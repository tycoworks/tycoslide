import type { Code } from "mdast";
import type { BundledLanguage, BundledTheme } from "shiki";
import type { StyledParagraph, TextFill, TextRun } from "../../engine/index.js";
import { MdastType } from "../mdast.js";
import { AcceptType, type BlockHandler } from "../types.js";
import { MERMAID_LANG } from "./mermaid.js";

/**
 * Recognize a fenced code block (any language except mermaid) at a region's top
 * level, folding it to a Text fill, and compile it by Shiki-highlighting its
 * source into a TextFill. Theme resolution is strict: the theme MUST declare a
 * `codeTheme` (one style per theme — the design-system framing); a deck with
 * code fences but no theme-level `codeTheme` throws, naming the offending slot.
 */
export const CODE: BlockHandler = {
  match: (node) => node.type === MdastType.Code && (node as Code).lang !== MERMAID_LANG,
  acceptType: AcceptType.Text,
  compile: async (node, ctx): Promise<TextFill> => {
    const code = node as Code;
    // A fence with no language can't be highlighted (no Shiki grammar to pick),
    // so fail fast naming the slot rather than attempt a language-less highlight.
    if (!code.lang) {
      throw new Error(
        `Slide ${ctx.slideIdx}: layout "${ctx.layoutName}" slot content (from ${ctx.source}) has a code fence ` +
          "with no language; add one after the opening ``` (e.g. ```sql).",
      );
    }
    const theme = ctx.config.codeTheme;
    if (!theme) {
      throw new Error(
        `Layout "${ctx.layoutName}" slot content (from ${ctx.source}): deck contains a code fence but the theme ` +
          'declares no "codeTheme". Add a theme-level "codeTheme" (a Shiki theme id) to theme.json.',
      );
    }
    return { paragraphs: await highlightCode(code.value, code.lang, theme) };
  },
};

/**
 * Run Shiki over a code block, producing StyledParagraph[] with per-token
 * color runs. Blank lines become paragraphs with a single empty run.
 */
export async function highlightCode(code: string, language: string, theme: string): Promise<StyledParagraph[]> {
  const { createHighlighter } = await import("shiki");
  const lang = language as BundledLanguage;
  const thm = theme as BundledTheme;
  const highlighter = await createHighlighter({ themes: [thm], langs: [lang] });
  const { tokens } = highlighter.codeToTokens(code, { lang, theme: thm });

  return tokens.map(
    (line): StyledParagraph => ({
      runs:
        line.length === 0
          ? [{ text: "" }]
          : line.map((token): TextRun => {
              const run: TextRun = { text: token.content };
              if (token.color) run.color = token.color.replace(/^#/, "");
              return run;
            }),
    }),
  );
}
