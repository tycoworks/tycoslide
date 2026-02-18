// Block Compiler
// Converts a markdown string into an array of ComponentNode[].
// Each block-level element becomes an independent ComponentNode.
//
// Dispatch is registry-driven — components register their own handlers
// via `markdown: { compile, nodeType?, compileSyntax? }` in componentRegistry.define().
//
// This file has ZERO component imports — all dispatch goes through the registry.

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import type { Root, RootContent } from 'mdast';
import { SYNTAX, extractSource, type ContainerDirective } from '../core/mdast.js';
import { componentRegistry, type ComponentNode } from '../core/registry.js';

// ============================================
// PARSER
// ============================================

const processor = unified()
  .use(remarkParse)
  .use(remarkDirective)
  .use(remarkGfm);

// ============================================
// PUBLIC API
// ============================================

/**
 * Compile a markdown string into an array of ComponentNodes.
 *
 * Block-level dispatch is registry-driven:
 * - :::name directives → component's `compile` function
 * - MDAST nodes (paragraphs, tables, etc.) → component's `compileSyntax` function
 * - Thematic breaks are silently skipped
 *
 * Callers decide how to arrange the returned nodes (e.g. wrap in column()).
 */
export function compileBlocks(markdownStr: string): ComponentNode[] {
  const tree = processor.parse(markdownStr) as Root;
  const nodes: ComponentNode[] = [];

  for (const child of tree.children) {
    const compiled = compileBlock(child, markdownStr);
    if (compiled) nodes.push(compiled);
  }

  return nodes;
}

// ============================================
// DIRECTIVE UTILITIES
// ============================================

/**
 * Extract the raw body text from a container directive,
 * stripping the :::name opener and ::: closer.
 */
function extractDirectiveBody(directive: ContainerDirective, source: string): string {
  const raw = extractSource(directive, source);
  // Strip opening :::name line and closing ::: line
  const lines = raw.split('\n');
  // First line is :::name (possibly with attributes)
  // Last line is :::
  if (lines.length < 2) return '';
  const bodyLines = lines.slice(1);
  // Remove closing ::: if present
  if (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === ':::') {
    bodyLines.pop();
  }
  return bodyLines.join('\n').trim();
}

// ============================================
// BLOCK DISPATCHING
// ============================================

function compileBlock(node: RootContent, source: string): ComponentNode | null {
  // 1. Container directives → component's compile function
  if (node.type === 'containerDirective') {
    return compileDirective(node as unknown as ContainerDirective, source);
  }

  // 2. Reject inline image syntax — MDAST wraps ![](url) in paragraphs
  if (node.type === SYNTAX.PARAGRAPH) {
    const para = node as { children: { type: string }[] };
    if (para.children.length === 1 && para.children[0].type === SYNTAX.IMAGE) {
      throw new Error('Images cannot be embedded inline in text. Use :::image directive.');
    }
  }

  // 3. MDAST nodes → component's compileSyntax function
  const handler = componentRegistry.getSyntaxHandler(node.type);
  if (handler) {
    return handler.markdown.compileSyntax(node, source);
  }

  // 4. Thematic breaks → skip
  if (node.type === SYNTAX.THEMATIC_BREAK) return null;

  // 5. Unknown → error
  const registered = componentRegistry.getAll()
    .filter(d => d.markdown?.nodeType)
    .map(d => {
      const nt = d.markdown!.nodeType!;
      return Array.isArray(nt) ? nt.join(', ') : nt;
    })
    .join(', ');

  throw new Error(
    `[tycoslide] compileBlocks: unsupported markdown block type "${node.type}". ` +
    `Registered syntax handlers: ${registered || 'none'}.`,
  );
}

// ============================================
// DIRECTIVE COMPILATION
// ============================================

/**
 * Compile a :::name container directive into a ComponentNode.
 * Delegates to the component's own compile function.
 */
function compileDirective(directive: ContainerDirective, source: string): ComponentNode {
  const handler = componentRegistry.getBlockHandler(directive.name);
  if (!handler) {
    const available = componentRegistry.getAll()
      .filter(d => d.markdown?.compile)
      .map(d => d.name)
      .join(', ');
    throw new Error(
      `[tycoslide] compileBlocks: unknown directive ":::${directive.name}". ` +
      `Available block directives: ${available || 'none'}.`,
    );
  }

  const body = extractDirectiveBody(directive, source);
  return handler.markdown.compile(directive, source, body);
}
