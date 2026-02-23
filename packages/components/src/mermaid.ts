// Mermaid Diagram Component
// Accepts raw mermaid text, sanitizes styling, injects theme classDefs,
// renders via mermaid-cli to PNG, expands to ImageNode.

import type { Theme } from 'tycoslide';
import {
  NODE_TYPE, type ImageNode,
  componentRegistry, component, type ComponentNode, type ExpansionContext, type InferProps, type SchemaShape,
  schema, Component,
} from 'tycoslide';

import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, mkdtempSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// ============================================
// CONSTANTS
// ============================================

/** Timeout for mermaid-cli rendering in milliseconds */
const MERMAID_RENDER_TIMEOUT_MS = 30000;

/** Max directory levels to search for mmdc binary */
const MAX_MMDC_SEARCH_DEPTH = 6;

// ============================================
// SCHEMAS & TYPES
// ============================================

const mermaidOptionsSchema = {
  scale: schema.number().optional(),
} satisfies SchemaShape;

export type MermaidProps = InferProps<typeof mermaidOptionsSchema>;

export type MermaidComponentProps = { body: string } & MermaidProps;

// ============================================
// SANITIZATION
// ============================================

/**
 * Sanitize mermaid definition by removing style and config directives.
 * These will be injected by the theme system.
 */
