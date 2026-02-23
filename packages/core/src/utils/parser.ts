// Shared Markdown Parser
// Remark processor and directive helpers shared by slot compiler and block component.
//
// text.ts keeps its own processor (intentionally omits remarkGfm).

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import { extractSource, type ContainerDirective } from '../core/model/syntax.js';

// ============================================
// PARSER
// ============================================

/** Remark processor with directive + GFM support. Used by slot compiler and block component. */
export const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkDirective)
  .use(remarkGfm);

// ============================================
// DIRECTIVE HELPERS
// ============================================

/**
 * Extract the raw body text from a scalar container directive,
 * stripping the :::name opener and ::: closer.
 *
 * For scalar components only (card, image, text, etc.) where the body is a string.
 * Slotted components (row, column, stack, grid) walk directive.children directly
 * via compileChildren() — they never call this function.
 */
export function extractDirectiveBody(directive: ContainerDirective, source: string): string {
  const raw = extractSource(directive, source);
  const lines = raw.split('\n');
  if (lines.length < 2) return '';
  const bodyLines = lines.slice(1);
  if (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === ':::') {
    bodyLines.pop();
  }
  return bodyLines.join('\n').trim();
}
