import {
  type Block,
  type Config,
  type Frame,
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
 * A frontmatter parameter always fills one physical shape on the layout's own
 * slide, so it projects to a single base `Block` (`sourceSlide === baseSlide`)
 * and never transplants — its `frame` is never read. `NO_FRAME` is that unread
 * placeholder; only body slots with a transplant block carry a real frame.
 */
const NO_FRAME: Frame = { x: 0, y: 0, cx: 0, cy: 0 };

function paramToEngineSlot(param: CompilerParameter, baseSlide: number): Slot {
  const block = (type: SlotType): Block => ({ type, sourceSlide: baseSlide, shapeName: param.shapeName });
  switch (param.type) {
    case ParameterType.Template:
      // A text shape carries no top-level key — its template placeholders are the keys. The
      // compiler emits its expanded content under shapeName, so the engine slot
      // is keyed by shapeName too.
      return { key: param.shapeName, frame: NO_FRAME, accepts: [block(SlotType.Template)] };
    case ParameterType.Image:
      return { key: param.key, frame: NO_FRAME, accepts: [block(SlotType.Image)] };
  }
}

/**
 * Project a body slot's real `accepts` to engine `Block[]` and pass its `frame`
 * through. The compiler `accepts` already carry engine content types
 * (text/table/image) — code folded to text and mermaid to image at authoring —
 * so projection is 1:1. A slot with no declared `frame` (a base-only slot that
 * never transplants) gets `NO_FRAME`, which the engine never reads.
 */
function slotToEngineSlot(slot: CompilerSlot): Slot {
  const accepts: Block[] = slot.accepts.map((b) => {
    const eb: Block = { type: b.type, sourceSlide: b.sourceSlide, shapeName: b.shapeName };
    if (b.startAt !== undefined) eb.startAt = b.startAt;
    return eb;
  });
  return { key: slot.key, frame: slot.frame ?? NO_FRAME, accepts };
}

/**
 * Compiler→engine boundary check: a slot with a transplant block (any block
 * whose `sourceSlide` differs from the layout's base slide) must declare a
 * `frame` — the real region the transplant is positioned into. A base-only slot
 * (all blocks in place) needs none. Missing → fail fast, naming layout + slot.
 * (The engine's `assertSlotsWellFormed` separately rejects duplicate accept
 * types.)
 */
function assertSlotFrames(layout: CompilerLayout): void {
  for (const slot of layout.slots) {
    const transplants = slot.accepts.some((b) => b.sourceSlide !== layout.slideNumber);
    if (transplants && slot.frame === undefined) {
      throw new Error(
        `Layout "${layout.name}" slot "${slot.key}": a transplant block (sourceSlide ≠ ${layout.slideNumber}) ` +
          'requires a "frame" (the region to position it into), but none is declared.',
      );
    }
  }
}

function toEngineLayout(layout: CompilerLayout): Layout {
  assertSlotFrames(layout);
  const base = layout.slideNumber;
  return {
    name: layout.name,
    baseSlide: base,
    slots: [...layout.parameters.map((p) => paramToEngineSlot(p, base)), ...layout.slots.map(slotToEngineSlot)],
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
export { fillImage, fillTable, fillTemplate, fillText, generate, SlotType } from "./engine/index.js";

// Authoring
export type { ManifestOptions } from "./manifest.js";
export { generateManifest } from "./manifest.js";
export type {
  AssetCatalog,
  AssetEntry,
  CodeFence,
  CompilerBlock,
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
export { AcceptType, compileMarkdownDeck, FenceType, ParameterType, resolveFences } from "./markdown/index.js";
