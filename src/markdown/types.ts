import type { RootContent } from "mdast";
import {
  type Frame,
  type ImageFill,
  RowRole,
  SlotType,
  type TableFill,
  type TemplateFill,
  type TextFill,
} from "../engine/index.js";
import type { MermaidConfig } from "./blocks/mermaidTheme.js";

// Re-export the engine's table row-role enum so the compiler layer (and the theme
// schema) reference one definition, mirroring how AcceptType derives from SlotType.
export { RowRole };

// ── Asset catalog (compiler / theme-metadata only) ───────────────────────────

/**
 * An asset's scaling/cropping tolerance, declared in the theme catalog. The
 * compiler maps it to the engine's object-fit `fit`. `icon`: never enlarge,
 * never crop. `image`: never crop, may scale. `background`: crop and scale freely.
 */
export const AssetType = {
  Icon: "icon",
  Image: "image",
  Background: "background",
} as const;
export type AssetType = (typeof AssetType)[keyof typeof AssetType];

/**
 * A theme's declaration of a reusable image asset. Purely compiler-facing —
 * the engine never sees this type; the compiler resolves an entry's `path`
 * to a fully-qualified filesystem path and wraps it as an ImageFill before
 * handing the deck to the engine.
 */
export type AssetEntry = {
  path: string;
  /** Required — a missing type is a fail-fast error. */
  type: AssetType;
  description: string;
};

/** Two-level catalog: `{ category: { name: AssetEntry } }`. */
export type AssetCatalog = Record<string, Record<string, AssetEntry>>;

// ── ParameterType discriminator (frontmatter, one value) ──────────────────────

/**
 * Discriminator for a layout's frontmatter *parameters* — inputs the author
 * writes as a single `key: value` line. Two kinds: `Template` (fills a styled
 * shape's runs via fillTemplate) and `Image` (a filesystem path filled via
 * fillImage). Both share their value with the engine's `SlotType`, since a
 * parameter maps straight to an engine slot with no resolution step.
 */
export const ParameterType = {
  Template: SlotType.Template,
  Image: SlotType.Image,
} as const;
export type ParameterType = (typeof ParameterType)[keyof typeof ParameterType];

// ── AcceptType discriminator (what a slot accepts) ────────────────────────────

/**
 * The engine content types a slot may `accept`. A subset of the engine's
 * `SlotType`: `Template` is parameter-only, never a body block. There is no
 * `code` / `mermaid` accept type — a code fence folds into a `Text`-accepting
 * slot (syntax highlighting → TextFill) and a mermaid fence into an
 * `Image`-accepting slot (PNG render → ImageFill), the same fold the engine
 * already performs. The author's markdown shape selects which accepted type a
 * region routes to.
 */
export const AcceptType = {
  Text: SlotType.Text,
  Table: SlotType.Table,
  Image: SlotType.Image,
} as const;
export type AcceptType = (typeof AcceptType)[keyof typeof AcceptType];

// ── Variant discriminator (a layout's light/dark surface) ─────────────────────

/**
 * The tonal surface a layout sits on. A code layout on a light panel needs a
 * light Shiki theme (dark syntax would wash out); one on a dark panel needs a
 * dark theme. A layout declares its `variant`; the code compile resolves a
 * `{ light, dark }` `codeTheme` pair against it (a pair with no `variant` throws).
 */
export const Variant = {
  Light: "light",
  Dark: "dark",
} as const;
export type Variant = (typeof Variant)[keyof typeof Variant];

// ── Engine fill union + block-handler strategy ────────────────────────────────

/**
 * The four engine content shapes a slot's compiled content can be — the value
 * `compile` produces and the engine fills. ImageFill carries a `.type`
 * discriminator; the other three — TextFill, TableFill, TemplateFill — are
 * identified structurally by their signature field.
 */
export type EngineFill = TextFill | TableFill | ImageFill | TemplateFill;

/**
 * The three engine content shapes a block handler can produce. A subset of
 * `EngineFill` — `TemplateFill` is parameter-only (`AcceptType` excludes
 * `Template`), so no block handler ever compiles one.
 */
export type BlockFill = TextFill | TableFill | ImageFill;

/**
 * Everything a block handler needs to compile a node into its engine fill: the
 * asset resolver, the diagnostic context to name the offending layout/slide/slot
 * when a region's markdown shape is illegal (a stray standalone block mixed into
 * prose), and the theme-level `config` — from which code/mermaid compile read
 * their one-per-theme style (`codeTheme`, `mermaid`, `mermaidVariant`), not the
 * slot.
 *
 * Lives in types.ts (not in `blocks/registry.ts`, which re-exports it) so a
 * per-kind block file can import it without importing the registry — the registry
 * imports the per-kind handlers, so the reverse would cycle.
 */
