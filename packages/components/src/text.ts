// Text Component
// Internal-only component — not reachable via :::text directive in markdown.
// Available to layout TypeScript authors via text() DSL function.
// Two content modes (default: CONTENT.RICH):
//   CONTENT.PLAIN — no parsing, single run (eyebrows, attributions, copyright)
//   CONTENT.RICH  — inline-only rich text (bold, italic, :color[highlights], no bullets/paragraphs)

import type { RootContent, Heading } from 'mdast';
import type { NormalizedRun, ContentType, TextStyleName, HorizontalAlignment, VerticalAlignment, ExpansionContext } from 'tycoslide';
import { HALIGN, VALIGN, TEXT_STYLE, CONTENT, SYNTAX, extractSource } from 'tycoslide';
import { NODE_TYPE, type ElementNode } from 'tycoslide';
import { defineComponent, component, type ComponentNode, type SchemaShape } from 'tycoslide';
import { schema } from 'tycoslide';
import { Component } from './names.js';
import { transformInline, inlineParse } from './utils/inline.js';

export const TEXT_TOKEN = {
  COLOR: 'color',
  BULLET_COLOR: 'bulletColor',
  STYLE: 'style',
  LINE_HEIGHT_MULTIPLIER: 'lineHeightMultiplier',
  LINK_COLOR: 'linkColor',
  LINK_UNDERLINE: 'linkUnderline',
} as const;

export interface TextTokens {
  [TEXT_TOKEN.COLOR]: string;
  [TEXT_TOKEN.BULLET_COLOR]: string;
  [TEXT_TOKEN.STYLE]: TextStyleName;
  [TEXT_TOKEN.LINE_HEIGHT_MULTIPLIER]: number;
  [TEXT_TOKEN.LINK_COLOR]: string;
  [TEXT_TOKEN.LINK_UNDERLINE]: boolean;
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
 *  DSL callers can pass styling props (color, bulletColor, lineHeightMultiplier)
 *  that are NOT in the directive schema — only available to TypeScript developers. */
export interface TextProps {
  content?: ContentType;
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
  bulletColor?: string;
  lineHeightMultiplier?: number;
  linkColor?: string;
  linkUnderline?: boolean;
  variant?: string;
}

/** Full props including body content and content kind (used internally by expansion) */
export type TextComponentProps = { body: string; content?: ContentType } & TextProps;

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
// EXPAND — single function, switches on content kind
// ============================================

function expandText(props: TextComponentProps, context: ExpansionContext, tokens: TextTokens): ElementNode {
  const contentKind = props.content ?? CONTENT.RICH;

  // Props override tokens: DSL/parent callers can pass explicit values
  const resolvedStyle = props.style ?? tokens.style;
  const resolvedColor = props.color ?? tokens.color;
  const resolvedLineHeight = props.lineHeightMultiplier ?? tokens.lineHeightMultiplier;
  const resolvedLinkColor = props.linkColor ?? tokens.linkColor;
  const resolvedLinkUnderline = props.linkUnderline ?? tokens.linkUnderline;
  const textStyle = context.theme.textStyles[resolvedStyle];
  const bulletIndentPt = textStyle.fontSize * context.theme.spacing.bulletIndentMultiplier;

  // PLAIN — no parsing, single run
  if (contentKind === CONTENT.PLAIN) {
    return {
      type: NODE_TYPE.TEXT,
      content: [{ text: props.body }],
      style: resolvedStyle,
      resolvedStyle: textStyle,
      color: resolvedColor,
      hAlign: props.hAlign ?? HALIGN.LEFT,
      vAlign: props.vAlign ?? VALIGN.TOP,
      lineHeightMultiplier: resolvedLineHeight,
      bulletIndentPt,
      linkColor: resolvedLinkColor,
      linkUnderline: resolvedLinkUnderline,
    };
  }

  // RICH — parse inline markdown only
  const tree = inlineParse(props.body);

  // Validate single paragraph (no multi-block)
  const blocks = tree.children.filter(c => c.type !== SYNTAX.THEMATIC_BREAK);
  if (blocks.length > 1 || (blocks.length === 1 && blocks[0].type !== SYNTAX.PARAGRAPH)) {
    throw new Error(
      `text() with CONTENT.RICH only supports inline formatting (bold, italic, colors). ` +
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
    hAlign: props.hAlign ?? HALIGN.LEFT,
    vAlign: props.vAlign ?? VALIGN.TOP,
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
  tokens: [TEXT_TOKEN.COLOR, TEXT_TOKEN.BULLET_COLOR, TEXT_TOKEN.STYLE, TEXT_TOKEN.LINE_HEIGHT_MULTIPLIER, TEXT_TOKEN.LINK_COLOR, TEXT_TOKEN.LINK_UNDERLINE],
  mdast: {
    nodeTypes: [SYNTAX.PARAGRAPH, SYNTAX.HEADING],
    compile: (node: RootContent, source: string): ComponentNode | null => {
      if (node.type === SYNTAX.HEADING) {
        const heading = node as Heading;
        const style = HEADING_STYLE[heading.depth] ?? TEXT_STYLE.H3;
        const raw = extractSource(heading, source);
        const content = raw.replace(/^#{1,6}\s*/, '');
        return component(Component.Text, { body: content, content: CONTENT.RICH, style });
      }
      if (node.type === SYNTAX.PARAGRAPH) {
        const para = node as { children: { type: string }[] };
        if (para.children.length === 1 && para.children[0].type === SYNTAX.IMAGE) {
          throw new Error('Images cannot be embedded inline in text. Use :::image directive.');
        }
      }
      return component(Component.Text, { body: extractSource(node, source), content: CONTENT.RICH });
    },
  },
  expand: expandText,
});

// ============================================
// DSL FUNCTION
// ============================================

/**
 * Create a text component node.
 * Default content mode is CONTENT.RICH (inline formatting only).
 *
 * @example
 * ```typescript
 * text("1. Problem statement", { style: TEXT_STYLE.H4 })
 * text("**Bold** and :teal[highlighted]")
 * text("ARCHITECTURE", { content: CONTENT.PLAIN, style: TEXT_STYLE.EYEBROW })
 * ```
 */
export function text(body: string, props?: TextProps): ComponentNode<TextComponentProps> {
  return component(Component.Text, { body, content: CONTENT.RICH, ...props });
}
