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

/**
 * What an agent reads WHOLE, every session: the layouts it composes into. Nothing
 * open-ended belongs here — a manifest that grows with the theme's picture count
 * spends the agent's context before it has read a single layout.
 */
type Manifest = {
  layouts: ManifestLayout[];
  /** Where the pictures are. The catalog is a separate document, to be searched. */
  assets: string;
};

/**
 * What an agent SEARCHES: every picture the theme offers, by category and name.
 * Split out of the manifest because it is the half that grows without bound — a
 * theme's icon set can run to thousands, and 135 bytes each is a manifest nobody
 * can afford to read. Kept as its own file rather than trimmed, so the catalog
 * stays complete and the cost of it stays opt-in.
 */
type AssetCatalog = Record<string, Record<string, ManifestAssetEntry>>;

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

/** Filename of the searchable asset catalog, named by the manifest that points at it. */
export const ASSETS_FILE = "assets.json";

/** The layouts document: read whole, so it carries no open-ended list. */
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

  const manifest: Manifest = { layouts, assets: ASSETS_FILE };
  return JSON.stringify(manifest, null, 2);
}

/** The catalog document: searched by name, never read whole. */
export function generateAssetCatalog(config: CompilerConfig): string {
  const assets: AssetCatalog = {};
  for (const [category, entries] of Object.entries(config.assets)) {
    assets[category] = {};
    for (const [name, entry] of Object.entries(entries)) {
      assets[category][name] = { path: entry.path, type: entry.type, description: entry.description };
    }
  }
  return JSON.stringify(assets, null, 2);
}
