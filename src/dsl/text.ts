// Text Components
// Parses markdown string via unified/remark, transforms MDAST to NormalizedRun[],
// and expands to a TextNode.

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import type { Root, PhrasingContent, List, Paragraph, ListItem, Heading } from 'mdast';
import type { TextDirective } from 'mdast-util-directive';
import type { NormalizedRun, HighlightScheme } from '../core/types.js';
import { HALIGN, VALIGN, MARKDOWN, TEXT_STYLE } from '../core/types.js';
import { NODE_TYPE, type ElementNode } from '../core/nodes.js';
import { componentRegistry, component, type ComponentNode, type InferProps, type SchemaShape } from '../core/registry.js';
import { MDAST, extractSource } from '../core/mdast.js';
import { image } from './primitives.js';
import { schema } from '../schema.js';

// ============================================
// CONSTANTS
// ============================================

/** Component name for markdown */
export const MARKDOWN_COMPONENT = 'markdown' as const;

/** Component name for text */
export const TEXT_COMPONENT = 'text' as const;

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

/** Full props including content (used internally by expansion) */
const textComponentSchema = {
  ...textSchema,
  content: schema.string(),
} satisfies SchemaShape;

export type TextComponentProps = InferProps<typeof textComponentSchema>;

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
export function parseMarkdown(input: string): Root {
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
export function mdastToRuns(
  tree: Root,
  highlights: HighlightScheme
): NormalizedRun[] {
  const runs: NormalizedRun[] = [];
  let isFirstBlock = true;

  for (const node of tree.children) {
    if (node.type === MDAST.PARAGRAPH) {
      if (!isFirstBlock && runs.length > 0) {
        // Add breakLine to the first run of non-first paragraphs
        // (means "start a new paragraph before this run")
        const paragraphRuns: NormalizedRun[] = [];
        transformInline(node.children, highlights, paragraphRuns, {});
        if (paragraphRuns.length > 0) {
          paragraphRuns[0] = { ...paragraphRuns[0], breakLine: true };
          runs.push(...paragraphRuns);
        }
      } else {
        transformInline(node.children, highlights, runs, {});
      }
      isFirstBlock = false;
    } else if (node.type === MDAST.LIST) {
      transformList(node as List, highlights, runs);
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
  highlights: HighlightScheme,
  runs: NormalizedRun[]
): void {
  const bulletType = list.ordered
    ? { type: 'number' as const }
    : true;

  for (const item of list.children as ListItem[]) {
    const firstChild = item.children[0];
    if (firstChild && firstChild.type === MDAST.PARAGRAPH) {
      // Collect item runs separately — only the first run gets bullet
      const itemRuns: NormalizedRun[] = [];
      transformInline(
        (firstChild as Paragraph).children,
        highlights,
        itemRuns,
        {}
      );
      if (itemRuns.length > 0) {
        itemRuns[0] = { ...itemRuns[0], bullet: bulletType };
        runs.push(...itemRuns);
      }
    } else if (firstChild && firstChild.type === MDAST.LIST) {
      // Nested list (e.g. `- 1. text`) — recurse, but use outer bullet type
      transformList(firstChild as List, highlights, runs);
    }
  }
}

/**
 * Transform inline/phrasing content into NormalizedRun[].
 * Recurses for strong, emphasis, and textDirective nodes.
 */
function transformInline(
  nodes: PhrasingContent[],
  highlights: HighlightScheme,
  runs: NormalizedRun[],
  defaults: Partial<NormalizedRun>
): void {
  for (const node of nodes) {
    switch (node.type) {
      case MDAST.TEXT:
        runs.push({ text: node.value, ...defaults });
        break;
      case MDAST.STRONG:
        transformInline(node.children, highlights, runs, { ...defaults, bold: true });
        break;
      case MDAST.EMPHASIS:
        transformInline(node.children, highlights, runs, { ...defaults, italic: true });
        break;
      case MDAST.TEXT_DIRECTIVE: {
        const directive = node as unknown as TextDirective;
        const pair = highlights[directive.name];
        if (!pair) {
          const available = Object.keys(highlights).join(', ');
          throw new Error(
            `Unknown highlight '${directive.name}'. Available: ${available}`
          );
        }
        transformInline(
          directive.children as PhrasingContent[],
          highlights,
          runs,
          { ...defaults, highlight: pair }
        );
        break;
      }
      // Silently skip unsupported inline types (html, code, break, etc.)
    }
  }
}

// ============================================
// EXPANSION FUNCTION
// ============================================

function expandMarkdown(props: TextComponentProps, context: { theme: any }): ElementNode {
  const tree = parseMarkdown(props.content);
  const runs = mdastToRuns(tree, context.theme.highlights);

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
// BLOCK-LEVEL MARKDOWN COMPILATION
// ============================================

const HEADING_STYLE: Record<number, TextProps['style']> = {
  1: TEXT_STYLE.H1,
  2: TEXT_STYLE.H2,
  3: TEXT_STYLE.H3,
  4: TEXT_STYLE.H4,
};

/**
 * Compile a paragraph. If the paragraph contains only an image,
 * produce an image() node instead of markdown().
 */
function compileParagraph(node: Paragraph, source: string): ComponentNode {
  if (node.children.length === 1 && node.children[0].type === MDAST.IMAGE) {
    const img = node.children[0];
    return image(img.url);
  }
  return compileTextBlock(node, source);
}

/** Compile any text-containing block by extracting raw source and passing to markdown(). */
function compileTextBlock(node: unknown, source: string): ComponentNode {
  const raw = extractSource(node as any, source);
  return markdown(raw);
}

/** Compile a heading by stripping # markers and applying TEXT_STYLE. */
function compileHeading(node: Heading, source: string): ComponentNode {
  const raw = extractSource(node, source);
  const content = raw.replace(/^#{1,6}\s+/, '');
  const style = HEADING_STYLE[node.depth] ?? TEXT_STYLE.H3;
  return markdown(content, { style });
}

/** Compile any block-level MDAST node handled by the markdown component. */
function compileMarkdownBlock(node: unknown, source: string): ComponentNode | null {
  const n = node as { type: string };
  switch (n.type) {
    case MDAST.PARAGRAPH:
      return compileParagraph(node as Paragraph, source);
    case MDAST.LIST:
      return compileTextBlock(node, source);
    case MDAST.HEADING:
      return compileHeading(node as Heading, source);
    default:
      return null;
  }
}

// ============================================
// COMPONENT DEFINITION & REGISTRATION
// ============================================

export const markdownComponent = componentRegistry.define({
  name: MARKDOWN_COMPONENT,
  input: schema.string(),
  expand: expandMarkdown,
  markdown: {
    type: MARKDOWN.SYNTAX,
    nodeType: [MDAST.PARAGRAPH, MDAST.LIST, MDAST.HEADING],
    compile: compileMarkdownBlock,
  },
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
  return component(MARKDOWN_COMPONENT, { content, ...props });
}

// ============================================
// PLAIN TEXT (no markdown parsing)
// ============================================

function expandText(props: TextComponentProps, _context: { theme: any }): ElementNode {
  const runs: NormalizedRun[] = [{ text: props.content }];

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

export const textComponent = componentRegistry.define({
  name: TEXT_COMPONENT,
  input: schema.string(),
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
  return component(TEXT_COMPONENT, { content, ...props });
}
