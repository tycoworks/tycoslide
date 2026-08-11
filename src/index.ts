import {
  type Config,
  type GenerateOptions,
  generate,
  type ImageFill,
  type Layout,
  type Slot,
  SlotType,
  type TableFill,
  type TemplateFill,
  type TextFill,
  type ThemeConfig,
} from "./engine/index.js";
import { isFence, resolveFences } from "./markdown/resolvers/resolver.js";
import {
  type CompilerConfig,
  type CompilerDeck,
  type CompilerLayout,
  type CompilerParameter,
  type CompilerSlot,
  CompilerSlotType,
  type CompilerThemeConfig,
  type MarkdownBlock,
  ParameterType,
  type ResolvedCompilerDeck,
} from "./markdown/types.js";

type ResolvedContent = Record<string, TextFill | TableFill | ImageFill | TemplateFill>;

/**
 * Narrow a resolved content map to the engine-shaped value union. Runs after
 * `resolveFences`, so no CodeFence or MermaidFence should remain — a leftover is
 * a resolver bug and throws. Every surviving value is already an engine fill
 * (TextFill / TableFill / ImageFill / TemplateFill), so no unwrapping is needed.
 */
function narrowContent(content: Record<string, MarkdownBlock>): ResolvedContent {
  const out: ResolvedContent = {};
  for (const [key, value] of Object.entries(content)) {
    if (isFence(value)) {
      throw new Error(
        `resolveDeck: slot "${key}" still holds an unresolved ${value.type} block ` +
          "after resolvers ran. This is a resolver bug.",
      );
    }
    out[key] = value;
  }
  return out;
}

/**
 * Run every compiler-owned resolver over `deck` (highlight code fences,
 * render mermaid PNGs) and return a `ResolvedCompilerDeck` whose content
 * values are narrowed to the engine's `TextFill | TableFill | ImageFill |
 * TemplateFill` union. Structurally equivalent to the engine's `Deck` — a
 * caller passes the returned value straight to `generate()` with no cast.
 *
 * Fails fast if `deck.output` is missing: downstream `generate()` requires it,
 * and the CLI populates it before calling `buildDeck`; a programmatic caller
 * that forgot to set it hits the error here instead of a confusing engine-side
 * failure.
 */
export async function resolveDeck(deck: CompilerDeck, config: CompilerConfig): Promise<ResolvedCompilerDeck> {
  await resolveFences(deck, config);
  if (deck.output === undefined) {
    throw new Error('resolveDeck: deck.output is not set. Set it (e.g. "deck.pptx") before calling buildDeck.');
  }
  return {
    theme: deck.theme,
    output: deck.output,
    steps: deck.steps.map((step) => {
      const resolvedStep: ResolvedCompilerDeck["steps"][number] = { layout: step.layout };
      if (step.content) resolvedStep.content = narrowContent(step.content);
      if (step.notes !== undefined) resolvedStep.notes = step.notes;
      return resolvedStep;
    }),
  };
}

/**
 * Project a CompilerParameter or CompilerSlot down to the engine's flat Slot.
 * Parameters (Template, Image) map straight to their engine equivalent; compiler-
 * only slot types (Code, Mermaid) map to Text / Image since their resolved
 * StyledParagraph[] / ImageFill content is filled by the corresponding engine
 * primitive once the compiler is done.
 *
 * The discriminated unions narrow per-variant fields, so the projection is a
 * straight switch over all six type values — no runtime "wrong field on wrong
 * type" checks; TypeScript enforces the invariants at authoring time.
 */
