// Theme Loader
// Dynamically imports a theme package by name and extracts the expected exports.

import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';
import type { Theme } from '../core/types.js';

export interface LoadedTheme {
  theme: Theme;
  assets?: Record<string, unknown>;
  defaultLayout?: string;
}

/**
 * Load a theme package by name.
 * The name is the exact npm package name (e.g., "acme_theme").
 *
 * The theme package must export:
 *   - theme: Theme (required)
 *   - assets: Record<string, unknown> (optional)
 *   - layouts: any (required — import triggers layoutRegistry.define() side effects)
 *   - defaultLayout: string (optional — fallback layout name)
 */
export async function loadTheme(name: string): Promise<LoadedTheme> {
  const packageName = name;

  // Resolve from the user's working directory, not from tycoslide's install location
  const require = createRequire(path.join(process.cwd(), 'package.json'));

  let mod: any;
  try {
    const resolved = require.resolve(packageName);
    mod = await import(pathToFileURL(resolved).href);
  } catch (err: any) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        `Could not find theme package '${packageName}'.\n` +
        `Is it installed? Try: npm install ${packageName}`,
      );
    }
    throw err;
  }

  if (!mod.theme) {
    throw new Error(
      `Theme package '${packageName}' does not export 'theme'.`,
    );
  }

  if (!mod.layouts) {
    throw new Error(
      `Theme package '${packageName}' does not export 'layouts'.\n` +
      `Layouts must be exported so that importing them registers them in the layout registry.`,
    );
  }

  // Side-effect: importing layouts triggers registration
  void mod.layouts;

  return {
    theme: mod.theme,
    assets: mod.assets,
    defaultLayout: mod.defaultLayout,
  };
}
