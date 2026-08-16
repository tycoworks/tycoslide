import type { RootContent } from "mdast";
import { MdastType, parseRegion } from "../mdast.js";
import { AcceptType, type BlockContext, type BlockFill, type BlockHandler } from "../types.js";
import { CODE } from "./code.js";
import { IMAGE } from "./image.js";
import { MERMAID } from "./mermaid.js";
import { TABLE } from "./table.js";
import { compileTextAggregate } from "./text.js";

// The compiler's block machinery — one registry, one `compile` per content kind,
// mirroring the engine's single `fillers/filler.ts`. The handler interface +
// context are defined in `../types.js` (so per-kind block files import them
// without importing this registry — that would cycle); re-export them here so
// callers treat the registry as their boundary.
export type { BlockContext, BlockHandler };

// ── The one registry: every content kind is one row ───────────────────────────

// One descriptor per content kind, carrying recognition (`match`/`acceptType`)
// and the single `compile` that folds the node straight into an engine fill. A
// region that is exactly one of these nodes folds to that kind. MERMAID precedes
// CODE, but their matches are already disjoint on `lang`.
const BLOCKS: BlockHandler[] = [MERMAID, CODE, IMAGE, TABLE];

/**
 * Recognize a body/`::name::` region's content and return the engine
 * `AcceptType` it folds to, plus a lazy `fill` that compiles it to the engine
 * fill. The split is deliberate: `acceptType` is available synchronously so the
 * caller can validate a region against its slot BEFORE running the (possibly
 * expensive — Shiki, Playwright) `fill`. A region that is exactly one
 * `mermaid`/`code`/`image`/`table` node folds to that kind; anything else
 * aggregates to one TextFill (prose + lists + headings). The paragraph-unwrap
 * mirrors remark wrapping a lone `![alt](src)` in a paragraph.
 */
export function parseSlotContent(
  text: string,
  ctx: BlockContext,
): { acceptType: AcceptType; fill: () => Promise<BlockFill> } {
  const nodes = parseRegion(text).children.map(unwrapLoneImage);
  if (nodes.length === 1) {
    const handler = BLOCKS.find((h) => h.match(nodes[0]));
    if (handler) return { acceptType: handler.acceptType, fill: () => handler.compile(nodes[0], ctx) };
  }
  // TEXT is the aggregate fallback (prose + lists + headings), not a registry
  // row — it's what a region folds to when no single-block handler claims it.
  // Wrapped in an async thunk so its fail-fast (a standalone kind mixed into
  // prose) surfaces from `fill`, after the caller's acceptType check.
  return { acceptType: AcceptType.Text, fill: async () => compileTextAggregate(nodes, ctx) };
}

/** remark wraps a lone `![alt](src)` in a paragraph; unwrap it so a standalone
 * image is dispatched as an `image` node, not walked as prose. */
function unwrapLoneImage(node: RootContent): RootContent {
  if (node.type === MdastType.Paragraph && node.children.length === 1 && node.children[0].type === MdastType.Image) {
    return node.children[0];
  }
  return node;
}
