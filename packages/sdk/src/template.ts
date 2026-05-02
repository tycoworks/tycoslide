// Template DSL: defineMaster() and defineTemplate()
// Wraps core's defineLayout/defineMaster with the unified "template" authoring concept.
// Masters provide a shared base layer (chrome, background).
// Templates declare content and wire into a master by name.

import {
  type Background,
  Bounds,
  type ComponentNode,
  defineLayout,
  defineMaster as coreDefineMaster,
  layoutRegistry,
  masterRegistry,
  type ScalarShape,
  SIZE,
  type Slide,
  type SlideNode,
} from "@tycoslide/core";
import { column } from "./components/containers.js";

/** Reserved token key — tokens under this key are forwarded to the master's render function. */
const MASTER_TOKEN_KEY = "master" as const;

// ============================================
// TYPES
// ============================================

/**
 * The return type from a master's render function.
 * `content` is the master layer nodes (footer, logo, slide number, etc).
 * `contentBounds` is optional — when present, template content is positioned within these bounds.
 * `background` is the slide background.
 */
export interface MasterResult {
  content: ComponentNode;
  contentBounds?: Bounds;
  background: Background;
}

/**
 * A master definition — typed wrapper around core's MasterDefinition.
 * TTokens is the master's token interface (e.g., { background: string; footerHeight: number }).
 */
export interface MasterDefinition<TTokens = Record<string, unknown>> {
  name: string;
  render: (tokens: TTokens, slideSize: { width: number; height: number }) => MasterResult;
}

/**
 * A template definition — the result of calling defineTemplate().
 * Carries the original definition shape plus a reference to the registered layout.
 */
export interface TemplateDefinition<
  TTokens = Record<string, unknown>,
  TParams = Record<string, unknown>,
  TSlots extends readonly string[] = readonly [],
> {
  name: string;
  description: string;
  params: ScalarShape;
  slots?: TSlots;
  master: MasterDefinition<any>;
  render: (params: TParams, slots: { [K in TSlots[number]]: SlideNode[] }, tokens: TTokens) => SlideNode;
}

// ============================================
// defineMaster()
// ============================================

/**
 * Define a master slide and auto-register it with core's masterRegistry.
 *
 * Masters provide the shared base layer for a set of templates:
 * - Background (color, image, or both)
 * - Chrome nodes (footer, logo, slide number, decorative elements)
 * - Optional contentBounds — constrains where template content is placed
 */
export function defineMaster<TTokens extends object = Record<string, unknown>>(def: {
  name: string;
  render: (tokens: TTokens, slideSize: { width: number; height: number }) => MasterResult;
}): MasterDefinition<TTokens> {
  // Register with core's master registry (core's defineMaster is a pure factory)
  const coreMaster = coreDefineMaster({
    name: def.name,
    render: (tokens, slideSize) => {
      const result = def.render(tokens as TTokens, slideSize);
      return {
        content: result.content,
        // Core requires contentBounds — provide a zero-inset fallback if not given
        contentBounds: result.contentBounds ?? new Bounds(0, 0, slideSize.width, slideSize.height),
        background: result.background,
      };
    },
  });
  masterRegistry.register(coreMaster);

  // Return the typed SDK definition (keeps TTokens on the render signature)
  return def as MasterDefinition<TTokens>;
}

// ============================================
// defineTemplate()
// ============================================

/**
 * Define a slide template and auto-register it as a layout with core's layoutRegistry.
 *
 * A template is the unified authoring concept replacing separate master + layout + variant.
 * It declares:
 * - params — scalar frontmatter fields
 * - slots — named body regions (optional)
 * - master — the shared chrome/background layer
 * - render — produces content nodes (NOT the full Slide — framework handles that)
 *
 * Token split: the `master` key in tokens is forwarded to the master; the rest go to render.
 */
export function defineTemplate<
  TTokens extends object = Record<string, unknown>,
  TParams extends ScalarShape = ScalarShape,
  const TSlots extends readonly string[] = readonly [],
>(def: {
  name: string;
  description: string;
  params: TParams;
  slots?: TSlots;
  master: MasterDefinition<any>;
  render: (
    params: Record<string, unknown>,
    slots: { [K in TSlots[number]]: SlideNode[] },
    tokens: TTokens,
  ) => SlideNode;
}): TemplateDefinition<TTokens, Record<string, unknown>, TSlots> {
  // Build the core layout. The layout's tokens come from theme.templates[name].
  // We split the `master` key out and forward the rest to the template render.
  const layout = defineLayout({
    name: def.name,
    description: def.description,
    params: def.params,
    slots: def.slots,
    render: (params, slots, tokens: Record<string, unknown>): Slide => {
      // Split tokens: master bag vs content bag
      const { [MASTER_TOKEN_KEY]: masterTokens, ...contentTokens } = tokens;

      // Call the template's render to get the content node tree
      const contentNode = def.render(params as Record<string, unknown>, slots as any, contentTokens as TTokens);

      // Wrap content in a fill-height column (framework wrapper)
      const wrappedContent = column({ spacing: 0, height: SIZE.FILL }, contentNode);

      return {
        masterName: def.master.name,
        masterTokens: (masterTokens as Record<string, unknown>) ?? {},
        content: wrappedContent,
      };
    },
  });

  layoutRegistry.register(layout);

  const templateDef: TemplateDefinition<TTokens, Record<string, unknown>, TSlots> = {
    name: def.name,
    description: def.description,
    params: def.params,
    slots: def.slots,
    master: def.master,
    render: def.render as TemplateDefinition<TTokens, Record<string, unknown>, TSlots>["render"],
  };
  return templateDef;
}
