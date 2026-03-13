// Primitive components: line, shape, slideNumber

import {
  ARROW_TYPE_VALUES,
  type ArrowType,
  type ComponentNode,
  component,
  type DashType,
  defineComponent,
  type ExpansionContext,
  type HorizontalAlignment,
  type LineNode,
  NODE_TYPE,
  type SchemaShape,
  SHAPE_VALUES,
  type ShapeName,
  type ShapeNode,
  type SlideNumberNode,
  schema,
  token,
  type TextStyleName,
  type TokenShape,
  type VerticalAlignment,
} from "tycoslide";
import { Component } from "./names.js";

export const LINE_TOKEN = {
  COLOR: "color",
  WIDTH: "width",
  DASH_TYPE: "dashType",
} as const;

export type LineTokens = {
  [LINE_TOKEN.COLOR]: string;
  [LINE_TOKEN.WIDTH]: number;
  [LINE_TOKEN.DASH_TYPE]: DashType;
};

export const LINE_TOKEN_SPEC: TokenShape = token.allRequired(LINE_TOKEN);

export const SLIDE_NUMBER_TOKEN = {
  STYLE: "style",
  COLOR: "color",
  HALIGN: "hAlign",
  VALIGN: "vAlign",
} as const;

export type SlideNumberTokens = {
  [SLIDE_NUMBER_TOKEN.STYLE]: TextStyleName;
  [SLIDE_NUMBER_TOKEN.COLOR]: string;
  [SLIDE_NUMBER_TOKEN.HALIGN]: HorizontalAlignment;
  [SLIDE_NUMBER_TOKEN.VALIGN]: VerticalAlignment;
};

export const SLIDE_NUMBER_TOKEN_SPEC: TokenShape = token.allRequired(SLIDE_NUMBER_TOKEN);

export const SHAPE_TOKEN = {
  FILL: "fill",
  FILL_OPACITY: "fillOpacity",
  BORDER_COLOR: "borderColor",
  BORDER_WIDTH: "borderWidth",
  CORNER_RADIUS: "cornerRadius",
} as const;

export type ShapeTokens = {
  [SHAPE_TOKEN.FILL]: string;
  [SHAPE_TOKEN.FILL_OPACITY]: number;
  [SHAPE_TOKEN.BORDER_COLOR]: string;
  [SHAPE_TOKEN.BORDER_WIDTH]: number;
  [SHAPE_TOKEN.CORNER_RADIUS]: number;
};

export const SHAPE_TOKEN_SPEC: TokenShape = token.allRequired(SHAPE_TOKEN);

// ============================================
// LINE
// ============================================

// Directive schema — author-facing props only.
const lineSchema = {
  beginArrow: schema.enum(ARROW_TYPE_VALUES).optional(),
  endArrow: schema.enum(ARROW_TYPE_VALUES).optional(),
} satisfies SchemaShape;

// Full props for DSL callers (only arrow overrides — styling comes from tokens)
export type LineProps = {
  beginArrow?: ArrowType;
  endArrow?: ArrowType;
};

function expandLine(props: LineProps, _context: ExpansionContext, tokens: LineTokens): LineNode {
  return {
    type: NODE_TYPE.LINE,
    color: tokens.color,
    width: tokens.width,
    dashType: tokens.dashType,
    beginArrow: props.beginArrow,
    endArrow: props.endArrow,
  };
}

export const lineComponent = defineComponent({
  name: Component.Line,
  params: lineSchema,
  tokens: LINE_TOKEN_SPEC,
  expand: expandLine,
});

export function line(tokens: LineTokens, props?: LineProps): ComponentNode {
  return component(Component.Line, props ?? {}, tokens);
}

// ============================================
// SHAPE (all area shapes)
// ============================================

// Directive schema — author-facing props only.
// Styling props removed: visual values come from tokens.
const shapeSchema = {
  shape: schema.enum(SHAPE_VALUES),
} satisfies SchemaShape;

// Full props for DSL callers (only shape geometry — styling comes from tokens)
export type ShapeProps = {
  shape: ShapeName;
};

function expandShape(props: ShapeProps, _context: ExpansionContext, tokens: ShapeTokens): ShapeNode {
  return {
    type: NODE_TYPE.SHAPE,
    shape: props.shape,
    fill: {
      color: tokens.fill,
      opacity: tokens.fillOpacity,
    },
    border: {
      color: tokens.borderColor,
      width: tokens.borderWidth,
    },
    cornerRadius: tokens.cornerRadius,
  };
}

export const shapeComponent = defineComponent({
  name: Component.Shape,
  params: shapeSchema,
  tokens: SHAPE_TOKEN_SPEC,
  expand: expandShape,
});

export function shape(tokens: ShapeTokens, props: ShapeProps): ComponentNode {
  return component(Component.Shape, props, tokens);
}

// ============================================
// SLIDE NUMBER
// ============================================

// Full props for DSL callers (no styling overrides — all comes from tokens)
export type SlideNumberProps = {};

function expandSlideNumber(
  _props: SlideNumberProps,
  context: ExpansionContext,
  tokens: SlideNumberTokens,
): SlideNumberNode {
  const style = tokens.style;
  return {
    type: NODE_TYPE.SLIDE_NUMBER,
    style,
    resolvedStyle: context.theme.textStyles[style],
    color: tokens.color,
    hAlign: tokens.hAlign,
    vAlign: tokens.vAlign,
  };
}

export const slideNumberComponent = defineComponent({
  name: Component.SlideNumber,
  tokens: SLIDE_NUMBER_TOKEN_SPEC,
  expand: expandSlideNumber,
});

export function slideNumber(tokens: SlideNumberTokens, props?: SlideNumberProps): ComponentNode {
  return component(Component.SlideNumber, props ?? {}, tokens);
}
