import {
  type FitMode,
  type ImageFill,
  SlotType,
  type TableFill,
  type TemplateFill,
  type TextFill,
} from "../engine/index.js";
import type { MermaidConfig } from "./resolvers/mermaidTheme.js";

// ── Asset catalog (compiler / theme-metadata only) ───────────────────────────

/**
 * A theme's declaration of a reusable image asset. Purely compiler-facing —
 * the engine never sees this type; the compiler resolves an entry's `path`
 * to a fully-qualified filesystem path and wraps it as an ImageFill before
 * handing the deck to the engine.
 */
export type AssetEntry = {
  path: string;
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

// ── CompilerSlotType discriminator (body region, multi-line) ──────────────────

/**
 * Compiler-facing slot type for a layout's *slots* — multi-line body regions
 * (the default body region, or a `::name::` region). Narrowed to four kinds;
 * `Template` and `Image` left this list to become parameters. `Code` and `Mermaid`
 * are compiler-only, resolved (syntax highlighting, mermaid PNG rendering)
 * before the engine sees the deck. Required on every CompilerSlot — no silent
 * default.
 */
export const CompilerSlotType = {
  Text: SlotType.Text,
  Table: SlotType.Table,
  Code: FenceType.Code,
  Mermaid: FenceType.Mermaid,
} as const;
export type CompilerSlotType = (typeof CompilerSlotType)[keyof typeof CompilerSlotType];

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

/** Image parameter: one frontmatter path filled by fillImage. */
export type CompilerImageParameter = CompilerSlotBase & {
  type: typeof ParameterType.Image;
  /** How the picture scales inside its frame (required — no silent default). */
  fit: FitMode;
};

/**
 * Compiler-facing parameter. A layout's frontmatter inputs — each written as a
 * single `key: value` line, resolved against the layout's `parameters` list.
 */
export type CompilerParameter = CompilerTemplateParameter | CompilerImageParameter;

// ── Slots (body regions, multi-line) ──────────────────────────────────────────

/** Multi-paragraph body filled by fillText (specimen-style rebuild). */
export type CompilerTextSlot = CompilerSlotBase & {
  type: typeof CompilerSlotType.Text;
  /** Leave the first N specimen paragraphs untouched. */
  startAt?: number;
};

/** Table shape backed by an `<a:tbl>` with header + data specimen rows. */
export type CompilerTableSlot = CompilerSlotBase & {
  type: typeof CompilerSlotType.Table;
  /** Enforced column count. */
  columns?: number;
};

/**
 * Text slot that consumes a fenced code block. The resolver (`CodeResolver`)
 * uses `codeTheme` to Shiki-highlight the source into StyledParagraph[]; the
 * engine sees the projected Text slot.
 */
export type CompilerCodeSlot = CompilerSlotBase & {
  type: typeof CompilerSlotType.Code;
  /** Shiki theme id (required — no silent default). */
  codeTheme: string;
};

/**
 * Slot that consumes a mermaid code fence. The resolver (`MermaidResolver`)
 * uses `mermaidVariant` to select colors and renders a PNG; the engine sees the
 * projected Image slot with `contain` fit. Mermaid slots do NOT declare `fit` —
 * mermaid diagrams are always contained.
 */
export type CompilerMermaidSlot = CompilerSlotBase & {
  type: typeof CompilerSlotType.Mermaid;
  /** Name of the mermaid variant (required — no silent default). */
  mermaidVariant: string;
};

/**
 * Compiler-facing slot. Discriminated union on `type` — each variant declares
 * ONLY the fields legal for that slot type. A layout's body regions (the
 * default region, or a `::name::` region), resolved against the layout's
 * `slots` list. Adds markdown-flavored concepts (limit hints, code-fence theme
 * selection, mermaid variant naming) on top of the engine's minimal Slot.
 * Compiler-only types (Code, Mermaid) are projected down to engine types (Text,
 * Image) at the engine boundary before the engine sees the layout.
 */
export type CompilerSlot = CompilerTextSlot | CompilerTableSlot | CompilerCodeSlot | CompilerMermaidSlot;

export type CompilerLayout = {
  name: string;
  slideNumber: number;
  description: string;
  whenToUse: string;
  whenNotToUse: string;
  /** Frontmatter inputs (template, image) — one value per `key: value` line. */
  parameters: CompilerParameter[];
  /** Body regions (text, table, code, mermaid) — the body or `::name::` regions. */
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
};

export type CompilerConfig = CompilerThemeConfig & {
  rootDir: string;
};
