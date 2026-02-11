// Markdown Parser & MDAST-to-NormalizedRun[] Transformer
// Parses markdown via unified/remark, then converts the AST into NormalizedRun[]

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import type { Root, PhrasingContent, List, Paragraph, ListItem } from 'mdast';
import type { TextDirective } from 'mdast-util-directive';
import type { NormalizedRun, HighlightScheme } from '../../core/types.js';

// ============================================
// MDAST NODE TYPES
// ============================================

const MDAST = {
  // Block-level
  PARAGRAPH: 'paragraph',
  LIST: 'list',
  // Inline
  TEXT: 'text',
  STRONG: 'strong',
  EMPHASIS: 'emphasis',
  TEXT_DIRECTIVE: 'textDirective',
} as const;

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
    // List items contain paragraphs; we take the first paragraph's children
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
