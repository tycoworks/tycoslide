// Text Component
// Internal-only component — not reachable via :::text directive in markdown.
// Available to layout TypeScript authors via text() DSL function.
// Always uses rich text (inline formatting only): bold, italic, :color[highlights], no bullets/paragraphs.

import type {
  HorizontalAlignment,
  NormalizedRun,
  RenderContext,
  TextStyleName,
  VerticalAlignment,
} from "@tycoslide/core";
import {
  type ComponentNode,
  component,
  type ElementNode,
  extractSource,
  NODE_TYPE,
  type ShadowEffect,
  SIZE,
  type Stroke,
  SYNTAX,
  type TextNode,
} from "@tycoslide/core";
import type { RootContent } from "mdast";
import { defineComponent, schema } from "../authoring/index.js";

import { Component } from "../presets/names.js";
import { inlineParse, transformInline } from "./utils/inline.js";

export interface TextTokens {
  color: string;
  style: TextStyleName;
  linkColor: string;
  linkUnderline: boolean;
  hAlign: HorizontalAlignment;
  vAlign: VerticalAlignment;
  highlightColor: string;
  border?: Stroke;
  shadow?: ShadowEffect;
}

// ============================================
// RENDER — always rich text (inline markdown)
// ============================================

function renderText(_params: {}, content: string, context: RenderContext, tokens: TextTokens): ElementNode {
  const textStyle = context.theme.textStyles[tokens.style];
  if (!textStyle) {
    throw new Error(
      `Text style "${tokens.style}" not found in theme.textStyles. ` +
        `Available: [${Object.keys(context.theme.textStyles).join(", ")}].`,
    );
  }

  // Parse inline markdown only (bold, italic, :color[highlights])
  const tree = inlineParse(content);

  // Validate single paragraph (no multi-block)
  const blocks = tree.children.filter((c) => c.type !== SYNTAX.THEMATIC_BREAK);
  if (blocks.length > 1 || (blocks.length === 1 && blocks[0].type !== SYNTAX.PARAGRAPH)) {
    throw new Error(
      `text() only supports inline formatting (bold, italic, colors). ` + `For bullets, use the list component.`,
    );
  }

  const runs: NormalizedRun[] = [];
  for (const child of tree.children) {
    if (child.type === SYNTAX.PARAGRAPH) {
      transformInline(child.children, tokens.highlightColor, runs, {});
    }
  }

  const node: TextNode = {
    type: NODE_TYPE.TEXT,
    width: SIZE.FILL,
    height: SIZE.HUG,
    content: runs,
    style: tokens.style,
    resolvedStyle: textStyle,
    color: tokens.color,
    hAlign: tokens.hAlign,
    vAlign: tokens.vAlign,
    lineHeight: textStyle.lineHeight,
    bulletIndentPt: textStyle.bulletIndentPt,
    linkColor: tokens.linkColor,
    linkUnderline: tokens.linkUnderline,
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

export const textComponent = defineComponent({
  name: Component.Text,
  content: schema.string(),
  directive: false,
  syntax: {
    nodeTypes: [SYNTAX.PARAGRAPH],
    compile: (node: RootContent, source: string): ComponentNode | null => {
      return component(Component.Text, {}, extractSource(node, source));
    },
  },
  render: renderText,
});

// ============================================
// DSL FUNCTION
// ============================================

/**
 * Create a text component node.
 *
 * @example
 * ```typescript
 * text("**Bold** and ==highlighted==", tokens.text)
 * ```
 */
export function text(body: string, tokens: TextTokens): ComponentNode {
  return component(Component.Text, {}, body, tokens);
}
