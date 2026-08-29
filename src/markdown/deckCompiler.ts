import { resolve } from "node:path";
import { type ImageFill, ImageFit, SlotType } from "../engine/index.js";
import { parseSlotContent } from "./blocks/registry.js";
import { validateSlideFrontmatter } from "./schema/deckSchema.js";
import type { ParsedDocument, RawSlide } from "./slideParser.js";
import { templateKeys, templateToSegments } from "./textTemplate.js";
import {
  type AcceptType,
  AssetType,
  type CompilerConfig,
  type CompilerDeck,
  type CompilerDeckStep,
  type CompilerLayout,
  type CompilerParameter,
  type CompilerSlot,
  type EngineFill,
  RESERVED_KEY,
} from "./types.js";

/** Map each semantic asset type to the engine's object-fit directive. */
const FIT_FOR: Record<AssetType, ImageFit> = {
  [AssetType.Icon]: ImageFit.ScaleDown,
  [AssetType.Image]: ImageFit.Contain,
  [AssetType.Background]: ImageFit.Cover,
};

/**
 * Wrap an absolute image path as an ImageFill, expanding the resolved asset
 * `type` into the engine's scaling constraints. Callers resolve the path (see
 * `resolveImagePath`) and the type (from the catalog) first.
 */
export function toImageFill(path: string, type: AssetType): ImageFill {
  return { type: SlotType.Image, path, fit: FIT_FOR[type] };
}

const KNOWN_GLOBAL_KEYS: Set<string> = new Set([RESERVED_KEY.THEME]);

// Anchored whole-field reference: the entire value is `$category.name` or it is
// not a reference at all. Anchored ⇒ no escaping concerns.
const ASSET_REF_RE = /^\$([a-zA-Z]\w*)\.([a-zA-Z]\w*)$/;

/** Resolve a `$category.name` catalog reference to an ImageFill. */
type ResolveAssetRef = (ref: string) => ImageFill;

/**
 * Assert that a region's parsed block folds to a type the slot `accepts`. The
 * folded type comes straight from `parseSlotContent` (which returns it beside
 * the block — no re-probe). A slot may accept several types (text/table/image);
 * the author's markdown shape selects one. A type the slot does not accept fails
 * fast, naming the layout, slot, the type it got, and the types the slot accepts.
 */
function assertSlotRegion(
  slot: CompilerSlot,
  got: AcceptType,
  layoutName: string,
  slideNo: number,
  source: string,
): void {
  if (!slot.accepts.some((b) => b.type === got)) {
    const accepted = slot.accepts.map((b) => b.type).join(", ");
    throw new Error(
      `Slide ${slideNo}: layout "${layoutName}" slot "${slot.key}" does not accept ${got} content ` +
        `(from ${source}); it accepts: ${accepted}.`,
    );
  }
}

/**
 * Resolve a catalog image path against the deck's root directory.
 * When `rootDir` is empty, the path is returned unchanged so callers that
 * already produce absolute paths (or callers that don't care about
 * resolution) can opt out. Absolute paths always pass through.
 */
function resolveImagePath(rootDir: string, path: string): string {
  if (!rootDir || path.startsWith("/")) return path;
  return resolve(rootDir, path);
}

/**
 * Assert no two layouts sample the same base slide. In the sampled-composition
 * model one layout is one sampled base slide's region-arrangement, so a shared
 * `slideNumber` means two layouts on one physical slide that should be one
 * multi-`accepts` layout.
 * `sourceSlide` inside a slot's `accepts` block is a distinct concept (a
 * specimen source for one content type) and is legitimately reused across
 * layouts, so it is deliberately not checked here.
 */
function assertUniqueSlideNumbers(layouts: CompilerLayout[]): void {
  const layoutNameBySlideNumber = new Map<number, string>();
  for (const layout of layouts) {
    const existing = layoutNameBySlideNumber.get(layout.slideNumber);
    if (existing !== undefined) {
      throw new Error(
        `Layouts "${existing}" and "${layout.name}" share slideNumber ${layout.slideNumber}; ` +
          "each layout must sample a distinct base slide (one layout = one slide, with slots that accept multiple content types).",
      );
    }
    layoutNameBySlideNumber.set(layout.slideNumber, layout.name);
  }
}

/**
 * Validate a layout's key spaces once, independent of any slide, so every later
 * frontmatter lookup and content-map write is unambiguous. Two spaces must each
 * be collision-free — otherwise a fill silently clobbers or throws a misleading
 * error:
 *
 * - **Author keys** — what a frontmatter line addresses: every parameter's placeholder
 *   keys must be distinct across the layout, so a line routes to exactly one parameter.
 * - **Content keys** — what `step.content` is addressed by: every parameter's
 *   `shapeName` and every slot key must be distinct, so no two overwrite each other in
 *   the content map.
 *
 * Also rejects a required template parameter whose template has no keys — it declares
 * no way to be filled, so `required` on it is unsatisfiable.
 */
