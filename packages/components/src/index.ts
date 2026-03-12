// tycoslide-components — Standard component definitions
// Barrel export — components are inert definitions until explicitly registered by a theme

// Card (composition component)
export {
  CARD_TOKEN,
  type CardProps,
  type CardTokens,
  card,
  cardComponent,
} from "./card.js";
// Code (I/O component — shared browser rendering via Shiki)
export {
  CODE_TOKEN,
  type CodeComponentProps,
  type CodeTokens,
  code,
  codeComponent,
} from "./code.js";
// Containers (row, column, stack, grid)
export {
  type ColumnProps,
  column,
  columnComponent,
  type GridProps,
  grid,
  gridComponent,
  type RowProps,
  row,
  rowComponent,
  type StackProps,
  stack,
  stackComponent,
} from "./containers.js";
// Image (with asset resolution)
export {
  type ImageComponentProps,
  type ImageProps,
  image,
  imageComponent,
} from "./image.js";
// Languages (supported syntax highlighting languages)
export { LANGUAGE, LANGUAGE_VALUES, type LanguageName } from "./languages.js";
// List
export {
  LIST_TOKEN,
  type ListTokens,
  list,
  listComponent,
} from "./list.js";
// Mermaid diagram (I/O component — shared browser rendering)
export {
  MERMAID_TOKEN,
  type MermaidComponentProps,
  type MermaidRenderContext,
  type MermaidTokens,
  mermaid,
  mermaidComponent,
} from "./mermaid.js";
// Component names (canonical registry of built-in identifiers)
export { Component, type ComponentName } from "./names.js";
// PlainText (plain string text — no markdown, no link tokens)
export {
  PLAIN_TEXT_TOKEN,
  type PlainTextComponentProps,
  type PlainTextTokens,
  plainText,
  plainTextComponent,
} from "./plainText.js";
// Primitives (line, shape, slideNumber)
export {
  LINE_TOKEN,
  type LineProps,
  type LineTokens,
  line,
  lineComponent,
  SHAPE_TOKEN,
  type ShapeProps,
  type ShapeTokens,
  SLIDE_NUMBER_TOKEN,
  type SlideNumberProps,
  type SlideNumberTokens,
  shape,
  shapeComponent,
  slideNumber,
  slideNumberComponent,
} from "./primitives.js";
// Quote (simple pull quote — composition component)
export {
  QUOTE_TOKEN,
  type QuoteProps,
  type QuoteTokens,
  quote,
  quoteComponent,
} from "./quote.js";
// Table
export {
  TABLE_TOKEN,
  type TableProps,
  type TableTokens,
  table,
  tableComponent,
} from "./table.js";
// Testimonial (card-style quote — composition component)
export {
  TESTIMONIAL_TOKEN,
  type TestimonialProps,
  type TestimonialTokens,
  testimonial,
  testimonialComponent,
} from "./testimonial.js";
// Text
export {
  TEXT_TOKEN,
  type TextComponentProps,
  type TextTokens,
  text,
  textComponent,
} from "./text.js";
