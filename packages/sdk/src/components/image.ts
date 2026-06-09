// Image component

import fs from "node:fs";
import path from "node:path";
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

const SVG_EXTENSION = ".svg";

// ============================================
// TOKENS
// ============================================

const imageParamShape = param.shape({
  alt: param.optional(schema.string()),
});

type ImageParams = InferParams<typeof imageParamShape>;

export interface ImageTokens {
  fit?: Fit;
  tint?: string;
  shadow?: ShadowEffect;
  padding?: number;
}

// ============================================
// SVG RASTERIZATION
// ============================================

async function rasterizeSvg(svgPath: string, context: RenderContext): Promise<string> {
  const resolved = path.resolve(svgPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`SVG file not found: ${resolved}\nCheck the image path in your markdown.`);
  }
  let svgContent = fs.readFileSync(resolved, "utf-8");
  svgContent = svgContent.replace(/<svg([^>]*)>/, (_match, attrs: string) => {
    const cleaned = attrs.replace(/\s(width|height)="[^"]*"/g, "");
    return `<svg${cleaned} width="100%" height="100%">`;
  });
  const { width, height } = context.theme.slide;
  const html = `<div style="display:inline-block;width:${width}px;height:${height}px">${svgContent}</div>`;
  return context.canvas.renderHtml(html, true);
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

  render: async (
    params: ImageParams,
    content: string,
    context: RenderContext,
    tokens: ImageTokens,
  ): Promise<SlideNode> => {
    let src = content;

    if (path.extname(content).toLowerCase() === SVG_EXTENSION) {
      src = await rasterizeSvg(content, context);
    }

    const node: ImageNode = { type: NODE_TYPE.IMAGE, src, fit: tokens?.fit ?? FIT.CONTAIN };
    if (params.alt) {
      node.alt = params.alt;
    }
    if (tokens?.shadow) {
      node.shadow = tokens.shadow;
    }
    if (tokens?.tint) {
      node.tint = tokens.tint;
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
