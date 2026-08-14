/**
 * PPTX Generation Engine — orchestration.
 *
 * `generate()` walks a Deck and dispatches each content value to one of four
 * `Filler` strategies (in `fillers/filler.ts`), each taking its matching `XFill`:
 *
 *   TemplateFill  → fillTemplate   Fills each paragraph in place from its template
 *     segments — styles are never read or changed. See fillers/template.ts.
 *
 *   TextFill  → fillText   Rebuilds a shape's paragraphs from harvested
 *     specimen styles (bullets, rich runs, syntax-highlighted code). See
 *     fillers/text.ts / dom.ts.
 *
 *   TableFill → fillTable  Clones specimen rows in the template's `<a:tbl>` and
 *     fills each cell's first paragraph. See fillers/table.ts.
 *
 *   ImageFill → fillImage  Points the picture's blip relationship at a new media
 *     file (registered by generate(), swapped by the ImageFiller) and adjusts
 *     geometry for the chosen fit. See fillers/image.ts.
 *
 * generate() loads the template, registers media, and for each DeckStep clones
 * the layout's base slide and calls `fillSlide`. Each value in `step.content`
 * selects, by its own shape, the `Block` in the slot's `accepts` whose type it
 * matches: a base-slide block fills in place; any other block is transplanted
 * from its source slide onto the clone, then filled with the same callbacks.
 *
 * `generate()` is first below; its helpers follow (function declarations hoist).
 */

