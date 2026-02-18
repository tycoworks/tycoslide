// Syntax Node Type Constants
// Shared constants for markdown AST node types used across the parser layer.

import type { PhrasingContent } from 'mdast';

export const SYNTAX = {
  ROOT: 'root',
  // Block-level
  PARAGRAPH: 'paragraph',
  LIST: 'list',
  HEADING: 'heading',
  TABLE: 'table',
  IMAGE: 'image',
  // Inline
  TEXT: 'text',
  STRONG: 'strong',
  EMPHASIS: 'emphasis',
  INLINE_CODE: 'inlineCode',
  TEXT_DIRECTIVE: 'textDirective',
  CODE: 'code',
  THEMATIC_BREAK: 'thematicBreak',
} as const;

// ============================================
// HELPERS
// ============================================

/** Extract the raw markdown source for a node using position offsets. */
export function extractSource(
  node: { position?: { start: { offset?: number }; end: { offset?: number } } },
  source: string,
): string {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (start == null || end == null) return '';
  return source.slice(start, end);
}

/** Container directive node from remark-directive (:::name{attrs} ... :::) */
export interface ContainerDirective {
  type: 'containerDirective';
  name: string;
  attributes?: Record<string, string | null | undefined>;
  children: { type: string; [key: string]: unknown }[];
  position?: { start: { offset?: number }; end: { offset?: number } };
}

/** Recursively extract plain text from inline mdast nodes. */
export function extractInlineText(nodes: PhrasingContent[]): string {
  return nodes.map(node => {
    if (node.type === SYNTAX.TEXT) return node.value;
    if (node.type === SYNTAX.INLINE_CODE) return node.value;
    if ('children' in node) return extractInlineText((node as any).children);
    return '';
  }).join('');
}
