// Slot Compiler
// Compiles a slot's markdown content into ComponentNode[].
//
// A slot is a named content region in a layout (e.g. body, left, right).
// Slots primarily contain :::directives. Consecutive bare MDAST nodes
// are auto-wrapped in the default component (Component.Document).
//
// The default is set here (not in document.ts) because it is a markdown pipeline
// policy, not a component concern.

import type { Root, RootContent } from 'mdast';
import { SYNTAX, type ContainerDirective } from '../model/syntax.js';
import { markdownProcessor, extractDirectiveBody } from '../../utils/parser.js';
import { componentRegistry, coerceAttributes, component, type ComponentNode } from '../rendering/registry.js';
import { Component } from '../model/types.js';

// ============================================
// DEFAULT COMPONENT
// ============================================

/** Default component for bare MDAST in slots. Set here as markdown pipeline policy. */
componentRegistry.setDefault(Component.Document);

// ============================================
// PUBLIC API
// ============================================

/**
 * Compile a slot's markdown content into ComponentNode[].
 *
 * - :::directives → dispatched through the component registry
 * - Thematic breaks (---) → silently skipped
 * - Bare MDAST → auto-wrapped in the default component
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
 * - Consecutive bare MDAST → grouped and wrapped in the default component
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
      nodes.push(component(componentRegistry.getDefault(), { body: rawSource }));
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
 * Exported for reuse by document.ts which also dispatches nested directives.
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
