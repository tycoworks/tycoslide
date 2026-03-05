// tycoslide-components — Standard component definitions
// Barrel export — components are inert definitions until explicitly registered by a theme

// Component names (canonical registry of built-in identifiers)
export { Component, type ComponentName } from './names.js';

// Image (with asset resolution)
export {
  image,
  imageComponent,
  type ImageProps,
  type ImageComponentProps,
} from './image.js';

// Primitives (line, shape, slideNumber)
export {
  line,
  lineComponent,
  shape,
  shapeComponent,
  slideNumber,
  slideNumberComponent,
  type LineProps,
  type ShapeProps,
  type SlideNumberProps,
  LINE_TOKEN,
  type LineTokens,
  SLIDE_NUMBER_TOKEN,
  type SlideNumberTokens,
  SHAPE_TOKEN,
  type ShapeTokens,
} from './primitives.js';

// Containers (row, column, stack, grid)
export {
  row,
  rowComponent,
  column,
  columnComponent,
  stack,
  stackComponent,
  grid,
  gridComponent,
  type RowProps,
  type ColumnProps,
  type StackProps,
  type GridProps,
} from './containers.js';

// Table
export {
  table,
  tableComponent,
  TABLE_TOKEN,
  type TableTokens,
  type TableProps,
} from './table.js';

// Text
export {
  text,
  textComponent,
  TEXT_TOKEN,
  type TextTokens,
  type TextProps,
  type TextComponentProps,
} from './text.js';

// List
export {
  list,
  listComponent,
  LIST_TOKEN,
  type ListTokens,
  type ListProps,
} from './list.js';

// Card (composition component)
export {
  card,
  cardComponent,
  CARD_TOKEN,
  type CardTokens,
  type CardProps,
} from './card.js';

// Quote (simple pull quote — composition component)
export {
  quote,
  quoteComponent,
  QUOTE_TOKEN,
  type QuoteTokens,
  type QuoteProps,
} from './quote.js';

// Testimonial (card-style quote — composition component)
export {
  testimonial,
  testimonialComponent,
  TESTIMONIAL_TOKEN,
  type TestimonialTokens,
  type TestimonialProps,
} from './testimonial.js';

// Mermaid diagram (I/O component — shared browser rendering)
export {
  mermaid,
  mermaidComponent,
  MERMAID_TOKEN,
  type MermaidTokens,
  type MermaidRenderContext,
  type MermaidComponentProps,
} from './mermaid.js';

// Code (I/O component — shared browser rendering via Shiki)
export {
  code,
  codeComponent,
  CODE_TOKEN,
  type CodeTokens,
  type CodeComponentProps,
} from './code.js';

// Languages (supported syntax highlighting languages)
export { LANGUAGE, type LanguageName, LANGUAGE_VALUES } from './languages.js';
