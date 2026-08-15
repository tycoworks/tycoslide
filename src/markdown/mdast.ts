import type { Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkIns from "remark-ins";
import remarkParse from "remark-parse";
import { unified } from "unified";

/** mdast node type discriminators we handle. Backing const so switch/if cases
 * reference named tokens rather than raw magic strings. Exported so the
 * per-kind block handlers in `blocks/` recognize their node against the same
 * tokens the inline walk uses. */
export const MdastType = {
  Text: "text",
  InlineCode: "inlineCode",
  Strong: "strong",
  Emphasis: "emphasis",
  Delete: "delete",
  Insert: "insert",
  Link: "link",
  Break: "break",
  Paragraph: "paragraph",
  Heading: "heading",
  Code: "code",
  Image: "image",
  List: "list",
  Table: "table",
} as const;

// remark-parse establishes the processor as Processor<Root>; remarkGfm and
// remarkIns extend the parser but don't transform the tree shape, so
// runSync's output is still a Root. Unified's TailTree generic defaults to
// undefined and widens runSync's return to the base Node, hence the narrowing
// casts below — kept to a single hop, no double-cast. Shared by both entry
// points: neither plugin adds a transform phase, so `.parse()` alone already
// yields the final tree (gfm tables/delete, ins nodes included); `runSync` is
// only needed by the inline path below.
const processor = unified().use(remarkParse).use(remarkGfm).use(remarkIns);

// ══════════════════════════════════════════════════════════════════════════════
// INLINE / PROSE PARSING
// ══════════════════════════════════════════════════════════════════════════════

/** Parse a single line of markdown into a raw mdast tree. */
export function parseInline(text: string): Root {
  return processor.runSync(processor.parse(text)) as Root;
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOCK / REGION PARSING
// ══════════════════════════════════════════════════════════════════════════════

// Region splitting (::name::) happens above the slot, so a region is plain
// GFM+ins markdown — `.parse()` alone is enough, no `runSync` needed here.

/** Parse a whole body/`::name::` region into a real mdast tree. */
export function parseRegion(text: string): Root {
  return processor.parse(text) as Root;
}
