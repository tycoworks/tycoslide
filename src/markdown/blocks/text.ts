import type { List, RootContent } from "mdast";
import type { StyledParagraph, TextFill, TextRun } from "../../engine/index.js";
import { walkPhrasingChildren } from "../inline.js";
import { MdastType } from "../mdast.js";
import type { BlockContext } from "../types.js";

/**
 * Aggregate a region's prose blocks into one TextFill. Paragraphs, headings, and
 * lists become `StyledParagraph[]` in document order; list nesting sets bullet
 * levels. A region reaching here whose only node is an unsupported standalone
 * block (a lone `blockquote`, `thematicBreak`, …) — or one that mixes a
 * standalone kind (table/image/code) into prose — is illegal, so fail fast
 * naming the layout/slide/slot and the node type.
 */
export function compileTextAggregate(nodes: RootContent[], ctx: BlockContext): TextFill {
  const paragraphs: StyledParagraph[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case MdastType.Paragraph:
      case MdastType.Heading:
        for (const runs of splitRunsIntoParagraphs(walkPhrasingChildren(node.children, { breakAsNewline: true }))) {
          paragraphs.push({ runs });
        }
        break;
      case MdastType.List:
        paragraphs.push(...listParagraphs(node, 0));
        break;
      default:
        throw new Error(reject(nodes.length, node.type, ctx));
    }
  }
  return { paragraphs };
}

/**
 * Word the rejection for a node that prose aggregation can't take. A region that
 * is a single unsupported block asks to be a standalone content kind that
 * doesn't exist; a node reaching here beside others is a standalone kind
 * (table/image/code) mixed into prose — both name the layout/slide/slot + type.
 */
function reject(nodeCount: number, nodeType: string, ctx: BlockContext): string {
  const where = `Slide ${ctx.slideIdx}: layout "${ctx.layoutName}" slot content (from ${ctx.source})`;
  if (nodeCount === 1) {
    return `${where} is a standalone "${nodeType}" block, which is not a supported content kind.`;
  }
  return (
    `${where} mixes a "${nodeType}" block with other content; ` +
    "a table, image, or code block must be the region's only content."
  );
}

/**
 * A `list` → bulleted `StyledParagraph[]`. Each item's paragraph/heading runs
 * become a bullet at `level` (top-level list = 0); a nested `list` recurses at
 * `level + 1`. Ordered and unordered both yield plain bullets — the engine has
 * no ordered flag.
 */
function listParagraphs(list: List, level: number): StyledParagraph[] {
  const out: StyledParagraph[] = [];
  for (const item of list.children) {
    for (const child of item.children) {
      if (child.type === MdastType.List) {
        out.push(...listParagraphs(child, level + 1));
      } else if (child.type === MdastType.Paragraph || child.type === MdastType.Heading) {
        for (const runs of splitRunsIntoParagraphs(walkPhrasingChildren(child.children, { breakAsNewline: true }))) {
          out.push({ runs, bullet: { level } });
        }
      }
    }
  }
  return out;
}

/**
 * Split a paragraph's runs on newlines into one `TextRun[]` per source line, so
 * one source line becomes one StyledParagraph. Both a soft break (`\n` inside a
 * text run) and a markdown hard break (a `break` node the inline walk emits as a
 * `"\n"` run in block context) split here. Empty segments (a style boundary
 * landing on a line edge) are dropped, and empty lines produce no paragraph.
 */
function splitRunsIntoParagraphs(runs: TextRun[]): TextRun[][] {
  const lines: TextRun[][] = [];
  let current: TextRun[] = [];
  for (const run of runs) {
    const parts = run.text.split("\n");
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        lines.push(current);
        current = [];
      }
      if (parts[i] !== "") current.push({ ...run, text: parts[i] });
    }
  }
  lines.push(current);
  return lines.filter((line) => line.length > 0);
}
