// Primitive components: line, shape, slideNumber

import {
  ARROW_TYPE_VALUES,
  type ComponentNode,
  component,
  type DashType,
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
  beginArrow: param.optional(schema.enum(ARROW_TYPE_VALUES)),
  endArrow: param.optional(schema.enum(ARROW_TYPE_VALUES)),
});
export type LineParams = InferParams<typeof lineParamShape>;

function renderLine(params: LineParams, _content: undefined, _context: RenderContext, tokens: LineTokens): LineNode {
  const node: LineNode = {
    type: NODE_TYPE.LINE,
    color: tokens.color,
    width: tokens.width,
    dashType: tokens.dashType,
    beginArrow: params.beginArrow,
    endArrow: params.endArrow,
  };
  if (tokens.shadow) {
    node.shadow = tokens.shadow;
  }
  return node;
}

export const lineComponent = defineComponent({
  name: Component.Line,
  params: lineParamShape,
  tokens: lineTokens,
  render: renderLine,
});

export function line(tokens: LineTokens, params?: LineParams): ComponentNode {
  return component(Component.Line, params ?? {}, undefined, tokens);
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

export type SlideNumberParams = {};

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
  tokens: slideNumberTokens,
  render: renderSlideNumber,
});

export function slideNumber(tokens: SlideNumberTokens, params?: SlideNumberParams): ComponentNode {
  return component(Component.SlideNumber, params ?? {}, undefined, tokens);
}
