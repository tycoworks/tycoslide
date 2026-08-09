import type { PhrasingContent, Root, RootContent } from "mdast";
import remarkGfm from "remark-gfm";
import remarkIns from "remark-ins";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { StyledParagraph, TableFill, TextRun } from "../engine/index.js";

/** mdast node type discriminators we handle. Backing const so switch/if cases
 * reference named tokens rather than raw magic strings. */
const MdastType = {
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
} as const;

/** The subset of MdastType values that are PhrasingContent (dispatched by walkPhrasing). */
const PHRASING_TYPES: ReadonlySet<string> = new Set([
  MdastType.Text,
  MdastType.InlineCode,
  MdastType.Strong,
  MdastType.Emphasis,
  MdastType.Delete,
  MdastType.Insert,
  MdastType.Link,
  MdastType.Break,
]);

// ══════════════════════════════════════════════════════════════════════════════
// INLINE / PROSE PARSING
// ══════════════════════════════════════════════════════════════════════════════

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

  // remark-parse establishes the processor as Processor<Root>; remarkGfm and
  // remarkIns extend the parser but don't transform the tree shape, so
  // runSync's output is still a Root. Unified's TailTree generic defaults to
  // undefined and widens runSync's return to the base Node, hence the narrowing
  // cast — kept to a single hop, no double-cast.
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkIns);
  const tree = processor.runSync(processor.parse(text)) as Root;
  const runs = walkInlineRoot(tree, {});
  return runs.length > 0 ? runs : [{ text: "" }];
}

/**
 * Parse a raw prose line into a StyledParagraph with bullet detection and inline
 * formatting. The caller provides the raw line including leading whitespace and
 * bullet markers.
 */
export function parseStyledParagraph(raw: string): StyledParagraph {
  const { indent, bullet, text } = detectBullet(raw);
  if (bullet) {
    return {
      runs: parseInlineRuns(text),
      bullet: { level: Math.floor(indent / 2) },
    };
  }
  return { runs: parseInlineRuns(text) };
}

/**
 * Parse a single line of prose into its structural components.
 *
 * Lines beginning with `- ` or `* ` (optionally preceded by spaces) are
 * recognized as bullet items. Every 2 spaces of leading indent on a bullet
 * line increase its level by 1. A leading dash without a trailing space is
 * NOT a bullet (e.g. `-foo`).
 */
export function parseProseLine(raw: string): { text: string; bullet: boolean; level: number } {
  const { indent, bullet, text } = detectBullet(raw);
  return { text, bullet, level: bullet ? Math.floor(indent / 2) : 0 };
}

/**
 * Splits a raw line into leading spaces, an optional `- `/`* ` marker, and the
 * remaining text in one pass. Group 1 is the run of leading spaces; group 2 is
 * the marker plus its trailing whitespace when present; group 3 is everything
 * after. A marker only matches when whitespace follows it, so `-foo` falls
 * through group 2 and stays plain text.
 */
const BULLET_LINE = /^( *)([-*]\s+)?(.*)$/;

/** Shared bullet-detection primitive used by parseStyledParagraph + parseProseLine. */
function detectBullet(raw: string): { indent: number; bullet: boolean; text: string } {
  const [, leading, marker, rest] = raw.match(BULLET_LINE) as RegExpMatchArray;
  return { indent: leading.length, bullet: marker !== undefined, text: rest };
}

// ══════════════════════════════════════════════════════════════════════════════
// GFM TABLE PARSING
// ══════════════════════════════════════════════════════════════════════════════

const TABLE_SEPARATOR_RE = /^\|?([\s:]*-{3,}[\s:]*\|)+[\s:]*-{3,}[\s:]*\|?$/;

function parseTableRow(line: string): string[] {
  const trimmed = line.trim();
  const stripped = trimmed.startsWith("|") ? trimmed.slice(1) : trimmed;
  const chopped = stripped.endsWith("|") ? stripped.slice(0, -1) : stripped;
  return chopped.split("|").map((c) => c.trim());
}

function cellToParagraph(text: string): StyledParagraph {
  return { runs: parseInlineRuns(text) };
}

/**
 * Parse a GFM table into TableFill (StyledParagraph[] cells). Returns null
 * for non-table text. Cells carry rich runs so inline formatting works
 * inside tables for free.
 */
export function parseGfmTable(text: string): TableFill | null {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return null;

  if (!TABLE_SEPARATOR_RE.test(lines[1])) return null;

  const headers = parseTableRow(lines[0]);
  if (headers.length === 0) return null;

  const rows: StyledParagraph[][] = [];
  for (let i = 2; i < lines.length; i++) {
    rows.push(parseTableRow(lines[i]).map(cellToParagraph));
  }

  return { headers: headers.map(cellToParagraph), rows };
}

// ══════════════════════════════════════════════════════════════════════════════
// MDAST TREE WALKER (type-narrowed against @types/mdast + remark-ins)
// ══════════════════════════════════════════════════════════════════════════════

interface InlineState {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  link?: string;
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
      // A hard line break inside a single "line" is treated as a space.
      return [makeRun(" ", state)];

    default:
      // Any other phrasing node with a literal `value` (footnote references,
      // etc.) — emit its text if it has one, otherwise nothing.
      if ("value" in node && typeof (node as { value: unknown }).value === "string") {
        return [makeRun((node as { value: string }).value, state)];
      }
      return [];
  }
}

function walkPhrasingChildren(children: PhrasingContent[], state: InlineState): TextRun[] {
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
