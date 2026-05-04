// Template DSL: defineTemplate()
// Templates declare content and wire into a master by name.

import {
  defineLayout,
  type LayoutDefinition,
  type MasterDefinition,
  type ScalarShape,
  type SlideNode,
} from "@tycoslide/core";

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
 * A complete template: layout + master object + layout tokens.
 * The master is the actual MasterDefinition — no string indirection.
 */
export interface Template {
  layout: LayoutDefinition;
  master: MasterDefinition;
  layoutTokens: Record<string, unknown>;
}

// ============================================
// defineTemplate()
// ============================================

/**
 * Define a slide template — a named layout + master object + layout tokens.
 *
 * A template is the unified authoring concept replacing separate master + layout + variant.
 * It accepts:
 * - layout: a Layout object (reusable structural blueprint)
 * - master: the MasterDefinition this template uses (pre-built data object)
 * - layoutTokens: token values for the layout's render function
 *
 * Returns a Template carrying the LayoutDefinition, master, and layout tokens.
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
  master: MasterDefinition;
  layoutTokens: Record<string, unknown>;
}): Template {
  const { layout: templateLayout, master, layoutTokens, ...rest } = def;

  // Build core layout — render delegates directly to the Layout blueprint.
  const coreLayout = defineLayout({
    ...rest,
    params: templateLayout.params,
    slots: templateLayout.slots,
    render: (params, slots, tokens: TTokens): SlideNode => {
      return templateLayout.render(params as Record<string, unknown>, slots as any, tokens);
    },
  });

  return { layout: coreLayout, master, layoutTokens };
}
