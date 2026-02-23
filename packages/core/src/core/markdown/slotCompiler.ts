// Slot Compiler
// Compiles a slot's markdown content into ComponentNode[].
//
// A slot is a named content region in a layout (e.g. body, left, right).
// Slots primarily contain :::directives. Consecutive bare MDAST nodes
// are compiled inline via compileBareMarkdown() — paragraphs, headings,
// lists, and tables become direct component nodes (Text, Table, Column).

import type { Root, RootContent, Heading, Table as MdastTable } from 'mdast';
import { SYNTAX, extractSource, extractInlineText, type ContainerDirective } from '../model/syntax.js';
import { markdownProcessor, extractDirectiveBody } from '../../utils/parser.js';
import { componentRegistry, coerceAttributes, component, type ComponentNode } from '../rendering/registry.js';
import { Component, TEXT_STYLE, CONTENT } from '../model/types.js';

// ============================================
// HEADING STYLE MAP
// ============================================

const HEADING_STYLE: Record<number, string> = {
  1: TEXT_STYLE.H1,
  2: TEXT_STYLE.H2,
  3: TEXT_STYLE.H3,
  4: TEXT_STYLE.H4,
};

// ============================================
// PUBLIC API
// ============================================

/**
 * Compile a slot's markdown content into ComponentNode[].
 *
 * - :::directives → dispatched through the component registry
 * - Thematic breaks (---) → silently skipped
 * - Bare MDAST → compiled inline via compileBareMarkdown()
 */
export function compileSlot(markdownStr: string): ComponentNode[] {
  const tree = markdownProcessor.parse(markdownStr) as Root;
  return compileChildren(tree.children, markdownStr, 'slot');
}

// ============================================
// MDAST CHILDREN → ComponentNode[]
// ============================================

/**
 * Compile an array of already-parsed MDAST nodes into ComponentNode[].
 * Shared by compileSlot (top-level slot parsing) and dispatchDirective (nested container bodies).
 *
 * - Container directives → dispatched through dispatchDirective (recursive)
 * - Thematic breaks → silently skipped
 * - Consecutive bare MDAST → grouped and compiled inline via compileBareMarkdown()
 */
function compileChildren(
  children: RootContent[],
  source: string,
  errorPrefix: string,
): ComponentNode[] {
  const nodes: ComponentNode[] = [];
  let bareStart: RootContent | null = null;
  let bareEnd: RootContent | null = null;

  function flushBareGroup(): void {
    if (!bareStart || !bareEnd) return;
    const startOffset = bareStart.position?.start.offset;
    const endOffset = bareEnd.position?.end.offset;
    if (startOffset === undefined || endOffset === undefined) {
      throw new Error(`[tycoslide] ${errorPrefix}: bare MDAST node missing position data.`);
    }
    const rawSource = source.slice(startOffset, endOffset).trim();
    if (rawSource) {
      nodes.push(compileBareMarkdown(rawSource));
    }
    bareStart = null;
    bareEnd = null;
  }

  for (const child of children) {
    // Container directives → flush bare group, then dispatch
    if (child.type === SYNTAX.CONTAINER_DIRECTIVE) {
      flushBareGroup();
      nodes.push(dispatchDirective(child as unknown as ContainerDirective, source, errorPrefix));
      continue;
    }

    // Thematic breaks → skip (don't accumulate)
    if (child.type === SYNTAX.THEMATIC_BREAK) continue;

    // Bare MDAST → accumulate (flush will wrap)
    if (!bareStart) bareStart = child;
    bareEnd = child;
  }

  // Flush any trailing bare group
  flushBareGroup();

  return nodes;
}

// ============================================
// DIRECTIVE DISPATCH
// ============================================

/**
 * Dispatch a :::name container directive into a ComponentNode.
 *
 * Two paths based on component definition:
 * - Slotted components (row, column, stack, grid): walk directive.children directly.
 *   The MDAST tree already has the correctly nested structure from the parser.
 * - Scalar components (card, image, text, etc.): extract body as raw text string.
 *
 * Exported for reuse by compileBareNode which also dispatches nested directives.
 */
