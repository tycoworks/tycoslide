import {
  type Block,
  type Config,
  type Deck,
  type Frame,
  type GenerateOptions,
  generate,
  type Layout,
  type Slot,
  SlotType,
  type ThemeConfig,
} from "./engine/index.js";
import {
  type CompilerConfig,
  type CompilerDeck,
  type CompilerLayout,
  type CompilerParameter,
  type CompilerSlot,
  type CompilerThemeConfig,
  ParameterType,
} from "./markdown/types.js";

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
 * End-to-end build: `compileDeck` already produced engine-shaped content (code
 * highlighted, mermaid rendered), so `buildDeck` only asserts an `output` is set
 * and hands the deck to the engine's primitives-only `generate()`. The deck is
 * structurally equivalent to the engine's `Deck` once `output` is present, so no
 * cast is required. `buildDeck` does not itself validate `config` — a
 * programmatic caller assembling a `CompilerConfig` by hand should load it
 * through `loadThemeConfig` (or `parseThemeConfig`) first to get the same
 * fail-fast structural checks the CLI gets.
 *
 * Fails fast if `deck.output` is missing: `generate()` requires it, and the CLI
 * populates it before calling `buildDeck`; a programmatic caller that forgot to
 * set it hits this error instead of a confusing engine-side failure.
 *
 * Mermaid PNGs are cached under `<outputDir>/.tycoslide-cache/mermaid/` so no
 * post-write cleanup is needed.
 */
export async function buildDeck(
  deck: CompilerDeck,
  config: CompilerConfig,
  options: GenerateOptions = {},
): Promise<void> {
  if (deck.output === undefined) {
    throw new Error('buildDeck: deck.output is not set. Set it (e.g. "deck.pptx") before calling buildDeck.');
  }
  const engineDeck: Deck = { theme: deck.theme, output: deck.output, steps: deck.steps };
  await generate(engineDeck, toEngineConfig(config), options);
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
export { generateManifest } from "./manifest.js";
export type {
  AssetCatalog,
  AssetEntry,
  CompilerBlock,
  CompilerConfig,
  CompilerDeck,
  CompilerDeckStep,
  CompilerLayout,
  CompilerParameter,
  CompilerSlot,
  CompilerThemeConfig,
  EngineFill,
  Limit,
  MermaidConfig,
  MermaidVariant,
  ParsedDocument,
  RawSlide,
} from "./markdown/index.js";
// Markdown / Compiler
export { AcceptType, compileMarkdownDeck, loadThemeConfig, ParameterType, parseThemeConfig } from "./markdown/index.js";
