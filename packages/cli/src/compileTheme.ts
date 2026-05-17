// build-theme command: compiles TypeScript and generates Claude Code skill files.

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { compilePlugin, PLUGIN_PATHS } from "@tycoslide/sdk";

/** Static skill files to copy to skills/tycoslide/. */
const SKILL_FILES: Record<string, string> = {
  "SKILL.md": "SKILL.md",
};

/** Reference docs to copy to skills/tycoslide/references/. */
const REFERENCE_FILES: Record<string, string> = {
  "markdown-syntax.md": "markdown-syntax.md",
  "cli.md": "cli.md",
  "troubleshooting.md": "troubleshooting.md",
  "authoring-guide.md": "authoring-guide.md",
  "components.md": "components.md",
};

export interface BuildThemeOptions {
  dir?: string;
  docsDir: string;
  noTsc?: boolean;
}

export async function buildTheme(opts: BuildThemeOptions): Promise<void> {
  const themeDir = path.resolve(opts.dir ?? ".");
  const docsDir = path.resolve(opts.docsDir);

  if (!fs.existsSync(docsDir)) {
    throw new Error(
      `Docs directory not found: ${docsDir}. Pass --docs-dir with the path to the tycoslide docs/ directory.`,
    );
  }

  // Read theme's package.json
  const pkgPath = path.join(themeDir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`No package.json found in ${themeDir}`);
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  if (!pkg.name) {
    throw new Error("package.json must have a 'name' field.");
  }
  if (!pkg.description) {
    throw new Error("package.json must have a 'description' field.");
  }
  if (!pkg.version) {
    throw new Error("package.json must have a 'version' field.");
  }

  // Step 1: TypeScript compilation (unless --no-tsc)
  if (!opts.noTsc) {
    const tsconfigPath = path.join(themeDir, "tsconfig.json");
    if (!fs.existsSync(tsconfigPath)) {
      throw new Error(`No tsconfig.json found in ${themeDir}`);
    }
    console.log("Compiling TypeScript...");
    try {
      execSync("npx tsc --build", { cwd: themeDir, stdio: "inherit" });
    } catch {
      throw new Error("TypeScript compilation failed. Fix errors above and retry.");
    }
  }

  // Step 2: Dynamic-import the compiled theme
  const distEntry = path.join(themeDir, "dist", "index.js");
  if (!fs.existsSync(distEntry)) {
    throw new Error(`No dist/index.js found after TypeScript compilation.`);
  }

  const mod = await import(pathToFileURL(distEntry).href);
  if (!mod.theme || typeof mod.theme !== "object" || !mod.theme.formats) {
    throw new Error(`Theme package must export 'theme' with a 'formats' object (ThemeDefinition). Check ${distEntry}`);
  }

  // Step 3: Compile plugin (manifest.json + plugin.json)
  const result = compilePlugin(mod.theme, {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
  });

  // Step 4: Write generated files
  for (const [filePath, content] of Object.entries(result.files)) {
    const fullPath = path.join(themeDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  // Step 5a: Copy skill files to skills/tycoslide/
  const skillDir = path.join(themeDir, PLUGIN_PATHS.SKILL_DIR);
  fs.mkdirSync(skillDir, { recursive: true });

  for (const [src, dest] of Object.entries(SKILL_FILES)) {
    const srcPath = path.join(docsDir, src);
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Required doc file not found: ${srcPath}`);
    }
    fs.copyFileSync(srcPath, path.join(skillDir, dest));
  }

  // Step 5b: Copy reference docs to skills/tycoslide/references/
  const refsDir = path.join(themeDir, PLUGIN_PATHS.REFERENCES_DIR);
  fs.mkdirSync(refsDir, { recursive: true });

  for (const [src, dest] of Object.entries(REFERENCE_FILES)) {
    const srcPath = path.join(docsDir, src);
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Required doc file not found: ${srcPath}`);
    }
    fs.copyFileSync(srcPath, path.join(refsDir, dest));
  }

  console.log(`Built theme ${pkg.name}:`);
  console.log(`  dist/`);
  console.log(`  ${PLUGIN_PATHS.SKILL_DIR}/SKILL.md`);
  console.log(`  ${PLUGIN_PATHS.MANIFEST_JSON}`);
  console.log(`  ${PLUGIN_PATHS.REFERENCES_DIR}/ (${Object.keys(REFERENCE_FILES).length} docs)`);
  console.log(`  ${PLUGIN_PATHS.PLUGIN_JSON}`);
}
