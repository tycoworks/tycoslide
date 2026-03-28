// Code Component
// Renders syntax-highlighted code blocks using the shared browser.
// Theme tokens control all styling — the highlighter is an implementation detail.

import {
  type ComponentNode,
  component,
  defineComponent,
  getFontForRun,
  HALIGN,
  type InferParams,
  type InferTokens,
  param,
  type RenderContext,
  SHAPE,
  SIZE,
  SYNTAX,
  schema,
  type TextStyle,
  type TextStyleName,
  token,
  VALIGN,
} from "@tycoworks/tycoslide";
import type { Code as MdastCode, RootContent } from "mdast";
import { codeToHtml } from "shiki";
import { column, stack } from "./containers.js";
import type { HighlightThemeName } from "./highlighting.js";
import { LANGUAGE_VALUES } from "./highlighting.js";
import { image } from "./image.js";
import { Component } from "./names.js";
import { type ShapeTokens, shape } from "./primitives.js";

const SUPPORTED_LANGUAGES = new Set<string>(LANGUAGE_VALUES);

// ============================================
// TOKENS
// ============================================

const codeTokens = token.shape({
  textStyle: token.required<TextStyleName>(),
  theme: token.required<HighlightThemeName>(),
  padding: token.required<number>(),
  background: token.required<ShapeTokens>(),
});

export type CodeTokens = InferTokens<typeof codeTokens>;

const codeParamShape = param.shape({
  language: param.required(schema.string()),
});
export type CodeParams = InferParams<typeof codeParamShape>;

// ============================================
// HTML RENDERING
// ============================================

/**
 * Render syntax-highlighted code to a complete HTML document for Playwright screenshot.
 * Returns a transparent PNG of just the highlighted text — background and padding
 * are handled by the stack+shape wrapper in renderCode.
 */
export async function renderCodeToHtml(
  code: string,
  language: string,
  tokens: CodeTokens,
  style: TextStyle,
): Promise<string> {
  const highlighted = await codeToHtml(code, {
    lang: language,
    theme: tokens.theme,
  });

  return `<!DOCTYPE html>
<html><head>
<style>
html, body {
  margin: 0;
  padding: 0;
  background: transparent;
}
.code-container {
  display: inline-block;
}
.code-container pre {
  margin: 0;
  background: transparent !important;
  font-family: '${style.fontFamily.name}';
  font-weight: ${getFontForRun(style.fontFamily).weight};
  font-size: ${style.fontSize}pt;
  line-height: ${style.lineHeightMultiplier};
}
.code-container code {
  font-family: inherit;
}
</style>
</head>
<body>
  <div class="code-container" data-render-signal="done">
    ${highlighted}
  </div>
</body></html>`;
}

// ============================================
// COMPONENT RENDERING
// ============================================

/**
 * Render code component to stack(shape, column(image)).
 * The shape provides a native PPTX background (fill, border, corner radius, shadow).
 * The column adds padding around the code screenshot.
 * The HUG-sized stack shrink-wraps to the code image dimensions.
 */
async function renderCode(
  params: CodeParams,
  content: string,
  context: RenderContext,
  tokens: CodeTokens,
): Promise<ComponentNode> {
  const code = content.trim();
  if (!code) {
    throw new Error("Code block is empty");
  }

  const codeStyle = context.theme.textStyles[tokens.textStyle];
  const html = await renderCodeToHtml(code, params.language, tokens, codeStyle);
  const pngPath = await context.canvas.renderHtml(html, true);

  const codeImage = image(pngPath, undefined, code);
  const backgroundRect = shape(tokens.background, { shape: SHAPE.RECTANGLE });
  const contentLayer = column(
    { spacing: 0, padding: tokens.padding, height: SIZE.FILL, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE },
    codeImage,
  );
  return stack({ height: SIZE.FILL }, backgroundRect, contentLayer);
}

// ============================================
// REGISTRATION + DSL FUNCTION
// ============================================

export const codeComponent = defineComponent({
  name: Component.Code,
  content: schema.string(),
  params: codeParamShape,
  tokens: codeTokens,
  mdast: {
    nodeTypes: [SYNTAX.CODE],
    compile: (node: RootContent, _source: string): ComponentNode | null => {
      const codeNode = node as unknown as MdastCode;
      if (!codeNode.lang) {
        throw new Error("Code block has no language specified. Add a language after the opening fences, e.g. ```sql");
      }
      if (!SUPPORTED_LANGUAGES.has(codeNode.lang)) {
        throw new Error(
          `Unsupported code language "${codeNode.lang}". Supported languages include: typescript, python, sql, rust, go, java. See LANGUAGE constant for full list.`,
        );
      }
      return component(Component.Code, { language: codeNode.lang }, codeNode.value);
    },
  },
  render: renderCode,
});

/**
 * Create a code block component.
 *
 * @example
 * ```typescript
 * const snippet = code(`SELECT * FROM orders WHERE status = 'active';`, 'sql', tokens.code);
 * pres.add(contentSlide('Query Example', snippet));
 * ```
 */
export function code(source: string, language: string, tokens: CodeTokens): ComponentNode {
  return component(Component.Code, { language }, source, tokens);
}
