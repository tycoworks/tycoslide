// Plugin compiler: generates manifest.json from a ThemeDefinition.

import type { ThemeDefinition } from "../theme/index.js";
import { introspectParams } from "./introspect.js";

// ============================================
// CONSTANTS
// ============================================

/** Output paths for generated plugin files (relative to theme root). */
export const PLUGIN_PATHS = {
  SKILLS_ROOT: "skills",
  SKILL_DIR: "skills/build",
  SKILL_MD: "skills/build/SKILL.md",
  REFERENCES_DIR: "skills/build/references",
  MANIFEST_JSON: "skills/build/manifest.json",
  PLUGIN_CONFIG_DIR: ".claude-plugin",
  PLUGIN_JSON: ".claude-plugin/plugin.json",
  HOOKS_DIR: "hooks",
  HOOKS_JSON: "hooks/hooks.json",
  BIN_DIR: "bin",
  BIN_TYCOSLIDE: "bin/tycoslide",
  RUNTIME_PACKAGE_JSON: "runtime-package.json",
  THEME_TGZ: "theme.tgz",
  /** Node.js entry point for the tycoslide CLI, resolved from node_modules. */
  CLI_ENTRY: "@tycoslide/cli/dist/index.js",
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
  /** Theme's package.json dependencies (used to derive runtime deps). */
  dependencies?: Record<string, string>;
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

/** Build the manifest JSON structure from a ThemeDefinition and options. */
function generateManifest(definition: ThemeDefinition, options: CompilePluginOptions): string {
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

/** Generate hooks/hooks.json — SessionStart hook that auto-installs runtime deps. */
function generateHooksJson(): string {
  // Pattern from Claude Code plugin docs: compare bundled runtime-package.json against cached
  // copy in CLAUDE_PLUGIN_DATA. On first run or change: copy, npm install, install theme tarball,
  // install Playwright Chromium. On failure: surface npm errors to stdout, remove cached
  // package.json so next session retries, and exit non-zero so Claude Code knows it failed.
  const errorLog = '"${CLAUDE_PLUGIN_DATA}/npm-error.log"';
  const installCmd = [
    'diff -q "${CLAUDE_PLUGIN_ROOT}/runtime-package.json" "${CLAUDE_PLUGIN_DATA}/package.json" >/dev/null 2>&1',
    "||",
    "(",
    'cp "${CLAUDE_PLUGIN_ROOT}/runtime-package.json" "${CLAUDE_PLUGIN_DATA}/package.json"',
    '&& cd "${CLAUDE_PLUGIN_DATA}"',
    `&& npm install 2>${errorLog}`,
    `&& npm install "\${CLAUDE_PLUGIN_ROOT}/theme.tgz" 2>>${errorLog}`,
    `&& npx playwright-core install chromium 2>>${errorLog}`,
    ")",
    "||",
    "(",
    'echo "tycoslide plugin install failed:";',
    `cat ${errorLog} 2>/dev/null;`,
    'rm -f "${CLAUDE_PLUGIN_DATA}/package.json";',
    "exit 1",
    ")",
  ].join(" ");

  const hooks = {
    hooks: {
      SessionStart: [
        {
          hooks: [
            {
              type: "command",
              command: installCmd,
            },
          ],
        },
      ],
    },
  };
  return `${JSON.stringify(hooks, null, 2)}\n`;
}

/** Generate bin/tycoslide — shell wrapper that resolves CLI from plugin data dir. */
function generateBinTycoslide(): string {
  return [
    "#!/usr/bin/env bash",
    'export NODE_PATH="${CLAUDE_PLUGIN_DATA}/node_modules"',
    `exec node "\${CLAUDE_PLUGIN_DATA}/node_modules/${PLUGIN_PATHS.CLI_ENTRY}" "$@"`,
    "",
  ].join("\n");
}

/** Generate runtime-package.json — lists public tycoslide deps for npm install in CLAUDE_PLUGIN_DATA. */
function generateRuntimePackageJson(options: CompilePluginOptions): string {
  const pluginName = stripScope(options.name);
  const deps: Record<string, string> = {};

  // Extract @tycoslide/* dependencies from theme's package.json
  if (options.dependencies) {
    for (const [pkg, version] of Object.entries(options.dependencies)) {
      if (pkg.startsWith("@tycoslide/")) {
        deps[pkg] = version;
      }
    }
  }

  // Ensure @tycoslide/cli is included (the bin wrapper needs it)
  if (!deps["@tycoslide/cli"]) {
    const coreVersion = deps["@tycoslide/core"] ?? deps["@tycoslide/sdk"] ?? `^${options.version}`;
    deps["@tycoslide/cli"] = coreVersion;
  }

  const runtimePkg = {
    name: `${pluginName}-runtime`,
    version: options.version,
    private: true,
    dependencies: deps,
  };
  return `${JSON.stringify(runtimePkg, null, 2)}\n`;
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Compile a ThemeDefinition into machine-readable plugin artifacts (manifest.json + plugin.json).
 *
 * Returns a map of relative file paths → content. The caller is responsible for
 * writing them to disk and assembling SKILL.md (frontmatter + static body) and
 * copying reference docs. See the CLI `buildTheme()` for the full pipeline.
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
    [PLUGIN_PATHS.HOOKS_JSON]: generateHooksJson(),
    [PLUGIN_PATHS.BIN_TYCOSLIDE]: generateBinTycoslide(),
    [PLUGIN_PATHS.RUNTIME_PACKAGE_JSON]: generateRuntimePackageJson(options),
  };

  return { files, plugin: pluginMeta };
}
