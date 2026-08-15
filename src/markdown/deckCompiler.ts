import { resolve } from "node:path";
import { FILLERS, type ImageFill, ImageFit, SlotType, type TextFill } from "../engine/index.js";
import { parseGfmTable, parseStyledParagraph } from "./parsers.js";
import { RESOLVERS } from "./resolvers/resolver.js";
import type { ParsedDocument, RawSlide } from "./slideParser.js";
import { templateKeys, templateToSegments } from "./textTemplate.js";
import {
  AcceptType,
  type AssetCatalog,
  AssetType,
  type CodeFence,
  type CompilerDeck,
  type CompilerDeckStep,
  type CompilerImageParameter,
  type CompilerLayout,
  type CompilerParameter,
  type CompilerSlot,
  type CompilerTemplateParameter,
  FenceType,
  type MarkdownBlock,
  type MermaidFence,
  ParameterType,
} from "./types.js";

/**
 * Wrap an absolute image path as an ImageFill, expanding the resolved asset
 * `type` into the engine's scaling constraints. Callers resolve the path (see
 * `resolveImagePath`) and the type (from the catalog) first.
 */
/** Map each semantic asset type to the engine's object-fit directive. */
const FIT_FOR: Record<AssetType, ImageFit> = {
  [AssetType.Icon]: ImageFit.ScaleDown,
  [AssetType.Image]: ImageFit.Contain,
  [AssetType.Background]: ImageFit.Cover,
};

export function toImageFill(path: string, type: AssetType): ImageFill {
  return { type: SlotType.Image, path, fit: FIT_FOR[type] };
}

/**
 * Reserved keys in a deck's frontmatter — global (theme, output) and per-slide
 * (layout, body). Exported so callers (e.g. cli.ts) reference the constants
 * instead of literal strings.
 */
export const RESERVED_KEY = {
  LAYOUT: "layout",
  BODY: "body",
  OUTPUT: "output",
  THEME: "theme",
  NOTES: "notes",
} as const;

const CODE_FENCE_RE = /^```(\w+)\n([\s\S]*?)```\s*$/;

function toTextFill(text: string): TextFill {
  const paragraphs = text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map(parseStyledParagraph);
  return { paragraphs };
}

function parseSlotContent(text: string): MarkdownBlock {
  const fence = CODE_FENCE_RE.exec(text.trim());
  if (fence) {
    if (fence[1] === FenceType.Mermaid) {
      const block: MermaidFence = { type: FenceType.Mermaid, definition: fence[2].replace(/\n$/, "") };
      return block;
    }
    const block: CodeFence = { type: FenceType.Code, language: fence[1], source: fence[2].replace(/\n$/, "") };
    return block;
  }
  const table = parseGfmTable(text);
  if (table) return table;
  return toTextFill(text);
}

/**
 * Fold a parsed region block down to the single engine content type it fills.
 * A code fence highlights into text; a mermaid fence renders into an image; a
 * GFM table is a table; everything else (prose) is text. Composed from the
 * compiler's `RESOLVERS` (code, mermaid) and the engine's `FILLERS` (table) so
 * the classification tracks whatever those registries say a block looks like.
 */
function acceptTypeOf(block: MarkdownBlock): AcceptType {
  if (RESOLVERS[FenceType.Code].matches(block)) return AcceptType.Text;
  if (RESOLVERS[FenceType.Mermaid].matches(block)) return AcceptType.Image;
  if (FILLERS[SlotType.Table].matches(block)) return AcceptType.Table;
  if (FILLERS[SlotType.Image].matches(block)) return AcceptType.Image;
  return AcceptType.Text;
}

/**
 * Assert that a region's parsed block folds to a type the slot `accepts`. Called
 * after `parseSlotContent` narrows a body/`::name::` region into a MarkdownBlock.
 * A slot may accept several types (text/table/image); the author's markdown
 * shape selects one. A block whose folded type is not accepted fails fast,
 * naming the layout, slot, the type it got, and the types the slot accepts.
 */
function assertSlotRegion(
  slot: CompilerSlot,
  block: MarkdownBlock,
  layoutName: string,
  slideIdx: number,
  source: string,
): void {
  const got = acceptTypeOf(block);
  if (!slot.accepts.some((b) => b.type === got)) {
    const accepted = slot.accepts.map((b) => b.type).join(", ");
    throw new Error(
      `Slide ${slideIdx}: layout "${layoutName}" slot "${slot.key}" does not accept ${got} content ` +
        `(from ${source}); it accepts: ${accepted}.`,
    );
  }
}

function isImageParameter(param: CompilerParameter): param is CompilerImageParameter {
  return param.type === ParameterType.Image;
}

