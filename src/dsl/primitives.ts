// Primitive components: image, line, rectangle, slideNumber
// Converts simple factory functions to defineComponent pattern

import { defineComponent, type ComponentNode } from '../core/registry.js';
import { NODE_TYPE } from '../core/nodes.js';
import type { ImageNode, LineNode, RectangleNode, SlideNumberNode, RectangleBorder } from '../core/nodes.js';
import type { TextStyleName, HorizontalAlignment, ArrowType, DashType } from '../core/types.js';
import { HALIGN } from '../core/types.js';

// ============================================
// IMAGE
// ============================================

interface ImageInternalProps {
  src: string;
  alt?: string;
}

const imageComponent = defineComponent<ImageInternalProps>('image', (props): ImageNode => ({
  type: NODE_TYPE.IMAGE,
  src: props.src,
  alt: props.alt,
}));

export interface ImageProps {
  alt?: string;
}

export function image(src: string, props?: ImageProps): ComponentNode {
  return imageComponent({ src, ...props });
}

// ============================================
// LINE
// ============================================

interface LineInternalProps {
  color?: string;
  width?: number;
  dashType?: DashType;
  beginArrow?: ArrowType;
  endArrow?: ArrowType;
}

const lineComponent = defineComponent<LineInternalProps>('line', (props): LineNode => ({
  type: NODE_TYPE.LINE,
  color: props.color,
  width: props.width,
  dashType: props.dashType,
  beginArrow: props.beginArrow,
  endArrow: props.endArrow,
}));

export interface LineProps {
  color?: string;
  width?: number;
  dashType?: DashType;
  beginArrow?: ArrowType;
  endArrow?: ArrowType;
}

export function line(props?: LineProps): ComponentNode {
  return lineComponent(props ?? {});
}

// ============================================
// RECTANGLE
// ============================================

interface RectangleInternalProps {
  fill?: { color: string; opacity?: number };
  border?: RectangleBorder;
  cornerRadius?: number;
}

const rectangleComponent = defineComponent<RectangleInternalProps>('rectangle', (props): RectangleNode => ({
  type: NODE_TYPE.RECTANGLE,
  fill: props.fill,
  border: props.border,
  cornerRadius: props.cornerRadius,
}));

export interface RectangleProps {
  fill?: { color: string; opacity?: number };
  border?: RectangleBorder;
  cornerRadius?: number;
}

export function rectangle(props?: RectangleProps): ComponentNode {
  return rectangleComponent(props ?? {});
}

// ============================================
// SLIDE NUMBER
// ============================================

interface SlideNumberInternalProps {
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
}

const slideNumberComponent = defineComponent<SlideNumberInternalProps>('slideNumber', (props): SlideNumberNode => ({
  type: NODE_TYPE.SLIDE_NUMBER,
  style: props.style,
  color: props.color,
  hAlign: props.hAlign ?? HALIGN.RIGHT,
}));

export interface SlideNumberProps {
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
}

export function slideNumber(props?: SlideNumberProps): ComponentNode {
  return slideNumberComponent({
    style: props?.style,
    color: props?.color,
    hAlign: props?.hAlign,
  });
}
