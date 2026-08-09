import { compileDeck } from "./deckCompiler.js";
import { parseSlideDocument } from "./slideParser.js";
import type { CompilerDeck, CompilerLayout } from "./types.js";

export function compileMarkdownDeck(source: string, layouts: CompilerLayout[], rootDir = ""): CompilerDeck {
  const doc = parseSlideDocument(source);
  return compileDeck(doc, layouts, rootDir);
}

export { compileDeck, RESERVED_KEY } from "./deckCompiler.js";
export { parseGfmTable, parseInlineRuns, parseProseLine, parseStyledParagraph } from "./parsers.js";
export { CodeResolver, highlightCode, isCodeBlock } from "./resolvers/code.js";
export { isMermaidBlock, MermaidResolver } from "./resolvers/mermaid.js";
export type { MermaidConfig, MermaidVariant } from "./resolvers/mermaidTheme.js";
export type { ResolveContext, Resolver } from "./resolvers/resolver.js";
export { isFence, RESOLVERS, resolveFences } from "./resolvers/resolver.js";
export type { ParsedDocument, RawSlide } from "./slideParser.js";
export { parseSlideDocument } from "./slideParser.js";
export type {
  AssetCatalog,
  AssetEntry,
  CodeFence,
  CompilerCodeSlot,
  CompilerConfig,
  CompilerDeck,
  CompilerDeckStep,
  CompilerImageParameter,
  CompilerLayout,
  CompilerMermaidSlot,
  CompilerParameter,
  CompilerSlot,
  CompilerTableSlot,
  CompilerTemplateParameter,
  CompilerTextSlot,
  CompilerThemeConfig,
  MarkdownBlock,
  MermaidFence,
  ResolvedCompilerDeck,
  ResolvedCompilerDeckStep,
} from "./types.js";
export { CompilerSlotType, FenceType, ParameterType } from "./types.js";
