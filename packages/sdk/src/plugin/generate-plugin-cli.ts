#!/usr/bin/env node
// CLI tool to generate manifest.json and plugin.json from a compiled theme.
// Run from a theme directory after `tsc --build`.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { compilePlugin } from "./compiler.js";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
const meta = { name: pkg.name, description: pkg.description, version: pkg.version };

const distEntry = pathToFileURL("dist/index.js").href;
const mod = await import(distEntry);
if (!mod.theme || typeof mod.theme !== "object" || !mod.theme.formats) {
  throw new Error("Theme package must export 'theme' with a 'formats' object (ThemeDefinition).");
}

const result = compilePlugin(mod.theme, meta);
for (const [path, content] of Object.entries(result.files)) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
