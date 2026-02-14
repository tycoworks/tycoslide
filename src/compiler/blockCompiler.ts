// Block Compiler
// Converts a markdown string into an array of ComponentNode[].
// Each block-level element (paragraph, list, heading, table, image) becomes
// an independent ComponentNode by calling the appropriate DSL function.
//
// This does NOT share internal parsing logic with text.ts — it reuses
// the text(), table(), and image() DSL components directly.

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import type { Root, RootContent, Heading, Paragraph, Table as MdastTable, PhrasingContent } from 'mdast';
import { text } from '../dsl/text.js';
import { MDAST } from '../core/mdast.js';
import { table } from '../dsl/table.js';
import { image } from '../dsl/primitives.js';
import { TEXT_STYLE } from '../core/types.js';
import type { TextStyleName } from '../core/types.js';
import type { ComponentNode } from '../core/registry.js';

// ============================================
// PARSER
// ============================================

const processor = unified()
  .use(remarkParse)
  .use(remarkDirective)
  .use(remarkGfm);

// ============================================
// HEADING DEPTH → TEXT_STYLE
// ============================================

const HEADING_STYLE: Record<number, TextStyleName> = {
  1: TEXT_STYLE.H1,
  2: TEXT_STYLE.H2,
  3: TEXT_STYLE.H3,
  4: TEXT_STYLE.H4,
};

// ============================================
// PUBLIC API
// ============================================

/**
 * Compile a markdown string into an array of ComponentNodes.
 *
 * Each block-level element becomes an independent node:
 * - Paragraphs → text()
 * - Lists → text()
 * - Headings → text() with appropriate TEXT_STYLE
 * - Tables → table() with headerRows: 1
 * - Images (standalone) → image()
 *
 * Callers decide how to arrange the returned nodes (e.g. wrap in column()).
 */
export function compileBlocks(markdown: string): ComponentNode[] {
  const tree = processor.parse(markdown) as Root;
  const nodes: ComponentNode[] = [];

  for (const child of tree.children) {
    const compiled = compileBlock(child, markdown);
    if (compiled) nodes.push(compiled);
  }

  return nodes;
}

// ============================================
// BLOCK DISPATCHING
// ============================================

function compileBlock(node: RootContent, source: string): ComponentNode | null {
  switch (node.type) {
    case MDAST.PARAGRAPH:
      return compileParagraph(node as Paragraph, source);
    case MDAST.LIST:
      return compileTextBlock(node, source);
    case MDAST.HEADING:
      return compileHeading(node as Heading, source);
    case MDAST.TABLE:
      return compileTable(node as MdastTable);
    default:
      // Skip unsupported block types (thematicBreak, html, code, blockquote, etc.)
      return null;
  }
}

// ============================================
// BLOCK COMPILERS
// ============================================

/**
 * Compile a paragraph. If the paragraph contains only an image,
 * produce an image() node instead of text().
 */
function compileParagraph(node: Paragraph, source: string): ComponentNode {
  // Standalone image: paragraph with a single image child
  if (node.children.length === 1 && node.children[0].type === MDAST.IMAGE) {
    const img = node.children[0];
    return image(img.url);
  }
  return compileTextBlock(node, source);
}

/**
 * Compile any text-containing block (paragraph, list) by extracting
 * its raw markdown source and passing it to text().
 */
function compileTextBlock(node: RootContent, source: string): ComponentNode {
  const raw = extractSource(node, source);
  return text(raw);
}

/**
 * Compile a heading by stripping the # markers and applying the
 * appropriate TEXT_STYLE based on depth.
 */
function compileHeading(node: Heading, source: string): ComponentNode {
  const raw = extractSource(node, source);
  const content = raw.replace(/^#{1,6}\s+/, '');
  const style = HEADING_STYLE[node.depth] ?? TEXT_STYLE.H3;
  return text(content, { style });
}

/**
 * Compile a GFM table into a table() component.
 * First row becomes the header row.
 */
function compileTable(node: MdastTable): ComponentNode {
  const rows = node.children.map(row =>
    row.children.map(cell => extractInlineText(cell.children))
  );
  return table(rows, { headerRows: 1 });
}

// ============================================
// HELPERS
// ============================================

/** Extract the raw markdown source for a node using position offsets. */
function extractSource(
  node: { position?: { start: { offset?: number }; end: { offset?: number } } },
  source: string
): string {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (start == null || end == null) return '';
  return source.slice(start, end);
}

/** Recursively extract plain text from inline mdast nodes. */
function extractInlineText(nodes: PhrasingContent[]): string {
  return nodes.map(node => {
    if (node.type === MDAST.TEXT) return node.value;
    if (node.type === MDAST.INLINE_CODE) return node.value;
    if ('children' in node) return extractInlineText((node as any).children);
    return '';
  }).join('');
}
