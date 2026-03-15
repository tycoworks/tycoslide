// Code Component
// Renders syntax-highlighted code blocks using Shiki and the shared browser.
// Theme tokens control all styling — Shiki is an implementation detail.

import type { Code as MdastCode, RootContent } from "mdast";
import type { ThemeRegistration } from "shiki";
import { codeToHtml } from "shiki";
import {
  type ComponentNode,
  component,
  defineComponent,
  getFontForRun,
  type ImageNode,
  type InferTokens,
  inToPx,
  NODE_TYPE,
  type RenderContext,
  param,
  SYNTAX,
  schema,
  type TextStyle,
  type TextStyleName,
  token,
} from "tycoslide";
import type { LanguageName } from "./languages.js";
import { LANGUAGE_VALUES } from "./languages.js";
import { Component } from "./names.js";

const SUPPORTED_LANGUAGES = new Set<string>(LANGUAGE_VALUES);

// ============================================
// TOKENS
// ============================================

const codeTokens = token.shape({
  textStyle: token.required<TextStyleName>(),
  backgroundColor: token.required<string>(),
  textColor: token.required<string>(),
  keywordColor: token.required<string>(),
  stringColor: token.required<string>(),
  commentColor: token.required<string>(),
  functionColor: token.required<string>(),
  numberColor: token.required<string>(),
  operatorColor: token.required<string>(),
  typeColor: token.required<string>(),
  variableColor: token.required<string>(),
  padding: token.required<number>(),
  borderRadius: token.required<number>(),
});

export type CodeTokens = InferTokens<typeof codeTokens>;

export type CodeParams = { body: string; language: string };

const codeParamShape = param.shape({
  language: param.required(schema.string()),
});

// ============================================
// SHIKI THEME BUILDER
// ============================================

/**
 * Build a Shiki ThemeRegistration from code tokens.
 * Maps tycoslide token colors to TextMate scopes.
 * Pure function — no side effects.
 */
export function buildCodeTheme(tokens: CodeTokens): ThemeRegistration {
  return {
    name: "tycoslide", // Shiki internal identifier — does not affect rendering
    type: "dark", // Fallback for unscoped tokens. If a light-background code theme is needed, add a darkMode token.
    colors: {
      "editor.background": tokens.backgroundColor,
      "editor.foreground": tokens.textColor,
    },
    tokenColors: [
      {
        scope: ["keyword", "storage", "keyword.control", "keyword.operator.expression", "keyword.operator.new"],
        settings: { foreground: tokens.keywordColor },
      },
      {
        scope: ["string", "string.quoted"],
        settings: { foreground: tokens.stringColor },
      },
      {
        scope: ["comment", "comment.line", "comment.block"],
        settings: { foreground: tokens.commentColor },
      },
      {
        scope: ["entity.name.function", "support.function", "meta.function-call"],
        settings: { foreground: tokens.functionColor },
      },
      {
        scope: ["constant.numeric", "constant.language"],
        settings: { foreground: tokens.numberColor },
      },
      {
        scope: [
          "keyword.operator",
          "keyword.operator.assignment",
          "keyword.operator.comparison",
          "keyword.operator.arithmetic",
          "keyword.operator.logical",
        ],
        settings: { foreground: tokens.operatorColor },
      },
      {
        scope: ["entity.name.type", "entity.name.class", "support.type", "support.class", "storage.type"],
        settings: { foreground: tokens.typeColor },
      },
      {
        scope: ["variable", "variable.other", "variable.parameter", "variable.language"],
        settings: { foreground: tokens.variableColor },
      },
    ],
  };
}

// ============================================
// HTML RENDERING
// ============================================

/**
 * Render syntax-highlighted code to a complete HTML document for Playwright screenshot.
 * Calls Shiki's codeToHtml server-side, wraps in a themed container.
 */
export async function renderCodeToHtml(
  code: string,
  language: string,
  tokens: CodeTokens,
  style: TextStyle,
): Promise<string> {
  const theme = buildCodeTheme(tokens);

  const highlighted = await codeToHtml(code, { lang: language, theme });

  const paddingPx = inToPx(tokens.padding);
  const borderRadiusPx = inToPx(tokens.borderRadius);

  return `<!DOCTYPE html>
<html><head>
<style>
body {
  margin: 0;
  padding: 0;
  background: transparent;
}
.code-container {
  background: ${tokens.backgroundColor};
  border-radius: ${borderRadiusPx}px;
  padding: ${paddingPx}px;
  display: inline-block;
}
.code-container pre {
  margin: 0;
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
 * Render code component to ImageNode.
 * Renders syntax-highlighted code via Shiki + shared browser, returns image reference.
 */
async function renderCode(
  params: CodeParams,
  context: RenderContext,
  tokens: CodeTokens,
): Promise<ImageNode> {
  const code = params.body.trim();
  if (!code) {
    throw new Error("[tycoslide] Code block is empty");
  }

  const codeStyle = context.theme.textStyles[tokens.textStyle];
  const html = await renderCodeToHtml(code, params.language, tokens, codeStyle);
  const pngPath = await context.canvas.renderHtml(html, false);

  return {
    type: NODE_TYPE.IMAGE,
    src: pngPath,
  };
}

// ============================================
// REGISTRATION + DSL FUNCTION
// ============================================

export const codeComponent = defineComponent({
  name: Component.Code,
  body: schema.string(),
  params: codeParamShape,
  tokens: codeTokens,
  mdast: {
    nodeTypes: [SYNTAX.CODE],
    compile: (node: RootContent, _source: string): ComponentNode | null => {
      const codeNode = node as unknown as MdastCode;
      if (!codeNode.lang) {
        throw new Error(
          "[tycoslide] Code block has no language specified. Add a language after the opening fences, e.g. ```sql",
        );
      }
      if (!SUPPORTED_LANGUAGES.has(codeNode.lang)) {
        throw new Error(
          `[tycoslide] Unsupported code language "${codeNode.lang}". Supported languages include: typescript, python, sql, rust, go, java. See LANGUAGE constant for full list.`,
        );
      }
      return component(Component.Code, {
        body: codeNode.value,
        language: codeNode.lang,
      });
    },
  },
  render: renderCode,
});

/**
 * Create a code block component.
 *
 * @example
 * ```typescript
 * const snippet = code(`SELECT * FROM orders WHERE status = 'active';`, 'sql');
 * pres.add(contentSlide('Query Example', snippet));
 * ```
 */
export function code(source: string, language: LanguageName): ComponentNode<CodeParams> {
  return component(Component.Code, { body: source, language });
}
