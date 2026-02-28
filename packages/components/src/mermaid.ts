// Mermaid Component
// Renders mermaid diagrams using the mermaid JS library and the shared browser.
// Theme fonts and colors are automatically injected for brand compliance.

import type { Theme } from 'tycoslide';
import {
  NODE_TYPE, type ImageNode,
  componentRegistry, component, type ComponentNode, type ExpansionContext, type SchemaShape,
  schema,
} from 'tycoslide';

import fs from 'fs';
import { createRequire } from 'module';
import { Component } from './names.js';

// ============================================
// SCHEMAS & TYPES
// ============================================

const mermaidSchema = {} satisfies SchemaShape;

export type MermaidComponentProps = { body: string };

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
// THEME INTEGRATION
// ============================================

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildMermaidConfig(theme: Theme): object {
  const { colors, textStyles } = theme;
  const fontFamily = textStyles.body.fontFamily.normal.name;
  const alphaDecimal = colors.subtleOpacity / 100;

  return {
    startOnLoad: false,
    // 'loose' enables foreignObject for richer text (e.g. <br/> in labels).
    // Safe: runs in sandboxed Playwright, input is sanitized.
    securityLevel: 'loose',
    theme: 'base',
    themeVariables: {
      fontFamily,
      background: 'transparent',
      primaryColor: `#${colors.primary}`,
      primaryTextColor: `#${colors.background}`,   // Light text on dark primary fill
      primaryBorderColor: `#${colors.textMuted}`,   // Visible borders
      lineColor: `#${colors.text}`,                 // Visible arrows
      secondaryColor: `#${colors.secondary}`,
      tertiaryColor: `#${colors.secondary}`,
      textColor: `#${colors.text}`,
      titleColor: `#${colors.text}`,
      nodeTextColor: `#${colors.background}`,        // Light text on filled nodes
      clusterBkg: hexToRgba(colors.secondary, alphaDecimal),
      clusterBorder: `#${colors.textMuted}`,
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
  // Primary gets full opacity with light text for contrast
  defs.push(`classDef primary fill:#${colors.primary},color:#${colors.background}`);
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
  // they are themed via buildMermaidConfig's themeVariables instead.
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
// MERMAID BUNDLE
// ============================================

let bundleCache: string | null = null;

async function getMermaidBundle(): Promise<string> {
  if (!bundleCache) {
    const require = createRequire(import.meta.url);
    const bundlePath = require.resolve('mermaid/dist/mermaid.min.js');
    bundleCache = await fs.promises.readFile(bundlePath, 'utf-8');
  }
  return bundleCache;
}

// ============================================
// RENDERING
// ============================================

/**
 * Render mermaid definition to PNG via shared browser.
 * Loads the mermaid JS library in-page, renders to SVG, screenshots to PNG.
 * Theme fonts are automatically injected by the render service.
 */
async function renderMermaidToPng(
  definition: string,
  theme: Theme,
  render: { renderHtmlToImage(html: string, transparent?: boolean): Promise<string> },
): Promise<string> {
  const config = buildMermaidConfig(theme);
  const processed = injectClassDefs(definition, theme);
  const bundle = await getMermaidBundle();

  // Use JSON script blocks to safely pass data without escaping issues.
  // Escape </ sequences to prevent premature </script> closure.
  const defJson = JSON.stringify(processed).replace(/<\//g, '<\\/');
  const configJson = JSON.stringify(config).replace(/<\//g, '<\\/');

  const html = `<!DOCTYPE html>
<html><head>
<style>body { margin: 0; background: transparent; }</style>
</head>
<body>
  <div id="output" data-render-signal="pending"></div>
  <script id="mermaid-def" type="application/json">${defJson}</script>
  <script id="mermaid-config" type="application/json">${configJson}</script>
  <script>${bundle}</script>
  <script>
    (async () => {
      try {
        const def = JSON.parse(document.getElementById('mermaid-def').textContent);
        const config = JSON.parse(document.getElementById('mermaid-config').textContent);

        // Hidden container for mermaid's scratch rendering
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '-9999px';
        document.body.appendChild(container);

        // Load ALL registered @font-face fonts before mermaid measures text.
        // document.fonts.ready alone resolves immediately (nothing references the font yet).
        // Iterating document.fonts and calling .load() on each triggers the actual fetch.
        // The @font-face rules are injected by renderHtmlToImage's font infrastructure.
        await Promise.all([...document.fonts].map(f => f.load()));
        await document.fonts.ready;

        mermaid.initialize(config);
        const { svg } = await mermaid.render('mermaid-0', def, container);

        container.remove();
        document.getElementById('output').innerHTML = svg;

        // Scale SVG to fill viewport AFTER mermaid has measured text at natural size.
        // Mermaid sets inline max-width that constrains the SVG — override it.
        // viewBox scaling is uniform, so text remains correctly sized.
        const svgEl = document.querySelector('#output svg');
        if (svgEl) {
          svgEl.style.maxWidth = 'none';
          svgEl.style.width = '100%';
          svgEl.style.height = 'auto';
        }

        document.getElementById('output').setAttribute('data-render-signal', 'done');
      } catch (e) {
        document.getElementById('output').setAttribute('data-render-error', e.message);
        document.getElementById('output').setAttribute('data-render-signal', 'done');
      }
    })();
  </script>
</body></html>`;

  return render.renderHtmlToImage(html, true);
}

// ============================================
// COMPONENT EXPANSION
// ============================================

/**
 * Expand mermaid component to ImageNode.
 * Sanitizes definition, renders via shared browser, returns image reference.
 */
async function expandMermaid(props: MermaidComponentProps, context: ExpansionContext): Promise<ImageNode> {
  if (!context.render) {
    throw new Error('Mermaid component requires render service. Use Presentation.writeFile() for rendering.');
  }
  const sanitized = sanitizeMermaidDefinition(props.body);
  if (!sanitized.trim()) {
    throw new Error('Mermaid definition is empty after sanitization');
  }
  const pngPath = await renderMermaidToPng(sanitized, context.theme, context.render);
  return {
    type: NODE_TYPE.IMAGE,
    src: pngPath,
    maxScale: context.theme.spacing.maxScaleFactor,
  };
}

// ============================================
// REGISTRATION + DSL FUNCTION
// ============================================

export const mermaidComponent = componentRegistry.define({
  name: Component.Mermaid,
  body: schema.string(),
  params: mermaidSchema,
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
export function mermaid(definition: string): ComponentNode<MermaidComponentProps> {
  return component(Component.Mermaid, { body: definition });
}
