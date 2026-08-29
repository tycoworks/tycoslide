import { templateKeys } from "./markdown/textTemplate.js";
import type { AcceptType, AssetType, CompilerConfig, CompilerParameter, CompilerSlot } from "./markdown/types.js";

/** A frontmatter parameter as advertised to AI authors. */
type ManifestParameter = {
  key: string;
  required?: true;
};

/**
 * A body region as advertised to AI authors. `accepts` lists the engine content
 * types the slot allows (`text` | `table` | `image`) — the author routes a
 * matching markdown block (prose/code → text, GFM table → table, mermaid →
 * image) to it; a type not listed fails fast at compile time.
 */
type ManifestSlot = {
  key: string;
  accepts: AcceptType[];
  required?: true;
};

type ManifestLayout = {
  name: string;
  /** Physical slide index in the theme's template. Unique per layout. */
  slideNumber: number;
  description?: string;
  parameters: ManifestParameter[];
  slots: ManifestSlot[];
};

type ManifestAssetEntry = {
  path: string;
  type: AssetType;
  description: string;
};

type Manifest = {
  version: 2;
  layouts: ManifestLayout[];
  assets: Record<string, Record<string, ManifestAssetEntry>>;
};

/**
 * Flatten a compiler parameter to the manifest entries advertised to AI authors.
 * A parameter has no top-level key — its template's placeholders are the keys, so
 * it flattens to one entry per key (shapeName/template stay manifest-internal).
 */
function stripParameter(param: CompilerParameter): ManifestParameter[] {
  return templateKeys(param.template).map((key) => {
    const result: ManifestParameter = { key };
    if (param.required) result.required = true;
    return result;
  });
}

function stripSlot(slot: CompilerSlot): ManifestSlot {
  const result: ManifestSlot = { key: slot.key, accepts: slot.accepts.map((b) => b.type) };
  if (slot.required) result.required = true;
  return result;
}

export function generateManifest(config: CompilerConfig): string {
  const layouts: ManifestLayout[] = config.layouts.map((layout) => {
    const ml: ManifestLayout = {
      name: layout.name,
      slideNumber: layout.slideNumber,
      parameters: layout.parameters.flatMap(stripParameter),
      slots: layout.slots.map(stripSlot),
    };
    if (layout.description !== undefined) ml.description = layout.description;
    return ml;
  });

  const assets: Record<string, Record<string, ManifestAssetEntry>> = {};
  for (const [category, entries] of Object.entries(config.assets)) {
    assets[category] = {};
    for (const [name, entry] of Object.entries(entries)) {
      const manifestEntry: ManifestAssetEntry = {
        path: entry.path,
        type: entry.type,
        description: entry.description,
      };
      assets[category][name] = manifestEntry;
    }
  }

  const manifest: Manifest = {
    version: 2,
    layouts,
    assets,
  };

  return JSON.stringify(manifest, null, 2);
}