function validateLayout(layout: CompilerLayout): void {
  const authorKeys = new Set<string>();
  const contentKeys = new Set<string>();

  const claimAuthorKey = (key: string, owner: string): void => {
    if (authorKeys.has(key)) {
      throw new Error(
        `Layout "${layout.name}": key "${key}" (${owner}) is declared twice; a frontmatter key fills exactly one parameter.`,
      );
    }
    authorKeys.add(key);
  };
  const claimContentKey = (key: string, owner: string): void => {
    if (contentKeys.has(key)) {
      throw new Error(
        `Layout "${layout.name}": name "${key}" (${owner}) collides with another parameter or slot; ` +
          "each parameter's shape and each slot key must be distinct.",
      );
    }
    contentKeys.add(key);
  };

  for (const param of layout.parameters) {
    const keys = templateKeys(param.template);
    if (param.required && keys.length === 0) {
      throw new Error(
        `Layout "${layout.name}": parameter "${param.shapeName}" is marked required but its template has no keys to fill.`,
      );
    }
    for (const key of keys) claimAuthorKey(key, `parameter "${param.shapeName}"`);
    claimContentKey(param.shapeName, "parameter");
  }
  for (const slot of layout.slots) {
    claimContentKey(slot.key, "slot");
  }
}

async function compileStep(
  slide: RawSlide,
  config: CompilerConfig,
  resolveAssetRef: ResolveAssetRef,
): Promise<CompilerDeckStep> {
  const { layouts } = config;
  const { frontmatter, slots, index } = slide;
  // Slide numbers in errors are 1-based, matching how an author counts slides in
  // the deck file. Derive it once: every message below, and the parse-time errors
  // in slideParser, must agree or the author looks at the wrong slide.
  const slideNo = index + 1;

  const layout = frontmatter[RESERVED_KEY.LAYOUT];
  if (layout === undefined) {
    throw new Error(`Slide ${slideNo}: missing required "${RESERVED_KEY.LAYOUT}" in frontmatter`);
  }

  // Speaker notes are slide-level metadata, stripped from frontmatter before
  // slot/param resolution — exactly like `layout`. Coerce to string if present.
  // An empty `notes:` key parses as YAML null; treat it as absent (loose `==`)
  // so it doesn't write the literal string "null".
  const notesRaw = frontmatter[RESERVED_KEY.NOTES];
  const notes = notesRaw == null ? undefined : String(notesRaw);

  const layoutName = String(layout);
  const layoutDef = layouts.find((l) => l.name === layoutName);
  if (!layoutDef) {
    const known = layouts.map((l) => l.name).join(", ");
    throw new Error(`Slide ${slideNo}: unknown layout "${layoutName}". Available layouts: ${known}`);
  }

  // Reject any frontmatter key not declared by this layout's parameters (reserved
  // layout/notes stripped first). The per-layout strict schema IS the unknown-key
  // check — it fires before the resolution loop, so that loop only sees valid keys.
  validateSlideFrontmatter(frontmatter, layoutDef, slideNo);

  // Map each author-facing key to the parameter that declares it. validateLayout
  // (run once per layout in compileDeck) has already proven these keys are
  // collision-free, so a later lookup is unambiguous.
  const templateParamByKey = new Map<string, CompilerParameter>();
  for (const param of layoutDef.parameters) {
    for (const key of templateKeys(param.template)) templateParamByKey.set(key, param);
  }

  const slotsByKey = new Map(layoutDef.slots.map((s) => [s.key, s]));

  const content: Record<string, EngineFill> = {};

  // Frontmatter lines fill template-parameter keys, gathered per parameter and
  // expanded together once every line is read.
  const valuesByTemplateParam = new Map<CompilerParameter, Map<string, string>>();
  for (const [key, value] of Object.entries(frontmatter)) {
    if (key === RESERVED_KEY.LAYOUT || key === RESERVED_KEY.NOTES) continue;

    const templateParam = templateParamByKey.get(key);
    if (templateParam) {
      let bucket = valuesByTemplateParam.get(templateParam);
      if (!bucket) {
        bucket = new Map();
        valuesByTemplateParam.set(templateParam, bucket);
      }
      bucket.set(key, String(value));
    }
    // Unreachable: validateSlideFrontmatter (above) already rejected any key that is
    // not a reserved key, so every key here routes to a parameter.
  }

  // Expand each template parameter whose keys were supplied. Filling any key fills the
  // parameter as a whole — a missing key throws (fail-fast in templateToSegments). A
  // parameter with no supplied keys stays designer-sample unless required. Content
  // is keyed by shapeName: one parameter → one entry, regardless of key count.
  for (const templateParam of layoutDef.parameters) {
    const supplied = valuesByTemplateParam.get(templateParam);
    if (!supplied) {
      if (templateParam.required) {
        throw new Error(
          `Slide ${slideNo}: layout "${layoutName}" requires parameter "${templateParam.shapeName}" ` +
            `(keys: ${templateKeys(templateParam.template).join(", ")}); none provided`,
        );
      }
      continue;
    }
    content[templateParam.shapeName] = {
      lines: templateToSegments(templateParam.template, supplied, templateParam.shapeName),
    };
  }

  // `::name::` regions resolve against the layout's slots.
  for (const [name, text] of Object.entries(slots)) {
    const slot = slotsByKey.get(name);
    if (!slot) {
      throw new Error(
        `Slide ${slideNo}: unknown slot "::${name}::" in layout "${layoutName}". ` +
          `Valid slots: ${[...slotsByKey.keys()].join(", ")}`,
      );
    }
    const source = `::${name}::`;
    const parsed = parseSlotContent(text, {
      resolveAssetRef,
      layoutName,
      slideNo: slideNo,
      source,
      config,
      layoutVariant: layoutDef.variant,
    });
    assertSlotRegion(slot, parsed.acceptType, layoutName, slideNo, source);
    content[name] = await parsed.fill();
  }

  // A required slot with no region throws with layout + key context. Required
  // parameters are enforced during template expansion above.
  for (const slot of layoutDef.slots) {
    if (slot.required && content[slot.key] === undefined) {
      throw new Error(`Slide ${slideNo}: layout "${layoutName}" requires slot "${slot.key}"; none provided`);
    }
  }

  // Content values are already engine fills — code fences highlighted to TextFill
  // and mermaid fences rendered to ImageFill by their handler's `compile`.
  const step: CompilerDeckStep = { layout: layoutName, content };
  if (notes !== undefined) step.notes = notes;
  return step;
}