export type BlockContext = {
  resolveAssetRef: (ref: string) => ImageFill;
  layoutName: string;
  slideIdx: number;
  source: string;
  config: CompilerConfig;
  /**
   * The current layout's tonal surface, threaded from its `variant`. The code
   * compile reads it to pick the arm of a `{ light, dark }` `codeTheme` pair;
   * a pair with no `variant` throws (no default).
   */
  layoutVariant?: Variant;
};

/**
 * A block handler recognizes one content kind at the region's top level, folds
 * it to the engine `AcceptType` it fills, and compiles the node straight into the
 * matching engine fill — highlighting a code fence to a TextFill, rendering a
 * mermaid fence to an ImageFill. Recognition (`match`), type (`acceptType`), and
 * build (`compile`) live together — a new content kind is one file, one registry
 * row. Non-generic like the engine's `Filler`: the array can't correlate a
 * per-element type guard with `compile`'s param, so each handler narrows the node
 * internally with a single-hop cast.
 */
export type BlockHandler = {
  match(node: RootContent): boolean;
  acceptType: AcceptType;
  compile(node: RootContent, ctx: BlockContext): Promise<BlockFill>;
};

// ── Compiler-facing deck shape ───────────────────────────────────────────────

/**
 * A DeckStep as the compiler produces it. Content is already engine-shaped —
 * code fences highlighted to TextFill and mermaid fences rendered to ImageFill
 * during `compile` — so this is structurally equivalent to the engine's DeckStep
 * and needs no further resolution.
 */
export type CompilerDeckStep = {
  layout: string;
  content?: Record<string, EngineFill>;
  /** Slide-level speaker notes, stripped from frontmatter. Plain text. */
  notes?: string;
};

/**
 * The deck shape the compiler produces. `output` may be unset until a caller
 * (the CLI, or a programmatic caller) assigns one; `buildDeck` fails fast if it
 * is still missing. Once `output` is present this is structurally equivalent to
 * the engine's Deck, so `generate` consumes it without any cast.
 */
export type CompilerDeck = {
  theme: string;
  /** Output path, set by the caller (the CLI, or a programmatic `buildDeck`), not from frontmatter. */
  output?: string;
  steps: CompilerDeckStep[];
};

// ── Compiler-facing slot / layout extensions ─────────────────────────────────

/**
 * Markdown-flavored measurement hints on a slot or template parameter: caps on
 * expanded run text, line count, or list items. All optional — a missing cap is
 * "no limit." Advisory metadata surfaced in the manifest; the fill never enforces
 * it.
 */
export type Limit = { maxChars?: number; maxLines?: number; maxItems?: number };

// ── Parameters (frontmatter, one value) ───────────────────────────────────────

/**
 * Template parameter: a styled text shape filled by expanding a `template` into the
 * shape's paragraphs via fillTemplate. The template is one string with `{key}`
 * placeholders and newlines for line breaks (`"{lastname}, {firstname} -
 * {company}"`, or `"{name}\n{jobTitle}"`); a shape's fillable keys are the
 * placeholders in its template. The shape carries no top-level `key`; its
 * placeholders are the keys the author fills in frontmatter.
 */
export type CompilerTemplateParameter = {
  shapeName: string;
  limit?: Limit;
  /**
   * Whether the parameter may be omitted from a slide. Optional (defaults to
   * false): a required one with no value causes the compiler to throw with
   * layout + key names.
   */
  required?: boolean;
  type: typeof ParameterType.Template;
  /** The shape's text as one template with `{key}` placeholders; newlines are line breaks. */
  template: string;
};

/** Image parameter: one frontmatter path filled by fillImage. Sizing/crop
 * behaviour comes from the resolved asset's `type`, not the slot. Carries no
 * `limit` — measuring an image path against char/line caps is meaningless. */
export type CompilerImageParameter = {
  shapeName: string;
  /**
   * Whether the parameter may be omitted from a slide. Optional (defaults to
   * false): a required one with no value causes the compiler to throw with
   * layout + key names.
   */
  required?: boolean;
  key: string;
  type: typeof ParameterType.Image;
};

/**
 * Compiler-facing parameter. A layout's frontmatter inputs — each written as a
 * single `key: value` line, resolved against the layout's `parameters` list.
 */
export type CompilerParameter = CompilerTemplateParameter | CompilerImageParameter;

/**
 * Reserved keys in a deck's frontmatter — global (theme) and per-slide
 * (layout). Exported so callers (e.g. cli.ts) reference the constants
 * instead of literal strings.
 */
export const RESERVED_KEY = {
  LAYOUT: "layout",
  THEME: "theme",
  NOTES: "notes",
} as const;

// ── Slots (body regions, multi-line) ──────────────────────────────────────────

