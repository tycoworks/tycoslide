// Block Component
// Parses a markdown string into ComponentNode(s), wrapping multiple blocks in a column.
// Owns ALL bare MDAST dispatch: paragraphs, headings, lists, tables, thematic breaks.
// Also handles nested :::directives within block content.
// Registered as the default component for bare MDAST in slots (set by slotCompiler.ts).

import type { Root, RootContent, Heading } from 'mdast';
import type { Table as MdastTable } from 'mdast';
import { componentRegistry, component, type ComponentNode } from '../core/registry.js';
import { SYNTAX, extractSource, extractInlineText, type ContainerDirective } from '../core/mdast.js';
import { markdownProcessor, extractDirectiveBody } from '../utils/parser.js';
import { Component, TEXT_STYLE } from '../core/types.js';
import { markdown, HEADING_STYLE } from './text.js';
import { table } from './table.js';
import { column } from './containers.js';
import { schema } from '../schema.js';

// ============================================
// MDAST DISPATCH
// ============================================

function compileNode(node: RootContent, source: string): ComponentNode | null {
  // 1. Container directives → registry dispatch
  if (node.type === SYNTAX.CONTAINER_DIRECTIVE) {
    const directive = node as unknown as ContainerDirective;
    const handler = componentRegistry.getDirectiveHandler(directive.name);
    if (!handler) {
      const available = componentRegistry.getAll()
        .filter(d => d.deserialize)
        .map(d => d.name)
        .join(', ');
      throw new Error(
        `[tycoslide] block: unknown directive ":::${directive.name}". ` +
        `Available: ${available || 'none'}.`,
      );
    }
    const body = extractDirectiveBody(directive, source);
    return handler.deserialize(directive.attributes ?? {}, body);
  }

  // 2. Paragraphs (reject inline images)
  if (node.type === SYNTAX.PARAGRAPH) {
    const para = node as { children: { type: string }[] };
    if (para.children.length === 1 && para.children[0].type === SYNTAX.IMAGE) {
      throw new Error('Images cannot be embedded inline in text. Use :::image directive.');
    }
    return markdown(extractSource(node, source));
  }

  // 3. Lists
  if (node.type === SYNTAX.LIST) {
    return markdown(extractSource(node, source));
  }

  // 4. Headings — separate TextNode with heading style
  if (node.type === SYNTAX.HEADING) {
    const heading = node as Heading;
    const style = HEADING_STYLE[heading.depth] ?? TEXT_STYLE.H3;
    // Preserve inline markdown: strip leading #+ prefix from raw source
    const raw = extractSource(heading, source);
    const content = raw.replace(/^#{1,6}\s*/, '');
    return markdown(content, { style });
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
    `[tycoslide] block: unsupported markdown block type "${node.type}".`,
  );
}

/**
 * Parse markdown and dispatch each block-level node to the appropriate component.
 */
function expandBlock(content: string): ComponentNode {
  const tree = markdownProcessor.parse(content) as Root;
  const nodes: ComponentNode[] = [];

  for (const child of tree.children) {
    const compiled = compileNode(child, content);
    if (compiled) nodes.push(compiled);
  }

  if (nodes.length === 0) {
    throw new Error('[tycoslide] block: empty markdown content');
  }
  if (nodes.length === 1) return nodes[0];
  return column(...nodes);
}

// ============================================
// COMPONENT DEFINITION
// ============================================

export const blockComponent = componentRegistry.defineContent({
  name: Component.Block,
  body: schema.string(),
  expand: (props: { body: string }) => expandBlock(props.body),
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
 * const content = block(`
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
 * :::block
 * ## Architecture
 *
 * Key components:
 * - **Frontend**: React SPA
 * - **Backend**: Node.js API
 * :::
 * ```
 */
export function block(content: string): ComponentNode {
  return component(Component.Block, { body: content });
}
