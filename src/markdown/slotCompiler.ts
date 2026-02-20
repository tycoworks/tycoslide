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
import { SYNTAX, type ContainerDirective } from '../core/mdast.js';
import { markdownProcessor, extractDirectiveBody } from '../utils/parser.js';
import { componentRegistry, component, type ComponentNode } from '../core/registry.js';
import { Component } from '../core/types.js';

// ============================================
// DEFAULT COMPONENT
// ============================================

/** Default component for bare MDAST in slots. Set here as markdown pipeline policy. */
componentRegistry.setDefaultContent(Component.Document);

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
  const nodes: ComponentNode[] = [];
  let bareStart: RootContent | null = null;
  let bareEnd: RootContent | null = null;

  function flushBareGroup(): void {
    if (!bareStart || !bareEnd) return;
    const startOffset = bareStart.position?.start.offset ?? 0;
    const endOffset = bareEnd.position?.end.offset ?? markdownStr.length;
    const rawSource = markdownStr.slice(startOffset, endOffset).trim();
    if (rawSource) {
      nodes.push(component(componentRegistry.getDefaultContent(), { body: rawSource }));
    }
    bareStart = null;
    bareEnd = null;
  }

  for (const child of tree.children) {
    // Container directives → flush bare group, then dispatch
    if (child.type === SYNTAX.CONTAINER_DIRECTIVE) {
      flushBareGroup();
      nodes.push(deserializeDirective(child as unknown as ContainerDirective, markdownStr));
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
// DIRECTIVE DESERIALIZATION
// ============================================

/**
 * Deserialize a :::name container directive into a ComponentNode.
 * Delegates to the component's auto-generated deserializer.
 */
function deserializeDirective(directive: ContainerDirective, source: string): ComponentNode {
  const handler = componentRegistry.getDirectiveHandler(directive.name);
  if (!handler) {
    const available = componentRegistry.getAll()
      .filter(d => d.deserialize)
      .map(d => d.name)
      .join(', ');
    throw new Error(
      `[tycoslide] slot: unknown directive ":::${directive.name}". ` +
      `Available directives: ${available || 'none'}.`,
    );
  }

  const body = extractDirectiveBody(directive, source);
  return handler.deserialize(directive.attributes ?? {}, body);
}
