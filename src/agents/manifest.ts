import {
  type AcceptType,
  type CompilerParameter,
  type CompilerSlot,
  type CompilerThemeConfig,
  templateKeys,
} from "../index.js";
import { ASSETS_FILE, jsonFile } from "./files.js";

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

/**
 * What an agent reads WHOLE, every session: the layouts it composes into. Nothing
 * open-ended belongs here — a manifest that grows with the theme's image count
 * spends the agent's context before it has read a single layout.
 */
type Manifest = {
  layouts: ManifestLayout[];
  /**
   * Where the images are: the catalog, a separate document to SEARCH. It is the
   * half that grows without bound -- a theme's icon set can run to thousands --
   * so it stays complete in its own file and reading it stays opt-in.
   */
  assets: string;
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

/** The layouts document: read whole, so it carries no open-ended list. */
export function generateManifest(config: CompilerThemeConfig): string {
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
  return jsonFile(manifest);
}
