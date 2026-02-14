// Text Component
// Parses markdown string via unified/remark, transforms MDAST to NormalizedRun[],
// and expands to a TextNode.

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import type { Root, PhrasingContent, List, Paragraph, ListItem } from 'mdast';
import type { TextDirective } from 'mdast-util-directive';
import type { NormalizedRun, HighlightScheme, TextStyleName, HorizontalAlignment, VerticalAlignment } from '../core/types.js';
import { HALIGN, VALIGN } from '../core/types.js';
import { NODE_TYPE, type ElementNode } from '../core/nodes.js';
import { componentRegistry, component, type ComponentNode } from '../core/registry.js';
import { MDAST } from '../core/mdast.js';

// Re-export for backward compatibility (tests, dsl/index.ts consumers)
export { MDAST } from '../core/mdast.js';

// ============================================
// CONSTANTS
// ============================================

/** Component name for text */
export const TEXT_COMPONENT = 'text' as const;

// ============================================
// TYPES
// ============================================

/** Style options for text (everything except the content string) */
export interface TextProps {
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
  bulletColor?: string;
  lineHeightMultiplier?: number;
}

/** Full props including content (used internally by expansion) */
export interface TextComponentProps extends TextProps {
  content: string;
}

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

function expandText(props: TextComponentProps, context: { theme: any }): ElementNode {
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
// COMPONENT REGISTRATION
// ============================================

componentRegistry.register({ name: TEXT_COMPONENT, expand: expandText });

/**
 * Create a text component node.
 *
 * @example
 * ```typescript
 * text("**Bold** and :teal[highlighted] text.")
 * text("- First bullet\n- Second bullet", { style: TEXT_STYLE.BODY })
 * ```
 */
export function text(content: string, props?: TextProps): ComponentNode<TextComponentProps> {
  return component(TEXT_COMPONENT, { content, ...props });
}
