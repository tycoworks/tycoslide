// tycoslide-components — Standard component definitions
// Barrel export — components are inert definitions until explicitly registered by a theme

// Card (composition component)
export {
  type CardParams,
  type CardTokens,
  card,
  cardComponent,
} from "./card.js";
// Code (I/O component — shared browser rendering)
export {
  type CodeParams,
  type CodeTokens,
  code,
  codeComponent,
} from "./code.js";
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
} from "./containers.js";
// Highlighting (supported languages and highlight themes for code blocks)
export {
  HIGHLIGHT_THEME,
  HIGHLIGHT_THEME_VALUES,
  type HighlightThemeName,
  LANGUAGE,
  LANGUAGE_VALUES,
  type LanguageName,
} from "./highlighting.js";
// Image (with asset resolution)
export { type ImageTokens, image, imageComponent } from "./image.js";
// Label (display text — eyebrows, footers, headings, attributions)
export {
  type HeadingDepth,
  type LabelSlotTokens,
  type LabelTokens,
  label,
  labelComponent,
} from "./label.js";
// List
export {
  type ListParams,
  type ListTokens,
  list,
  listComponent,
} from "./list.js";
// Mermaid diagram (I/O component — shared browser rendering)
export {
  type MermaidRenderContext,
  type MermaidTokens,
  mermaid,
  mermaidComponent,
} from "./mermaid.js";
// Component names (canonical registry of built-in identifiers)
export { Component, type ComponentName } from "./names.js";
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
} from "./primitives.js";
// Quote (simple pull quote — composition component)
export {
  type QuoteParams,
  type QuoteTokens,
  quote,
  quoteComponent,
} from "./quote.js";
// Table
export {
  type TableTokens,
  table,
  tableComponent,
} from "./table.js";
// Testimonial (card-style quote — composition component)
export {
  type TestimonialParams,
  type TestimonialTokens,
  testimonial,
  testimonialComponent,
} from "./testimonial.js";
// Text (rich inline markdown — bold, italic, colors, links)
export {
  type TextTokens,
  text,
  textComponent,
} from "./text.js";
