// Slot Compiler
// Compiles a slot's markdown content into SlideNode[].
//
// A slot is a named content region in a layout (e.g. body, left, right).
// Slots primarily contain :::directives. Consecutive bare MDAST nodes
// are compiled via registered MDAST handlers on the component registry.

import type { Paragraph, Root, RootContent } from "mdast";
import { extractDirectiveBody, markdownProcessor } from "../../utils/parser.js";
import type { ComponentNode, SlideNode } from "../model/nodes.js";
import { type ContainerDirective, SYNTAX } from "../model/syntax.js";
import { componentRegistry } from "../rendering/registry.js";

// ============================================
// PUBLIC API
// ============================================

/**
 * Compile a slot's markdown content into SlideNode[].
 *
 * - :::directives → dispatched through the component registry
 * - Bare MDAST → compiled via registered MDAST handlers
 */
export function compileSlot(markdownStr: string): SlideNode[] {
  const tree = markdownProcessor.parse(markdownStr) as Root;
  return compileChildren(tree.children, markdownStr, "slot");
}

// ============================================
// MDAST CHILDREN → SlideNode[]
// ============================================

/**
 * Compile an array of already-parsed MDAST nodes into SlideNode[].
 * Shared by compileSlot (top-level slot parsing) and dispatchDirective (nested container bodies).
 *
 * - Container directives → dispatched through dispatchDirective (recursive)
 * - Consecutive bare MDAST → grouped and compiled via registered MDAST handlers
 */
function compileChildren(children: RootContent[], source: string, errorPrefix: string): SlideNode[] {
  const nodes: SlideNode[] = [];
  let bareStart: RootContent | null = null;
  let bareEnd: RootContent | null = null;

  function flushBareGroup(): void {
    if (!bareStart || !bareEnd) return;
    const startOffset = bareStart.position?.start.offset;
    const endOffset = bareEnd.position?.end.offset;
    if (startOffset === undefined || endOffset === undefined) {
      throw new Error(`${errorPrefix}: bare MDAST node missing position data.`);
    }
    const rawSource = source.slice(startOffset, endOffset).trim();
    if (rawSource) {
      nodes.push(...compileBareMarkdown(rawSource));
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

    // Thematic breaks (---, ***, ___) are not supported in slide content.
    if (child.type === SYNTAX.THEMATIC_BREAK) {
      throw new Error(
        `${errorPrefix}: horizontal rules (---, ***, ___) are not supported in slide content. ` +
          `Use :::line to insert a line element.`,
      );
    }

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
 * Scalar components (card, image, table, etc.): extract body as raw text string
 * and pass to the component's deserializer.
 *
 * Exported for reuse by compileBareNode which also dispatches nested directives.
 */
export function dispatchDirective(directive: ContainerDirective, source: string, errorPrefix: string): ComponentNode {
  const handler = componentRegistry.getDirectiveHandler(directive.name);
  if (!handler) {
    const available = componentRegistry
      .getAll()
      .filter((d) => d.deserialize)
      .map((d) => d.name)
      .join(", ");
    throw new Error(
      `${errorPrefix}: unknown directive ":::${directive.name}". ` + `Available directives: ${available || "none"}.`,
    );
  }

  // Scalar component: extract body as raw text string for the deserializer.
  const body = extractDirectiveBody(directive, source);
  return handler.deserialize!(directive.attributes ?? {}, body);
}

// ============================================
// BARE MARKDOWN COMPILATION
// ============================================

/**
 * Compile a bare markdown string into SlideNode[].
 * Each MDAST block becomes a separate SlideNode via registered MDAST handlers.
 * Callers insert these directly into their parent container, whose gap
 * (set by the layout with theme access) controls inter-block spacing.
 */
function compileBareMarkdown(source: string): SlideNode[] {
  const tree = markdownProcessor.parse(source) as Root;
  const nodes: SlideNode[] = [];

  for (const child of tree.children) {
    const compiled = compileBareNode(child, source);
    if (compiled) nodes.push(compiled);
  }

  return nodes;
}

/**
 * Compile a single MDAST block node into a SlideNode.
 * Dispatches to registered MDAST handlers on the component registry.
 */
function compileBareNode(node: RootContent, source: string): SlideNode | null {
  // Container directives → shared dispatch
  if (node.type === SYNTAX.CONTAINER_DIRECTIVE) {
    return dispatchDirective(node as unknown as ContainerDirective, source, "document");
  }

  // Thematic breaks (---, ***, ___) are not supported in slide content.
  if (node.type === SYNTAX.THEMATIC_BREAK) {
    throw new Error(
      "Horizontal rules (---, ***, ___) are not supported in slide content. " + "Use :::line to insert a line element.",
    );
  }

  // Unwrap paragraph-wrapped images: remark treats ![alt](src) as inline
  // content, always wrapping it in a paragraph. Normalize before dispatch.
  if (node.type === SYNTAX.PARAGRAPH) {
    const para = node as Paragraph;
    if (para.children.length === 1 && para.children[0].type === SYNTAX.IMAGE) {
      node = para.children[0] as RootContent;
    }
  }

  // Dispatch to registered MDAST handler
  const handler = componentRegistry.getMdastHandler(node.type);
  if (handler?.mdast) {
    return handler.mdast.compile(node, source);
  }

  // Unknown → error
  throw new Error(
    `document: unsupported markdown block type "${node.type}". ` +
      `No component has registered an MDAST handler for this type.`,
  );
}