import { existsSync, rmSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { Automizer, modify } from "pptx-automizer";
import { FILLERS, type FillTarget } from "./fillers/filler.js";
import { isImageFill } from "./fillers/image.js";
import { applyNotesToSlide, type NotesArchive, sweepOrphanNotes } from "./notes.js";
import type { Block, Config, Deck, DeckStep, Layout, Slot, SlotType } from "./types.js";

/** Options for `generate` / `buildDeck`. */
export type GenerateOptions = {
  /**
   * Suppress authored speaker notes. Default `false` (notes are written and any
   * template notes cloned onto slides are stripped). When `true`, no notes are
   * written but inherited template notes are still stripped — the deck is
   * guaranteed notes-free.
   */
  excludeNotes?: boolean;
};

/**
 * Generate a PPTX file from a deck definition and a theme configuration.
 *
 * Orchestration:
 *   1. Load the template; register it twice (as root and under an alias).
 *   2. Pre-register every image's media buffer with pptx-automizer, walking
 *      the unified `step.content` for ImageFill values.
 *   3. For each deck step, clone the layout's base slide, then within the
 *      addSlide callback call `fillSlide` to dispatch each content value to the
 *      matching `Block` (fill in place, or transplant + fill).
 *   4. Write the output PPTX.
 */
export async function generate(deck: Deck, config: Config, options: GenerateOptions = {}): Promise<void> {
  const { layouts, rootDir, template, outputDir } = config;
  const outFile = deck.output;
  const outDir = outputDir ?? process.cwd();

  const automizer = new Automizer({
    templateDir: resolve(rootDir, "template"),
    outputDir: outDir,
    removeExistingSlides: true,
    autoImportSlideMasters: true,
    useCreationIds: false,
    cleanup: true,
  });

  const sourceAlias = "source";
  const pres = automizer.loadRoot(template).load(template, sourceAlias);

  // Look up the layout a step targets; an unknown name is a hard error.
  const resolveLayout = (name: string): Layout => {
    const match = layouts.find((candidate) => candidate.name === name);
    if (!match) throw new Error(`Unknown layout: ${name}`);
    return match;
  };

  registerMedia(pres, deck);
  assertLayoutsWellFormed(layouts);

  // pptx-automizer runs fill callbacks during write() and SWALLOWS any error they
  // throw (it logs a stack trace but keeps going, producing a broken slide). A
  // fill primitive's fail-fast throw would therefore never fail the build. This
  // wraps BOTH fill entry points — `modifyElement` (in-place) and `addElement`
  // (transplant) — so a throw on a transplanted shape fails the build too.
  const fillErrors: Error[] = [];
  const wrapCallbacks = (callbacks: unknown): unknown => {
    const arr = Array.isArray(callbacks) ? callbacks : callbacks === undefined ? [] : [callbacks];
    return arr.map((cb: unknown) =>
      typeof cb === "function"
        ? (...args: unknown[]) => {
            try {
              return (cb as (...a: unknown[]) => unknown)(...args);
            } catch (err) {
              fillErrors.push(err instanceof Error ? err : new Error(String(err)));
              throw err;
            }
          }
        : cb,
    );
  };
  const captureFillErrors = (slide: any): void => {
    const modifyElement = slide.modifyElement.bind(slide);
    slide.modifyElement = (shapeName: string, callbacks: unknown) => modifyElement(shapeName, wrapCallbacks(callbacks));
    const addElement = slide.addElement.bind(slide);
    slide.addElement = (presName: string, slideNumber: number, selector: unknown, callbacks: unknown) =>
      addElement(presName, slideNumber, selector, wrapCallbacks(callbacks));
  };

  // Default: write authored notes and strip any template notes automizer clones
  // onto slides. When true, no notes are written but inherited notes are still
  // stripped — the deck is guaranteed notes-free.
  const excludeNotes = options.excludeNotes ?? false;

  for (const step of deck.steps) {
    const layout = resolveLayout(step.layout);
    pres.addSlide(sourceAlias, layout.baseSlide, (slide: any) => {
      captureFillErrors(slide);
      fillSlide(slide, layout, step, sourceAlias);
      // In-band notes pass: automizer runs this during write() and hands us the
      // OUTPUT archive (parent.targetArchive) and the real output slide number
      // (parent.targetNumber), so notes map 1:1 with no slide-number mapping.
      // Registered for EVERY slide — a slide without authored notes must still
      // have any auto-copied template notes stripped.
      slide.modify(async (_document: unknown, parent: any) => {
        await applyNotesToSlide(toNotesArchive(parent.targetArchive), parent.targetNumber, step.notes, excludeNotes);
      });
    });
  }

  // Sweep the template's orphaned notesSlides. This MUST be a presentation-level
  // modify callback, not part of the per-slide pass: per-slide callbacks run
  // during writeSlides(), BEFORE automizer truncates the template's original
  // slides and renumbers the deck — at which point every template notesSlide
  // still looks referenced by a not-yet-removed original slide. automizer runs
  // presentation modify callbacks after truncation, when a notesSlide's
  // referenced status is final. Runs regardless of excludeNotes — the leak
  // exists either way. Routed through toNotesArchive so the buffered
  // [Content_Types].xml write survives automizer's final buffer flush.
  pres.modify(async (_xml: unknown, _index: number | undefined, archive: any) => {
    await sweepOrphanNotes(toNotesArchive(archive));
  });

  await pres.write(outFile);

  if (fillErrors.length > 0) {
    // The output would be a broken deck — remove it so a failed build never
    // leaves a misleading artifact behind.
    rmSync(resolve(outDir, outFile), { force: true });
    const detail = fillErrors.map((e) => `  - ${e.message}`).join("\n");
    throw new Error(`generate: ${fillErrors.length} shape fill(s) failed while writing "${outFile}":\n${detail}`);
  }

  console.log(`tycoslide: built ${deck.steps.length} slide(s) → ${resolve(outDir, outFile)}`);
}

// ── generate() helpers ───────────────────────────────────────────────────────

/**
 * Register the media for every image slot. Each file is validated (absolute
 * paths are the caller's responsibility; a stray relative path trips the
 * existsSync guard here or readFileSync in fillImage) and handed to
 * pptx-automizer once per distinct filename.
 */
function registerMedia(pres: any, deck: Deck): void {
  const registeredMedia = new Set<string>();
  for (const step of deck.steps) {
    for (const value of Object.values(step.content ?? {})) {
      if (!isImageFill(value)) continue;
      if (!existsSync(value.path)) {
        throw new Error(`Layout "${step.layout}" image "${value.path}": file not found`);
      }
      const file = basename(value.path);
      if (registeredMedia.has(file)) continue;
      registeredMedia.add(file);
      pres.loadMedia(file, dirname(value.path));
    }
  }
}

// Validate every layout once, up front (see assertSlotsWellFormed).
function assertLayoutsWellFormed(layouts: Layout[]): void {
  for (const layout of layouts) assertSlotsWellFormed(layout);
}

function describeValue(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "object") {
    const t = (v as { type?: unknown }).type;
    return typeof t === "string" ? `object (type="${t}")` : "object";
  }
  return typeof v;
}

