// Text Components
// Parses markdown string via unified/remark, transforms MDAST to NormalizedRun[],
// and expands to a TextNode.

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import type { Root, PhrasingContent, List, Paragraph, ListItem } from 'mdast';
import type { TextDirective } from 'mdast-util-directive';
import type { NormalizedRun, HighlightPair, ColorScheme } from '../core/types.js';
import { HALIGN, VALIGN, TEXT_STYLE } from '../core/types.js';
import { NODE_TYPE, type ElementNode } from '../core/nodes.js';
import { componentRegistry, component, type ComponentNode, type InferProps, type SchemaShape } from '../core/registry.js';
import { SYNTAX } from '../core/mdast.js';
import { schema } from '../schema.js';

// ============================================
// CONSTANTS
// ============================================

import { Component } from '../core/types.js';

// ============================================
// SCHEMAS & TYPES
// ============================================

/** Style options for text (everything except the content string) */
const textSchema = {
  style: schema.textStyle().optional(),
  color: schema.string().optional(),
  hAlign: schema.hAlign().optional(),
  vAlign: schema.vAlign().optional(),
  bulletColor: schema.string().optional(),
  lineHeightMultiplier: schema.number().optional(),
} satisfies SchemaShape;

export type TextProps = InferProps<typeof textSchema>;

/** Full props including body content (used internally by expansion) */
export type TextComponentProps = { body: string } & TextProps;

// ============================================
// PARSER
// ============================================

const processor = unified()
  .use(remarkParse)
  .use(remarkDirective);

/**
 * Parse markdown string into MDAST (Markdown Abstract Syntax Tree).
 * Supports CommonMark + remark-directive text directives (:name[text]).
 */
function parseMarkdown(input: string): Root {
  return processor.parse(input) as Root;
}

// ============================================
// TRANSFORMER
// ============================================

/**
 * Transform a parsed MDAST tree into NormalizedRun[].
 *
 * Supported node types:
 * - paragraph: text runs, with breakLine between paragraphs
 * - list (ordered/unordered): bullet runs
 * - strong: bold: true
 * - emphasis: italic: true
 * - textDirective: :name[text] -> highlight from theme
 */
function mdastToRuns(
  tree: Root,
  colors: ColorScheme
): NormalizedRun[] {
  const runs: NormalizedRun[] = [];
  let isFirstBlock = true;

  for (const node of tree.children) {
    if (node.type === SYNTAX.PARAGRAPH) {
      if (!isFirstBlock && runs.length > 0) {
        // Add breakLine to the first run of non-first paragraphs
        // (means "start a new paragraph before this run")
        const paragraphRuns: NormalizedRun[] = [];
        transformInline(node.children, colors, paragraphRuns, {});
        if (paragraphRuns.length > 0) {
          paragraphRuns[0] = { ...paragraphRuns[0], breakLine: true };
          runs.push(...paragraphRuns);
        }
      } else {
        transformInline(node.children, colors, runs, {});
      }
      isFirstBlock = false;
    } else if (node.type === SYNTAX.LIST) {
      transformList(node as List, colors, runs);
      isFirstBlock = false;
    }
  }

  return runs;
}

/**
 * Transform a list node into bullet/numbered runs.
 */
function transformList(
  list: List,
  colors: ColorScheme,
  runs: NormalizedRun[]
): void {
  const bulletType = list.ordered
    ? { type: 'number' as const }
    : true;

  for (const item of list.children as ListItem[]) {
    const firstChild = item.children[0];
    if (firstChild && firstChild.type === SYNTAX.PARAGRAPH) {
      // Collect item runs separately — only the first run gets bullet
      const itemRuns: NormalizedRun[] = [];
      transformInline(
        (firstChild as Paragraph).children,
        colors,
        itemRuns,
        {}
      );
      if (itemRuns.length > 0) {
        itemRuns[0] = { ...itemRuns[0], bullet: bulletType };
        runs.push(...itemRuns);
      }
    } else if (firstChild && firstChild.type === SYNTAX.LIST) {
      // Nested list (e.g. `- 1. text`) — recurse, but use outer bullet type
      transformList(firstChild as List, colors, runs);
    }
  }
}

/**
 * Transform inline/phrasing content into NormalizedRun[].
 * Recurses for strong, emphasis, and textDirective nodes.
 */
