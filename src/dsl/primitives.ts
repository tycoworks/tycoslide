// Primitive components: image, line, shape, slideNumber
// Converts simple factory functions to defineComponent pattern

import { defineComponent, type ComponentNode } from '../core/registry.js';
import { NODE_TYPE } from '../core/nodes.js';
import type { ImageNode, LineNode, ShapeNode, ShapeBorder, SlideNumberNode } from '../core/nodes.js';
import type { TextStyleName, HorizontalAlignment, ArrowType, DashType, ShapeName } from '../core/types.js';
import { HALIGN, SHAPE } from '../core/types.js';

// ============================================
// IMAGE
// ============================================

export const IMAGE_COMPONENT = 'image' as const;

export interface ImageOptions {
  alt?: string;
}

export interface ImageProps extends ImageOptions {
  src: string;
}

const imageComponent = defineComponent<ImageProps>(IMAGE_COMPONENT, (props): ImageNode => ({
  type: NODE_TYPE.IMAGE,
  src: props.src,
  alt: props.alt,
}));

export function image(src: string, options?: ImageOptions): ComponentNode {
  return imageComponent({ src, ...options });
}

// ============================================
// LINE
// ============================================

export const LINE_COMPONENT = 'line' as const;

export interface LineProps {
  color?: string;
  width?: number;
  dashType?: DashType;
  beginArrow?: ArrowType;
  endArrow?: ArrowType;
}

const lineComponent = defineComponent<LineProps>(LINE_COMPONENT, (props): LineNode => ({
  type: NODE_TYPE.LINE,
  color: props.color,
  width: props.width,
  dashType: props.dashType,
  beginArrow: props.beginArrow,
  endArrow: props.endArrow,
}));

export function line(props?: LineProps): ComponentNode {
  return lineComponent(props ?? {});
}

// ============================================
// SHAPE (all area shapes)
// ============================================

export const SHAPE_COMPONENT = 'shape' as const;

export interface ShapeProps {
  shape: ShapeName;
  fill?: { color: string; opacity?: number };
  border?: ShapeBorder;
  cornerRadius?: number;
}

const shapeComponent = defineComponent<ShapeProps>(SHAPE_COMPONENT, (props): ShapeNode => ({
  type: NODE_TYPE.SHAPE,
  shape: props.shape,
  fill: props.fill,
  border: props.border,
  cornerRadius: props.cornerRadius,
}));

export function shape(props: ShapeProps): ComponentNode {
  return shapeComponent(props);
}

// ============================================
// SLIDE NUMBER
// ============================================

export const SLIDE_NUMBER_COMPONENT = 'slideNumber' as const;

export interface SlideNumberProps {
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
}

const slideNumberComponent = defineComponent<SlideNumberProps>(SLIDE_NUMBER_COMPONENT, (props): SlideNumberNode => ({
  type: NODE_TYPE.SLIDE_NUMBER,
  style: props.style,
  color: props.color,
  hAlign: props.hAlign ?? HALIGN.RIGHT,
}));

export function slideNumber(props?: SlideNumberProps): ComponentNode {
  return slideNumberComponent({
    style: props?.style,
    color: props?.color,
    hAlign: props?.hAlign,
  });
}