// ── Slot fill dispatch (composition-aware) ───────────────────────────────────

/**
 * Fill one cloned slide. Per slot the step supplies a value for: resolve WHICH
 * shape realizes it (`resolveBlock`), build WHAT to write (`FILLERS[…].callbacks`),
 * and place it WHERE/HOW (`applyBlock`). Every ambiguity fails fast, naming layout
 * + slot.
 *
 * Exported for tests; `generate()` calls it inside the `addSlide` callback.
 */
export function fillSlide(slide: any, layout: Layout, step: DeckStep, sourceAlias: string): void {
  assertNoUnknownSlots(step, layout);

  for (const slot of layout.slots) {
    const value = step.content?.[slot.key];
    if (value === undefined) continue; // Empty slot: leave the base slide's shape untouched.

    const block = resolveBlock(step, slot, value);
    const callbacks = FILLERS[block.type].callbacks(value, targetOf(block));
    applyBlock(slide, sourceAlias, layout.baseSlide, slot, block, callbacks);
  }
}

/** The SlotType a resolved `*Fill` value maps to, via the filler discriminators. */
function fillTypeOf(value: object): SlotType | undefined {
  for (const type of Object.keys(FILLERS) as SlotType[]) {
    if (FILLERS[type].matches(value)) return type;
  }
  return undefined;
}

/**
 * Reject a slot whose `accepts` lists two blocks of the same type — the
 * value→block lookup would silently pick the first. Called once per layout at
 * build start.
 */
export function assertSlotsWellFormed(layout: Layout): void {
  for (const slot of layout.slots) {
    const seen = new Set<SlotType>();
    for (const block of slot.accepts) {
      if (seen.has(block.type)) {
        throw new Error(
          `Layout "${layout.name}" slot "${slot.key}": accepts two ${block.type} blocks; each content type may appear once.`,
        );
      }
      seen.add(block.type);
    }
  }
}

/**
 * A deck supplying content for a slot the layout doesn't declare is an authoring
 * mistake, not a silent no-op. Runs per step, over `step.content`'s keys.
 */
function assertNoUnknownSlots(step: DeckStep, layout: Layout): void {
  const keys = new Set(layout.slots.map((s) => s.key));
  for (const key of Object.keys(step.content ?? {})) {
    if (!keys.has(key)) {
      const declared = layout.slots.map((s) => s.key).join(", ") || "none";
      throw new Error(`Layout "${step.layout}" has no slot "${key}" (declared slots: ${declared}).`);
    }
  }
}

/**
 * WHICH shape: pick the `Block` in `slot.accepts` whose type matches the value's
 * shape. Fails fast — first on an unrecognized value, then on a value no block
 * accepts (order matters; both messages are asserted).
 */
function resolveBlock(step: DeckStep, slot: Slot, value: object): Block {
  const requestedType = fillTypeOf(value);
  if (requestedType === undefined) {
    throw new Error(`Layout "${step.layout}" slot "${slot.key}": unrecognized content value ${describeValue(value)}.`);
  }
  const block = slot.accepts.find((b) => b.type === requestedType);
  if (!block) {
    const available = slot.accepts.map((b) => b.type).join(", ") || "none";
    throw new Error(
      `Layout "${step.layout}" slot "${slot.key}": no block accepts ${requestedType} content (this slot accepts: ${available}).`,
    );
  }
  return block;
}

/** The shape a filler targets, plus `startAt` when the (text) block declares it. */
function targetOf(block: Block): FillTarget {
  const target: FillTarget = { shapeName: block.shapeName };
  if (block.startAt !== undefined) target.startAt = block.startAt;
  return target;
}

/**
 * WHERE/HOW: place the (already-built) fill callbacks. A base-slide block is
 * already on the cloned slide → fill in place. Any other block is transplanted:
 * pptx-automizer runs an appended shape's callbacks against the imported element
 * itself, so the same callbacks refill it — position it to the slot's frame,
 * then remove the base shape it supersedes (a base block, if this slot has one —
 * a slot need not).
 */