export function sanitizeMermaidDefinition(definition: string): string {
  const lines = definition.split('\n');
  const stripped: string[] = [];
  const filtered = lines.filter(line => {
    if (/^\s*style\s+\S+\s+/.test(line)) { stripped.push(line.trim()); return false; }
    if (/^\s*linkStyle\s+/.test(line)) { stripped.push(line.trim()); return false; }
    if (/^\s*classDef\s+/.test(line)) { stripped.push(line.trim()); return false; }
    if (/^\s*%%\{init/.test(line)) { stripped.push(line.trim()); return false; }
    return true;
  });
  if (stripped.length > 0) {
    throw new Error(
      `[tycoslide] Mermaid: found ${stripped.length} forbidden style directive(s). ` +
      `Use theme classes instead (e.g. "class NodeId primary"):\n` +
      stripped.map(s => `  - ${s}`).join('\n'),
    );
  }
  return filtered.join('\n');
}

// ============================================
// MERMAID RENDERING HELPERS
// ============================================

function findMmdcPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  let dir = __dirname;
  for (let i = 0; i < MAX_MMDC_SEARCH_DEPTH; i++) {
    const candidate = join(dir, 'node_modules', '.bin', 'mmdc');
    if (existsSync(candidate)) {
      return candidate;
    }
    dir = dirname(dir);
  }

  try {
    const require = createRequire(import.meta.url);
    const cliPath = require.resolve('@mermaid-js/mermaid-cli/src/cli.js');
    return `node "${cliPath}"`;
  } catch {
    return 'mmdc';
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildDiagramConfig(theme: Theme): object {
  const { colors, textStyles } = theme;
  const fontFamily = textStyles.body.fontFamily.normal.name;
  const alphaDecimal = colors.subtleOpacity / 100;

  return {
    theme: 'base',
    themeVariables: {
      fontFamily,
      background: `#${colors.background}`,
      primaryColor: `#${colors.primary}`,
      primaryTextColor: `#${colors.text}`,
      primaryBorderColor: `#${colors.secondary}`,
      lineColor: `#${colors.secondary}`,
      secondaryColor: `#${colors.primary}`,
      tertiaryColor: `#${colors.primary}`,
      textColor: `#${colors.text}`,
      titleColor: `#${colors.text}`,
      nodeTextColor: `#${colors.text}`,
      clusterBkg: hexToRgba(colors.secondary, alphaDecimal),
      clusterBorder: `#${colors.secondary}`,
      edgeLabelBackground: `#${colors.background}`,
    },
  };
}

function buildClassDefs(theme: Theme): string {
  const { colors } = theme;
  const alpha = Math.round(colors.subtleOpacity / 100 * 255).toString(16).padStart(2, '0');

  const defs = Object.entries(colors.accents).map(([name, color]) => {
    return `classDef ${name} fill:#${color}${alpha}`;
  });
  // Primary gets full opacity (not subtle)
  defs.push(`classDef primary fill:#${colors.primary}`);
  return defs.join('\n');
}

function buildSubgraphStyles(definition: string, theme: Theme): string {
  const { colors } = theme;
  const alpha = Math.round(colors.subtleOpacity / 100 * 255).toString(16).padStart(2, '0');
  const fillColor = `#${colors.secondary}${alpha}`;

  const subgraphPattern = /subgraph\s+(\w+)/g;
  const ids: string[] = [];
  let match;
  while ((match = subgraphPattern.exec(definition)) !== null) {
    ids.push(match[1]);
  }

  if (ids.length === 0) return '';
  return ids.map(id => `style ${id} fill:${fillColor}`).join('\n');
}

function injectClassDefs(definition: string, theme: Theme): string {
  // classDef and style directives are flowchart/graph-only syntax.
  // For other diagram types (sequence, state, ER, etc.), skip injection —
  // they are themed via buildDiagramConfig's themeVariables instead.
  const flowchartPattern = /^(\s*(?:flowchart|graph)\s+\w*\s*\n)/m;
  const match = definition.match(flowchartPattern);

  if (!match) {
    return definition;
  }

  const classDefs = buildClassDefs(theme);
  const subgraphStyles = buildSubgraphStyles(definition, theme);

  const [fullMatch] = match;
  let result = definition.replace(fullMatch, `${fullMatch}${classDefs}\n`);
  if (subgraphStyles) {
    result = result.trimEnd() + '\n' + subgraphStyles;
  }
  return result;
}

// ============================================
// RENDERING
// ============================================

const execAsync = promisify(execCb);

/**
 * Render mermaid definition to PNG via mermaid-cli.
 * Returns the path to the generated PNG file.
 */
async function renderMermaidToPng(definition: string, theme: Theme, scale: number): Promise<string> {
  // Create temp directory and files
  const tmpDir = mkdtempSync(join(tmpdir(), 'mermaid-'));
  const inputPath = join(tmpDir, 'diagram.mmd');
  const outputPath = join(tmpDir, 'diagram.png');
  const configPath = join(tmpDir, 'config.json');

  // Inject theme-based class definitions
  const processedDefinition = injectClassDefs(definition, theme);
  writeFileSync(inputPath, processedDefinition);

  // Write mermaid config
  const config = buildDiagramConfig(theme);
  writeFileSync(configPath, JSON.stringify(config));

  // Render via mermaid-cli
  const mmdc = findMmdcPath();
  try {
    await execAsync(
      `${mmdc} -i "${inputPath}" -o "${outputPath}" -c "${configPath}" -s ${scale} -b transparent`,
      { timeout: MERMAID_RENDER_TIMEOUT_MS },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Mermaid rendering failed: ${message}`);
  }

  return outputPath;
}

// ============================================
// COMPONENT EXPANSION
// ============================================

/**
 * Expand mermaid component to ImageNode.
 * Sanitizes definition, renders via mermaid-cli, returns image reference.
 */
async function expandMermaid(props: MermaidComponentProps, context: ExpansionContext): Promise<ImageNode> {
  const sanitized = sanitizeMermaidDefinition(props.body);
  if (!sanitized.trim()) {
    throw new Error('Mermaid diagram definition is empty after sanitization');
  }
  const pngPath = await renderMermaidToPng(sanitized, context.theme, props.scale ?? 2);
  return {
    type: NODE_TYPE.IMAGE,
    src: pngPath,
  };
}

// ============================================
// REGISTRATION + DSL FUNCTION
// ============================================

export const mermaidComponent = componentRegistry.define({
  name: Component.Mermaid,
  body: schema.string(),
  params: mermaidOptionsSchema,
  expand: expandMermaid,
});

/**
 * Create a mermaid diagram from raw mermaid definition string.
 * Style directives (style, linkStyle, classDef, %%{init}) are stripped
 * and replaced with theme-based styling.
 *
 * @example
 * ```typescript
 * const diagram = mermaid(`
 *   flowchart LR
 *     A[Client] --> B[Server]
 *     B --> C[(Database)]
 *     class B primary
 * `);
 * pres.add(contentSlide('Architecture', diagram));
 * ```
 */
export function mermaid(definition: string, props?: MermaidProps): ComponentNode<MermaidComponentProps> {
  return component(Component.Mermaid, { body: definition, ...props });
}
