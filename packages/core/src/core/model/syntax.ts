// Syntax Node Type Constants
// Shared constants for markdown AST node types used across the parser layer.

export const SYNTAX = {
  ROOT: "root",
  // Block-level
  CONTAINER_DIRECTIVE: "containerDirective",
  PARAGRAPH: "paragraph",
  LIST: "list",
  HEADING: "heading",
  TABLE: "table",
  IMAGE: "image",
  CODE: "code",
  BLOCKQUOTE: "blockquote",
  HTML: "html",
  DEFINITION: "definition",
  THEMATIC_BREAK: "thematicBreak",
  // Inline
  TEXT: "text",
  STRONG: "strong",
  EMPHASIS: "emphasis",
  INLINE_CODE: "inlineCode",
  LINK: "link",
  BREAK: "break",
  DELETE: "delete",
  INS: "insert",
  TEXT_DIRECTIVE: "textDirective",
} as const;

/** Union of all SYNTAX values — use for typed MDAST node type references. */
export type SyntaxType = (typeof SYNTAX)[keyof typeof SYNTAX];

/** Frontmatter keys consumed by the compiler — cannot be used as layout param names. */
export const RESERVED_FRONTMATTER_KEYS = new Set(["layout", "name", "notes", "variant"] as const);

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
  if (start == null || end == null) return "";
  return source.slice(start, end);
}

/** Container directive node from remark-directive (:::name{attrs} ... :::) */
export interface ContainerDirective {
  type: typeof SYNTAX.CONTAINER_DIRECTIVE;
  name: string;
  attributes?: Record<string, string | null | undefined>;
  children: { type: string; [key: string]: unknown }[];
  position?: { start: { offset?: number }; end: { offset?: number } };
}