function applyBlock(
  slide: any,
  sourceAlias: string,
  baseSlide: number,
  slot: Slot,
  block: Block,
  callbacks: unknown[],
): void {
  if (block.sourceSlide === baseSlide) {
    slide.modifyElement(block.shapeName, callbacks);
    return;
  }
  slide.addElement(sourceAlias, block.sourceSlide, block.shapeName, [modify.setPosition(slot.frame), ...callbacks]);
  const baseBlock = slot.accepts.find((b) => b.sourceSlide === baseSlide);
  if (baseBlock && baseBlock.shapeName !== block.shapeName) slide.removeElement(baseBlock.shapeName);
}

// ── Notes archive adapter (automizer-buffer glue) ────────────────────────────

/** Installed pptx-automizer version this notes-buffer adapter is pinned to. */
const PPTX_AUTOMIZER_VERSION = "0.8.2";

/**
 * The exact surface {@link toNotesArchive} consumes from pptx-automizer's OUTPUT
 * archive (`parent.targetArchive`, or the presentation-level `archive`). `buffer`
 * is automizer's internal cache of edited parts (`ArchivedFile[]`) — the load-
 * bearing assumption this adapter is pinned to.
 */
type AutomizerArchive = {
  buffer: { relativePath: string; content: any }[];
  read(file: string, type: "string"): Promise<string | Buffer>;
  write(file: string, data: string): Promise<unknown>;
  remove(file: string): Promise<void>;
  fileExists(file: string): boolean;
  folder(dir: string): Promise<{ name: string; relativePath: string }[]>;
};

/**
 * Bridge pptx-automizer's OUTPUT archive (`parent.targetArchive`) to the minimal
 * {@link NotesArchive} surface, cooperating with automizer's XML buffer.
 *
 * automizer caches every part it edits via `readXml`/`writeXml` — for a cloned
 * slide's notes that means `slide{N}.xml.rels`, `notesSlide{N}.xml.rels`, and
 * `[Content_Types].xml` — as a parsed document, then re-serializes the cache over
 * the zip at write() time. A plain `write`/`remove` to those parts is therefore
 * silently reverted at the final flush. This adapter reads the buffered
 * (automizer-current) content and steers writes/removes back through the same
 * buffer, so `applyNotesToSlide` stays pure over string+xmldom while its edits
 * survive. The notes PART (`notesSlide{N}.xml`) is copied raw and never buffered,
 * so it round-trips as a plain zip entry. The buffer holds docs parsed by the one
 * installed `@xmldom/xmldom`, so our parser/serializer operate on them safely.
 */
function toNotesArchive(target: AutomizerArchive): NotesArchive {
  // Fail loud if automizer's internals no longer expose the buffer array this
  // adapter steers writes through: without it, every buffered write would be
  // silently reverted at the final flush, corrupting the deck with no error.
  if (!Array.isArray(target.buffer)) {
    throw new Error(
      "Speaker notes: expected the pptx-automizer archive to expose a `buffer` array " +
        `(pinned to pptx-automizer ${PPTX_AUTOMIZER_VERSION}); its internals may have changed. ` +
        "Re-verify the notes buffer adapter before relying on it.",
    );
  }
  const buffer = target.buffer;
  const buffered = (file: string) => buffer.find((entry) => entry.relativePath === file);
  return {
    async read(file: string, type: "string"): Promise<string | Buffer> {
      const entry = buffered(file);
      return entry ? new XMLSerializer().serializeToString(entry.content) : target.read(file, type);
    },
    async write(file: string, data: string): Promise<unknown> {
      const entry = buffered(file);
      if (entry) entry.content = new DOMParser().parseFromString(data, "application/xml");
      return target.write(file, data);
    },
    async remove(file: string): Promise<void> {
      const index = buffer.findIndex((entry) => entry.relativePath === file);
      if (index !== -1) buffer.splice(index, 1);
      await target.remove(file);
    },
    fileExists(file: string): boolean {
      return buffered(file) !== undefined || target.fileExists(file);
    },
    async folder(dir: string): Promise<{ name: string; relativePath: string }[]> {
      return target.folder(dir);
    },
  };
}