function transformInline(
  nodes: PhrasingContent[],
  colors: ColorScheme,
  runs: NormalizedRun[],
  defaults: Partial<NormalizedRun>
): void {
  for (const node of nodes) {
    switch (node.type) {
      case SYNTAX.TEXT:
        runs.push({ text: node.value, ...defaults });
        break;
      case SYNTAX.STRONG:
        transformInline(node.children, colors, runs, { ...defaults, bold: true });
        break;
      case SYNTAX.EMPHASIS:
        transformInline(node.children, colors, runs, { ...defaults, italic: true });
        break;
      case SYNTAX.TEXT_DIRECTIVE: {
        const directive = node as unknown as TextDirective;
        const accentColor = colors.accents[directive.name];
        if (!accentColor) {
          const available = Object.keys(colors.accents).join(', ');
          throw new Error(
            `Unknown accent '${directive.name}'. Available: ${available}`
          );
        }
        const highlight: HighlightPair = { bg: colors.background, text: accentColor };
        transformInline(
          directive.children as PhrasingContent[],
          colors,
          runs,
          { ...defaults, highlight }
        );
        break;
      }
      case SYNTAX.IMAGE:
        throw new Error('Images cannot be embedded inline in text.');
      default:
        throw new Error(`Unsupported inline markdown type "${node.type}".`);
    }
  }
}

// ============================================
// EXPANSION FUNCTION
// ============================================

function expandMarkdown(props: TextComponentProps, context: { theme: any }): ElementNode {
  const tree = parseMarkdown(props.body);
  const runs = mdastToRuns(tree, context.theme.colors);

  // Apply bulletColor to all bullet runs if specified
  if (props.bulletColor) {
    for (const run of runs) {
      if (run.bullet && typeof run.bullet === 'object') {
        run.bullet = { ...run.bullet, color: props.bulletColor };
      } else if (run.bullet === true) {
        run.bullet = { color: props.bulletColor };
      }
    }
  }

  return {
    type: NODE_TYPE.TEXT,
    content: runs,
    style: props.style,
    color: props.color,
    hAlign: props.hAlign ?? HALIGN.LEFT,
    vAlign: props.vAlign ?? VALIGN.TOP,
    lineHeightMultiplier: props.lineHeightMultiplier,
  };
}

// ============================================
// HEADING STYLE MAP (exported for block component)
// ============================================

export const HEADING_STYLE: Record<number, TextProps['style']> = {
  1: TEXT_STYLE.H1,
  2: TEXT_STYLE.H2,
  3: TEXT_STYLE.H3,
  4: TEXT_STYLE.H4,
};

// ============================================
// COMPONENT DEFINITION & REGISTRATION
// ============================================

export const markdownComponent = componentRegistry.defineContent({
  name: Component.Markdown,
  body: schema.string(),
  params: textSchema,
  expand: expandMarkdown,
});

/**
 * Create a markdown text component node.
 *
 * @example
 * ```typescript
 * markdown("**Bold** and :teal[highlighted] text.")
 * markdown("- First bullet\n- Second bullet", { style: TEXT_STYLE.BODY })
 * ```
 */
export function markdown(content: string, props?: TextProps): ComponentNode<TextComponentProps> {
  return component(Component.Markdown, { body: content, ...props });
}

// ============================================
// PLAIN TEXT (no markdown parsing)
// ============================================

function expandText(props: TextComponentProps, _context: { theme: any }): ElementNode {
  const runs: NormalizedRun[] = [{ text: props.body }];

  return {
    type: NODE_TYPE.TEXT,
    content: runs,
    style: props.style,
    color: props.color,
    hAlign: props.hAlign ?? HALIGN.LEFT,
    vAlign: props.vAlign ?? VALIGN.TOP,
    lineHeightMultiplier: props.lineHeightMultiplier,
  };
}

export const textComponent = componentRegistry.defineContent({
  name: Component.Text,
  body: schema.string(),
  params: textSchema,
  expand: expandText,
});

/**
 * Create a plain text component node (no markdown parsing).
 *
 * Use for labels and structural text that should never be interpreted
 * as markdown: eyebrows, attributions, captions, slide numbers.
 *
 * @example
 * ```typescript
 * text("ARCHITECTURE", { style: TEXT_STYLE.EYEBROW })
 * text("— Sam Spelsberg, CTO", { style: TEXT_STYLE.SMALL })
 * ```
 */
export function text(content: string, props?: TextProps): ComponentNode<TextComponentProps> {
  return component(Component.Text, { body: content, ...props });
}
