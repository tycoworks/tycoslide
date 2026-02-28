// Code Component
// Renders syntax-highlighted code blocks using Shiki and the shared browser.
// Theme tokens control all styling — Shiki is an implementation detail.

import {
  NODE_TYPE, type ImageNode,
  componentRegistry, component, type ComponentNode, type ExpansionContext, type SchemaShape,
  schema,
  SYNTAX,
  inToPx,
} from 'tycoslide';
import type { RootContent } from 'mdast';
import type { Code as MdastCode } from 'mdast';
import { codeToHtml } from 'shiki';
import type { ThemeRegistration } from 'shiki';
import { Component } from './names.js';
import type { LanguageName } from './languages.js';
import { LANGUAGE_VALUES } from './languages.js';

const SUPPORTED_LANGUAGES = new Set<string>(LANGUAGE_VALUES);

// ============================================
// TOKENS
// ============================================

export const CODE_TOKEN = {
  // Syntax colors (map to Shiki TextMate scopes)
  BACKGROUND_COLOR: 'backgroundColor',
  TEXT_COLOR: 'textColor',
  KEYWORD_COLOR: 'keywordColor',
  STRING_COLOR: 'stringColor',
  COMMENT_COLOR: 'commentColor',
  FUNCTION_COLOR: 'functionColor',
  NUMBER_COLOR: 'numberColor',
  OPERATOR_COLOR: 'operatorColor',
  TYPE_COLOR: 'typeColor',
  VARIABLE_COLOR: 'variableColor',
  // Structural styling
  FONT_SIZE: 'fontSize',
  FONT_FAMILY: 'fontFamily',
  LINE_HEIGHT: 'lineHeight',
  PADDING: 'padding',
  BORDER_RADIUS: 'borderRadius',
} as const;

export interface CodeTokens {
  [CODE_TOKEN.BACKGROUND_COLOR]: string;
  [CODE_TOKEN.TEXT_COLOR]: string;
  [CODE_TOKEN.KEYWORD_COLOR]: string;
  [CODE_TOKEN.STRING_COLOR]: string;
  [CODE_TOKEN.COMMENT_COLOR]: string;
  [CODE_TOKEN.FUNCTION_COLOR]: string;
  [CODE_TOKEN.NUMBER_COLOR]: string;
  [CODE_TOKEN.OPERATOR_COLOR]: string;
  [CODE_TOKEN.TYPE_COLOR]: string;
  [CODE_TOKEN.VARIABLE_COLOR]: string;
  [CODE_TOKEN.FONT_SIZE]: number;
  [CODE_TOKEN.FONT_FAMILY]: string;
  [CODE_TOKEN.LINE_HEIGHT]: number;
  [CODE_TOKEN.PADDING]: number;
  [CODE_TOKEN.BORDER_RADIUS]: number;
}

// ============================================
// SCHEMAS & TYPES
// ============================================

const codeSchema = {
  language: schema.string(),
} satisfies SchemaShape;

export type CodeComponentProps = { body: string; language: string };

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
    name: 'tycoslide',  // Shiki internal identifier — does not affect rendering
    type: 'dark',       // Fallback for unscoped tokens. If a light-background code theme is needed, add a darkMode token.
    colors: {
      'editor.background': `#${tokens.backgroundColor}`,
      'editor.foreground': `#${tokens.textColor}`,
    },
    tokenColors: [
      {
        scope: ['keyword', 'storage', 'keyword.control', 'keyword.operator.expression', 'keyword.operator.new'],
        settings: { foreground: `#${tokens.keywordColor}` },
      },
      {
        scope: ['string', 'string.quoted'],
        settings: { foreground: `#${tokens.stringColor}` },
      },
      {
        scope: ['comment', 'comment.line', 'comment.block'],
        settings: { foreground: `#${tokens.commentColor}` },
      },
      {
        scope: ['entity.name.function', 'support.function', 'meta.function-call'],
        settings: { foreground: `#${tokens.functionColor}` },
      },
      {
        scope: ['constant.numeric', 'constant.language'],
        settings: { foreground: `#${tokens.numberColor}` },
      },
      {
        scope: ['keyword.operator', 'keyword.operator.assignment', 'keyword.operator.comparison',
                 'keyword.operator.arithmetic', 'keyword.operator.logical'],
        settings: { foreground: `#${tokens.operatorColor}` },
      },
      {
        scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class', 'storage.type'],
        settings: { foreground: `#${tokens.typeColor}` },
      },
      {
        scope: ['variable', 'variable.other', 'variable.parameter', 'variable.language'],
        settings: { foreground: `#${tokens.variableColor}` },
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
  background: #${tokens.backgroundColor};
  border-radius: ${borderRadiusPx}px;
  padding: ${paddingPx}px;
  display: inline-block;
}
.code-container pre {
  margin: 0;
  font-family: '${tokens.fontFamily}', monospace;
  font-size: ${tokens.fontSize}pt;
  line-height: ${tokens.lineHeight};
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
// COMPONENT EXPANSION
// ============================================

/**
 * Expand code component to ImageNode.
 * Renders syntax-highlighted code via Shiki + shared browser, returns image reference.
 */
async function expandCode(
  props: CodeComponentProps,
  context: ExpansionContext,
  tokens: CodeTokens,
): Promise<ImageNode> {
  const code = props.body.trim();
  if (!code) {
    throw new Error('[tycoslide] Code block is empty');
  }

  const html = await renderCodeToHtml(code, props.language, tokens);
  const pngPath = await context.render.renderHtmlToImage(html, false);

  return {
    type: NODE_TYPE.IMAGE,
    src: pngPath,
    maxScale: context.theme.spacing.maxScaleFactor,
  };
}

// ============================================
// REGISTRATION + DSL FUNCTION
// ============================================

export const codeComponent = componentRegistry.define({
  name: Component.Code,
  body: schema.string(),
  params: codeSchema,
  tokens: [
    CODE_TOKEN.BACKGROUND_COLOR,
    CODE_TOKEN.TEXT_COLOR,
    CODE_TOKEN.KEYWORD_COLOR,
    CODE_TOKEN.STRING_COLOR,
    CODE_TOKEN.COMMENT_COLOR,
    CODE_TOKEN.FUNCTION_COLOR,
    CODE_TOKEN.NUMBER_COLOR,
    CODE_TOKEN.OPERATOR_COLOR,
    CODE_TOKEN.TYPE_COLOR,
    CODE_TOKEN.VARIABLE_COLOR,
    CODE_TOKEN.FONT_SIZE,
    CODE_TOKEN.FONT_FAMILY,
    CODE_TOKEN.LINE_HEIGHT,
    CODE_TOKEN.PADDING,
    CODE_TOKEN.BORDER_RADIUS,
  ],
  mdast: {
    nodeTypes: [SYNTAX.CODE],
    compile: (node: RootContent, _source: string): ComponentNode | null => {
      const codeNode = node as unknown as MdastCode;
      if (!codeNode.lang) {
        throw new Error('[tycoslide] Code block has no language specified. Add a language after the opening fences, e.g. ```sql');
      }
      if (!SUPPORTED_LANGUAGES.has(codeNode.lang)) {
        throw new Error(`[tycoslide] Unsupported code language "${codeNode.lang}". Supported languages include: typescript, python, sql, rust, go, java. See LANGUAGE constant for full list.`);
      }
      return component(Component.Code, {
        body: codeNode.value,
        language: codeNode.lang,
      });
    },
  },
  expand: expandCode,
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
export function code(source: string, language: LanguageName): ComponentNode<CodeComponentProps> {
  return component(Component.Code, { body: source, language });
}
