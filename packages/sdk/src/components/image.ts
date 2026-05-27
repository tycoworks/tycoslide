// Image component

import type { SlideNode } from "@tycoslide/core";
import {
  type ComponentNode,
  component,
  FIT,
  type Fit,
  type ImageNode,
  NODE_TYPE,
  type RenderContext,
  type ShadowEffect,
  SIZE,
  SYNTAX,
} from "@tycoslide/core";
import type { Image, RootContent } from "mdast";
import { defineComponent, type InferParams, param, schema } from "../authoring/index.js";
import { Component } from "../presets/names.js";
import { column } from "./containers.js";

// ============================================
// TOKENS
// ============================================

const imageParamShape = param.shape({
  alt: param.optional(schema.string()),
});

type ImageParams = InferParams<typeof imageParamShape>;

export interface ImageTokens {
  fit?: Fit;
  shadow?: ShadowEffect;
  padding?: number;
}

// ============================================
// IMAGE COMPONENT
// ============================================

export const imageComponent = defineComponent({
  name: Component.Image,
  content: schema.string(),
  params: imageParamShape,

  syntax: {
    nodeTypes: [SYNTAX.IMAGE],
    compile: (node: RootContent): ComponentNode | null => {
      const img = node as Image;
      return component(Component.Image, { alt: img.alt || undefined }, img.url);
    },
  },

  render: (params: ImageParams, content: string, _context: RenderContext, tokens: ImageTokens): SlideNode => {
    const node: ImageNode = { type: NODE_TYPE.IMAGE, src: content, fit: tokens?.fit ?? FIT.CONTAIN };
    if (params.alt) {
      node.alt = params.alt;
    }
    if (tokens?.shadow) {
      node.shadow = tokens.shadow;
    }
    if (tokens?.padding) {
      return column({ padding: tokens.padding, height: SIZE.FILL }, node);
    }
    return node;
  },
});

export function image(src: string, tokens: ImageTokens, alt?: string): ComponentNode {
  return component(Component.Image, { ...(alt != null && { alt }) }, src, tokens);
}
