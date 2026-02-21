// Document Component
// Parses a markdown string into ComponentNode(s), wrapping multiple blocks in a column.
// Owns ALL bare MDAST dispatch: paragraphs, headings, lists, tables, thematic breaks.
// Also handles nested :::directives within block content.
// Registered as the default component for bare MDAST in slots (set by slotCompiler.ts).

import type { Root, RootContent, Heading } from 'mdast';
import type { Table as MdastTable } from 'mdast';
import { componentRegistry, component, type ComponentNode } from '../core/registry.js';
import { SYNTAX, extractSource, extractInlineText, type ContainerDirective } from '../core/mdast.js';
import { markdownProcessor } from '../utils/parser.js';
import { dispatchDirective } from '../markdown/slotCompiler.js';
import { Component, TEXT_STYLE } from '../core/types.js';
import { prose, HEADING_STYLE } from './text.js';
import { table } from './table.js';
import { column } from './containers.js';
import { schema } from '../schema.js';

// ============================================
// MDAST DISPATCH
// ============================================

function compileNode(node: RootContent, source: string): ComponentNode | null {
  // 1. Container directives → shared dispatch (handles scalar + slotted components)
  if (node.type === SYNTAX.CONTAINER_DIRECTIVE) {
    return dispatchDirective(node as unknown as ContainerDirective, source, 'document');
  }

  // 2. Paragraphs (reject inline images)
  if (node.type === SYNTAX.PARAGRAPH) {
    const para = node as { children: { type: string }[] };
    if (para.children.length === 1 && para.children[0].type === SYNTAX.IMAGE) {
      throw new Error('Images cannot be embedded inline in text. Use :::image directive.');
    }
    return prose(extractSource(node, source));
  }

  // 3. Lists
  if (node.type === SYNTAX.LIST) {
    return prose(extractSource(node, source));
  }

  // 4. Headings — separate TextNode with heading style
  if (node.type === SYNTAX.HEADING) {
    const heading = node as Heading;
    const style = HEADING_STYLE[heading.depth] ?? TEXT_STYLE.H3;
    // Preserve inline markdown: strip leading #+ prefix from raw source
    const raw = extractSource(heading, source);
    const content = raw.replace(/^#{1,6}\s*/, '');
    return prose(content, { style });
  }

  // 5. Tables (GFM)
  if (node.type === SYNTAX.TABLE) {
    const tableNode = node as unknown as MdastTable;
    const rows = tableNode.children.map(row =>
      row.children.map(cell => extractInlineText(cell.children))
    );
    return table(rows, { headerRows: 1 });
  }

  // 6. Thematic breaks → skip
  if (node.type === SYNTAX.THEMATIC_BREAK) return null;

  // 7. Unknown → error
  throw new Error(
    `[tycoslide] document: unsupported markdown block type "${node.type}".`,
  );
}

/**
 * Parse markdown and dispatch each block-level node to the appropriate component.
 */
function expandDocument(content: string): ComponentNode {
  const tree = markdownProcessor.parse(content) as Root;
  const nodes: ComponentNode[] = [];

  for (const child of tree.children) {
    const compiled = compileNode(child, content);
    if (compiled) nodes.push(compiled);
  }

  if (nodes.length === 0) {
    throw new Error('[tycoslide] document: empty markdown content');
  }
  if (nodes.length === 1) return nodes[0];
  return column(...nodes);
}

// ============================================
// COMPONENT DEFINITION
// ============================================

export const documentComponent = componentRegistry.define({
  name: Component.Document,
  body: schema.string(),
  expand: (props: { body: string }) => expandDocument(props.body),
});

// ============================================
// DSL FUNCTION
// ============================================

/**
 * Parse a markdown string into ComponentNode(s).
 * Single blocks return directly; multiple blocks are wrapped in a column.
 *
 * Handles all block-level markdown: paragraphs, headings, lists, tables,
 * thematic breaks, and nested :::directives.
 *
 * @example
 * ```typescript
 * // Programmatic use — mix headings, lists, paragraphs
 * const content = document(`
 *   ## Architecture
 *
 *   Key components:
 *   - **Frontend**: React SPA
 *   - **Backend**: Node.js API
 *   - **Database**: PostgreSQL
 * `);
 * pres.add(contentSlide('Overview', content));
 * ```
 *
 * @example
 * ```markdown
 * <!-- In a markdown slide file -->
 * :::document
 * ## Architecture
 *
 * Key components:
 * - **Frontend**: React SPA
 * - **Backend**: Node.js API
 * :::
 * ```
 */
export function document(content: string): ComponentNode {
  return component(Component.Document, { body: content });
}
