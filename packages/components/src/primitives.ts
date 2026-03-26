// Primitive components: line, shape, slideNumber

import {
  type ComponentNode,
  component,
  type DashType,
  DIRECTION,
  DIRECTION_VALUES,
  type Direction,
  defineComponent,
  type HorizontalAlignment,
  type InferParams,
  type InferTokens,
  type LineNode,
  NODE_TYPE,
  param,
  type RenderContext,
  SHAPE_VALUES,
  type Shadow,
  type ShapeNode,
  SIZE,
  type SlideNumberNode,
  type Stroke,
  schema,
  type TextStyleName,
  token,
  type VerticalAlignment,
} from "tycoslide";
import { Component } from "./names.js";

const lineTokens = token.shape({
  color: token.required<string>(),
  width: token.required<number>(),
  dashType: token.required<DashType>(),
  shadow: token.optional<Shadow>(),
});

export type LineTokens = InferTokens<typeof lineTokens>;

const slideNumberTokens = token.shape({
  style: token.required<TextStyleName>(),
  color: token.required<string>(),
  hAlign: token.required<HorizontalAlignment>(),
  vAlign: token.required<VerticalAlignment>(),
});

export type SlideNumberTokens = InferTokens<typeof slideNumberTokens>;

const shapeTokens = token.shape({
  fill: token.required<string>(),
  fillOpacity: token.required<number>(),
  border: token.optional<Stroke>(),
  cornerRadius: token.required<number>(),
  shadow: token.optional<Shadow>(),
});

export type ShapeTokens = InferTokens<typeof shapeTokens>;

// ============================================
// LINE
// ============================================

const lineParamShape = param.shape({
  direction: param.optional(schema.enum(DIRECTION_VALUES)),
});
export type LineParams = InferParams<typeof lineParamShape>;

function renderLine(params: LineParams, _content: undefined, _context: RenderContext, tokens: LineTokens): LineNode {
  const node: LineNode = {
    type: NODE_TYPE.LINE,
    direction: params.direction ?? DIRECTION.ROW,
    stroke: { color: tokens.color, width: tokens.width, dashType: tokens.dashType },
  };
  if (tokens.shadow) {
    node.shadow = tokens.shadow;
  }
  return node;
}

export const lineComponent = defineComponent({
  name: Component.Line,
  directive: false,
  params: lineParamShape,
  tokens: lineTokens,
  render: renderLine,
});

export function line(tokens: LineTokens, direction?: Direction): ComponentNode {
  return component(Component.Line, { direction }, undefined, tokens);
}

// ============================================
// SHAPE (all area shapes)
// ============================================

const shapeParamShape = param.shape({
  shape: param.required(schema.enum(SHAPE_VALUES)),
});
export type ShapeParams = InferParams<typeof shapeParamShape>;

function renderShape(
  params: ShapeParams,
  _content: undefined,
  _context: RenderContext,
  tokens: ShapeTokens,
): ShapeNode {
  const node: ShapeNode = {
    type: NODE_TYPE.SHAPE,
    width: SIZE.FILL,
    height: SIZE.FILL,
    shape: params.shape,
    fill: {
      color: tokens.fill,
      opacity: tokens.fillOpacity,
    },
    cornerRadius: tokens.cornerRadius,
  };
  if (tokens.border) {
    node.border = tokens.border;
  }
  if (tokens.shadow) {
    node.shadow = tokens.shadow;
  }
  return node;
}

export const shapeComponent = defineComponent({
  name: Component.Shape,
  directive: false,
  params: shapeParamShape,
  tokens: shapeTokens,
  render: renderShape,
});

export function shape(tokens: ShapeTokens, params: ShapeParams): ComponentNode {
  return component(Component.Shape, params, undefined, tokens);
}

// ============================================
// SLIDE NUMBER
// ============================================

function renderSlideNumber(
  _params: {},
  _content: undefined,
  context: RenderContext,
  tokens: SlideNumberTokens,
): SlideNumberNode {
  const style = tokens.style;
  return {
    type: NODE_TYPE.SLIDE_NUMBER,
    width: SIZE.HUG,
    height: SIZE.HUG,
    style,
    resolvedStyle: context.theme.textStyles[style],
    color: tokens.color,
    hAlign: tokens.hAlign,
    vAlign: tokens.vAlign,
  };
}

export const slideNumberComponent = defineComponent({
  name: Component.SlideNumber,
  directive: false,
  tokens: slideNumberTokens,
  render: renderSlideNumber,
});

export function slideNumber(tokens: SlideNumberTokens): ComponentNode {
  return component(Component.SlideNumber, {}, undefined, tokens);
}
