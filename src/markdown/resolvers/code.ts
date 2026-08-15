import type { BundledLanguage, BundledTheme } from "shiki";
import type { StyledParagraph, TextFill, TextRun } from "../../engine/index.js";
import { type CodeFence, FenceType } from "../types.js";
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
 * Theme resolution is strict: the theme MUST declare a `codeTheme`. It is one
 * style per theme (design-system framing) — a deck with code fences but no
 * theme-level `codeTheme` throws, naming the layout + slot that carries the
 * offending fence.
 */
export const CodeResolver: Resolver<CodeFence> = {
  matches: isCodeBlock,
  async resolve(fence, ctx): Promise<TextFill> {
    const theme = ctx.config.codeTheme;
    if (!theme) {
      throw new Error(
        `Layout "${ctx.layout.name}" slot "${ctx.key}": deck contains a code fence but the theme ` +
          'declares no "codeTheme". Add a theme-level "codeTheme" (a Shiki theme id) to theme.json.',
      );
    }
    const paragraphs = await highlightCode(fence.source, fence.language, theme);
    return { paragraphs };
  },
};
