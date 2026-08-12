import { templateKeys } from "./markdown/textTemplate.js";
import type { AssetType, CompilerConfig, CompilerParameter, CompilerSlot } from "./markdown/types.js";
import { CompilerSlotType, ParameterType } from "./markdown/types.js";

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

/** A body region (text, table, code, mermaid) as advertised to AI authors. */
type ManifestSlot = {
  key: string;
  type: CompilerSlot["type"];
  required?: true;
  limit?: ManifestLimit;
  codeTheme?: string;
  mermaidVariant?: string;
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
  description: string;
  whenToUse: string;
  whenNotToUse: string;
  parameters: ManifestParameter[];
  slots: ManifestSlot[];
};

type ManifestAssetEntry = {
  path: string;
  type: AssetType;
  description: string;
  whenToUse?: string;
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
      if (param.limit) result.limit = param.limit;
      return [result];
    }
  }
}

function stripSlot(slot: CompilerSlot): ManifestSlot {
  const result: ManifestSlot = { key: slot.key, type: slot.type };
  if (slot.required) result.required = true;
  if (slot.limit) result.limit = slot.limit;
  switch (slot.type) {
    case CompilerSlotType.Text:
    case CompilerSlotType.Table:
      // No fields beyond the shared key/type/required/limit.
      break;
    case CompilerSlotType.Code:
      result.codeTheme = slot.codeTheme;
      break;
    case CompilerSlotType.Mermaid:
      result.mermaidVariant = slot.mermaidVariant;
      break;
  }
  return result;
}

export function generateManifest(config: CompilerConfig, options: ManifestOptions): string {
  const layouts: ManifestLayout[] = config.layouts.map((layout) => ({
    name: layout.name,
    slideNumber: layout.slideNumber,
    description: layout.description,
    whenToUse: layout.whenToUse,
    whenNotToUse: layout.whenNotToUse,
    parameters: layout.parameters.flatMap(stripParameter),
    slots: layout.slots.map(stripSlot),
  }));

  const assets: Record<string, Record<string, ManifestAssetEntry>> = {};
  for (const [category, entries] of Object.entries(config.assets)) {
    assets[category] = {};
    for (const [name, entry] of Object.entries(entries)) {
      const manifestEntry: ManifestAssetEntry = {
        path: entry.path,
        type: entry.type,
        description: entry.description,
      };
      if (entry.whenToUse) manifestEntry.whenToUse = entry.whenToUse;
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
