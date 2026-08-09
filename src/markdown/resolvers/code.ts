import type { BundledLanguage, BundledTheme } from "shiki";
import type { StyledParagraph, TextFill, TextRun } from "../../engine/index.js";
import { type CodeFence, CompilerSlotType, FenceType } from "../types.js";
import type { Resolver } from "./resolver.js";

/** Discriminator for CodeFence values. Doubles as `CodeResolver.matches`. */
export function isCodeBlock(v: unknown): v is CodeFence {
  return typeof v === "object" && v !== null && !Array.isArray(v) && (v as { type?: unknown }).type === FenceType.Code;
}

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

/**
 * Resolve one CodeFence into a TextFill by Shiki-highlighting its source.
 * Theme resolution is strict: the fence's slot MUST declare `codeTheme`. There
 * is no theme-wide fallback — a code-capable slot with no theme throws with the
 * offending slot and layout names.
 */
export const CodeResolver: Resolver<CodeFence> = {
  matches: isCodeBlock,
  async resolve(fence, ctx): Promise<TextFill> {
    const theme = ctx.slot.type === CompilerSlotType.Code ? ctx.slot.codeTheme : undefined;
    if (!theme) {
      throw new Error(
        `Slide layout "${ctx.layout.name}" slot "${ctx.key}": no "codeTheme" declared on the slot. ` +
          "Every code-capable slot must declare its own theme (CompilerContentSlot.codeTheme).",
      );
    }
    const paragraphs = await highlightCode(fence.source, fence.language, theme);
    return { paragraphs };
  },
};
