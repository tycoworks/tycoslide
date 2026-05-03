// Test Mocks
// Shared mock utilities for testing

import * as assert from "node:assert";
import { createRequire } from "node:module";
import type {
  ComponentDefinition,
  ComponentNode,
  ElementNode,
  FontFamily,
  LayoutNode,
  RenderContext,
  SlideNode,
  TextStyle,
  Theme,
} from "@tycoslide/core";
import { DASH_TYPE, GRID_STYLE, HALIGN, isComponentNode, isLayoutNode, VALIGN } from "@tycoslide/core";
import type {
  CardTokens,
  CodeTokens,
  LabelTokens,
  LineTokens,
  ListTokens,
  MermaidTokens,
  QuoteTokens,
  ShapeTokens,
  SlideNumberTokens,
  TableTokens,
  TestimonialTokens,
  TextTokens,
} from "../src/index.js";
import { HIGHLIGHT_THEME } from "../src/presets/highlighting.js";

const require = createRequire(import.meta.url);

// ============================================
// SHARED TEST COMPONENT MAP
// ============================================

const componentMap = new Map<string, ComponentDefinition<any, any, any>>();

export const testRegistry = {
  register(input: ComponentDefinition<any, any, any> | readonly ComponentDefinition<any, any, any>[]): void {
    const arr = Array.isArray(input) ? input : [input];
    for (const d of arr) componentMap.set(d.name, d);
  },
  has(name: string): boolean {
    return componentMap.has(name);
  },
  get(name: string): ComponentDefinition<any, any, any> | undefined {
    return componentMap.get(name);
  },
  getMdastHandler(nodeType: string): ComponentDefinition<any, any, any> | undefined {
    for (const def of componentMap.values()) {
      if (def.mdast?.nodeTypes.includes(nodeType as any)) return def;
    }
    return undefined;
  },
};

// ============================================
// MOCK THEME
// ============================================

const mockFontFamily: FontFamily = {
  name: "Inter",
  regular: { path: require.resolve("@fontsource/inter/files/inter-latin-400-normal.woff"), weight: 400 },
  bold: { path: require.resolve("@fontsource/inter/files/inter-latin-700-normal.woff"), weight: 700 },
};

const mockTextStyle: TextStyle = {
  fontSize: 12,
  fontFamily: mockFontFamily,
  lineHeightMultiplier: 1.0,
  bulletIndentPt: 18,
};

/**
 * Create a mock Theme.
 * All text styles point to the same mock style.
 * Accepts optional overrides for layouts, textStyles, and slide dimensions.
 */
export function mockTheme(options?: {
  layouts?: Theme["layouts"];
  textStyles?: Partial<Record<string, Partial<TextStyle>>>;
  slide?: Theme["slide"];
}): Theme {
  return {
    slide: options?.slide ?? { width: 13.333, height: 7.5 },
    fonts: [mockFontFamily],
    textStyles: {
      h1: { ...mockTextStyle, ...options?.textStyles?.h1 },
      h2: { ...mockTextStyle, ...options?.textStyles?.h2 },
      h3: { ...mockTextStyle, ...options?.textStyles?.h3 },
      h4: { ...mockTextStyle, ...options?.textStyles?.h4 },
      body: { ...mockTextStyle, ...options?.textStyles?.body },
      small: { ...mockTextStyle, ...options?.textStyles?.small },
      footer: { ...mockTextStyle, ...options?.textStyles?.footer },
      eyebrow: { ...mockTextStyle, ...options?.textStyles?.eyebrow },
      code: { ...mockTextStyle, ...options?.textStyles?.code },
    },
    layouts: options?.layouts ?? {},
  };
}

// ============================================
// DEFAULT TOKEN MAPS FOR TEST DSL CALLS
// ============================================

export const DEFAULT_TEXT_TOKENS: TextTokens = {
  color: "#000000",
  style: "body",
  linkColor: "#0000FF",
  linkUnderline: true,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.TOP,
  accents: { accent: "#00CCCC", soft: "#FF00FF", dark: "#FF8800" },
};

