// Plugin compiler: generates manifest.json from a ThemeDefinition.

import type { ThemeDefinition } from "../theme/index.js";
import { introspectParams } from "./introspect.js";

// ============================================
// CONSTANTS
// ============================================

/** Output paths for generated plugin files (relative to theme root). */
export const PLUGIN_PATHS = {
  SKILLS_ROOT: "skills",
  SKILL_DIR: "skills/tycoslide",
  SKILL_MD: "skills/tycoslide/SKILL.md",
  REFERENCES_DIR: "skills/tycoslide/references",
  MANIFEST_JSON: "skills/tycoslide/manifest.json",
  PLUGIN_CONFIG_DIR: ".claude-plugin",
  PLUGIN_JSON: ".claude-plugin/plugin.json",
} as const;

// ============================================
// TYPES
// ============================================

export interface CompilePluginOptions {
  /** Theme package name (e.g., "@tycoslide/theme-default"). */
  name: string;
  /** One-line description of the theme. */
  description: string;
  /** Package version (semver). */
  version: string;
}

export interface CompilePluginResult {
  /** Generated file contents. Keys are relative paths from the theme root. */
  files: Record<string, string>;
  /** Plugin manifest metadata. */
  plugin: { name: string; description: string; version: string };
}

/** Strip npm scope from a package name (e.g., "@tycoslide/theme-default" → "tycoslide-theme-default"). */
export function stripScope(name: string): string {
  return name.replace(/^@/, "").replace(/\//g, "-");
}

// ============================================
// GENERATION HELPERS
// ============================================

/** Build the manifest JSON structure from a ThemeDefinition and package metadata. */
export function generateManifest(definition: ThemeDefinition, options: CompilePluginOptions): string {
  const formatsOut: Record<string, unknown> = {};

  for (const [formatName, format] of Object.entries(definition.formats)) {
    const templates = format.templates ?? [];
    const templateEntries = templates.map((t) => {
      const params = (t.layout.params ? introspectParams(t.layout.params) : []).map((p) => ({
        name: p.name,
        type: p.type,
        required: p.required,
        ...(p.enumValues ? { enumValues: p.enumValues } : {}),
        ...(p.itemType ? { itemType: p.itemType } : {}),
        ...(p.objectShape ? { objectShape: p.objectShape } : {}),
      }));

      return {
        name: t.layout.name,
        description: t.documentation.description,
        ...(t.documentation.whenToUse ? { whenToUse: t.documentation.whenToUse } : {}),
        ...(t.documentation.whenNotToUse ? { whenNotToUse: t.documentation.whenNotToUse } : {}),
        ...(t.documentation.limits?.length ? { limits: t.documentation.limits } : {}),
        ...(t.documentation.gotchas?.length ? { gotchas: t.documentation.gotchas } : {}),
        params,
        slots: t.layout.slots ?? [],
      };
    });

    formatsOut[formatName] = {
      slide: { width: format.slide.width, height: format.slide.height },
      templates: templateEntries,
    };
  }

  // Build asset catalog for manifest
  const assetsOut: Record<string, unknown[]> = {};
  if (definition.assets) {
    for (const [category, entries] of Object.entries(definition.assets)) {
      assetsOut[category] = Object.entries(entries).map(([name, entry]) => ({
        name,
        ref: `$${category}.${name}`,
        description: entry.documentation.description,
        ...(entry.documentation.whenToUse ? { whenToUse: entry.documentation.whenToUse } : {}),
      }));
    }
  }

  const manifest = {
    theme: {
      name: options.name,
      description: options.description,
      version: options.version,
    },
    formats: formatsOut,
    assets: assetsOut,
  };

  return `${JSON.stringify(manifest, null, 2)}\n`;
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Compile a ThemeDefinition into machine-readable plugin artifacts (manifest.json + plugin.json).
 *
 * Returns a map of relative file paths → content. The caller is responsible for
 * writing them to disk and assembling SKILL.md (frontmatter + static body) and
 * copying reference docs. See theme-default's npm scripts for the full pipeline.
 */
export function compilePlugin(definition: ThemeDefinition, options: CompilePluginOptions): CompilePluginResult {
  if (!options.name) {
    throw new Error("compilePlugin: options.name is required.");
  }
  if (!options.version) {
    throw new Error("compilePlugin: options.version is required.");
  }
  if (!definition.formats || Object.keys(definition.formats).length === 0) {
    throw new Error("compilePlugin: ThemeDefinition must have at least one format.");
  }

  const pluginName = stripScope(options.name);
  const pluginMeta = { name: pluginName, description: options.description, version: options.version };

  const files: Record<string, string> = {
    [PLUGIN_PATHS.MANIFEST_JSON]: generateManifest(definition, options),
    [PLUGIN_PATHS.PLUGIN_JSON]: `${JSON.stringify(pluginMeta, null, 2)}\n`,
  };

  return { files, plugin: pluginMeta };
}
