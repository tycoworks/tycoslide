// Shared Markdown Parser
// Remark processor with directive + GFM support.
// Used by slot compiler and table component.

import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

/** Remark processor with directive + GFM support. */
const markdownProcessor = unified().use(remarkParse).use(remarkDirective).use(remarkGfm);

/** Parse a markdown string into an MDAST tree. */
export function parseMarkdown(content: string): import("mdast").Root {
  return markdownProcessor.parse(content) as import("mdast").Root;
}
