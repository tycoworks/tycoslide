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
  AcceptType,
  type CompilerBlock,
  type CompilerConfig,
  type CompilerDeck,
  type CompilerLayout,
  type CompilerParameter,
  type CompilerSlot,
  type CompilerThemeConfig,
} from "./markdown/types.js";
import { expandAssets } from "./skillZip.js";

/**
 * A frontmatter parameter always fills one physical shape on the layout's own
 * slide, so it projects to a single base `Block` (`sourceSlide === baseSlide`)
 * and never transplants — its `frame` is never read. `NO_FRAME` is that unread
 * placeholder; only body slots with a transplant block carry a real frame.
 */
const NO_FRAME: Frame = { x: 0, y: 0, cx: 0, cy: 0 };

// A text shape carries no top-level key — its template placeholders are the keys.
// The compiler emits its expanded content under shapeName, so the engine slot is
// keyed by shapeName too.
function paramToEngineSlot(param: CompilerParameter, baseSlide: number): Slot {
  return {
    key: param.shapeName,
    frame: NO_FRAME,
    accepts: [{ type: SlotType.Template, sourceSlide: baseSlide, shapeName: param.shapeName }],
  };
}

/**
 * Project a body slot's real `accepts` to engine `Block[]` and pass its `frame`
 * through. The compiler `accepts` already carry engine content types
 * (text/table/image) — code folded to text and mermaid to image at authoring —
 * so projection is 1:1. A slot with no declared `frame` (a base-only slot that
 * never transplants) gets `NO_FRAME`, which the engine never reads.
 */
/** Project one CompilerBlock variant onto its matching engine `Block` variant. */
function compilerBlockToEngineBlock(b: CompilerBlock): Block {
  switch (b.type) {
    case AcceptType.Text:
      return b.startAt !== undefined
        ? { type: SlotType.Text, sourceSlide: b.sourceSlide, shapeName: b.shapeName, startAt: b.startAt }
        : { type: SlotType.Text, sourceSlide: b.sourceSlide, shapeName: b.shapeName };
    case AcceptType.Table:
      return { type: SlotType.Table, sourceSlide: b.sourceSlide, shapeName: b.shapeName, bodyRows: b.bodyRows };
    case AcceptType.Image:
      return { type: SlotType.Image, sourceSlide: b.sourceSlide, shapeName: b.shapeName };
  }
}

function slotToEngineSlot(slot: CompilerSlot): Slot {
  return { key: slot.key, frame: slot.frame ?? NO_FRAME, accepts: slot.accepts.map(compilerBlockToEngineBlock) };
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
 * Mermaid PNGs are cached under `<rootDir>/.tycoslide-cache/mermaid/` (the theme
 * directory) so no post-write cleanup is needed.
 */
export async function buildDeck(
  deck: CompilerDeck,
  config: CompilerConfig,
  options: GenerateOptions = {},
): Promise<void> {
  if (deck.output === undefined) {
    throw new Error('buildDeck: deck.output is not set. Set it (e.g. "deck.pptx") before calling buildDeck.');
  }
  // A packaged theme ships its assets as one archive, because hosts cap how many
  // files a skill may contain. Expand it here rather than at compile: the catalog
  // is what an author reads, and only filling needs the bytes.
  await expandAssets(config.rootDir);

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
export { ASSETS_ARCHIVE, ASSETS_FILE } from "./files.js";
// Authoring
export { generateAssetCatalog, generateManifest } from "./manifest.js";
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
  MermaidConfig,
  MermaidVariant,
  ParsedDocument,
  RawSlide,
} from "./markdown/index.js";
// Markdown / Compiler
export { AcceptType, compileMarkdownDeck, loadThemeConfig, parseThemeConfig } from "./markdown/index.js";
export { expandAssets } from "./skillZip.js";
