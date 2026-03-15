// Image component with asset resolution

import type { Image, RootContent } from "mdast";
import {
  type ComponentNode,
  component,
  defineComponent,
  type RenderContext,
  type ImageNode,
  NODE_TYPE,
  type SchemaShape,
  SYNTAX,
  schema,
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
// IMAGE COMPONENT
// ============================================

const imageSchema = {
  alt: schema.string().optional(),
} satisfies SchemaShape;

export type ImageProps = {
  alt?: string;
};

export type ImageComponentProps = { body: string } & ImageProps;

export const imageComponent = defineComponent({
  name: Component.Image,
  body: schema.string(),
  params: imageSchema,
  tokens: {},

  mdast: {
    nodeTypes: [SYNTAX.IMAGE],
    compile: (node: RootContent): ComponentNode | null => {
      const img = node as Image;
      return component(Component.Image, { body: img.url, ...(img.alt ? { alt: img.alt } : {}) });
    },
  },

  render: (props: ImageComponentProps, context: RenderContext): ImageNode => {
    let src = props.body;
    if (src.startsWith(ASSET_PREFIX)) {
      src = resolveAssetPath(src, context.assets);
    }
    return { type: NODE_TYPE.IMAGE, src };
  },
});

export function image(src: string, options?: ImageProps): ComponentNode {
  return component(Component.Image, { body: src, ...options });
}