function toEngineSlot(slot: CompilerParameter | CompilerSlot): Slot {
  switch (slot.type) {
    case ParameterType.Template:
      // A text shape carries no top-level key — its template placeholders are the keys. The
      // compiler emits its expanded content under shapeName, so the engine slot
      // is keyed by shapeName too.
      return { key: slot.shapeName, shapeName: slot.shapeName, type: SlotType.Template };
    case ParameterType.Image:
      return { key: slot.key, shapeName: slot.shapeName, type: SlotType.Image };
    case CompilerSlotType.Text: {
      const result: Slot = { key: slot.key, shapeName: slot.shapeName, type: SlotType.Text };
      if (slot.startAt !== undefined) result.startAt = slot.startAt;
      return result;
    }
    case CompilerSlotType.Table:
      return { key: slot.key, shapeName: slot.shapeName, type: SlotType.Table };
    case CompilerSlotType.Code:
      // Highlighter resolves the code fence into StyledParagraph[]; engine
      // fills it via fillText.
      return { key: slot.key, shapeName: slot.shapeName, type: SlotType.Text };
    case CompilerSlotType.Mermaid:
      // Mermaid renderer produces a PNG (ImageFill); engine fills it via
      // fillImage. The fit lives on the ImageFill, not the engine Slot.
      return { key: slot.key, shapeName: slot.shapeName, type: SlotType.Image };
  }
}

function toEngineLayout(layout: CompilerLayout): Layout {
  return {
    name: layout.name,
    slideNumber: layout.slideNumber,
    description: layout.description,
    whenToUse: layout.whenToUse,
    whenNotToUse: layout.whenNotToUse,
    slots: [...layout.parameters.map(toEngineSlot), ...layout.slots.map(toEngineSlot)],
  };
}

/**
 * Project a CompilerThemeConfig down to the engine's ThemeConfig shape.
 * Fields are copied cell-by-cell so the boundary is explicit — no casts.
 * The compiler's `assets` catalog is intentionally NOT forwarded: the engine
 * is ignorant of theme-level asset metadata; the compiler resolves any asset
 * reference to a filesystem path and wraps it as an ImageFill in
 * `step.content` before this projection runs.
 */
export function toEngineThemeConfig(config: CompilerThemeConfig): ThemeConfig {
  const result: ThemeConfig = {
    layouts: config.layouts.map(toEngineLayout),
    template: config.template,
  };
  if (config.outputDir !== undefined) result.outputDir = config.outputDir;
  return result;
}

/**
 * Project a CompilerConfig down to the engine's Config shape. Explicit
 * projection at the boundary where compiler-only fields stop mattering.
 */
export function toEngineConfig(config: CompilerConfig): Config {
  return {
    ...toEngineThemeConfig(config),
    rootDir: config.rootDir,
  };
}

/**
 * End-to-end build: run compiler-owned resolvers (syntax highlighting, mermaid
 * PNG rendering) over the deck via `resolveDeck`, which returns a narrowed
 * `ResolvedCompilerDeck` — structurally equivalent to the engine's `Deck` —
 * then hand it to the engine's primitives-only `generate()`. No cast required:
 * the narrowing happens at the type level via `resolveDeck`.
 *
 * Mermaid PNGs are cached under `<outputDir>/.tycoslide-cache/mermaid/` so no
 * post-write cleanup is needed.
 */
export async function buildDeck(
  deck: CompilerDeck,
  config: CompilerConfig,
  options: GenerateOptions = {},
): Promise<void> {
  const resolved = await resolveDeck(deck, config);
  await generate(resolved, toEngineConfig(config), options);
}

export type {
  Config,
  Deck,
  DeckStep,
  GenerateOptions,
  ImageFill,
  Layout,
  Slot,
  StyledParagraph,
  TableFill,
  TextFill,
  TextRun,
  ThemeConfig,
} from "./engine/index.js";
// Engine — primitives-only public surface.
export { FitMode, fillImage, fillTable, fillTemplate, fillText, generate, SlotType } from "./engine/index.js";

// Authoring
export type { ManifestOptions } from "./manifest.js";
export { generateManifest } from "./manifest.js";
export type {
  AssetCatalog,
  AssetEntry,
  CodeFence,
  CompilerConfig,
  CompilerDeck,
  CompilerDeckStep,
  CompilerLayout,
  CompilerParameter,
  CompilerSlot,
  CompilerThemeConfig,
  MarkdownBlock,
  MermaidConfig,
  MermaidFence,
  MermaidVariant,
  ParsedDocument,
  RawSlide,
} from "./markdown/index.js";
// Markdown / Compiler
export { CompilerSlotType, compileMarkdownDeck, FenceType, ParameterType, resolveFences } from "./markdown/index.js";
