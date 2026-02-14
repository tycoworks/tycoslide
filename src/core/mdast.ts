// MDAST Node Type Constants
// Shared constants for markdown AST node types used across the parser layer.

export const MDAST = {
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
} as const;
