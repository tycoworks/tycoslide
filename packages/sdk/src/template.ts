// Template DSL: defineTemplate()
// Masters provide a shared base layer (chrome, background).
// Templates declare content and wire into a master by name.

import {
  type Background,
  type Bounds,
  type ComponentNode,
  defineLayout,
  type LayoutDefinition,
  type ScalarShape,
  SIZE,
  type Slide,
  type SlideNode,
} from "@tycoslide/core";
import { column } from "./components/containers.js";

// ============================================
// TYPES
// ============================================

/**
 * The return type from a master's render function.
 * `content` is the master layer nodes (footer, logo, slide number, etc).
 * `contentBounds` is optional — when present, template content is positioned within these bounds.
 * `background` is the slide background.
 */
export interface MasterLayer {
  content: ComponentNode;
  contentBounds?: Bounds;
  background: Background;
}

/**
 * A master chrome blueprint — plain generic interface like Layout<TTokens>.
 * Masters are plain objects with a typed render function.
 * No factory needed — just implement the interface.
 */
export interface Master<TTokens extends object = Record<string, unknown>> {
  name: string;
  render: (tokens: TTokens, slideSize: { width: number; height: number }) => MasterLayer;
}

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
 * A complete template: layout + master + tokens (explicitly separated).
 * The master and its tokens are first-class fields — no magic token-bag key.
 */
export interface Template {
  layout: LayoutDefinition;
  master: Master<any>;
  masterTokens: Record<string, unknown>;
  layoutTokens: Record<string, unknown>;
}

// ============================================
// defineTemplate()
// ============================================

/**
 * Define a slide template — a named layout + master + separated tokens.
 *
 * A template is the unified authoring concept replacing separate master + layout + variant.
 * It accepts:
 * - layout: a Layout object (reusable structural blueprint)
 * - master: a Master object (chrome/background blueprint)
 * - masterTokens: token values for the master's render function
 * - layoutTokens: token values for the layout's render function
 *
 * Returns a Template carrying the LayoutDefinition, master, and separated tokens.
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
  master: Master<any>;
  masterTokens: Record<string, unknown>;
  layoutTokens: Record<string, unknown>;
}): Template {
  const { layout: templateLayout, master, masterTokens, layoutTokens, ...rest } = def;

  // Build the core layout. At render time, core passes the flat token bag
  // (assembled by templatesToLayouts). The render wrapper splits it back out.
  const coreLayout = defineLayout({
    ...rest,
    params: templateLayout.params,
    slots: templateLayout.slots,
    render: (params, slots, flatTokens: Record<string, unknown>): Slide => {
      // The flat bag has master info under the "master" key (put there by templatesToLayouts).
      // Strip it and pass only content tokens to the layout render.
      const { master: masterInfo, ...contentTokens } = flatTokens;
      const ref = masterInfo as { masterName: string; tokens: Record<string, unknown> } | undefined;

      const contentNode = templateLayout.render(
        params as Record<string, unknown>,
        slots as any,
        contentTokens as TTokens,
      );

      return {
        masterName: ref?.masterName ?? "",
        masterTokens: ref?.tokens ?? {},
        content: column({ spacing: 0, height: SIZE.FILL }, contentNode),
      };
    },
  });

  return { layout: coreLayout, master, masterTokens, layoutTokens };
}
