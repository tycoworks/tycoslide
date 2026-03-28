// tycoslide - Declarative slide generation library
// Main barrel export

export { LayoutValidationError, type SlideValidationResult, type ValidationResult } from "./core/layout/validator.js";
// Document compiler (markdown file → Presentation)
export { type CompileOptions, compileDocument, validateLayout } from "./core/markdown/documentCompiler.js";
// Slide parser (multi-slide markdown file → structured document)
export {
  FrontmatterParseError,
  type ParsedDocument,
  parseSlideDocument,
  type RawSlide,
} from "./core/markdown/slideParser.js";
export type {
  ContainerNode,
  ElementNode,
  GridNode,
  ImageNode,
  LayoutNode,
  LineNode,
  NodeType,
  PositionedNode,
  Shadow,
  ShapeNode,
  SlideNode,
  SlideNumberNode,
  StackNode,
  Stroke,
  TableCellData,
  TableCellInput,
  TableHeaderStyle,
  TableNode,
  TextNode,
} from "./core/model/nodes.js";

export { component, isComponentNode, isLayoutNode, NODE_TYPE } from "./core/model/nodes.js";
// Param helpers (schema type builders + param declaration wrappers)
export { type InferParams, param, type ScalarParam, schema } from "./core/model/param.js";
export type { ContainerDirective, SyntaxType } from "./core/model/syntax.js";
// Markdown utilities (for component authors)
export { extractSource, RESERVED_FRONTMATTER_KEYS, SYNTAX } from "./core/model/syntax.js";
// Token descriptors (required/optional markers for component token declarations)
export { type InferTokens, type TokenDescriptor, type TokenShape, token } from "./core/model/token.js";
export type {
  Background,
  DashType,
  Direction,
  Font,
  FontFamily,
  FontSlot,
  GridStyle,
  HighlightPair,
  HorizontalAlignment,
  NormalizedRun,
  ShadowType,
  ShapeName,
  SizeValue,
  Slide,
  SlideSize,
  SpacingMode,
  StrikeType,
  TextContent,
  TextRun,
  TextStyle,
  TextStyleName,
  Theme,
  UnderlineStyle,
  VariantConfig,
  VerticalAlignment,
} from "./core/model/types.js";
export {
  Bounds,
  CUSTOM_LAYOUT,
  DASH_TYPE,
  DIRECTION,
  DIRECTION_VALUES,
  FONT_SLOT,
  GRID_STYLE,
  HALIGN,
  SHADOW_TYPE,
  SHAPE,
  SHAPE_VALUES,
  SIZE,
  SLIDE_SIZE,
  SPACING_MODE,
  STRIKE_TYPE,
  UNDERLINE_STYLE,
  VALIGN,
} from "./core/model/types.js";
// Core
export { Presentation, type SlideLayout, type WriteResult } from "./core/rendering/presentation.js";
// Component system (for custom component authors)
export {
  type Canvas,
  type ComponentDefinition,
  type ComponentNode,
  componentRegistry,
  defineComponent,
  defineLayout,
  defineMaster,
  defineTheme,
  type LayoutDefinition,
  layoutRegistry,
  type MasterDefinition,
  type MdastHandler,
  masterRegistry,
  type RenderContext,
  type ScalarComponentDefinition,
  type ScalarShape,
  type SchemaShape,
  type TypedLayoutDefinition,
  type TypedMasterDefinition,
} from "./core/rendering/registry.js";
// Color utilities
export { bgColor, hexToRgba } from "./utils/color.js";
// Font utilities
export {
  type FontVariantViolation,
  getFontForRun,
  isFontFamily,
  MissingFontError,
  normalizeContent,
  resolveFontFace,
} from "./utils/font.js";
export { parseMarkdown } from "./utils/parser.js";
// Unit utilities (for component authors that resolve theme values during render)
export { inToPx, ptToIn, ptToPx } from "./utils/units.js";
