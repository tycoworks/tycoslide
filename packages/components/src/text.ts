// Text Component
// Internal-only component — not reachable via :::text directive in markdown.
// Available to layout TypeScript authors via text() DSL function.
// Always uses rich text (inline formatting only): bold, italic, :color[highlights], no bullets/paragraphs.

import type { Heading, RootContent } from "mdast";
import type { HorizontalAlignment, NormalizedRun, RenderContext, TextStyleName, VerticalAlignment } from "tycoslide";
import {
  type ComponentNode,
  component,
  defineComponent,
  type ElementNode,
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
} from "tycoslide";

// ============================================
// HEADING TYPES
// ============================================

/** CommonMark heading depths. Matches MDAST Heading.depth. */
export type HeadingDepth = 1 | 2 | 3 | 4 | 5 | 6;

/** Theme-controlled mapping from heading depth to text style name. All 6 depths required. */
export type HeadingStyles = Record<HeadingDepth, TextStyleName>;

import { Component } from "./names.js";
import { inlineParse, transformInline } from "./utils/inline.js";

const textTokens = token.shape({
  color: token.required<string>(),
  style: token.required<TextStyleName>(),
  linkColor: token.required<string>(),
  linkUnderline: token.required<boolean>(),
  hAlign: token.required<HorizontalAlignment>(),
  vAlign: token.required<VerticalAlignment>(),
  accents: token.required<Record<string, string>>(),
  border: token.optional<Stroke>(),
  shadow: token.optional<Shadow>(),
  headingStyles: token.optional<HeadingStyles>(),
});

export type TextTokens = InferTokens<typeof textTokens>;

// ============================================
// RENDER — always rich text (inline markdown)
// ============================================

function renderText(
  params: { headingDepth?: number },
  content: string,
  context: RenderContext,
  tokens: TextTokens,
): ElementNode {
  // Resolve the effective style name: heading depth overrides base style
  let styleName: TextStyleName = tokens.style;

  if (params.headingDepth !== undefined) {
    if (!tokens.headingStyles) {
      throw new Error(
        `Heading (depth ${params.headingDepth}) appeared in a text slot without headingStyles. ` +
        `Add headingStyles to this slot's text token configuration.`,
      );
    }
    const mapped = tokens.headingStyles[params.headingDepth as HeadingDepth];
    if (mapped === undefined) {
      throw new Error(
        `Heading depth ${params.headingDepth} is not mapped in headingStyles. ` +
        `Provide a mapping for all depths 1-6.`,
      );
    }
    styleName = mapped;
  }

  const textStyle = context.theme.textStyles[styleName];
  if (!textStyle) {
    throw new Error(
      `Text style "${styleName}" not found in theme.textStyles. ` +
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
      transformInline(child.children, tokens.accents, runs, {});
    }
  }

  const node: TextNode = {
    type: NODE_TYPE.TEXT,
    width: SIZE.FILL,
    height: SIZE.HUG,
    content: runs,
    style: styleName,
    resolvedStyle: textStyle,
    color: tokens.color,
    hAlign: tokens.hAlign,
    vAlign: tokens.vAlign,
    lineHeightMultiplier: textStyle.lineHeightMultiplier,
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
  tokens: textTokens,
  mdast: {
    nodeTypes: [SYNTAX.PARAGRAPH, SYNTAX.HEADING],
    compile: (node: RootContent, source: string): ComponentNode | null => {
      if (node.type === SYNTAX.HEADING) {
        const heading = node as Heading;
        const raw = extractSource(heading, source);
        const headingContent = raw.replace(/^#{1,6}\s*/, "");
        return component(Component.Text, { headingDepth: heading.depth }, headingContent);
      }
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
 * text("**Bold** and :teal[highlighted]", tokens.text)
 * ```
 */
export function text(body: string, tokens: TextTokens): ComponentNode {
  return component(Component.Text, {}, body, tokens);
}