/**
 * A kind of content a slot accepts, and the real template shape that realizes
 * it — the compiler mirror of the engine's `Block`, a union discriminated by
 * `type` (an engine content type: `text` | `table` | `image`) so each variant
 * carries only its own specimen options. `shapeName` names the shape on
 * `sourceSlide` carrying the specimen styling; when `sourceSlide` equals the
 * layout's `slideNumber` the shape is already on the cloned slide (fill in
 * place), otherwise it is transplanted into the slot's `frame`. A text block may
 * pin `startAt` (leave the first N specimen paragraphs untouched); a table block
 * MUST label each `<a:tbl>` specimen row with a `RowRole` (required); an image
 * block carries neither. There is no `Template` variant — `AcceptType` excludes
 * it (a parameter, not a body block). Named `CompilerBlock` to stay distinct from
 * the engine's `Block` and the compiler's `BlockHandler`.
 */
export type CompilerTextBlock = {
  type: typeof AcceptType.Text;
  sourceSlide: number;
  shapeName: string;
  startAt?: number;
};
export type CompilerTableBlock = {
  type: typeof AcceptType.Table;
  sourceSlide: number;
  shapeName: string;
  rows: RowRole[];
};
export type CompilerImageBlock = {
  type: typeof AcceptType.Image;
  sourceSlide: number;
  shapeName: string;
};
export type CompilerBlock = CompilerTextBlock | CompilerTableBlock | CompilerImageBlock;

/**
 * Compiler-facing slot. A layout's body region (a `::name::` region): it
 * `accepts` a set of `CompilerBlock`s and owns a `frame` (real observed EMU coordinates, never
 * computed). The author's markdown shape selects which accepted block a region
 * routes to; a type the slot does not accept fails fast. `frame` is required
 * only when a slot has a transplant block (a block whose `sourceSlide` differs
 * from the layout's `slideNumber`); a base-only slot fills in place and needs
 * none. Adds markdown-flavored `limit` hints on top of the engine's minimal
 * Slot; per-slot `codeTheme` / `mermaidVariant` moved to the theme level.
 */
export type CompilerSlot = {
  key: string;
  accepts: CompilerBlock[];
  frame?: Frame;
  limit?: Limit;
  /**
   * Whether the slot may be omitted from a slide. Optional (defaults to false):
   * a required slot with no content throws with layout + key names.
   */
  required?: boolean;
};

export type CompilerLayout = {
  name: string;
  slideNumber: number;
  /** Optional prose — a neutral description of the arrangement (a layout is a shape, not a purpose). */
  description?: string;
  /**
   * The layout's tonal surface. Selects the arm of a `{ light, dark }` `codeTheme`
   * pair for code fences on this layout. Required when `codeTheme` is a pair.
   */
  variant?: Variant;
  /** Frontmatter inputs (template, image) — one value per `key: value` line. */
  parameters: CompilerParameter[];
  /** Body regions — `::name::` regions; each `accepts` blocks. */
  slots: CompilerSlot[];
};

// ── Compiler-facing theme + config ───────────────────────────────────────────

/**
 * A brand font the theme hands the compiler for HTML-based rendering (currently
 * mermaid). Purely compiler-facing — the engine fills PPTX shapes, whose fonts
 * live in the template, and never sees this. `path` is a module specifier
 * (`@fontsource/inter/files/inter-latin-400-normal.woff2`) resolved from the
 * theme's directory, or a `./`- / `/`-prefixed filesystem path resolved against
 * `rootDir`; `family` is the CSS `font-family` name the mermaid variant's
 * `fontFamily` must match. Register weight 400 + 700 to avoid synthetic bold on
 * node labels. The mechanism is generic — the theme names its own fonts.
 */
export type ThemeFont = {
  family: string;
  path: string;
  /** OpenType weight (default 400). */
  weight?: number;
};

/**
 * Compiler-facing theme configuration. Mirrors the engine's ThemeConfig but
 * carries markdown-flavored fields (mermaid variants) that live outside the
 * engine's awareness. Fields are declared explicitly rather than
 * inherit-and-omit, so the boundary is visible.
 */
export type CompilerThemeConfig = {
  layouts: CompilerLayout[];
  assets: AssetCatalog;
  template: string;
  mermaid?: MermaidConfig;
  /**
   * Brand fonts injected as `@font-face` when rendering mermaid, so diagram text
   * uses the theme font instead of a Chromium fallback. Optional — with none
   * declared, mermaid renders in whatever the OS substitutes.
   */
  fonts?: ThemeFont[];
  /**
   * Theme-level defaults for the two content types the compiler resolves before
   * the engine sees them. One code style and one mermaid style per theme (the
   * design-system framing) — they can't sit on a multi-type slot. `codeTheme` is
   * a Shiki theme id, or a `{ light, dark }` pair when the theme has both light
   * and dark code layouts (each layout's `variant` picks the arm);
   * `mermaidVariant` names an entry in `mermaid`.
   */
  codeTheme?: string | { light: string; dark: string };
  mermaidVariant?: string;
};

export type CompilerConfig = CompilerThemeConfig & {
  rootDir: string;
};
