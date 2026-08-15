import {
  type Frame,
  type ImageFill,
  SlotType,
  type TableFill,
  type TemplateFill,
  type TextFill,
} from "../engine/index.js";
import type { MermaidConfig } from "./resolvers/mermaidTheme.js";

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
  whenToUse?: string;
};

/** Two-level catalog: `{ category: { name: AssetEntry } }`. */
export type AssetCatalog = Record<string, Record<string, AssetEntry>>;

// ── FenceType discriminator ───────────────────────────────────────────────────

/**
 * Discriminator strings for the compiler-internal fence shapes produced by
 * deckCompiler.ts. `Code` and `Mermaid` are resolved away entirely (syntax
 * highlighting → TextFill, PNG rendering → ImageFill), so neither reaches the
 * engine. Prose has no FenceType: it becomes a `TextFill` (`{ paragraphs }`),
 * one of the engine's own fill shapes.
 */
export const FenceType = {
  Code: "code",
  Mermaid: "mermaid",
} as const;
export type FenceType = (typeof FenceType)[keyof typeof FenceType];

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

// ── Compiler-internal block shapes ────────────────────────────────────────────

/**
 * A fenced code block awaiting syntax highlighting. Produced by deckCompiler,
 * consumed by CodeResolver. Never crosses the engine boundary.
 */
export type CodeFence = {
  type: typeof FenceType.Code;
  language: string;
  source: string;
};

/**
 * A mermaid code fence awaiting rendering. Produced by deckCompiler, consumed
 * by MermaidResolver — the resulting PNG is wrapped as an ImageFill in
 * step.content, so the engine never learns mermaid exists.
 */
export type MermaidFence = {
  type: typeof FenceType.Mermaid;
  definition: string;
};

/**
 * The full set of value shapes a slot may hold during compilation, before code
 * fences are highlighted (→ TextFill) and mermaid fences are rendered
 * (→ ImageFill). CodeFence, MermaidFence, and ImageFill carry a `.type`
 * discriminator; the three engine fills without one — TextFill, TableFill,
 * TemplateFill — are identified structurally by their signature field.
 */
export type MarkdownBlock = TextFill | TableFill | CodeFence | MermaidFence | ImageFill | TemplateFill;

// ── Compiler-facing deck shape ───────────────────────────────────────────────

/**
 * A DeckStep as compileDeck produces it — content values may still be
 * unresolved (CodeFence, MermaidFence) at this point. `resolveFences` narrows
 * these into StyledParagraph[] / ImageFill before the engine sees the deck.
 */
export type CompilerDeckStep = {
  layout: string;
  content?: Record<string, MarkdownBlock>;
  /** Slide-level speaker notes, stripped from frontmatter. Plain text. */
  notes?: string;
};

/**
 * The intermediate deck shape produced by compileDeck. buildDeck runs the
 * resolvers and hands the resulting engine-shaped Deck to generate().
 */
export type CompilerDeck = {
  theme: string;
  output?: string;
  steps: CompilerDeckStep[];
};

/**
 * A DeckStep whose content values have been narrowed post-resolution — no
 * CodeFence or MermaidFence remains, only shapes the engine understands.
 * Structurally equivalent to the engine's DeckStep.
 */
export type ResolvedCompilerDeckStep = {
  layout: string;
  content?: Record<string, TextFill | TableFill | ImageFill | TemplateFill>;
  /** Slide-level speaker notes, threaded through to the engine. Plain text. */
  notes?: string;
};

/**
 * A CompilerDeck whose steps have been passed through the resolvers via
 * `resolveFences`. Structurally equivalent to the engine's Deck — deck
 * resolution returns this shape so `generate` can consume it without any cast.
 */
export type ResolvedCompilerDeck = {
  theme: string;
  output: string;
  steps: ResolvedCompilerDeckStep[];
};

// ── Compiler-facing slot / layout extensions ─────────────────────────────────

/**
 * Fields common to every text shape, image parameter, and slot. A text shape is
 * addressed by `shapeName` and owns a `template` (its placeholders are the
 * fillable keys); image parameters and slots additionally carry a single `key`.
 */
