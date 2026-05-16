// Label Component
// DSL-only component — not reachable via :::directives in markdown.
// Handles plain (non-markdown) text with token-controlled styling.
// Use for eyebrows, attributions, footers, headings, and other display text.
// Headings get depth-keyed tokens resolved at compile time in documentCompiler.

import type { HorizontalAlignment, RenderContext, TextStyleName, VerticalAlignment } from "@tycoslide/core";
import {
  type ComponentNode,
  component,
  extractSource,
  NODE_TYPE,
  type Shadow,
  SIZE,
  type Stroke,
  SYNTAX,
  type TextNode,
} from "@tycoslide/core";
import type { Heading, RootContent } from "mdast";
import { defineComponent, schema } from "../authoring/index.js";
import { Component } from "../presets/names.js";

// ============================================
// HEADING TYPES
// ============================================

/** All CommonMark heading depths (1–6). */
export type HeadingDepth = 1 | 2 | 3 | 4 | 5 | 6;

// ============================================
// TOKENS
// ============================================

export interface LabelTokens {
  color: string;
  style: TextStyleName;
  hAlign: HorizontalAlignment;
  vAlign: VerticalAlignment;
  border?: Stroke;
  shadow?: Shadow;
}

// ============================================
// RENDER
// ============================================

function renderLabel(_params: {}, content: string, context: RenderContext, tokens: LabelTokens): TextNode {
  const textStyle = context.theme.textStyles[tokens.style];
  if (!textStyle) {
    throw new Error(
      `Text style "${tokens.style}" not found in theme.textStyles. ` +
        `Available: [${Object.keys(context.theme.textStyles).join(", ")}].`,
    );
  }

  const node: TextNode = {
    type: NODE_TYPE.TEXT,
    width: SIZE.FILL,
    height: SIZE.HUG,
    content: [{ text: content }],
    style: tokens.style,
    resolvedStyle: textStyle,
    color: tokens.color,
    hAlign: tokens.hAlign,
    vAlign: tokens.vAlign,
    lineHeight: textStyle.lineHeight,
    bulletIndentPt: textStyle.bulletIndentPt,
    linkColor: tokens.color,
    linkUnderline: false,
  };
  if (tokens.border) {
    node.border = tokens.border;
  }
  if (tokens.shadow) {
    node.shadow = tokens.shadow;
  }
  return node;
}

// ============================================
// COMPONENT REGISTRATION
// ============================================

export const labelComponent = defineComponent({
  name: Component.Label,
  content: schema.string(),
  directive: false,
  syntax: {
    nodeTypes: [SYNTAX.HEADING],
    compile: (node: RootContent, source: string): ComponentNode => {
      const heading = node as Heading;
      const raw = extractSource(heading, source);
      const headingContent = raw.replace(/^#{1,6}\s*/, "");
      return component(Component.Label, { headingDepth: heading.depth }, headingContent);
    },
  },
  render: renderLabel,
});

// ============================================
// DSL FUNCTION
// ============================================

/**
 * Create a label component node.
 * No markdown parsing — the body string is used as-is, single run.
 * Use for eyebrows, attributions, footers, headings, and other display text.
 *
 * @example
 * ```typescript
 * label("ARCHITECTURE", tokens.eyebrow)
 * ```
 */
export function label(body: string, tokens: LabelTokens): ComponentNode {
  return component(Component.Label, {}, body, tokens);
}
