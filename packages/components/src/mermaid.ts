// Mermaid Component
// Renders mermaid diagrams using the mermaid JS library and the shared browser.
// Theme fonts and colors are automatically injected for brand compliance.

import type { Canvas } from 'tycoslide';
import {
  NODE_TYPE, type ImageNode,
  defineComponent, component, type ComponentNode, type ExpansionContext,
  schema,
} from 'tycoslide';

import fs from 'fs';
import { createRequire } from 'module';
import { Component } from './names.js';

// ============================================
// TOKENS
// ============================================

export const MERMAID_TOKEN = {
  PRIMARY_COLOR: 'primaryColor',
  PRIMARY_TEXT_COLOR: 'primaryTextColor',
  PRIMARY_BORDER_COLOR: 'primaryBorderColor',
  LINE_COLOR: 'lineColor',
  SECONDARY_COLOR: 'secondaryColor',
  TERTIARY_COLOR: 'tertiaryColor',
  TEXT_COLOR: 'textColor',
  NODE_TEXT_COLOR: 'nodeTextColor',
  CLUSTER_BACKGROUND: 'clusterBackground',
  CLUSTER_BORDER_COLOR: 'clusterBorderColor',
  EDGE_LABEL_BACKGROUND: 'edgeLabelBackground',
  TITLE_COLOR: 'titleColor',
  TEXT_STYLE: 'textStyle',
  ACCENT_OPACITY: 'accentOpacity',
} as const;

export type MermaidTokens = {
  [MERMAID_TOKEN.PRIMARY_COLOR]: string;
  [MERMAID_TOKEN.PRIMARY_TEXT_COLOR]: string;
  [MERMAID_TOKEN.PRIMARY_BORDER_COLOR]: string;
  [MERMAID_TOKEN.LINE_COLOR]: string;
  [MERMAID_TOKEN.SECONDARY_COLOR]: string;
  [MERMAID_TOKEN.TERTIARY_COLOR]: string;
  [MERMAID_TOKEN.TEXT_COLOR]: string;
  [MERMAID_TOKEN.NODE_TEXT_COLOR]: string;
  [MERMAID_TOKEN.CLUSTER_BACKGROUND]: string;
  [MERMAID_TOKEN.CLUSTER_BORDER_COLOR]: string;
  [MERMAID_TOKEN.EDGE_LABEL_BACKGROUND]: string;
  [MERMAID_TOKEN.TITLE_COLOR]: string;
  [MERMAID_TOKEN.TEXT_STYLE]: string;
  [MERMAID_TOKEN.ACCENT_OPACITY]: number;
};

// ============================================
// TYPES
// ============================================

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

/** The subset of theme data that mermaid rendering actually needs (beyond tokens). */
export interface MermaidRenderContext {
  accents: Record<string, string>;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function buildMermaidConfig(tokens: MermaidTokens, fontFamily: string): object {
  return {
    startOnLoad: false,
    // 'loose' enables foreignObject for richer text (e.g. <br/> in labels).
    // Safe: runs in sandboxed Playwright, input is sanitized.
    securityLevel: 'loose',
    theme: 'base',
    themeVariables: {
      fontFamily,
      background: 'transparent',
      primaryColor: `#${tokens.primaryColor}`,
      primaryTextColor: `#${tokens.primaryTextColor}`,
      primaryBorderColor: `#${tokens.primaryBorderColor}`,
      lineColor: `#${tokens.lineColor}`,
      secondaryColor: `#${tokens.secondaryColor}`,
      tertiaryColor: `#${tokens.tertiaryColor}`,
      textColor: `#${tokens.textColor}`,
      titleColor: `#${tokens.titleColor}`,
      nodeTextColor: `#${tokens.nodeTextColor}`,
      clusterBkg: hexToRgba(tokens.clusterBackground, tokens.accentOpacity / 100),
      clusterBorder: `#${tokens.clusterBorderColor}`,
      edgeLabelBackground: `#${tokens.edgeLabelBackground}`,
    },
  };
}

export function buildClassDefs(tokens: MermaidTokens, accents: Record<string, string>): string {
  const alpha = Math.round(tokens.accentOpacity / 100 * 255).toString(16).padStart(2, '0');

  const defs = Object.entries(accents).map(([name, color]) => {
    return `classDef ${name} fill:#${color}${alpha}`;
  });
  // Primary gets full opacity with themed text color for contrast
  defs.push(`classDef primary fill:#${tokens.primaryColor},color:#${tokens.primaryTextColor}`);
  return defs.join('\n');
}

function buildSubgraphStyles(definition: string, tokens: MermaidTokens): string {
  const alpha = Math.round(tokens.accentOpacity / 100 * 255).toString(16).padStart(2, '0');
  const fillColor = `#${tokens.clusterBackground}${alpha}`;

  const subgraphPattern = /subgraph\s+(\w+)/g;
  const ids: string[] = [];
  let match;
  while ((match = subgraphPattern.exec(definition)) !== null) {
    ids.push(match[1]);
  }

  if (ids.length === 0) return '';
  return ids.map(id => `style ${id} fill:${fillColor}`).join('\n');
}

export function injectClassDefs(definition: string, tokens: MermaidTokens, accents: Record<string, string>): string {
  // classDef and style directives are flowchart/graph-only syntax.
  // For other diagram types (sequence, state, ER, etc.), skip injection —
  // they are themed via buildMermaidConfig's themeVariables instead.
  const flowchartPattern = /^(\s*(?:flowchart|graph)\s+\w*\s*\n)/m;
  const match = definition.match(flowchartPattern);

  if (!match) {
    return definition;
  }

  const classDefs = buildClassDefs(tokens, accents);
  const subgraphStyles = buildSubgraphStyles(definition, tokens);

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
 * Theme fonts are automatically injected by the canvas.
 */
async function renderMermaidToPng(
  definition: string,
  tokens: MermaidTokens,
  fontFamily: string,
  ctx: MermaidRenderContext,
  canvas: Canvas,
): Promise<string> {
  const config = buildMermaidConfig(tokens, fontFamily);
  const processed = injectClassDefs(definition, tokens, ctx.accents);
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
        // The @font-face rules are injected by the canvas font infrastructure.
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

  return canvas.renderHtml(html, true);
}

// ============================================
// COMPONENT EXPANSION
// ============================================

/**
 * Expand mermaid component to ImageNode.
 * Sanitizes definition, renders via shared browser, returns image reference.
 */
async function expandMermaid(props: MermaidComponentProps, context: ExpansionContext, tokens: MermaidTokens): Promise<ImageNode> {
  const sanitized = sanitizeMermaidDefinition(props.body);
  if (!sanitized.trim()) {
    throw new Error('Mermaid definition is empty after sanitization');
  }
  const textStyleConfig = context.theme.textStyles[tokens.textStyle as keyof typeof context.theme.textStyles];
  const fontFamily = textStyleConfig.fontFamily.normal.name;
  const renderCtx: MermaidRenderContext = {
    accents: context.theme.colors.accents,
  };
  const pngPath = await renderMermaidToPng(sanitized, tokens, fontFamily, renderCtx, context.canvas);
  return {
    type: NODE_TYPE.IMAGE,
    src: pngPath,
    maxScale: context.theme.spacing.maxScaleFactor,
  };
}

// ============================================
// REGISTRATION + DSL FUNCTION
// ============================================

export const mermaidComponent = defineComponent({
  name: Component.Mermaid,
  body: schema.string(),
  params: {},
  tokens: Object.values(MERMAID_TOKEN),
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
