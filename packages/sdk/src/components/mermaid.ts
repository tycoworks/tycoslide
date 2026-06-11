// Mermaid Component
// Renders mermaid diagrams using the mermaid JS library and the shared browser.
// Theme fonts and colors are automatically injected for brand compliance.
//
// Theming strategy:
//   - Default nodes: styled via mermaid's themeVariables (primaryColor, primaryTextColor, etc.)
//   - Accent nodes: styled via injected classDef directives — fill at accentOpacity,
//     full-color stroke, and accentTextColor for text. Group names are round-robin
//     assigned to the theme's accent color pool.
//   - Subgraphs: filled at accentOpacity with rounded corners (groupCornerRadius, pixels).
//   - Non-flowchart diagrams (sequence, state, ER): themed via themeVariables only (no classDef).
//
// Units: all color tokens are #-prefixed hex. groupCornerRadius is in pixels.
// accentOpacity is 0-100 (percentage).

import fs from "node:fs";
import { createRequire } from "node:module";
import type { Canvas, TextStyleName } from "@tycoslide/core";
import { type ComponentNode, component, type RenderContext, SHAPE } from "@tycoslide/core";
import { defineComponent, schema } from "../authoring/index.js";
import { Component } from "../presets/names.js";
import { column, stack } from "./containers.js";
import { type ImageTokens, image } from "./image.js";
import { type ShapeTokens, shape } from "./primitives.js";

// ============================================
// TOKENS
// ============================================

export interface MermaidTokens {
  // --- Semantic color scheme ---
  primary: string; // Default node fill
  primaryContrast: string; // Default node text color
  text: string; // All diagram text (labels, titles, edge text)
  line: string; // Arrow/edge color
  surface: string; // Secondary/tertiary fills (alt nodes)
  surfaceBorder: string; // Node and subgraph border color
  surfaceSubtle: string; // Edge label background
  group: string; // Subgraph fill (tinted at accentOpacity)
  groupCornerRadius: number; // Subgraph corner radius (pixels)

  // --- Accent classes (injected classDefs for flowcharts) ---
  accents: string[]; // Accent color pool for round-robin class assignment
  accentOpacity: number; // Fill opacity (0-100) for accent nodes and subgraphs
  accentTextColor: string; // Text color inside accent-classed nodes

  // --- Typography ---
  textStyle: TextStyleName; // Font style for text measurement

  // --- Background (optional, like table) ---
  background?: ShapeTokens; // Background shape (fill, border, cornerRadius, shadow)
  backgroundPadding?: number; // Padding between background edge and diagram
  image: ImageTokens;
}

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
        `Use theme classes instead (e.g. "class NodeId backend"):\n` +
        forbidden.map((s) => `  - ${s}`).join("\n"),
    );
  }
  return definition;
}

// ============================================
// THEME INTEGRATION
// ============================================

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
      primaryColor: tokens.primary,
      primaryTextColor: tokens.primaryContrast,
      primaryBorderColor: tokens.surfaceBorder,
      lineColor: tokens.line,
      secondaryColor: tokens.surface,
      tertiaryColor: tokens.surface,
      textColor: tokens.text,
      titleColor: tokens.text,
      nodeTextColor: tokens.text,
      // Raw color — flowcharts apply opacity via buildSubgraphStyles inline directives.
      // Non-flowchart diagrams (sequence, state, ER) use this value directly.
      clusterBkg: tokens.group,
      clusterBorder: tokens.surfaceBorder,
      edgeLabelBackground: tokens.surfaceSubtle,
    },
  };
}

/**
 * Extract unique class group names from a mermaid definition in encounter order.
 * Handles both `class NodeId groupName` statements and `NodeId:::groupName` inline syntax.
 */
export function extractGroups(definition: string): string[] {
  const seen = new Set<string>();
  const groups: string[] = [];

  const classPattern = /^\s*class\s+[\w,]+\s+(\w+)/gm;
  let match: RegExpExecArray | null = null;
  while ((match = classPattern.exec(definition)) !== null) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      groups.push(name);
    }
  }

  const inlinePattern = /:::(\w+)/g;
  while ((match = inlinePattern.exec(definition)) !== null) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      groups.push(name);
    }
  }

  return groups;
}