/**
 * Compile a parsed deck document against a theme `config`. Each slide's content
 * is compiled straight into engine fills — prose/tables/images plus highlighted
 * code (Shiki) and rendered mermaid (PNG) — so the returned deck is
 * engine-shaped, ready for `buildDeck`.
 *
 * `config.rootDir` is the base directory for resolving relative image paths
 * declared in the deck's frontmatter or named slots. When empty, image paths are
 * returned unchanged — callers that already produce absolute paths (or don't need
 * resolution, e.g. unit tests) rely on the pass-through. When set, relative paths
 * are resolved to absolute via `path.resolve(rootDir, path)`; absolute paths pass
 * through. `config.codeTheme` / `config.mermaid` / `config.mermaidVariant` feed
 * the code and mermaid compiles.
 */
export async function compileDeck(doc: ParsedDocument, config: CompilerConfig): Promise<CompilerDeck> {
  const { layouts, rootDir, assets } = config;

  const theme = doc.global[RESERVED_KEY.THEME];
  if (theme === undefined) {
    throw new Error(`Missing required "${RESERVED_KEY.THEME}" in global frontmatter`);
  }

  const unknownGlobal = Object.keys(doc.global).filter((k) => !KNOWN_GLOBAL_KEYS.has(k));
  if (unknownGlobal.length > 0) {
    throw new Error(
      `Unknown key(s) in global frontmatter: ${unknownGlobal.join(", ")}. Valid keys: ${[...KNOWN_GLOBAL_KEYS].join(", ")}`,
    );
  }

  // Validate the layout list as a whole (one pass), then each layout's key
  // spaces up front (once per layout), so a broken theme fails fast regardless
  // of which layouts this deck's slides use.
  assertUniqueSlideNumbers(layouts);
  for (const layout of layouts) validateLayout(layout);

  // Resolve a `$category.name` reference against the theme's curated asset
  // catalog. Anchored ⇒ the whole ref is the reference or it is nothing; a found
  // entry wraps through `toImageFill`, which maps the asset's declared type to
  // its ImageFit.
  const resolveAssetRef: ResolveAssetRef = (ref) => {
    const match = ASSET_REF_RE.exec(ref);
    if (!match) {
      throw new Error(`Asset reference "${ref}" must be in the form $category.name (e.g. $logos.primary).`);
    }
    const [, category, name] = match;
    const entry = assets[category]?.[name];
    if (!entry) {
      // Every asset in the catalog is far too many to read (mz-slides has 126).
      // A known category narrows it to that category's names, which is what the
      // author is choosing between; an unknown one lists the categories instead.
      const group = assets[category];
      const available = group
        ? Object.keys(group)
            .map((n) => `$${category}.${n}`)
            .join(", ")
        : Object.keys(assets)
            .map((c) => `$${c}.*`)
            .join(", ");
      throw new Error(`Unknown asset reference "${ref}". Available: ${available}`);
    }
    return toImageFill(resolveImagePath(rootDir, entry.path), entry.type);
  };

  // Slides compile in order: a slide's structural errors (unknown layout/key,
  // bad asset ref, accept-type mismatch) fire before its own content is rendered.
  const steps: CompilerDeckStep[] = [];
  for (const slide of doc.slides) {
    steps.push(await compileStep(slide, config, resolveAssetRef));
  }
  return { theme: String(theme), steps };
}
