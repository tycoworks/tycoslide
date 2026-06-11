// @tycoslide/sdk — Components, presets, and theme-authoring helpers
// Barrel export — components are inert definitions until explicitly registered by a theme

// ── Components ──────────────────────────────────────────────────────────────

// Card (composition component)
export {
  type CardParams,
  type CardTokens,
  card,
  cardComponent,
} from "./components/card.js";
// Code (I/O component — shared browser rendering)
export {
  type CodeParams,
  type CodeTokens,
  code,
  codeComponent,
} from "./components/code.js";
// Containers (row, column, stack, grid)
export {
  type ColumnParams,
  column,
  columnComponent,
  type GridParams,
  grid,
  gridComponent,
  type RowParams,
  row,
  rowComponent,
  type StackParams,
  stack,
  stackComponent,
} from "./components/containers.js";
// Image (with asset resolution)
export { type ImageTokens, image, imageComponent } from "./components/image.js";
// Label (display text — eyebrows, footers, headings, attributions)
export {
  type HeadingDepth,
  type LabelTokens,
  label,
  labelComponent,
} from "./components/label.js";
// List
export {
  type ListParams,
  type ListTokens,
  list,
  listComponent,
} from "./components/list.js";
// Mermaid diagram (I/O component — shared browser rendering)
export {
  type MermaidTokens,
  extractGroups,
  mermaid,
  mermaidComponent,
} from "./components/mermaid.js";
// Primitives (line, shape, slideNumber)
export {
  type LineParams,
  type LineTokens,
  line,
  lineComponent,
  type ShapeParams,
  type ShapeTokens,
  type SlideNumberTokens,
  shape,
  shapeComponent,
  slideNumber,
  slideNumberComponent,
} from "./components/primitives.js";
// Quote (simple pull quote — composition component)
export {
  type QuoteParams,
  type QuoteTokens,
  quote,
  quoteComponent,
} from "./components/quote.js";
// Table
export {
  type TableTokens,
  table,
  tableComponent,
} from "./components/table.js";
// Testimonial (card-style quote — composition component)
export {
  type TestimonialParams,
  type TestimonialTokens,
  testimonial,
  testimonialComponent,
} from "./components/testimonial.js";
// Text (rich inline markdown — bold, italic, colors, links)
export {
  type TextTokens,
  text,
  textComponent,
} from "./components/text.js";

// ── Presets ─────────────────────────────────────────────────────────────────

// Highlighting (supported languages and highlight themes for code blocks)
export {
  HIGHLIGHT_THEME,
  HIGHLIGHT_THEME_VALUES,
  type HighlightThemeName,
  LANGUAGE,
  LANGUAGE_VALUES,
  type LanguageName,
} from "./presets/highlighting.js";
// Component names (canonical registry of built-in identifiers)
export { Component, type ComponentName } from "./presets/names.js";
// Slide format presets (standard dimensions for common aspect ratios and paper sizes)
export { SlideFormat } from "./presets/slideFormats.js";

// ── Format & Brand ────────────────────────────────────────────────────────

export {
  type Brand,
  brandFonts,
  type FontFamily,
  type Format,
  type Hex,
  type Palette,
  resolveFontFamily,
  resolveTextStyle,
  TEXT_STYLE,
  type TextStyle,
  type TextStyleKey,
} from "./theme/format.js";

// ── Theme ───────────────────────────────────────────────────────────────────

export type { Theme, ThemeFormat } from "./theme/index.js";
// Multi-format theme definition and resolution
export { defineTheme, resolveThemeFormat } from "./theme/index.js";

// ── Templates ────────────────────────────────────────────────────────────────

export {
  AssetCatalog,
  type AssetCatalogEntries,
  type AssetEntry,
  type Documentation,
  defineTemplate,
  isAssetRef,
  type Layout,
  type Template,
} from "./theme/template.js";

// ── Token Derivation ────────────────────────────────────────────────────────

export { deriveTokens, type VisualTokens } from "./theme/tokens.js";

// ── Component & Layout Authoring ────────────────────────────────────────

// Runtime types (still from core)
export type {
  Canvas,
  ComponentDefinition,
  ComponentNode,
  RenderContext,
} from "@tycoslide/core";
// Component node factory (for layouts that instantiate components dynamically)
export { component } from "@tycoslide/core";
export type {
  ComponentSpec,
  InferParams,
  InferTokens,
  LayoutConfig,
  ParamShape,
  ScalarShape,
  SyntaxHandler,
  TokenDescriptor,
  TokenShape,
} from "./authoring/index.js";
// Factories for defining custom components and layouts
// Token descriptors (required/optional markers for component token declarations)
// Param helpers (schema type builders + param declaration wrappers)
export { defineComponent, defineLayout, param, schema, token } from "./authoring/index.js";

// ── Layout Primitives (re-exported from core for theme authors) ──────────

export type {
  Fit,
  HorizontalAlignment,
  SlideNode,
  TextStyleName,
  VerticalAlignment,
} from "@tycoslide/core";
export {
  FIT,
  FIT_VALUES,
  GRID_STYLE,
  HALIGN,
  Insets,
  LAYER,
  SHADOW,
  SHAPE,
  SIZE,
  SPACING,
  VALIGN,
} from "@tycoslide/core";

// ── Presentation (programmatic slide building) ──────────────────────────

export {
  createPresentation,
  Presentation,
  type PresentationConfig,
  type SlideLayout,
} from "@tycoslide/core";

// ── Plugin Compiler ─────────────────────────────────────────────────────────

export {
  type CompilePluginOptions,
  type CompilePluginResult,
  compilePlugin,
  generateManifest,
  introspectParams,
  PARAM_TYPE,
  type ParamInfo,
  type ParamType,
  PLUGIN_PATHS,
  stripScope,
} from "./plugin/index.js";

// ── Markdown Compilation ──────────────────────────────────────────────────

// Document compiler (markdown source → Presentation)
export { type CompileOptions, compileDocument, validateLayout } from "./markdown/documentCompiler.js";
// Slide parser (multi-slide markdown → structured document)
export {
  FrontmatterParseError,
  type ParsedDocument,
  parseSlideDocument,
  type RawSlide,
} from "./markdown/slideParser.js";