export const DEFAULT_LABEL_TOKENS: LabelTokens = {
  color: "#000000",
  style: "body",
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.TOP,
};

export const DEFAULT_LIST_TOKENS: ListTokens = {
  color: "#000000",
  style: "body",
  linkColor: "#0000FF",
  linkUnderline: true,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.TOP,
  accents: { accent: "#00CCCC", soft: "#FF00FF", dark: "#FF8800" },
};

export const DEFAULT_TABLE_TOKENS: TableTokens = {
  headerRow: {
    textStyle: "body",
    textColor: "#000000",
    background: "#FFFFFF",
    backgroundOpacity: 100,
  },
  cellTextStyle: "body",
  cellTextColor: "#000000",
  cellBackground: "#FFFFFF",
  cellBackgroundOpacity: 100,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
  border: { color: "#333333", width: 1, dashType: DASH_TYPE.SOLID },
  gridStyle: GRID_STYLE.BOTH,
  gridStroke: { color: "#333333", width: 1, dashType: DASH_TYPE.SOLID },
  cellPadding: 0.1,
  linkColor: "#0000FF",
  linkUnderline: true,
  accents: { accent: "#00CCCC", soft: "#FF00FF", dark: "#FF8800" },
};

export const DEFAULT_IMAGE_TOKENS = { padding: 0 };

export const DEFAULT_CODE_TOKENS: CodeTokens = {
  textStyle: "code",
  theme: HIGHLIGHT_THEME.GITHUB_DARK,
  padding: 0.25,
  background: {
    fill: "#1E1E1E",
    fillOpacity: 100,
    cornerRadius: 0,
  },
  image: DEFAULT_IMAGE_TOKENS,
};

export const DEFAULT_MERMAID_TOKENS: MermaidTokens = {
  primary: "#FF0000",
  primaryContrast: "#FFFFFF",
  text: "#000000",
  line: "#000000",
  surface: "#333333",
  surfaceBorder: "#666666",
  surfaceSubtle: "#FFFFFF",
  group: "#333333",
  groupCornerRadius: 0.08,
  accents: { accent: "#00CCCC", soft: "#FF00FF", dark: "#FF8800" },
  accentStyle: { opacity: 100, textColor: "#000000" },
  textStyle: "body",
  image: DEFAULT_IMAGE_TOKENS,
};

export const DEFAULT_CARD_TOKENS: CardTokens = {
  background: {
    fill: "#333333",
    fillOpacity: 100,
    cornerRadius: 0,
  },
  padding: 0.25,
  spacing: 0.125,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.TOP,
  title: {
    style: "h4",
    color: "#FFFFFF",
    linkColor: "#0000FF",
    linkUnderline: true,
    hAlign: HALIGN.CENTER,
    vAlign: VALIGN.TOP,
    accents: { accent: "#00CCCC", soft: "#FF00FF", dark: "#FF8800" },
  },
  description: {
    style: "small",
    color: "#CCCCCC",
    linkColor: "#0000FF",
    linkUnderline: true,
    hAlign: HALIGN.CENTER,
    vAlign: VALIGN.TOP,
    accents: { accent: "#00CCCC", soft: "#FF00FF", dark: "#FF8800" },
  },
  image: DEFAULT_IMAGE_TOKENS,
};

export const DEFAULT_QUOTE_TOKENS: QuoteTokens = {
  bar: {
    color: "#FF0000",
    width: 3,
    dashType: DASH_TYPE.SOLID,
  },
  spacing: 0.125,
  quote: {
    style: "body",
    color: "#FFFFFF",
    linkColor: "#0000FF",
    linkUnderline: true,
    hAlign: HALIGN.LEFT,
    vAlign: VALIGN.TOP,
    accents: { accent: "#00CCCC", soft: "#FF00FF", dark: "#FF8800" },
  },
  attribution: {
    style: "small",
    color: "#666666",
    hAlign: HALIGN.LEFT,
    vAlign: VALIGN.TOP,
  },
};

