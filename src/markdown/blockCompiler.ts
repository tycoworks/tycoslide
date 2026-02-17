// Block Compiler
// Converts a markdown string into an array of ComponentNode[].
// Each block-level element becomes an independent ComponentNode.
//
// Dispatch is registry-driven — components register their own MDAST handlers
// via `markdown: { type: MARKDOWN.SYNTAX, ... }` in componentRegistry.define().
// Block directives (:::name) are dispatched to components with
// `markdown: { type: MARKDOWN.BLOCK }`.
//
// This file has ZERO component imports — all dispatch goes through the registry.

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import type { Root, RootContent } from 'mdast';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { SYNTAX, extractSource } from '../core/mdast.js';
import { MARKDOWN } from '../core/types.js';
import { componentRegistry, component, type ComponentNode } from '../core/registry.js';

// ============================================
// PARSER
// ============================================

const processor = unified()
  .use(remarkParse)
  .use(remarkDirective)
  .use(remarkGfm);

// ============================================
// DIRECTIVE NODE TYPE (from remark-directive)
// ============================================

interface ContainerDirective {
  type: 'containerDirective';
  name: string;
  children: RootContent[];
  position?: { start: { offset?: number }; end: { offset?: number } };
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Compile a markdown string into an array of ComponentNodes.
 *
 * Block-level dispatch is registry-driven:
 * - SYNTAX handlers: components that registered for specific MDAST node types
 * - BLOCK handlers: components invoked via :::name directives
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
// BLOCK DISPATCHING
// ============================================

function compileBlock(node: RootContent, source: string): ComponentNode | null {
  // 1. Container directives → registry lookup by name
  if (node.type === 'containerDirective') {
    return compileDirective(node as unknown as ContainerDirective, source);
  }

  // 2. MDAST nodes → registry lookup by nodeType
  const handler = componentRegistry.getSyntaxHandler(node.type);
  if (handler) {
    return handler.markdown.compile(node, source);
  }

  // 3. Thematic breaks → skip
  if (node.type === SYNTAX.THEMATIC_BREAK) return null;

  // 4. Unknown → error
  const registered = componentRegistry.getAll()
    .filter(d => d.markdown?.type === MARKDOWN.SYNTAX)
    .map(d => {
      const md = d.markdown!;
      if (md.type === MARKDOWN.SYNTAX) {
        return Array.isArray(md.nodeType) ? md.nodeType.join(', ') : md.nodeType;
      }
      return '';
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
 *
 * Looks up the component by directive name. Body parsing depends on
 * the component's schema:
 * - params (ZodObject) → parse body as YAML
 * - input (simple Zod type) → pass body as raw text
 */
function compileDirective(directive: ContainerDirective, source: string): ComponentNode {
  const handler = componentRegistry.getBlockHandler(directive.name);
  if (!handler) {
    const available = componentRegistry.getAll()
      .filter(d => d.markdown?.type === MARKDOWN.BLOCK)
      .map(d => d.name)
      .join(', ');
    throw new Error(
      `[tycoslide] compileBlocks: unknown directive ":::${directive.name}". ` +
      `Available block directives: ${available || 'none'}.`,
    );
  }

  // Extract the raw body text between :::name and closing :::
  const body = extractDirectiveBody(directive, source);

  // Parse and validate through the component's schema.
  // For params (ZodObject): parse body as YAML first, then validate.
  // For input (e.g., z.string()): validate directly (runs any transforms).
  const input = handler.input;
  const raw = input instanceof z.ZodObject ? (parseYaml(body) ?? {}) : body;
  const props = input.parse(raw);

  return component(handler.name, props);
}

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
