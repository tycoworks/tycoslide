// build-theme command: compiles TypeScript and generates Claude Code skill files.

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { compileSkill, SKILL_PATHS } from "@tycoslide/sdk";

/** Docs to copy as skill references. */
const DOC_FILES: Record<string, string> = {
  "markdown-syntax.md": "markdown-syntax.md",
  "cli.md": "cli.md",
  "troubleshooting.md": "troubleshooting.md",
};

/**
 * Find the tycoslide docs directory by resolving from the CLI package location.
 * Works in monorepo (docs are at repo root) and installed contexts.
 */
function findDocsDir(): string {
  const cliDir = path.resolve(new URL(".", import.meta.url).pathname, "..");
  let dir = cliDir;
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, "docs");
    if (fs.existsSync(path.join(candidate, "cli.md"))) {
      return candidate;
    }
    dir = path.dirname(dir);
  }
  throw new Error(
    "Could not find tycoslide docs directory. Ensure you are running from within the tycoslide monorepo.",
  );
}

export interface BuildThemeOptions {
  dir?: string;
  noTsc?: boolean;
}

export async function buildTheme(opts: BuildThemeOptions): Promise<void> {
  const themeDir = path.resolve(opts.dir ?? ".");

  // Read theme's package.json
  const pkgPath = path.join(themeDir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`No package.json found in ${themeDir}`);
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

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

  // Step 3: Compile skill
  const result = compileSkill(mod.theme, {
    name: pkg.name,
    description: pkg.description ?? "A tycoslide theme.",
    version: pkg.version,
  });

  // Step 4: Write generated files
  for (const [filePath, content] of Object.entries(result.files)) {
    const fullPath = path.join(themeDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  // Step 5: Copy docs as references
  const docsDir = findDocsDir();
  const refsDir = path.join(themeDir, SKILL_PATHS.REFERENCES_DIR);
  fs.mkdirSync(refsDir, { recursive: true });

  for (const [src, dest] of Object.entries(DOC_FILES)) {
    const srcPath = path.join(docsDir, src);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join(refsDir, dest));
    } else {
      console.warn(`Warning: ${src} not found in docs, skipping.`);
    }
  }

  console.log(`Built theme ${pkg.name}:`);
  console.log(`  dist/`);
  console.log(`  ${SKILL_PATHS.SKILL_MD}`);
  console.log(`  ${SKILL_PATHS.REFERENCES_DIR}/ (${Object.keys(DOC_FILES).length} docs)`);
  console.log(`  ${SKILL_PATHS.PLUGIN_JSON}`);
}
