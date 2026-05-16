// Define Layout
// Factory for creating layout definitions.
// Moved from core — defineLayout is authoring-time, not runtime.

import type { SlideNode } from "@tycoslide/core";
import { RESERVED_FRONTMATTER_KEYS } from "@tycoslide/core";
import type { z } from "zod";
import type { ParamShape, ScalarShape } from "./param.js";

// ============================================
// LAYOUT TYPES
// ============================================

/** Map slot names to their render type (each slot becomes SlideNode[]). */
type SlotsToProps<T extends readonly string[]> = { [K in T[number]]: SlideNode[] };

/**
 * A named, described, typed slide factory.
 * `params` holds scalar fields (from YAML frontmatter).
 * `slots` lists slot names (from ::name:: body markers), optional.
 * Use `defineLayout()` to create layouts.
 */
export interface LayoutConfig {
  name: string;
  params: ParamShape;
  slots?: readonly string[];
  render: (params: any, slots: any, tokens: unknown) => SlideNode;
}

/**
 * Define a layout. Pure factory — does NOT register the layout.
 *
 * Annotate the `tokens` parameter in the render callback with your token interface
 * (e.g., `tokens: BodyLayoutTokens`) for compile-time type checking.
 */
export function defineLayout<
  TTokens extends object = Record<string, unknown>,
  TParams extends ScalarShape = ScalarShape,
  const TSlots extends readonly string[] = readonly [],
>(def: {
  name: string;
  params: TParams;
  slots?: TSlots;
  render: (params: z.infer<z.ZodObject<TParams>>, slots: SlotsToProps<TSlots>, tokens: TTokens) => SlideNode;
}): LayoutConfig {
  for (const key of Object.keys(def.params)) {
    if (RESERVED_FRONTMATTER_KEYS.has(key as any)) {
      throw new Error(
        `Layout '${def.name}': param '${key}' is a reserved frontmatter key (${[...RESERVED_FRONTMATTER_KEYS].join(", ")}). Use a different name.`,
      );
    }
  }
  return def as unknown as LayoutConfig;
}