export function dispatchDirective(
  directive: ContainerDirective,
  source: string,
  errorPrefix: string,
): ComponentNode {
  const handler = componentRegistry.getDirectiveHandler(directive.name);
  if (!handler) {
    const available = componentRegistry.getAll()
      .filter(d => d.deserialize || d.slots?.length)
      .map(d => d.name)
      .join(', ');
    throw new Error(
      `[tycoslide] ${errorPrefix}: unknown directive ":::${directive.name}". ` +
      `Available directives: ${available || 'none'}.`,
    );
  }

  // Slotted component: walk the already-parsed MDAST children directly.
  // No re-parsing — the parser already built the correctly nested tree.
  if (handler.slots?.length) {
    if (handler.slots.length > 1) {
      throw new Error(
        `Component '${handler.name}' has ${handler.slots.length} slots but directive syntax only supports 1.`,
      );
    }
    const attrs = coerceAttributes(directive.attributes ?? {});
    const children = compileChildren(
      directive.children as RootContent[],
      source,
      errorPrefix,
    );
    return component(handler.name, { ...attrs, [handler.slots[0]]: children });
  }

  // Scalar component: extract body as raw text string for the deserializer.
  const body = extractDirectiveBody(directive, source);
  return handler.deserialize!(directive.attributes ?? {}, body);
}

// ============================================
// BARE MARKDOWN COMPILATION
// ============================================

/**
 * Compile a bare markdown string into ComponentNode(s).
 * Single blocks return directly; multiple blocks are wrapped in a Column.
 *
 * Handles all block-level markdown: paragraphs, headings, lists, tables,
 * thematic breaks, and nested :::directives.
 *
 * Used by flushBareGroup() for inline compilation of bare MDAST,
 * and exported for the document() DSL function.
 */
export function compileBareMarkdown(source: string): ComponentNode {
  const tree = markdownProcessor.parse(source) as Root;
  const nodes: ComponentNode[] = [];

  for (const child of tree.children) {
    const compiled = compileBareNode(child, source);
    if (compiled) nodes.push(compiled);
  }

  if (nodes.length === 0) {
    throw new Error('[tycoslide] document: empty markdown content');
  }
  if (nodes.length === 1) return nodes[0];
  return component(Component.Column, { children: nodes });
}

/**
 * Compile a single MDAST block node into a ComponentNode.
 * Uses component() factory calls only — no imports from component files.
 */
function compileBareNode(node: RootContent, source: string): ComponentNode | null {
  // Container directives → shared dispatch
  if (node.type === SYNTAX.CONTAINER_DIRECTIVE) {
    return dispatchDirective(node as unknown as ContainerDirective, source, 'document');
  }

  // Paragraphs (reject inline images)
  if (node.type === SYNTAX.PARAGRAPH) {
    const para = node as { children: { type: string }[] };
    if (para.children.length === 1 && para.children[0].type === SYNTAX.IMAGE) {
      throw new Error('Images cannot be embedded inline in text. Use :::image directive.');
    }
    return component(Component.Text, { body: extractSource(node, source), content: CONTENT.PROSE });
  }

  // Lists
  if (node.type === SYNTAX.LIST) {
    return component(Component.Text, { body: extractSource(node, source), content: CONTENT.PROSE });
  }

  // Headings
  if (node.type === SYNTAX.HEADING) {
    const heading = node as Heading;
    const style = HEADING_STYLE[heading.depth] ?? TEXT_STYLE.H3;
    const raw = extractSource(heading, source);
    const content = raw.replace(/^#{1,6}\s*/, '');
    return component(Component.Text, { body: content, content: CONTENT.PROSE, style });
  }

  // Tables (GFM)
  if (node.type === SYNTAX.TABLE) {
    const tableNode = node as unknown as MdastTable;
    const rows = tableNode.children.map(row =>
      row.children.map(cell => extractInlineText(cell.children))
    );
    return component(Component.Table, { data: rows, tableProps: { headerRows: 1 } });
  }

  // Thematic breaks → skip
  if (node.type === SYNTAX.THEMATIC_BREAK) return null;

  // Unknown → error
  throw new Error(
    `[tycoslide] document: unsupported markdown block type "${node.type}".`,
  );
}
