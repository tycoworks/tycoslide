// Primitive components: line, shape, slideNumber

import {
  ARROW_TYPE_VALUES,
  type ArrowType,
  type ComponentNode,
  component,
  type DashType,
  defineComponent,
  type HorizontalAlignment,
  type InferTokens,
  type LineNode,
  NODE_TYPE,
  type Shadow,
  param,
  SHAPE_VALUES,
  type ShapeName,
  type ShapeNode,
  type SlideNumberNode,
  type RenderContext,
  schema,
  token,
  type TextStyleName,
  type VerticalAlignment,
} from "tycoslide";
import { Component } from "./names.js";

export const lineTokens = token.shape({
  color: token.required<string>(),
  width: token.required<number>(),
  dashType: token.required<DashType>(),
});

export type LineTokens = InferTokens<typeof lineTokens>;

export const slideNumberTokens = token.shape({
  style: token.required<TextStyleName>(),
  color: token.required<string>(),
  hAlign: token.required<HorizontalAlignment>(),
  vAlign: token.required<VerticalAlignment>(),
});

export type SlideNumberTokens = InferTokens<typeof slideNumberTokens>;

export const shapeTokens = token.shape({
  fill: token.required<string>(),
  fillOpacity: token.required<number>(),
  borderColor: token.required<string>(),
  borderWidth: token.required<number>(),
  cornerRadius: token.required<number>(),
  shadow: token.optional<Shadow>(),
});

export type ShapeTokens = InferTokens<typeof shapeTokens>;

// ============================================
// LINE
// ============================================

// Full props for DSL callers (only arrow overrides — styling comes from tokens)
export type LineProps = {
  beginArrow?: ArrowType;
  endArrow?: ArrowType;
};

function renderLine(props: LineProps, _context: RenderContext, tokens: LineTokens): LineNode {
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
  params: {
    beginArrow: param.optional(schema.enum(ARROW_TYPE_VALUES)),
    endArrow: param.optional(schema.enum(ARROW_TYPE_VALUES)),
  },
  tokens: lineTokens,
  render: renderLine,
});

export function line(tokens: LineTokens, props?: LineProps): ComponentNode {
  return component(Component.Line, props ?? {}, tokens);
}

// ============================================
// SHAPE (all area shapes)
// ============================================

// Full props for DSL callers (only shape geometry — styling comes from tokens)
export type ShapeProps = {
  shape: ShapeName;
};

function renderShape(props: ShapeProps, _context: RenderContext, tokens: ShapeTokens): ShapeNode {
  const node: ShapeNode = {
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
  if (tokens.shadow) {
    node.shadow = tokens.shadow;
  }
  return node;
}

export const shapeComponent = defineComponent({
  name: Component.Shape,
  params: {
    shape: param.required(schema.enum(SHAPE_VALUES)),
  },
  tokens: shapeTokens,
  render: renderShape,
});

export function shape(tokens: ShapeTokens, props: ShapeProps): ComponentNode {
  return component(Component.Shape, props, tokens);
}

// ============================================
// SLIDE NUMBER
// ============================================

// Full props for DSL callers (no styling overrides — all comes from tokens)
export type SlideNumberProps = {};

function renderSlideNumber(
  _props: SlideNumberProps,
  context: RenderContext,
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
  tokens: slideNumberTokens,
  render: renderSlideNumber,
});

export function slideNumber(tokens: SlideNumberTokens, props?: SlideNumberProps): ComponentNode {
  return component(Component.SlideNumber, props ?? {}, tokens);
}