function isTemplateParameter(param: CompilerParameter): param is CompilerTemplateParameter {
  return param.type === ParameterType.Template;
}

/**
 * Resolve a user-supplied image path against the deck's root directory.
 * When `rootDir` is empty, the path is returned unchanged so callers that
 * already produce absolute paths (or callers that don't care about
 * resolution) can opt out. Absolute paths always pass through.
 */
function resolveImagePath(rootDir: string, path: string): string {
  if (!rootDir || path.startsWith("/")) return path;
  return resolve(rootDir, path);
}

/**
 * Validate a layout's key spaces once, independent of any slide, so every later
 * frontmatter lookup and content-map write is unambiguous. Two spaces must each
 * be collision-free — otherwise a fill silently clobbers or throws a misleading
 * error:
 *
 * - **Author keys** — what a frontmatter line addresses: every template-parameter key
 *   and every image-parameter key must be distinct, so a line routes to exactly
 *   one parameter.
 * - **Content keys** — what `step.content` is addressed by: every image key, every
 *   template parameter's `shapeName`, and every slot key must be distinct, so no two
 *   overwrite each other in the content map.
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
          "each template parameter's shape, image key, and slot key must be distinct.",
      );
    }
    contentKeys.add(key);
  };

  for (const param of layout.parameters) {
    if (isImageParameter(param)) {
      claimAuthorKey(param.key, "image parameter");
      claimContentKey(param.key, "image parameter");
    } else {
      const keys = templateKeys(param.template);
      if (param.required && keys.length === 0) {
        throw new Error(
          `Layout "${layout.name}": template parameter "${param.shapeName}" is marked required but its template has no keys to fill.`,
        );
      }
      for (const key of keys) claimAuthorKey(key, `template parameter "${param.shapeName}"`);
      claimContentKey(param.shapeName, "template parameter");
    }
  }
  for (const slot of layout.slots) {
    claimContentKey(slot.key, "slot");
  }
}

function compileStep(
  slide: RawSlide,
  layouts: CompilerLayout[],
  rootDir: string,
  assetTypeByPath: Map<string, AssetType>,
): CompilerDeckStep {
  const { frontmatter, body, slots, index } = slide;

  const layout = frontmatter[RESERVED_KEY.LAYOUT];
  if (layout === undefined) {
    throw new Error(`Slide ${index}: missing required "${RESERVED_KEY.LAYOUT}" in frontmatter`);
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
    throw new Error(`Slide ${index}: unknown layout "${layoutName}". Available layouts: ${known}`);
  }

  // Map each author-facing key to its owning parameter: template keys → the template
  // parameter that declares them, image keys → the image parameter. validateLayout
  // (run once per layout in compileDeck) has already proven these key spaces are
  // collision-free, so a later lookup is unambiguous.
  const templateParams = layoutDef.parameters.filter(isTemplateParameter);
  const imageByKey = new Map<string, CompilerImageParameter>();
  const templateParamByKey = new Map<string, CompilerTemplateParameter>();
  for (const param of layoutDef.parameters) {
    if (isImageParameter(param)) {
      imageByKey.set(param.key, param);
    } else {
      for (const key of templateKeys(param.template)) templateParamByKey.set(key, param);
    }
  }

  const slotsByKey = new Map(layoutDef.slots.map((s) => [s.key, s]));

  const content: Record<string, MarkdownBlock> = {};

  // Frontmatter lines fill image parameters (by key) or template-parameter keys
  // (gathered per parameter, expanded together once every line is read).
  const valuesByTemplateParam = new Map<CompilerTemplateParameter, Map<string, string>>();
  for (const [key, value] of Object.entries(frontmatter)) {
    if (key === RESERVED_KEY.LAYOUT || key === RESERVED_KEY.NOTES) continue;

    const image = imageByKey.get(key);
    if (image) {
      const imgPath = resolveImagePath(rootDir, String(value));
      const assetType = assetTypeByPath.get(imgPath);
      if (assetType === undefined) {
        throw new Error(
          `Slide image "${image.key}": "${value}" has no asset-catalog entry, so no type. ` +
            `Add it to the theme's assets with a type (icon | image | background).`,
        );
      }
      content[image.key] = toImageFill(imgPath, assetType);
      continue;
    }

    const templateParam = templateParamByKey.get(key);
    if (templateParam) {
      let bucket = valuesByTemplateParam.get(templateParam);
      if (!bucket) {
        bucket = new Map();
        valuesByTemplateParam.set(templateParam, bucket);
      }
      bucket.set(key, String(value));
      continue;
    }

    const validKeys = [...templateParamByKey.keys(), ...imageByKey.keys()].join(", ");
    throw new Error(`Slide ${index}: unknown key "${key}" in layout "${layoutName}". Valid parameters: ${validKeys}`);
  }

  // Expand each template parameter whose keys were supplied. Filling any key fills the
  // parameter as a whole — a missing key throws (fail-fast in templateToSegments). A
  // parameter with no supplied keys stays designer-sample unless required. Content
  // is keyed by shapeName: one parameter → one entry, regardless of key count.
  for (const templateParam of templateParams) {
    const supplied = valuesByTemplateParam.get(templateParam);
    if (!supplied) {
      if (templateParam.required) {
        throw new Error(
          `Slide ${index}: layout "${layoutName}" requires template parameter "${templateParam.shapeName}" ` +
            `(keys: ${templateKeys(templateParam.template).join(", ")}); none provided`,
        );
      }
      continue;
    }
    content[templateParam.shapeName] = {
      lines: templateToSegments(templateParam.template, supplied, templateParam.shapeName),
    };
  }

  // The default body region resolves against the layout's body slot.
  if (body.trim()) {
    const bodySlot = slotsByKey.get(RESERVED_KEY.BODY);
    if (!bodySlot) {
      throw new Error(
        `Slide ${index}: layout "${layoutName}" does not accept body content. Valid slots: ${[...slotsByKey.keys()].join(", ")}`,
      );
    }
    const parsedBody = parseSlotContent(body);
    assertSlotRegion(bodySlot, parsedBody, layoutName, index, "body content");
    content[RESERVED_KEY.BODY] = parsedBody;
  }

  // `::name::` regions resolve against the layout's slots.
  for (const [name, text] of Object.entries(slots)) {
    const slot = slotsByKey.get(name);
    if (!slot) {
      throw new Error(
        `Slide ${index}: unknown slot "::${name}::" in layout "${layoutName}". ` +
          `Valid slots: ${[...slotsByKey.keys()].join(", ")}`,
      );
    }
    const block = parseSlotContent(text);
    assertSlotRegion(slot, block, layoutName, index, `::${name}::`);
    content[name] = block;
  }

  // Required image parameters (missing frontmatter key) and required slots
  // (missing region) throw with layout + key context. Required template parameters are
  // enforced during expansion above.
  for (const image of imageByKey.values()) {
    if (image.required && content[image.key] === undefined) {
      throw new Error(`Slide ${index}: layout "${layoutName}" requires parameter "${image.key}"; none provided`);
    }
  }
  for (const slot of layoutDef.slots) {
    if (slot.required && content[slot.key] === undefined) {
      throw new Error(`Slide ${index}: layout "${layoutName}" requires slot "${slot.key}"; none provided`);
    }
  }

  // CompilerDeckStep.content values are MarkdownBlock — CodeFence and
  // MermaidFence are legal in transit until the resolvers narrow them into
  // StyledParagraph[] / ImageFill before the engine sees the deck.
  const step: CompilerDeckStep = { layout: layoutName, content };
  if (notes !== undefined) step.notes = notes;
  return step;
}

const KNOWN_GLOBAL_KEYS: Set<string> = new Set([RESERVED_KEY.THEME, RESERVED_KEY.OUTPUT]);

/**
 * Compile a parsed deck document against a set of layouts.
 *
 * `rootDir` (optional) is the base directory for resolving relative image
 * paths declared in the deck's frontmatter or named slots. When omitted (or
 * empty), image paths are returned unchanged — callers that already produce
 * absolute paths (or callers that don't need resolution, e.g. unit tests)
 * can rely on the pass-through. When provided, relative paths are resolved
 * to absolute via `path.resolve(rootDir, path)`; absolute paths pass through.
 */
export function compileDeck(
  doc: ParsedDocument,
  layouts: CompilerLayout[],
  rootDir = "",
  assets: AssetCatalog = {},
): CompilerDeck {
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

  // Validate every layout's key spaces up front (once per layout), so a broken
  // theme fails fast regardless of which layouts this deck's slides use.
  for (const layout of layouts) validateLayout(layout);

  // Index each catalog asset's resolved path → its declared type, so an image
  // filled by path inherits the scaling tolerance intrinsic to its pixels.
  const assetTypeByPath = new Map<string, AssetType>();
  for (const group of Object.values(assets)) {
    for (const entry of Object.values(group)) {
      assetTypeByPath.set(resolveImagePath(rootDir, entry.path), entry.type);
    }
  }

  const deck: CompilerDeck = {
    theme: String(theme),
    steps: doc.slides.map((slide) => compileStep(slide, layouts, rootDir, assetTypeByPath)),
  };

  const output = doc.global[RESERVED_KEY.OUTPUT];
  if (output !== undefined) {
    deck.output = String(output);
  }

  return deck;
}
