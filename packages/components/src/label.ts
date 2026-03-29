// Label Component
// DSL-only component — not reachable via :::directives in markdown.
// Handles plain (non-markdown) text with token-controlled styling.
// Use for eyebrows, attributions, footers, headings, and other display text.
// Headings resolve their style from depth via resolveTokens hook (depth-keyed LabelSlotTokens).

import type { HorizontalAlignment, RenderContext, TextStyleName, VerticalAlignment } from "@tycoslide/core";
import {
  type ComponentNode,
  component,
  defineComponent,
  extractSource,
  type InferTokens,
  NODE_TYPE,
  type Shadow,
  SIZE,
  type Stroke,
  SYNTAX,
  schema,
  type TextNode,
  token,
} from "@tycoslide/core";
import type { Heading, RootContent } from "mdast";
import { Component } from "./names.js";

// ============================================
// HEADING TYPES
// ============================================

/** CommonMark heading depths. Matches MDAST Heading.depth. */
export type HeadingDepth = 1 | 2 | 3 | 4 | 5 | 6;

/** Slot token type for the label component. Maps each heading depth to a complete LabelTokens object. */
export type LabelSlotTokens = Record<HeadingDepth, LabelTokens>;

// ============================================
// TOKENS
// ============================================

const labelTokens = token.shape({
  color: token.required<string>(),
  style: token.required<TextStyleName>(),
  hAlign: token.required<HorizontalAlignment>(),
  vAlign: token.required<VerticalAlignment>(),
  border: token.optional<Stroke>(),
  shadow: token.optional<Shadow>(),
});

export type LabelTokens = InferTokens<typeof labelTokens>;

// ============================================
// RESOLVE TOKENS
// ============================================

/**
 * Token transform hook — runs during slot injection, after layout tokens merge.
 * If headingDepth is present (markdown heading), look up tokens[depth] to get the
 * full LabelTokens for that depth. Tokens must be a Record<HeadingDepth, LabelTokens>.
 * DSL label() calls have no headingDepth — tokens are already flat LabelTokens.
 */
function resolveLabelTokens(tokens: Record<string, unknown>, params: Record<string, unknown>): Record<string, unknown> {
  const depth = params.headingDepth as HeadingDepth | undefined;
  if (depth === undefined) return tokens; // DSL label — tokens are already flat LabelTokens

  const entry = tokens[depth] as Record<string, unknown> | undefined;
  if (!entry) {
    throw new Error(
      `Label with headingDepth=${depth} requires a token entry for depth ${depth}. ` +
        `Provide label slot tokens as Record<HeadingDepth, LabelTokens>.`,
    );
  }
  return entry;
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
    lineHeightMultiplier: textStyle.lineHeightMultiplier,
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
  tokens: labelTokens,
  resolveTokens: resolveLabelTokens,
  mdast: {
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
