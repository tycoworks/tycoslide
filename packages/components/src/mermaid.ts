// Mermaid Component
// Renders mermaid diagrams using the mermaid JS library and the shared browser.
// Theme fonts and colors are automatically injected for brand compliance.

import fs from "node:fs";
import { createRequire } from "node:module";
import type { Canvas, TextStyleName } from "tycoslide";
import {
  type ComponentNode,
  component,
  defineComponent,
  hexToRgba,
  type InferTokens,
  type RenderContext,
  type Shadow,
  schema,
  token,
} from "tycoslide";
import { image } from "./image.js";
import { Component } from "./names.js";

// ============================================
// TOKENS
// ============================================

const mermaidTokens = token.shape({
  primaryColor: token.required<string>(),
  primaryTextColor: token.required<string>(),
  primaryBorderColor: token.required<string>(),
  lineColor: token.required<string>(),
  secondaryColor: token.required<string>(),
  tertiaryColor: token.required<string>(),
  textColor: token.required<string>(),
  nodeTextColor: token.required<string>(),
  clusterBackground: token.required<string>(),
  clusterBorderColor: token.required<string>(),
  edgeLabelBackground: token.required<string>(),
  titleColor: token.required<string>(),
  textStyle: token.required<TextStyleName>(),
  accentOpacity: token.required<number>(),
  accents: token.required<Record<string, string>>(),
  shadow: token.optional<Shadow>(),
});

export type MermaidTokens = InferTokens<typeof mermaidTokens>;

// ============================================
// VALIDATION
// ============================================

const FORBIDDEN_PATTERNS = [/^\s*style\s+\S+\s+/, /^\s*linkStyle\s+/, /^\s*classDef\s+/, /^\s*%%\{init/];

/**
 * Validate a mermaid definition, rejecting forbidden style and config directives.
 * Throws if any `style`, `linkStyle`, `classDef`, or `%%{init}` directives are found —
 * these are injected by the theme system and must not be authored manually.
 */
export function validateMermaidDefinition(definition: string): string {
  const forbidden: string[] = [];
  for (const line of definition.split("\n")) {
    if (FORBIDDEN_PATTERNS.some((p) => p.test(line))) {
      forbidden.push(line.trim());
    }
  }
  if (forbidden.length > 0) {
    throw new Error(
      `Mermaid: found ${forbidden.length} forbidden style directive(s). ` +
        `Use theme classes instead (e.g. "class NodeId primary"):\n` +
        forbidden.map((s) => `  - ${s}`).join("\n"),
    );
  }
  return definition;
}

// ============================================
// THEME INTEGRATION
// ============================================

/** The subset of theme data that mermaid rendering actually needs (beyond tokens). */
export interface MermaidRenderContext {
  accents: Record<string, string>;
}

export function buildMermaidConfig(tokens: MermaidTokens, fontFamily: string): object {
  return {
    startOnLoad: false,
    // 'loose' enables foreignObject for richer text (e.g. <br/> in labels).
    // Safe: runs in sandboxed Playwright, input is sanitized.
    securityLevel: "loose",
    theme: "base",
    themeVariables: {
      fontFamily,
      background: "transparent",
      primaryColor: tokens.primaryColor,
      primaryTextColor: tokens.primaryTextColor,
      primaryBorderColor: tokens.primaryBorderColor,
      lineColor: tokens.lineColor,
      secondaryColor: tokens.secondaryColor,
      tertiaryColor: tokens.tertiaryColor,
      textColor: tokens.textColor,
      titleColor: tokens.titleColor,
      nodeTextColor: tokens.nodeTextColor,
      clusterBkg: hexToRgba(tokens.clusterBackground, tokens.accentOpacity / 100),
      clusterBorder: tokens.clusterBorderColor,
      edgeLabelBackground: tokens.edgeLabelBackground,
    },
  };
}

export function buildClassDefs(tokens: MermaidTokens, accents: Record<string, string>): string {
  const alpha = Math.round((tokens.accentOpacity / 100) * 255)
    .toString(16)
    .padStart(2, "0");

  const defs = Object.entries(accents).map(([name, color]) => {
    return `classDef ${name} fill:${color}${alpha}`;
  });
  // Primary gets full opacity with themed text color for contrast
  defs.push(`classDef primary fill:${tokens.primaryColor},color:${tokens.primaryTextColor}`);
  return defs.join("\n");
}

function buildSubgraphStyles(definition: string, tokens: MermaidTokens): string {
  const alpha = Math.round((tokens.accentOpacity / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  const fillColor = `${tokens.clusterBackground}${alpha}`;

  const subgraphPattern = /subgraph\s+(\w+)/g;
  const ids: string[] = [];
  let match: RegExpExecArray | null = null;
  while ((match = subgraphPattern.exec(definition)) !== null) {
    ids.push(match[1]);
  }

  if (ids.length === 0) return "";
  return ids.map((id) => `style ${id} fill:${fillColor}`).join("\n");
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
    result = `${result.trimEnd()}\n${subgraphStyles}`;
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
    const bundlePath = require.resolve("mermaid/dist/mermaid.min.js");
    bundleCache = await fs.promises.readFile(bundlePath, "utf-8");
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
  const defJson = JSON.stringify(processed).replace(/<\//g, "<\\/");
  const configJson = JSON.stringify(config).replace(/<\//g, "<\\/");

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
// COMPONENT RENDERING
// ============================================

/**
 * Render mermaid component to image component.
 * Validates definition, renders via shared browser, returns image reference.
 */
async function renderMermaid(
  _params: {},
  content: string,
  context: RenderContext,
  tokens: MermaidTokens,
): Promise<ComponentNode> {
  const definition = validateMermaidDefinition(content);
  if (!definition.trim()) {
    throw new Error("Mermaid definition is empty");
  }
  const textStyleConfig = context.theme.textStyles[tokens.textStyle];
  const fontFamily = textStyleConfig.fontFamily.name;
  const renderCtx: MermaidRenderContext = {
    accents: tokens.accents,
  };
  const pngPath = await renderMermaidToPng(definition, tokens, fontFamily, renderCtx, context.canvas);
  const mermaidImage = image(pngPath, undefined, definition);
  if (tokens.shadow) {
    mermaidImage.tokens = { shadow: tokens.shadow };
  }
  return mermaidImage;
}

// ============================================
// REGISTRATION + DSL FUNCTION
// ============================================

export const mermaidComponent = defineComponent({
  name: Component.Mermaid,
  content: schema.string(),
  tokens: mermaidTokens,
  render: renderMermaid,
});

/**
 * Create a mermaid diagram from raw mermaid definition string.
 * Style directives (style, linkStyle, classDef, %%{init}) are forbidden
 * and will fail the build — theme-based styling is injected automatically.
 *
 * @example
 * ```typescript
 * const diagram = mermaid(`
 *   flowchart LR
 *     A[Client] --> B[Server]
 *     B --> C[(Database)]
 *     class B primary
 * `, tokens.mermaid);
 * pres.add(contentSlide('Architecture', diagram));
 * ```
 */
export function mermaid(definition: string, tokens: MermaidTokens): ComponentNode {
  return component(Component.Mermaid, {}, definition, tokens);
}
