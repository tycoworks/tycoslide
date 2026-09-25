import { compileDeck } from "./deckCompiler.js";
import { parseSlideDocument } from "./slideParser.js";
import type { CompilerConfig, CompilerDeck } from "./types.js";

export function compileMarkdownDeck(source: string, config: CompilerConfig): Promise<CompilerDeck> {
  const doc = parseSlideDocument(source);
  return compileDeck(doc, config);
}

export { highlightCode } from "./blocks/code.js";
export type { MermaidConfig, MermaidVariant } from "./blocks/mermaidTheme.js";
export { type BlockContext, type BlockHandler, parseSlotContent } from "./blocks/registry.js";
export { compileDeck } from "./deckCompiler.js";
export { parseInlineRuns } from "./inline.js";
export { parseRegion } from "./mdast.js";
export { strict } from "./schema/strict.js";
export { loadThemeConfig, parseThemeConfig, ThemeConfigSchema } from "./schema/themeConfigSchema.js";
export type { ParsedDocument, RawSlide } from "./slideParser.js";
export { parseSlideDocument } from "./slideParser.js";
export { templateKeys } from "./textTemplate.js";
export type {
  CompilerBlock,
  CompilerConfig,
  CompilerDeck,
  CompilerDeckStep,
  CompilerLayout,
  CompilerParameter,
  CompilerSlot,
  CompilerThemeConfig,
  EngineFill,
  LoadedTheme,
} from "./types.js";
export { AcceptType, RESERVED_KEY } from "./types.js";
