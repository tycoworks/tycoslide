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
export { compileDeck, RESERVED_KEY } from "./deckCompiler.js";
export { parseInlineRuns } from "./inline.js";
export { parseRegion } from "./mdast.js";
export type { ParsedDocument, RawSlide } from "./slideParser.js";
export { parseSlideDocument } from "./slideParser.js";
export type {
  AssetCatalog,
  AssetEntry,
  CompilerBlock,
  CompilerConfig,
  CompilerDeck,
  CompilerDeckStep,
  CompilerImageParameter,
  CompilerLayout,
  CompilerParameter,
  CompilerSlot,
  CompilerTemplateParameter,
  CompilerThemeConfig,
  EngineFill,
  Limit,
} from "./types.js";
export { AcceptType, AssetType, ParameterType } from "./types.js";
