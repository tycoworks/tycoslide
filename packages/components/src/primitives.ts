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
  type SlideNumberNode,
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
  borderColor: token.required<string>(),
  borderWidth: token.required<number>(),
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
    color: tokens.color,
    width: tokens.width,
    dashType: tokens.dashType,
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
    shape: params.shape,
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

const slideNumberParamShape = param.shape({});
export type SlideNumberParams = InferParams<typeof slideNumberParamShape>;

function renderSlideNumber(
  _params: SlideNumberParams,
  _content: undefined,
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
  directive: false,
  tokens: slideNumberTokens,
  render: renderSlideNumber,
});

export function slideNumber(tokens: SlideNumberTokens, params?: SlideNumberParams): ComponentNode {
  return component(Component.SlideNumber, params ?? {}, undefined, tokens);
}
