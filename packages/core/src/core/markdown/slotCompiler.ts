// Slot Compiler
// Compiles a slot's markdown content into SlideNode[].
//
// A slot is a named content region in a layout (e.g. body, left, right).
// Slots primarily contain :::directives. Consecutive bare MDAST nodes
// are compiled via registered MDAST handlers on the component registry.

import type { Root, RootContent } from 'mdast';
import { SYNTAX, type ContainerDirective } from '../model/syntax.js';
import { markdownProcessor, extractDirectiveBody } from '../../utils/parser.js';
import { componentRegistry, coerceAttributes, component, type ComponentNode } from '../rendering/registry.js';
import { NODE_TYPE, type SlideNode, type ContainerNode, type ElementNode } from '../model/nodes.js';
import { DIRECTION, SIZE, HALIGN, VALIGN } from '../model/types.js';

// ============================================
// PUBLIC API
// ============================================

/**
 * Compile a slot's markdown content into SlideNode[].
 *
 * - :::directives → dispatched through the component registry
 * - Thematic breaks (---) → silently skipped
 * - Bare MDAST → compiled via registered MDAST handlers
 */
export function compileSlot(markdownStr: string): SlideNode[] {
  const tree = markdownProcessor.parse(markdownStr) as Root;
  return compileChildren(tree.children, markdownStr, 'slot');
}

// ============================================
// MDAST CHILDREN → SlideNode[]
// ============================================

/**
 * Compile an array of already-parsed MDAST nodes into SlideNode[].
 * Shared by compileSlot (top-level slot parsing) and dispatchDirective (nested container bodies).
 *
 * - Container directives → dispatched through dispatchDirective (recursive)
 * - Thematic breaks → silently skipped
 * - Consecutive bare MDAST → grouped and compiled via registered MDAST handlers
 */
function compileChildren(
  children: RootContent[],
  source: string,
  errorPrefix: string,
): SlideNode[] {
  const nodes: SlideNode[] = [];
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
 * Compile a bare markdown string into a SlideNode.
 * Single blocks return directly; multiple blocks are wrapped in a
 * ContainerNode with column direction (structural primitive, no component reference).
 *
 * Block compilation is driven by registered MDAST handlers on the component registry.
 *
 * Used by flushBareGroup() for inline compilation of bare MDAST,
 * and exported for the document() DSL function.
 */
export function compileBareMarkdown(source: string): SlideNode {
  const tree = markdownProcessor.parse(source) as Root;
  const nodes: SlideNode[] = [];

  for (const child of tree.children) {
    const compiled = compileBareNode(child, source);
    if (compiled) nodes.push(compiled);
  }

  if (nodes.length === 0) {
    throw new Error('[tycoslide] document: empty markdown content');
  }
  if (nodes.length === 1) return nodes[0];
  return {
    type: NODE_TYPE.CONTAINER,
    direction: DIRECTION.COLUMN,
    // Pre-expansion: children are ComponentNodes; expandTree() resolves them to ElementNodes
    children: nodes as unknown as ElementNode[],
    width: SIZE.FILL,
    height: SIZE.HUG,
    vAlign: VALIGN.TOP,
    hAlign: HALIGN.LEFT,
  } as ContainerNode;
}

/**
 * Compile a single MDAST block node into a SlideNode.
 * Dispatches to registered MDAST handlers on the component registry.
 */
function compileBareNode(node: RootContent, source: string): SlideNode | null {
  // Container directives → shared dispatch
  if (node.type === SYNTAX.CONTAINER_DIRECTIVE) {
    return dispatchDirective(node as unknown as ContainerDirective, source, 'document');
  }

  // Thematic breaks → skip
  if (node.type === SYNTAX.THEMATIC_BREAK) return null;

  // Dispatch to registered MDAST handler
  const handler = componentRegistry.getMdastHandler(node.type);
  if (handler?.mdast) {
    return handler.mdast.compile(node, source);
  }

  // Unknown → error
  throw new Error(
    `[tycoslide] document: unsupported markdown block type "${node.type}". ` +
    `No component has registered an MDAST handler for this type.`,
  );
}
