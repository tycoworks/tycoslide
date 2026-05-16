// Template DSL: defineTemplate()

import type { Background, SlideNode } from "@tycoslide/core";
import { defineLayout, type LayoutConfig, type ScalarShape } from "./authoring/index.js";

// ============================================
// TYPES
// ============================================

/**
 * A reusable structural blueprint — params + slots + render function.
 * Layouts capture the spatial structure of a slide (where content goes)
 * without any design tokens. Multiple templates can share the same layout
 * with different token values.
 */
export interface Layout<
  TTokens extends object = Record<string, unknown>,
  TParams extends ScalarShape = ScalarShape,
  TSlots extends readonly string[] = readonly [],
> {
  params: TParams;
  slots?: TSlots;
  render: (
    params: Record<string, unknown>,
    slots: { [K in TSlots[number]]: SlideNode[] },
    tokens: TTokens,
  ) => SlideNode;
}

/**
 * A complete template: layout + background + tokens.
 * No master indirection — chrome is composed into the layout.
 */
export interface Template {
  description: string;
  layout: LayoutConfig;
  background: Background;
  tokens: Record<string, unknown>;
}

// ============================================
// defineTemplate()
// ============================================

/**
 * Define a slide template — a named layout + background + tokens.
 *
 * A template is the unified authoring concept. Chrome is composed into the layout
 * via composition functions (chromed). Background is provided directly.
 *
 * Returns a Template carrying the core Layout, background, and tokens.
 * The layout is NOT auto-registered — the CLI extracts and registers layouts
 * from the resolved theme format.
 */
export function defineTemplate<
  TTokens extends object = Record<string, unknown>,
  TParams extends ScalarShape = ScalarShape,
  const TSlots extends readonly string[] = readonly [],
>(def: {
  name: string;
  description: string;
  layout: Layout<TTokens, TParams, TSlots>;
  background: Background;
  tokens: Record<string, unknown>;
}): Template {
  const { layout: templateLayout, background, tokens, name, description } = def;

  // Build core layout — render delegates directly to the Layout blueprint.
  const coreLayout = defineLayout({
    name,
    params: templateLayout.params,
    slots: templateLayout.slots,
    render: (params, slots, tokens: TTokens): SlideNode => {
      return templateLayout.render(params as Record<string, unknown>, slots as any, tokens);
    },
  });

  return { description, layout: coreLayout, background, tokens };
}
