// tycoslide-components — Standard component definitions
// Barrel export — each component self-registers via import side effects

// Component names (canonical registry of built-in identifiers)
export { Component, type ComponentName } from './names.js';

// Image (with asset resolution)
export {
  image,
  imageComponent,
  type ImageProps,
} from './image.js';

// Primitives (line, shape, slideNumber)
export {
  line,
  shape,
  slideNumber,
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
  column,
  stack,
  grid,
  type RowProps,
  type ColumnProps,
  type StackProps,
  type GridProps,
} from './containers.js';

// Table
export {
  table,
  type TableProps,
} from './table.js';

// Text (label, inline-rich, structured)
export {
  label,
  text,
  prose,
  labelComponent,
  textComponent,
  proseComponent,
  HEADING_STYLE,
  TEXT_TOKEN,
  type TextTokens,
  type TextProps,
  type TextComponentProps,
} from './text.js';

// Card (composition component)
export {
  card,
  cardComponent,
  CARD_TOKEN,
  type CardTokens,
  type CardProps,
} from './card.js';

// Quote (composition component)
export {
  quote,
  quoteComponent,
  QUOTE_TOKEN,
  type QuoteTokens,
  type QuoteProps,
} from './quote.js';

// Mermaid diagram (I/O component — mermaid-cli)
export {
  mermaid,
  mermaidComponent,
  sanitizeMermaidDefinition,
  type MermaidProps,
  type MermaidComponentProps,
} from './mermaid.js';
