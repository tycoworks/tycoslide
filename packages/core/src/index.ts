// tycoslide - Declarative slide generation library
// Main barrel export

// Core
export { Presentation, type WriteResult, type SlideLayout } from './core/rendering/presentation.js';
export { LayoutValidationError, type SlideValidationResult, type ValidationResult } from './core/layout/validator.js';
export {
  HALIGN,
  VALIGN,
  GAP,
  DIRECTION,
  SIZE,
  BORDER_STYLE,
  SHAPE, SHAPE_VALUES,
  ARROW_TYPE, ARROW_TYPE_VALUES,
  DASH_TYPE,
  STRIKE_TYPE, UNDERLINE_STYLE,
  SLIDE_SIZE,
  CUSTOM_LAYOUT,
  FONT_SLOT,
  TEXT_STYLE,
  Bounds,
} from './core/model/types.js';
export type {
  HorizontalAlignment, VerticalAlignment,
  GapSize,
  Direction,
  SizeValue,
  BorderStyle,
  ShapeName,
  ArrowType,
  DashType,
  StrikeType,
  UnderlineStyle,
  SlideSize,
  TextStyleName,
  FontSlot,
  Font, FontFamily,
  TextStyle,
  HighlightPair,
  NormalizedRun,
  Background,
  Slide, Theme,
  TextRun, TextContent,
} from './core/model/types.js';

export { NODE_TYPE } from './core/model/nodes.js';
export type {
  NodeType,
  TextNode,
  ImageNode,
  LineNode,
  ShapeBorder,
  ShapeNode,
  SlideNumberNode,
  TableCellInput,
  TableCellData,
  TableNode,
  ContainerNode,
  StackNode,
  PositionedNode,
  ElementNode,
  SlideNode,
} from './core/model/nodes.js';

// Component system (for custom component authors)
export {
  defineComponent,
  defineLayout,
  defineMaster,
  componentRegistry,
  layoutRegistry,
  masterRegistry,
  component,
  isComponentNode,
  type ComponentNode,
  type ComponentDefinition,
  type ScalarComponentDefinition,
  type ExpansionContext,
  type Canvas,
  type LayoutDefinition,
  type TypedLayoutDefinition,
  type MasterDefinition,
  type TypedMasterDefinition,
  type SchemaShape,
  type ScalarShape,
  type ComponentProps,
  type MdastHandler,
} from './core/rendering/registry.js';

// Slide parser (multi-slide markdown file → structured document)
export { parseSlideDocument, FrontmatterParseError, type ParsedDocument, type RawSlide } from './core/markdown/slideParser.js';

// Unit utilities (for component authors that resolve theme values during expand)
export { resolveGap, inToPx } from './utils/units.js';

// Font utilities
export { getFontForRun, resolveFontFace, normalizeContent, isFontFamily, MissingFontError, type FontVariantViolation } from './utils/font.js';

// Color utilities
export { hexToRgba, bgColor } from './utils/color.js';

// Schema helpers (domain-specific wrappers for layout Zod schemas)
export { schema, type ScalarParam } from './core/model/schema.js';

// Markdown utilities (for component authors)
export { extractSource, SYNTAX } from './core/model/syntax.js';
export type { ContainerDirective, SyntaxType } from './core/model/syntax.js';
export { parseMarkdown } from './utils/parser.js';

// Document compiler (markdown file → Presentation)
export { compileDocument, validateLayout, type CompileOptions } from './core/markdown/documentCompiler.js';
