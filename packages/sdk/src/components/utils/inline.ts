// Inline text formatting utilities
// Shared between text and list components.

import type { NormalizedRun } from "@tycoslide/core";
import { SYNTAX } from "@tycoslide/core";
import type { Link, PhrasingContent, Root } from "mdast";
import { gfmStrikethroughFromMarkdown } from "mdast-util-gfm-strikethrough";
import { gfmStrikethrough } from "micromark-extension-gfm-strikethrough";
import remarkIns from "remark-ins";
import remarkParse from "remark-parse";
import type { Processor } from "unified";
import { unified } from "unified";
import type { Parent } from "unist";
import remarkMark from "./remarkMark.js";

// ============================================
// PARSER PLUGINS
// ============================================

/** Plugin that disables block-level constructs at the micromark level.
 *  Prevents `1. Problem` being parsed as an ordered list in inline/rich text parsing. */
function remarkDisableBlocks(this: Processor): void {
  const data = this.data() as { micromarkExtensions?: unknown[] };
  const ext = data.micromarkExtensions ?? (data.micromarkExtensions = []);
  ext.push({
    disable: {
      null: [
        "list",
        "headingAtx",
        "setextUnderline",
        "blockQuote",
        "thematicBreak",
        "codeFenced",
        "codeIndented",
        "htmlFlow",
        "definition",
      ],
    },
  });
}

/** Plugin that adds GFM strikethrough (~~text~~) without the rest of GFM.
 *  singleTilde: false means only ~~ works, avoiding accidental triggers. */
function remarkStrikethrough(this: Processor): void {
  const data = this.data() as Record<string, unknown[]>;
  (data.micromarkExtensions ??= []).push(gfmStrikethrough({ singleTilde: false }));
  (data.fromMarkdownExtensions ??= []).push(gfmStrikethroughFromMarkdown());
}

/** Inline-only processor — block constructs disabled, strikethrough + underline + mark enabled.
 *  Uses runSync(parse(...)) because remark-ins is a transform plugin requiring the run phase. */
const processor = unified()
  .use(remarkParse)
  .use(remarkStrikethrough)
  .use(remarkIns)
  .use(remarkMark)
  .use(remarkDisableBlocks);

/** Parse inline markdown to an MDAST tree. */
export function inlineParse(input: string): Root {
  return processor.runSync(processor.parse(input)) as Root;
}

// ============================================
// INLINE TRANSFORMER
// ============================================

/**
 * Transform inline/phrasing content into NormalizedRun[].
 * Recurses for strong, emphasis, strikethrough, underline, hyperlink, and mark nodes.
 */
export function transformInline(
  nodes: PhrasingContent[],
  highlightColor: string,
  runs: NormalizedRun[],
  defaults: Partial<NormalizedRun>,
): void {
  for (const node of nodes) {
    switch (node.type) {
      case SYNTAX.TEXT:
        runs.push({ text: node.value, ...defaults });
        break;
      case SYNTAX.STRONG:
        transformInline(node.children, highlightColor, runs, { ...defaults, bold: true });
        break;
      case SYNTAX.EMPHASIS:
        transformInline(node.children, highlightColor, runs, { ...defaults, italic: true });
        break;
      case SYNTAX.LINK: {
        const link = node as unknown as Link;
        transformInline(link.children as PhrasingContent[], highlightColor, runs, {
          ...defaults,
          hyperlink: link.url,
        });
        break;
      }
      case SYNTAX.DELETE:
        transformInline((node as unknown as Parent).children as PhrasingContent[], highlightColor, runs, {
          ...defaults,
          strikethrough: true,
        });
        break;
      case SYNTAX.INS:
        transformInline((node as unknown as Parent).children as PhrasingContent[], highlightColor, runs, {
          ...defaults,
          underline: true,
        });
        break;
      case SYNTAX.MARK as string:
        transformInline((node as unknown as Parent).children as PhrasingContent[], highlightColor, runs, {
          ...defaults,
          color: highlightColor,
        });
        break;
      case SYNTAX.BREAK:
        runs.push({ text: "", softBreak: true, ...defaults });
        break;
      default:
        if ("children" in node && Array.isArray((node as any).children)) {
          transformInline((node as any).children as PhrasingContent[], highlightColor, runs, defaults);
        } else if ("value" in node && typeof (node as any).value === "string") {
          runs.push({ text: (node as any).value, ...defaults });
        }
        break;
    }
  }
}
