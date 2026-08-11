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
 * generate() loads the template, registers media, and for each DeckStep walks
 * the unified `layout.slots`. Each value in `step.content` is dispatched by the
 * slot's type via `FILLERS[slot.type]` (required, no default).
 */

import { existsSync, rmSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { Automizer, modify } from "pptx-automizer";
import { FILLERS } from "./fillers/filler.js";
import { isImageFill } from "./fillers/image.js";
import { applyNotesToSlide, type NotesArchive, sweepOrphanNotes } from "./notes.js";
import type { Config, Deck, DeckStep, Layout, Slot } from "./types.js";

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
 *   3. For each deck step, clone the layout's source slide, then within the
 *      addSlide callback walk `layout.slots` once and dispatch by slot.type
 *      via `FILLERS[slot.type]`.
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

  // Register the media for every image slot. Each file is validated (absolute
  // paths are the caller's responsibility; a stray relative path trips the
  // existsSync guard here or readFileSync in fillImage) and handed to
  // pptx-automizer once per distinct filename.
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

  // pptx-automizer runs modifyElement callbacks during write() and SWALLOWS any
  // error they throw (it logs a stack trace but keeps going, producing a broken
  // slide). A fill primitive's fail-fast throw would therefore never fail the
  // build. Collect those errors and re-surface them after write().
  const fillErrors: Error[] = [];
  const captureFillErrors = (slide: any): void => {
    const modifyElement = slide.modifyElement.bind(slide);
    slide.modifyElement = (shapeName: string, callbacks: any[]) =>
      modifyElement(
        shapeName,
        callbacks.map((cb: unknown) =>
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
        ),
      );
  };

  // Populate one cloned slide: for each declared slot that the step supplies a
  // value for, hand the value to the filler registered for the slot's type.
  const fillSlide = (slide: any, layout: Layout, step: DeckStep): void => {
    captureFillErrors(slide);
    for (const slot of layout.slots) {
      const value = step.content?.[slot.key];
      if (value === undefined) continue;

      if (typeof value === "string") {
        // Fallback: bare string. Compiler normally normalizes to
        // StyledParagraph[] / ImageFill; this branch only fires when
        // callers construct decks by hand.
        slide.modifyElement(slot.shapeName, [modify.setText(value)]);
        continue;
      }

      const filler = FILLERS[slot.type];
      if (!filler.matches(value)) {
        throw new Error(
          `Layout "${step.layout}" slot "${slot.key}" (type "${slot.type}"): expected ${filler.label}, got ${describeValue(value)}`,
        );
      }
      filler.fill(slide, slot, value, { layoutName: step.layout });
    }
  };

  // Default: write authored notes and strip any template notes automizer clones
  // onto slides. When true, no notes are written but inherited notes are still
  // stripped — the deck is guaranteed notes-free.
  const excludeNotes = options.excludeNotes ?? false;

  for (const step of deck.steps) {
    const layout = resolveLayout(step.layout);
    pres.addSlide(sourceAlias, layout.slideNumber, (slide: any) => {
      fillSlide(slide, layout, step);
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

function describeValue(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "object") {
    const t = (v as { type?: unknown }).type;
    return typeof t === "string" ? `object (type="${t}")` : "object";
  }
  return typeof v;
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

// ── Content-slot validation (test-visible helper) ────────────────────────────

/**
 * Validate that every required slot on a layout is supplied. Type/shape
 * validation happens in the compiler now — this is a thin required-only
 * checker kept for tests and defensive callers.
 *
 * Exported for tests; not part of the public engine surface (index.ts).
 */
export function validateContentSlots(
  step: { layout: string; content?: Record<string, unknown> },
  tpl: { slots: Slot[] },
): void {
  const missing = tpl.slots.filter((s) => step.content?.[s.key] === undefined).map((s) => s.key);
  if (missing.length > 0) {
    throw new Error(`Layout "${step.layout}": missing content for slot(s): ${missing.join(", ")}`);
  }
}
