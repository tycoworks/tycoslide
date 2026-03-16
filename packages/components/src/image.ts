// Image component with asset resolution

import type { Image, RootContent } from "mdast";
import {
  type ComponentNode,
  component,
  defineComponent,
  type ImageNode,
  type InferTokens,
  NODE_TYPE,
  type RenderContext,
  type Shadow,
  SYNTAX,
  schema,
  token,
} from "tycoslide";
import { Component } from "./names.js";

// ============================================
// ASSET RESOLUTION
// ============================================

const ASSET_PREFIX = "$";

/**
 * Resolve a `$dot.path` reference to a string value from the assets object.
 * Throws descriptive errors if the path is invalid or the value is not a string.
 */
function resolveAssetPath(ref: string, assets: Record<string, unknown> | undefined): string {
  if (!assets) {
    throw new Error(`asset reference '${ref}' found but no assets provided in CompileOptions`);
  }

  const dotPath = ref.slice(ASSET_PREFIX.length);
  const segments = dotPath.split(".");
  let current: unknown = assets;

  for (let i = 0; i < segments.length; i++) {
    if (current === null || typeof current !== "object") {
      const traversed = segments.slice(0, i).join(".");
      throw new Error(`asset reference '${ref}' failed — '${traversed}' is not an object`);
    }

    const key = segments[i];
    const obj = current as Record<string, unknown>;

    if (!(key in obj)) {
      const available = Object.keys(obj).join(", ");
      const at = i === 0 ? "root" : `'${segments.slice(0, i).join(".")}'`;
      throw new Error(`asset reference '${ref}' could not be resolved. Available keys at ${at}: ${available}`);
    }

    current = obj[key];
  }

  if (typeof current === "string") {
    return current;
  }

  if (current !== null && typeof current === "object") {
    const keys = Object.keys(current as Record<string, unknown>);
    const suggestions = keys
      .slice(0, 5)
      .map((k) => `${ASSET_PREFIX}${dotPath}.${k}`)
      .join(", ");
    throw new Error(`asset reference '${ref}' resolved to an object, not a string. Did you mean ${suggestions}?`);
  }

  throw new Error(`asset reference '${ref}' resolved to ${typeof current}, expected a string`);
}

// ============================================
// TOKENS
// ============================================

const imageTokens = token.shape({
  shadow: token.optional<Shadow>(),
});

export type ImageTokens = InferTokens<typeof imageTokens>;

// ============================================
// IMAGE COMPONENT
// ============================================

export const imageComponent = defineComponent({
  name: Component.Image,
  content: schema.string(),
  tokens: imageTokens,

  mdast: {
    nodeTypes: [SYNTAX.IMAGE],
    compile: (node: RootContent): ComponentNode | null => {
      const img = node as Image;
      return component(Component.Image, {}, img.url);
    },
  },

  render: (_params: {}, content: string, context: RenderContext, tokens: ImageTokens): ImageNode => {
    let src = content;
    if (src.startsWith(ASSET_PREFIX)) {
      src = resolveAssetPath(src, context.assets);
    }
    const node: ImageNode = { type: NODE_TYPE.IMAGE, src };
    if (tokens?.shadow) {
      node.shadow = tokens.shadow;
    }
    return node;
  },
});

export function image(src: string, tokens?: ImageTokens): ComponentNode {
  return component(Component.Image, {}, src, tokens);
}