/**
 * Build classDef directives for flowchart accent classes.
 * Group names are round-robin assigned to the accent color pool.
 */
export function buildClassDefs(tokens: MermaidTokens, groups: string[]): string {
  if (groups.length === 0 || tokens.accents.length === 0) return "";
  const alpha = Math.round((tokens.accentOpacity / 100) * 255)
    .toString(16)
    .padStart(2, "0");

  return groups
    .map((name, i) => {
      const color = tokens.accents[i % tokens.accents.length];
      return `classDef ${name} fill:${color}${alpha},stroke:${color},color:${tokens.accentTextColor}`;
    })
    .join("\n");
}

/**
 * Build inline style directives for subgraph containers.
 * Applies group fill at accentOpacity, with rounded corners (groupCornerRadius in pixels).
 * Only emitted for flowchart/graph diagrams where `subgraph ID` declarations are found.
 */
function buildSubgraphStyles(definition: string, tokens: MermaidTokens): string {
  const alpha = Math.round((tokens.accentOpacity / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  const fillColor = `${tokens.group}${alpha}`;

  const subgraphPattern = /subgraph\s+(\w+)/g;
  const ids: string[] = [];
  let match: RegExpExecArray | null = null;
  while ((match = subgraphPattern.exec(definition)) !== null) {
    ids.push(match[1]);
  }

  if (ids.length === 0) return "";
  const radiusPx = Math.round(tokens.groupCornerRadius);
  const radiusPart = radiusPx > 0 ? `,rx:${radiusPx},ry:${radiusPx}` : "";
  return ids.map((id) => `style ${id} fill:${fillColor}${radiusPart}`).join("\n");
}

export function injectClassDefs(definition: string, tokens: MermaidTokens): string {
  const flowchartPattern = /^(\s*(?:flowchart|graph)\s+\w*\s*\n)/m;
  const match = definition.match(flowchartPattern);

  if (!match) {
    return definition;
  }

  const groups = extractGroups(definition);
  const classDefs = buildClassDefs(tokens, groups);
  const subgraphStyles = buildSubgraphStyles(definition, tokens);

  const [fullMatch] = match;
  let result = classDefs ? definition.replace(fullMatch, `${fullMatch}${classDefs}\n`) : definition;
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
  canvas: Canvas,
): Promise<string> {
  const config = buildMermaidConfig(tokens, fontFamily);
  const processed = injectClassDefs(definition, tokens);
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
 * Render mermaid component to image or stack(shape, image).
 * When `background` token is set, wraps the diagram in a native PPTX shape
 * (same pattern as code and table components).
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
  const pngPath = await renderMermaidToPng(definition, tokens, fontFamily, context.canvas);
  const mermaidImage = image(pngPath, tokens.image, definition);

  if (tokens.background) {
    const backgroundRect = shape(tokens.background, { shape: SHAPE.RECTANGLE });
    const padding = tokens.backgroundPadding ?? 0;
    const contentLayer = padding > 0 ? column({ padding }, mermaidImage) : mermaidImage;
    return stack({}, backgroundRect, contentLayer);
  }

  return mermaidImage;
}

// ============================================
// REGISTRATION + DSL FUNCTION
// ============================================

export const mermaidComponent = defineComponent({
  name: Component.Mermaid,
  content: schema.string(),
  render: renderMermaid,
});

/**
 * Create a mermaid diagram from raw mermaid definition string.
 * Style directives (style, linkStyle, classDef, %%{init}) are forbidden
 * and will fail the build — theme-based styling is injected automatically.
 *
 * Use `class NodeId groupName` to color nodes. Group names are arbitrary —
 * the system round-robin assigns accent colors from the theme's color pool.
 * Nodes sharing a group name share a color.
 *
 * @example
 * ```typescript
 * const diagram = mermaid(`
 *   flowchart LR
 *     A[Client] --> B[Server]
 *     B --> C[(Database)]
 *     class B,C backend
 * `, tokens.mermaid);
 * ```
 */
export function mermaid(definition: string, tokens: MermaidTokens): ComponentNode {
  return component(Component.Mermaid, {}, definition, tokens);
}