export const DEFAULT_TESTIMONIAL_TOKENS: TestimonialTokens = {
  background: {
    fill: "#333333",
    fillOpacity: 100,
    cornerRadius: 0,
  },
  padding: 0.5,
  spacing: 0.25,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.MIDDLE,
  quote: {
    style: "body",
    color: "#FFFFFF",
    linkColor: "#0000FF",
    linkUnderline: true,
    hAlign: HALIGN.CENTER,
    vAlign: VALIGN.TOP,
    accents: { accent: "#00CCCC", soft: "#FF00FF", dark: "#FF8800" },
  },
  attribution: {
    style: "small",
    color: "#666666",
    hAlign: HALIGN.RIGHT,
    vAlign: VALIGN.TOP,
  },
  image: DEFAULT_IMAGE_TOKENS,
};

export const DEFAULT_LINE_TOKENS: LineTokens = {
  color: "#333333",
  width: 1,
  dashType: DASH_TYPE.SOLID,
};

export const DEFAULT_SHAPE_TOKENS: ShapeTokens = {
  fill: "#333333",
  fillOpacity: 100,
  cornerRadius: 0,
};

export const DEFAULT_SLIDE_NUMBER_TOKENS: SlideNumberTokens = {
  style: "footer",
  color: "#666666",
  hAlign: HALIGN.RIGHT,
  vAlign: VALIGN.MIDDLE,
};

// ============================================
// CANVAS MOCK
// ============================================

export function noopCanvas() {
  return { renderHtml: async () => "mock://render.png" };
}

// ============================================
// RENDER CONTEXT MOCK
// ============================================

/** Build a mock RenderContext with no-op canvas and passthrough renderTree. */
export function mockRenderContext(theme?: Theme) {
  const t = theme ?? mockTheme();
  const ctx: any = {
    theme: t,
    canvas: noopCanvas(),
    renderTree: async (node: any) => node,
  };
  return ctx;
}

// ============================================
// ASSERTION HELPERS
// ============================================

/**
 * Assert that a number is approximately equal to expected value.
 */
export function approx(actual: number, expected: number, msg: string, tolerance = 0.01): void {
  assert.ok(Math.abs(actual - expected) < tolerance, `${msg}: expected ~${expected}, got ${actual}`);
}

/**
 * Assert that two numbers are approximately equal.
 */
export function assertApprox(actual: number, expected: number, tolerance = 0.01): void {
  assert.ok(Math.abs(actual - expected) < tolerance, `expected ~${expected}, got ${actual}`);
}

// ============================================
// RENDER HELPERS
// ============================================

/** Render a single component node using registered components. */
export async function renderComponent(node: ComponentNode, context: RenderContext): Promise<SlideNode> {
  const def = testRegistry.get(node.componentName);
  if (!def) {
    throw new Error(`Unknown component: '${node.componentName}'. Did you forget to register it?`);
  }
  return def.render(node.params, node.content, context, node.tokens as any);
}

/** Recursively render a component tree to primitives using registered components. */
export async function renderTree(node: SlideNode, context: RenderContext): Promise<ElementNode> {
  if (isComponentNode(node)) {
    const def = testRegistry.get((node as ComponentNode).componentName);
    if (!def) {
      throw new Error(`Unknown component: '${(node as ComponentNode).componentName}'.`);
    }
    const rendered = await def.render(
      (node as ComponentNode).params,
      (node as ComponentNode).content,
      context,
      (node as ComponentNode).tokens as any,
    );
    return renderTree(rendered, context);
  }

  if (isLayoutNode(node as ElementNode)) {
    const layout = node as LayoutNode;
    return {
      ...layout,
      children: await Promise.all(layout.children.map((c) => renderTree(c, context))),
    } as LayoutNode;
  }

  return node as ElementNode;
}
