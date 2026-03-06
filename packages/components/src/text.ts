// Text Component
// Internal-only component — not reachable via :::text directive in markdown.
// Available to layout TypeScript authors via text() DSL function.
// Always uses rich text (inline formatting only): bold, italic, :color[highlights], no bullets/paragraphs.

import type { RootContent, Heading } from 'mdast';
import type { NormalizedRun, TextStyleName, HorizontalAlignment, VerticalAlignment, ExpansionContext } from 'tycoslide';
import { TEXT_STYLE, SYNTAX, extractSource } from 'tycoslide';
import { NODE_TYPE, type ElementNode } from 'tycoslide';
import { defineComponent, component, type ComponentNode, type SchemaShape } from 'tycoslide';
import { schema } from 'tycoslide';
import { Component } from './names.js';
import { transformInline, inlineParse } from './utils/inline.js';

export const TEXT_TOKEN = {
  COLOR: 'color',
  STYLE: 'style',
  LINE_HEIGHT_MULTIPLIER: 'lineHeightMultiplier',
  LINK_COLOR: 'linkColor',
  LINK_UNDERLINE: 'linkUnderline',
  HALIGN: 'hAlign',
  VALIGN: 'vAlign',
} as const;

export interface TextTokens {
  [TEXT_TOKEN.COLOR]: string;
  [TEXT_TOKEN.STYLE]: TextStyleName;
  [TEXT_TOKEN.LINE_HEIGHT_MULTIPLIER]: number;
  [TEXT_TOKEN.LINK_COLOR]: string;
  [TEXT_TOKEN.LINK_UNDERLINE]: boolean;
  [TEXT_TOKEN.HALIGN]: HorizontalAlignment;
  [TEXT_TOKEN.VALIGN]: VerticalAlignment;
}

// ============================================
// SCHEMAS & TYPES
// ============================================

const textSchema = {
  style: schema.textStyle().optional(),
  hAlign: schema.hAlign().optional(),
  vAlign: schema.vAlign().optional(),
  variant: schema.string().optional(),
} satisfies SchemaShape;

/** Props accepted by the text() DSL function.
 *  DSL callers can pass styling props (color, lineHeightMultiplier)
 *  that are NOT in the directive schema — only available to TypeScript developers. */
export interface TextProps {
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
  lineHeightMultiplier?: number;
  linkColor?: string;
  linkUnderline?: boolean;
  variant?: string;
}

/** Full props including body content (used internally by expansion) */
export type TextComponentProps = { body: string } & TextProps;

// ============================================
// HEADING STYLE MAP (exported for document component)
// ============================================

export const HEADING_STYLE: Record<number, TextProps['style']> = {
  1: TEXT_STYLE.H1,
  2: TEXT_STYLE.H2,
  3: TEXT_STYLE.H3,
  4: TEXT_STYLE.H4,
};

// ============================================
// EXPAND — always rich text (inline markdown)
// ============================================

function expandText(props: TextComponentProps, context: ExpansionContext, tokens: TextTokens): ElementNode {
  // Props override tokens: DSL/parent callers can pass explicit values
  const resolvedStyle = props.style ?? tokens.style;
  const resolvedColor = props.color ?? tokens.color;
  const resolvedLineHeight = props.lineHeightMultiplier ?? tokens.lineHeightMultiplier;
  const resolvedLinkColor = props.linkColor ?? tokens.linkColor;
  const resolvedLinkUnderline = props.linkUnderline ?? tokens.linkUnderline;
  const textStyle = context.theme.textStyles[resolvedStyle];
  const bulletIndentPt = textStyle.fontSize * context.theme.spacing.bulletIndentMultiplier;

  // Parse inline markdown only (bold, italic, :color[highlights])
  const tree = inlineParse(props.body);

  // Validate single paragraph (no multi-block)
  const blocks = tree.children.filter(c => c.type !== SYNTAX.THEMATIC_BREAK);
  if (blocks.length > 1 || (blocks.length === 1 && blocks[0].type !== SYNTAX.PARAGRAPH)) {
    throw new Error(
      `text() only supports inline formatting (bold, italic, colors). ` +
      `For bullets, use the list component.`
    );
  }

  const runs: NormalizedRun[] = [];
  for (const child of tree.children) {
    if (child.type === SYNTAX.PARAGRAPH) {
      transformInline(child.children, context.theme.colors, runs, {});
    }
  }

  return {
    type: NODE_TYPE.TEXT,
    content: runs,
    style: resolvedStyle,
    resolvedStyle: textStyle,
    color: resolvedColor,
    hAlign: props.hAlign ?? tokens.hAlign,
    vAlign: props.vAlign ?? tokens.vAlign,
    lineHeightMultiplier: resolvedLineHeight,
    bulletIndentPt,
    linkColor: resolvedLinkColor,
    linkUnderline: resolvedLinkUnderline,
  };
}

// ============================================
// COMPONENT REGISTRATION
// ============================================

export const textComponent = defineComponent({
  name: Component.Text,
  body: schema.string(),
  params: textSchema,
  directive: false,
  tokens: [TEXT_TOKEN.COLOR, TEXT_TOKEN.STYLE, TEXT_TOKEN.LINE_HEIGHT_MULTIPLIER, TEXT_TOKEN.LINK_COLOR, TEXT_TOKEN.LINK_UNDERLINE, TEXT_TOKEN.HALIGN, TEXT_TOKEN.VALIGN],
  mdast: {
    nodeTypes: [SYNTAX.PARAGRAPH, SYNTAX.HEADING],
    compile: (node: RootContent, source: string): ComponentNode | null => {
      if (node.type === SYNTAX.HEADING) {
        const heading = node as Heading;
        const style = HEADING_STYLE[heading.depth] ?? TEXT_STYLE.H3;
        const raw = extractSource(heading, source);
        const content = raw.replace(/^#{1,6}\s*/, '');
        return component(Component.Text, { body: content, style });
      }
      if (node.type === SYNTAX.PARAGRAPH) {
        const para = node as { children: { type: string }[] };
        if (para.children.length === 1 && para.children[0].type === SYNTAX.IMAGE) {
          throw new Error('Images cannot be embedded inline in text. Use :::image directive.');
        }
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
 * text("1. Problem statement", { style: TEXT_STYLE.H4 })
 * text("**Bold** and :teal[highlighted]")
 * ```
 */
export function text(body: string, props?: TextProps): ComponentNode<TextComponentProps> {
  return component(Component.Text, { body, ...props });
}