type CompilerShapeBase = {
  shapeName: string;
  limit?: { maxChars?: number; maxLines?: number; maxItems?: number };
  /**
   * Whether the parameter/slot may be omitted from a slide. Optional (defaults
   * to false): a required one with no value causes the compiler to throw with
   * layout + key names.
   */
  required?: boolean;
};

/**
 * Shape base plus a single `key` — the addressing model for image parameters
 * and every slot. Template parameters do NOT extend this: their fillable keys are
 * the placeholders in their `template`, not a single top-level key.
 */
type CompilerSlotBase = CompilerShapeBase & {
  key: string;
};

// ── Parameters (frontmatter, one value) ───────────────────────────────────────

/**
 * Template parameter: a styled text shape filled by expanding a `template` into the
 * shape's paragraphs via fillTemplate. The template is one string with `{key}`
 * placeholders and newlines for line breaks (`"{lastname}, {firstname} -
 * {company}"`, or `"{name}\n{jobTitle}"`); a shape's fillable keys are the
 * placeholders in its template. The shape carries no top-level `key`; its
 * placeholders are the keys the author fills in frontmatter.
 */
export type CompilerTemplateParameter = CompilerShapeBase & {
  type: typeof ParameterType.Template;
  /** The shape's text as one template with `{key}` placeholders; newlines are line breaks. */
  template: string;
};

/** Image parameter: one frontmatter path filled by fillImage. Sizing/crop
 * behaviour comes from the resolved asset's `type`, not the slot. */
export type CompilerImageParameter = CompilerSlotBase & {
  type: typeof ParameterType.Image;
};

/**
 * Compiler-facing parameter. A layout's frontmatter inputs — each written as a
 * single `key: value` line, resolved against the layout's `parameters` list.
 */
export type CompilerParameter = CompilerTemplateParameter | CompilerImageParameter;

// ── Slots (body regions, multi-line) ──────────────────────────────────────────

/**
 * A kind of content a slot accepts, and the real template shape that realizes
 * it — the compiler mirror of the engine's `Block`. `type` is an engine content
 * type (`text` | `table` | `image`); `shapeName` names the shape on
 * `sourceSlide` carrying the specimen styling. When `sourceSlide` equals the
 * layout's `slideNumber` the shape is already on the cloned slide (fill in
 * place); otherwise it is transplanted into the slot's `frame`. `startAt` is a
 * text-specimen concern (leave the first N specimen paragraphs untouched), only
 * meaningful on a text block. Named `CompilerBlock` to stay distinct from the
 * engine's `Block` and the compiler's `MarkdownBlock`.
 */
export type CompilerBlock = {
  type: AcceptType;
  sourceSlide: number;
  shapeName: string;
  startAt?: number;
};

/**
 * Compiler-facing slot. A layout's body region (the default region, or a
 * `::name::` region), no longer welded to one shape+type: it `accepts` a set of
 * `CompilerBlock`s and owns a `frame` (real observed EMU coordinates, never
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
  limit?: { maxChars?: number; maxLines?: number; maxItems?: number };
  /**
   * Whether the slot may be omitted from a slide. Optional (defaults to false):
   * a required slot with no content throws with layout + key names.
   */
  required?: boolean;
};

export type CompilerLayout = {
  name: string;
  slideNumber: number;
  /** Optional prose — a layout is a shape, not a purpose (agent-guidance descoped). */
  description?: string;
  whenToUse?: string;
  whenNotToUse?: string;
  /** Frontmatter inputs (template, image) — one value per `key: value` line. */
  parameters: CompilerParameter[];
  /** Body regions — the default body or `::name::` regions; each `accepts` blocks. */
  slots: CompilerSlot[];
};

// ── Compiler-facing theme + config ───────────────────────────────────────────

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
  outputDir?: string;
  mermaid?: MermaidConfig;
  /**
   * Theme-level defaults for the two content types the compiler resolves before
   * the engine sees them. One code style and one mermaid style per theme (the
   * design-system framing) — they can't sit on a multi-type slot. `codeTheme` is
   * a Shiki theme id; `mermaidVariant` names an entry in `mermaid`.
   */
  codeTheme?: string;
  mermaidVariant?: string;
};

export type CompilerConfig = CompilerThemeConfig & {
  rootDir: string;
};
