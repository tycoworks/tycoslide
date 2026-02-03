// Core Library Exports
// Public API for the presentation library

// Main class
export { Presentation } from './core/presentation.js';

// Types
export {
  // Constants
  TEXT_ALIGN,
  VALIGN,
  GAP,
  DIRECTION,
  JUSTIFY,
  ALIGN,
  BORDER_STYLE,
  SHAPE,
  FONT_WEIGHT,
  TEXT_STYLE,
  LAYER,
  SLIDE_SIZE,
  CUSTOM_LAYOUT,

  // Type aliases
  type TextAlignment,
  type VerticalAlignment,
  type GapSize,
  type Direction,
  type Justify,
  type Align,
  type BorderStyle,
  type ShapeName,
  type FontWeight,
  type FontFamily,
  type Font,
  type TextStyleName,
  type Layer,
  type SlideSize,
  type CustomSlideSize,

  // Theme types
  type Theme,
  type Component,
  type Drawer,
  Bounds,
  type ColorScheme,
  type TextStyle,
  type HighlightPair,
  type HighlightScheme,

  // Master/Slide types
  type Master,
  type Slide,
} from './core/types.js';

// Layout utilities
export { sizeOf } from './components/index.js';
export { POINTS_PER_INCH } from './utils/font-utils.js';

// Component classes and types
export {
  Text,
  Image,
  List,
  Table,
  Divider,
  Card,
  type TextProps,
  type TextRun,
  type TextContent,
  type ListProps,
  type ListType,
  type TableProps,
  type TableData,
  type TableCell,
  type DividerProps,
  type CardProps,
  type SlideNumberProps,
  SlideNumber,
  LIST_TYPE,
  Mermaid,
  type MermaidProps,
} from './components/index.js';

// DSL — Factory functions and layout primitives
export {
  text,
  h1,
  h2,
  h3,
  h4,
  body,
  small,
  eyebrow,
  image,
  list,
  bulletList,
  numberedList,
  table,
  divider,
  slideNumber,
  mermaid,
  card,
  group,
  row,
  column,
  type LayoutOptions,
  createDSL,
  type DSL,
} from './core/dsl.js';

// Grid layout classes
export { GridRow, GridColumn } from './core/layout.js';
