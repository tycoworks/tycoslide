import type { PhrasingContent, Root, RootContent } from "mdast";
import type { TextRun } from "../engine/index.js";
import { MdastType, parseInline } from "./mdast.js";

/** The subset of MdastType values that are PhrasingContent (dispatched by walkPhrasing). */
export const PHRASING_TYPES: ReadonlySet<string> = new Set([
  MdastType.Text,
  MdastType.InlineCode,
  MdastType.Strong,
  MdastType.Emphasis,
  MdastType.Delete,
  MdastType.Insert,
  MdastType.Link,
  MdastType.Break,
]);

/**
 * Parse inline markdown formatting in a single line of text into TextRun arrays.
 * Handles **bold**, *italic*, ***bold italic***, ~~strikethrough~~, ++underline++,
 * [link](url), and `inline code`.
 */
export function parseInlineRuns(text: string): TextRun[] {
  if (!text) return [{ text: "" }];

  // Fast path: no formatting characters means plain text.
  if (!text.includes("*") && !text.includes("[") && !text.includes("`") && !text.includes("~") && !text.includes("+")) {
    return [{ text }];
  }

  const tree = parseInline(text);
  const runs = walkInlineRoot(tree, {});
  return runs.length > 0 ? runs : [{ text: "" }];
}

/**
 * Inline formatting carried down the phrasing walk. `breakAsNewline` is the one
 * block-vs-inline knob: in block aggregation a markdown hard `break` node must
 * split the paragraph, so the walk emits it as a `"\n"` run (which the block
 * text splitter then breaks on); the single-line `parseInlineRuns` path leaves
 * it unset, so a hard break stays a space.
 */
export interface InlineState {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  link?: string;
  breakAsNewline?: boolean;
}

function makeRun(text: string, state: InlineState): TextRun {
  const run: TextRun = { text };
  if (state.bold) run.bold = true;
  if (state.italic) run.italic = true;
  if (state.strikethrough) run.strikethrough = true;
  if (state.underline) run.underline = true;
  if (state.link) run.link = state.link;
  return run;
}

/**
 * Walk a `PhrasingContent` node, converting inline formatting into TextRun[].
 *
 * The `node.type` case strings are the mdast library's own discriminators;
 * TypeScript narrows each case to the concrete node interface (Text, Strong,
 * Emphasis, …) so misspellings and dropped cases are compile errors, not
 * silent fallthroughs. `remark-ins` augments PhrasingContentMap with
 * "insert", so that case narrows to the Insert node type.
 */
function walkPhrasing(node: PhrasingContent, state: InlineState): TextRun[] {
  switch (node.type) {
    case MdastType.Text:
      return [makeRun(node.value, state)];

    case MdastType.InlineCode:
      return [makeRun(node.value, state)];

    case MdastType.Strong:
      return walkPhrasingChildren(node.children, { ...state, bold: true });

    case MdastType.Emphasis:
      return walkPhrasingChildren(node.children, { ...state, italic: true });

    case MdastType.Delete:
      return walkPhrasingChildren(node.children, { ...state, strikethrough: true });

    case MdastType.Insert:
      return walkPhrasingChildren(node.children, { ...state, underline: true });

    case MdastType.Link:
      return walkPhrasingChildren(node.children, { ...state, link: node.url });

    case MdastType.Break:
      // A markdown hard break. In block aggregation it splits the paragraph
      // (emit a "\n" run the splitter breaks on); on the single-line inline
      // path it collapses to a space.
      return [makeRun(state.breakAsNewline ? "\n" : " ", state)];

    default:
      // Any other phrasing node with a literal `value` (footnote references,
      // etc.) — emit its text if it has one, otherwise nothing.
      if ("value" in node && typeof (node as { value: unknown }).value === "string") {
        return [makeRun((node as { value: string }).value, state)];
      }
      return [];
  }
}

export function walkPhrasingChildren(children: PhrasingContent[], state: InlineState): TextRun[] {
  const out: TextRun[] = [];
  for (const child of children) out.push(...walkPhrasing(child, state));
  return out;
}

/** Walk the root's children, entering each block-level container's phrasing. */
function walkInlineRoot(root: Root, state: InlineState): TextRun[] {
  const out: TextRun[] = [];
  for (const child of root.children) out.push(...walkBlock(child, state));
  return out;
}

/**
 * Enter a block-level node. remarkParse on a single line produces a `Root`
 * whose children include block-level nodes (Paragraph, most commonly), which
 * in turn hold phrasing content. Anything unexpected (Heading, Blockquote,
 * List, …) recurses via its phrasing-holding children when applicable.
 */
function walkBlock(node: RootContent, state: InlineState): TextRun[] {
  switch (node.type) {
    case MdastType.Paragraph:
      return walkPhrasingChildren(node.children, state);
    case MdastType.Heading:
      return walkPhrasingChildren(node.children, state);
    default:
      // Fall back: some block nodes carry phrasing content among their
      // children. Recurse into typed children when the shape is known;
      // otherwise return nothing rather than guess.
      if ("children" in node && Array.isArray((node as { children?: unknown }).children)) {
        const out: TextRun[] = [];
        for (const child of (node as { children: unknown[] }).children) {
          out.push(...walkUnknown(child, state));
        }
        return out;
      }
      return [];
  }
}

/**
 * Handle a child of unknown shape: dispatch to phrasing- or block-level walker
 * based on the node's type discriminator. Preserves discriminated-union
 * narrowing by explicitly re-checking the type against known mdast unions.
 */
function walkUnknown(node: unknown, state: InlineState): TextRun[] {
  if (typeof node !== "object" || node === null || !("type" in node)) return [];
  const typed = node as { type: string };
  // Phrasing-content types we handle directly:
  if (PHRASING_TYPES.has(typed.type)) return walkPhrasing(node as PhrasingContent, state);
  // Otherwise treat as a block-content node; walkBlock will recurse or
  // return nothing.
  return walkBlock(node as RootContent, state);
}
