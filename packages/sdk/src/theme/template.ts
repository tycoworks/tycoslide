// Template DSL: defineTemplate()

import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Background, SlideNode } from "@tycoslide/core";
import { defineLayout, type LayoutConfig, type ScalarShape } from "../authoring/index.js";

// ============================================
// TYPES
// ============================================

/** Documentation metadata for templates and assets — used by the skill compiler. */
export interface Documentation {
  description: string;
  whenToUse?: string;
  whenNotToUse?: string;
  limits?: string[];
  gotchas?: string[];
}

/** A documented asset entry — path + documentation for the skill compiler manifest. */
export interface AssetEntry {
  /** Relative path from the package root to the asset file (e.g., "assets/icons/shield.png"). */
  path: string;
  documentation: Documentation;
}

/** Matches `$category.name` — word chars only, exactly two segments. */
const ASSET_REF_PATTERN = /^\$([a-zA-Z]\w*)\.([a-zA-Z]\w*)$/;

/** Test whether a string is a `$category.name` asset reference. */
export function isAssetRef(value: string): boolean {
  return ASSET_REF_PATTERN.test(value);
}

/** Raw catalog entries type — category → name → documented entry. */
export type AssetCatalogEntries = Record<string, Record<string, AssetEntry>>;

/**
 * Asset catalog — holds asset entries and resolves them to absolute disk paths.
 *
 * Theme authors create one with `import.meta.url` and their catalog entries.
 * The class derives the package root from the caller's location on disk.
 *
 * @example
 * ```ts
 * export const assets = new AssetCatalog(import.meta.url, {
 *   icons: { shield: { path: "assets/icons/shield.png", documentation: { description: "..." } } },
 * });
 * ```
 */
export class AssetCatalog {
  readonly entries: AssetCatalogEntries;
  private readonly packageRoot: string;

  constructor(importMetaUrl: string, entries: AssetCatalogEntries) {
    this.packageRoot = path.resolve(path.dirname(fileURLToPath(importMetaUrl)), "..");
    this.entries = entries;
  }

  /** Resolve an asset entry to an absolute disk path. */
  resolve(entry: AssetEntry): string {
    return path.join(this.packageRoot, entry.path);
  }

  /** Resolve a `$category.name` reference string to an absolute disk path. */
  resolveRef(ref: string): string {
    const match = ASSET_REF_PATTERN.exec(ref);
    if (!match) {
      throw new Error(`Asset reference '${ref}' must be in the form $category.name (e.g. $icons.shield).`);
    }
    const [, category, name] = match;
    const entry = this.entries[category]?.[name];
    if (!entry) {
      const available = Object.keys(this.entries[category] ?? {}).join(", ");
      throw new Error(
        `Unknown asset reference '${ref}'. Category '${category}' has no entry '${name}'.` +
          (available ? ` Available: ${available}` : ""),
      );
    }
    return this.resolve(entry);
  }
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
 * A complete template: layout + background + tokens.
 * No master indirection — chrome is composed into the layout.
 */
export interface Template {
  documentation: Documentation;
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
  documentation: Documentation;
  layout: Layout<TTokens, TParams, TSlots>;
  background: Background;
  tokens: Record<string, unknown>;
}): Template {
  const { layout: templateLayout, background, tokens, name, documentation } = def;

  // Build core layout — render delegates directly to the Layout blueprint.
  const coreLayout = defineLayout({
    name,
    params: templateLayout.params,
    slots: templateLayout.slots,
    render: (params, slots, tokens: TTokens): SlideNode => {
      return templateLayout.render(params as Record<string, unknown>, slots as any, tokens);
    },
  });

  return { documentation, layout: coreLayout, background, tokens };
}
