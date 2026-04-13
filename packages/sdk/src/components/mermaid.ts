// Mermaid Component
// Renders mermaid diagrams using the mermaid JS library and the shared browser.
// Theme fonts and colors are automatically injected for brand compliance.
//
// Theming strategy:
//   - Default nodes: styled via mermaid's themeVariables (primaryColor, primaryTextColor, etc.)
//   - Accent nodes: styled via injected classDef directives — fill at accentOpacity,
//     full-color stroke, and accentTextColor for text. Apply with `class NodeId purple`.
//   - Primary class: full-opacity primaryColor fill with primaryTextColor text.
//   - Subgraphs: filled at accentOpacity with rounded corners (groupCornerRadius, inches).
//   - Non-flowchart diagrams (sequence, state, ER): themed via themeVariables only (no classDef).
//
// Units: all color tokens are #-prefixed hex. groupCornerRadius is in inches (converted to SVG px
// internally via inToPx). accentOpacity is 0-100 (percentage).

import fs from "node:fs";
import { createRequire } from "node:module";
import type { Canvas, TextStyleName } from "@tycoslide/core";
import {
  type ComponentNode,
  component,
  defineComponent,
  type InferTokens,
  inToPx,
  type RenderContext,
  SHAPE,
  schema,
  token,
} from "@tycoslide/core";
import { Component } from "../presets/names.js";
import { column, stack } from "./containers.js";
import { type ImageTokens, image } from "./image.js";
import { type ShapeTokens, shape } from "./primitives.js";

// ============================================
// TOKENS
// ============================================

const mermaidTokens = token.shape({
  // --- Semantic color scheme ---
  primary: token.required<string>(), // Default node fill
  primaryContrast: token.required<string>(), // Default node text color
  text: token.required<string>(), // All diagram text (labels, titles, edge text)
  line: token.required<string>(), // Arrow/edge color
  surface: token.required<string>(), // Secondary/tertiary fills (alt nodes)
  surfaceBorder: token.required<string>(), // Node and subgraph border color
  surfaceSubtle: token.required<string>(), // Edge label background
  group: token.required<string>(), // Subgraph fill (tinted at accentStyle.opacity)
  groupCornerRadius: token.required<number>(), // Subgraph corner radius (inches)

  // --- Accent classes (injected classDefs for flowcharts) ---
  accents: token.required<Record<string, string>>(), // Named accent colors (e.g. { purple: "#7C3AED" })
  accentStyle: token.required<{ opacity: number; textColor: string }>(), // Fill opacity (0-100) and text color for accent nodes

  // --- Typography ---
  textStyle: token.required<TextStyleName>(), // Font style for text measurement

  // --- Background (optional, like table) ---
  background: token.optional<ShapeTokens>(), // Background shape (fill, border, cornerRadius, shadow)
  backgroundPadding: token.optional<number>(), // Padding between background edge and diagram
  image: token.required<ImageTokens>(),
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
 * Build classDef directives for flowchart accent classes.
 * Each accent gets: tinted fill (color at accentOpacity), full-color stroke, accentTextColor text.
 * The `primary` class gets full-opacity primaryColor fill with primaryTextColor for contrast.
 */
export function buildClassDefs(tokens: MermaidTokens, accents: Record<string, string>): string {
  const alpha = Math.round((tokens.accentStyle.opacity / 100) * 255)
    .toString(16)
    .padStart(2, "0");

  const defs = Object.entries(accents).map(([name, color]) => {
    return `classDef ${name} fill:${color}${alpha},stroke:${color},color:${tokens.accentStyle.textColor}`;
  });
  // Primary gets full opacity with themed text color for contrast
  defs.push(`classDef primary fill:${tokens.primary},color:${tokens.primaryContrast}`);
  return defs.join("\n");
}

/**
 * Build inline style directives for subgraph containers.
 * Applies group fill at accentOpacity, with rounded corners (groupCornerRadius in inches).
 * Only emitted for flowchart/graph diagrams where `subgraph ID` declarations are found.
 */
function buildSubgraphStyles(definition: string, tokens: MermaidTokens): string {
  const alpha = Math.round((tokens.accentStyle.opacity / 100) * 255)
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
  const radiusPx = Math.round(inToPx(tokens.groupCornerRadius));
  const radiusPart = radiusPx > 0 ? `,rx:${radiusPx},ry:${radiusPx}` : "";
  return ids.map((id) => `style ${id} fill:${fillColor}${radiusPart}`).join("\n");
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
  const renderCtx: MermaidRenderContext = {
    accents: tokens.accents,
  };
  const pngPath = await renderMermaidToPng(definition, tokens, fontFamily, renderCtx, context.canvas);
  const mermaidImage = image(pngPath, tokens.image, definition);

  if (tokens.background) {
    const backgroundRect = shape(tokens.background, { shape: SHAPE.RECTANGLE });
    const padding = tokens.backgroundPadding ?? 0;
    const contentLayer = padding > 0 ? column({ padding, spacing: 0 }, mermaidImage) : mermaidImage;
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
  tokens: mermaidTokens,
  render: renderMermaid,
});

/**
 * Create a mermaid diagram from raw mermaid definition string.
 * Style directives (style, linkStyle, classDef, %%{init}) are forbidden
 * and will fail the build — theme-based styling is injected automatically.
 *
 * Use `class NodeId <accent>` to apply themed accent colors (e.g. `class B purple`).
 * Use `class NodeId primary` for full-opacity primary fill.
 * Available accent names come from the theme's `accents` token map.
 *
 * @example
 * ```typescript
 * const diagram = mermaid(`
 *   flowchart LR
 *     A[Client] --> B[Server]
 *     B --> C[(Database)]
 *     class B purple
 * `, tokens.mermaid);
 * pres.add(contentSlide('Architecture', diagram));
 * ```
 */
export function mermaid(definition: string, tokens: MermaidTokens): ComponentNode {
  return component(Component.Mermaid, {}, definition, tokens);
}
