// Text Component
// Internal-only component — not reachable via :::text directive in markdown.
// Available to layout TypeScript authors via text() DSL function.
// Always uses rich text (inline formatting only): bold, italic, :color[highlights], no bullets/paragraphs.

import type { Heading, RootContent } from "mdast";
import type { ExpansionContext, HorizontalAlignment, NormalizedRun, TextStyleName, TokenShape, VerticalAlignment } from "tycoslide";
import {
  type ComponentNode,
  component,
  defineComponent,
  type ElementNode,
  extractSource,
  NODE_TYPE,
  SYNTAX,
  schema,
  TEXT_STYLE,
  token,
} from "tycoslide";
import { Component } from "./names.js";
import { inlineParse, transformInline } from "./utils/inline.js";

export const TEXT_TOKEN = {
  COLOR: "color",
  STYLE: "style",
  LINK_COLOR: "linkColor",
  LINK_UNDERLINE: "linkUnderline",
  HALIGN: "hAlign",
  VALIGN: "vAlign",
  ACCENTS: "accents",
} as const;

export type TextTokens = {
  [TEXT_TOKEN.COLOR]: string;
  [TEXT_TOKEN.STYLE]: TextStyleName;
  [TEXT_TOKEN.LINK_COLOR]: string;
  [TEXT_TOKEN.LINK_UNDERLINE]: boolean;
  [TEXT_TOKEN.HALIGN]: HorizontalAlignment;
  [TEXT_TOKEN.VALIGN]: VerticalAlignment;
  [TEXT_TOKEN.ACCENTS]: Record<string, string>;
};

export const TEXT_TOKEN_SPEC: TokenShape = token.allRequired(TEXT_TOKEN)

// ============================================
// TYPES
// ============================================

/** Full props including body content (used internally by expansion) */
export type TextComponentProps = { body: string };

// ============================================
// HEADING STYLE MAP (exported for document component)
// ============================================

export const HEADING_STYLE: Record<number, TextStyleName> = {
  1: TEXT_STYLE.H1,
  2: TEXT_STYLE.H2,
  3: TEXT_STYLE.H3,
  4: TEXT_STYLE.H4,
};

// ============================================
// EXPAND — always rich text (inline markdown)
// ============================================

function expandText(props: TextComponentProps, context: ExpansionContext, tokens: TextTokens): ElementNode {
  const textStyle = context.theme.textStyles[tokens.style];

  // Parse inline markdown only (bold, italic, :color[highlights])
  const tree = inlineParse(props.body);

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
      transformInline(child.children, tokens.accents, runs, {});
    }
  }

  return {
    type: NODE_TYPE.TEXT,
    content: runs,
    style: tokens.style,
    resolvedStyle: textStyle,
    color: tokens.color,
    hAlign: tokens.hAlign,
    vAlign: tokens.vAlign,
    lineHeightMultiplier: textStyle.lineHeightMultiplier,
    bulletIndentPt: textStyle.bulletIndentPt,
    linkColor: tokens.linkColor,
    linkUnderline: tokens.linkUnderline,
  };
}

// ============================================
// COMPONENT REGISTRATION
// ============================================

export const textComponent = defineComponent({
  name: Component.Text,
  body: schema.string(),
  directive: false,
  tokens: TEXT_TOKEN_SPEC,
  mdast: {
    nodeTypes: [SYNTAX.PARAGRAPH, SYNTAX.HEADING],
    compile: (node: RootContent, source: string): ComponentNode | null => {
      if (node.type === SYNTAX.HEADING) {
        const heading = node as Heading;
        const style = HEADING_STYLE[heading.depth] ?? TEXT_STYLE.H3;
        const raw = extractSource(heading, source);
        const content = raw.replace(/^#{1,6}\s*/, "");
        return component(Component.Text, { body: content }, { style });
      }
      return component(Component.Text, { body: extractSource(node, source) });
    },
  },
  expand: expandText,
});

// ============================================
// DSL FUNCTION
// ============================================

/**
 * Create a text component node.
 *
 * @example
 * ```typescript
 * text("**Bold** and :teal[highlighted]", tokens.text)
 * ```
 */
export function text(body: string, tokens: TextTokens): ComponentNode<TextComponentProps> {
  return component(Component.Text, { body }, tokens);
}
