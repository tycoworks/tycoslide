// tycoslide-components — Standard component definitions
// Barrel export — components are inert definitions until explicitly registered by a theme

// Card (composition component)
export {
  type CardParams,
  type CardTokens,
  card,
  cardComponent,
} from "./card.js";
// Code (I/O component — shared browser rendering via Shiki)
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
// Image (with asset resolution)
export { type ImageTokens, image, imageComponent } from "./image.js";
// Languages (supported syntax highlighting languages)
export { LANGUAGE, LANGUAGE_VALUES, type LanguageName } from "./languages.js";
// List
export {
  type ListParams,
  type ListTokens,
  list,
  listComponent,
} from "./list.js";
// Mermaid diagram (I/O component — shared browser rendering)
export {
  type MermaidParams,
  type MermaidRenderContext,
  type MermaidTokens,
  mermaid,
  mermaidComponent,
} from "./mermaid.js";
// Component names (canonical registry of built-in identifiers)
export { Component, type ComponentName } from "./names.js";
// PlainText (plain string text — no markdown, no link tokens)
export {
  type PlainTextParams,
  type PlainTextTokens,
  plainText,
  plainTextComponent,
} from "./plainText.js";
// Primitives (line, shape, slideNumber)
export {
  type LineParams,
  type LineTokens,
  line,
  lineComponent,
  type ShapeParams,
  type ShapeTokens,
  type SlideNumberParams,
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
  type TableParams,
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
// Text
export {
  type TextParams,
  type TextTokens,
  text,
  textComponent,
} from "./text.js";
