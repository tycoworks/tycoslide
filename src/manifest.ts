import { templateKeys } from "./markdown/textTemplate.js";
import type { AcceptType, AssetType, CompilerConfig, CompilerParameter, CompilerSlot } from "./markdown/types.js";
import { ParameterType } from "./markdown/types.js";

export type ManifestOptions = {
  build: { command: string };
};

type ManifestLimit = { maxChars?: number; maxLines?: number; maxItems?: number };

/** A frontmatter parameter (template, image) as advertised to AI authors. */
type ManifestParameter = {
  key: string;
  type: CompilerParameter["type"];
  required?: true;
  limit?: ManifestLimit;
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
  limit?: ManifestLimit;
};

type ManifestLayout = {
  name: string;
  /**
   * Physical slide index in the theme's template. Two manifest layouts may
   * share a slideNumber when they back the same physical slide with different
   * slot-type intents (e.g. an image variant and a mermaid variant); authors
   * pick between them by layout name.
   */
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
  version: 1;
  layouts: ManifestLayout[];
  assets: Record<string, Record<string, ManifestAssetEntry>>;
  build: {
    command: string;
  };
};

/**
 * Flatten a compiler parameter to the manifest entries advertised to AI authors.
 * A template parameter has no top-level key — its template's keys are the keys, so it
 * flattens to one entry per key (shapeName/template stay manifest-internal). An
 * image parameter is a single key.
 *
 * A template parameter's `limit` is deliberately NOT projected here: it measures the
 * expanded run text (parameter-level), so surfacing it per key would misrepresent
 * it as per-key. How to advertise a parameter-level limit is a Phase 2 decision;
 * until then it stays manifest-internal.
 */
function stripParameter(param: CompilerParameter): ManifestParameter[] {
  switch (param.type) {
    case ParameterType.Template:
      return templateKeys(param.template).map((key) => {
        const result: ManifestParameter = { key, type: param.type };
        if (param.required) result.required = true;
        return result;
      });
    case ParameterType.Image: {
      const result: ManifestParameter = { key: param.key, type: param.type };
      if (param.required) result.required = true;
      return [result];
    }
  }
}

function stripSlot(slot: CompilerSlot): ManifestSlot {
  const result: ManifestSlot = { key: slot.key, accepts: slot.accepts.map((b) => b.type) };
  if (slot.required) result.required = true;
  if (slot.limit) result.limit = slot.limit;
  return result;
}

export function generateManifest(config: CompilerConfig, options: ManifestOptions): string {
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
    version: 1,
    layouts,
    assets,
    build: {
      command: options.build.command,
    },
  };

  return JSON.stringify(manifest, null, 2);
}
