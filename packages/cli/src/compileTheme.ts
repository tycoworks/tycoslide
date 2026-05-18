// build-theme command: compiles TypeScript and generates Claude Code skill files.

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { compilePlugin, PLUGIN_PATHS, stripScope } from "@tycoslide/sdk";

/** Reference docs to copy to skills/build/references/. */
const REFERENCE_FILES: string[] = [
  "markdown-syntax.md",
  "cli.md",
  "troubleshooting.md",
  "authoring-guide.md",
  "components.md",
];

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

  // Step 3: Compile plugin (manifest.json + plugin.json + hooks + bin + runtime-package.json)
  const result = compilePlugin(mod.theme, {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    dependencies: pkg.dependencies,
  });

  // Step 4: Clean skills/build/ to remove stale generated files from previous builds, then write all.
  const skillBuildDir = path.join(themeDir, PLUGIN_PATHS.SKILL_DIR);
  if (fs.existsSync(skillBuildDir)) {
    fs.rmSync(skillBuildDir, { recursive: true });
  }

  for (const [filePath, content] of Object.entries(result.files)) {
    const fullPath = path.join(themeDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  // Step 4b: Make bin/tycoslide executable
  const binPath = path.join(themeDir, PLUGIN_PATHS.BIN_TYCOSLIDE);
  if (fs.existsSync(binPath)) {
    fs.chmodSync(binPath, 0o755);
  }

  // Step 4c: Bundle theme as tarball (npm pack) for inclusion in plugin zip
  console.log("Packing theme tarball...");
  const packOutput = execSync("npm pack --pack-destination .", { cwd: themeDir, encoding: "utf-8" }).trim();
  const tgzFilename = packOutput.split("\n").pop();
  if (!tgzFilename) {
    throw new Error("npm pack produced no output — could not determine tarball filename.");
  }
  const tgzPath = path.join(themeDir, tgzFilename);
  const themeTgzDest = path.join(themeDir, PLUGIN_PATHS.THEME_TGZ);
  fs.renameSync(tgzPath, themeTgzDest);

  // Step 5a: Copy SKILL.md to skill directory
  const skillMdDest = path.join(themeDir, PLUGIN_PATHS.SKILL_MD);
  fs.mkdirSync(path.dirname(skillMdDest), { recursive: true });

  const skillSrcPath = path.join(docsDir, path.basename(PLUGIN_PATHS.SKILL_MD));
  if (!fs.existsSync(skillSrcPath)) {
    throw new Error(`Required doc file not found: ${skillSrcPath}`);
  }
  fs.copyFileSync(skillSrcPath, skillMdDest);

  // Step 5b: Copy reference docs to skills/build/references/
  const refsDir = path.join(themeDir, PLUGIN_PATHS.REFERENCES_DIR);
  fs.mkdirSync(refsDir, { recursive: true });

  for (const filename of REFERENCE_FILES) {
    const srcPath = path.join(docsDir, filename);
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Required doc file not found: ${srcPath}`);
    }
    fs.copyFileSync(srcPath, path.join(refsDir, filename));
  }

  // Step 6: Validate plugin structure (skip gracefully if claude CLI is not installed)
  let claudeOnPath = false;
  try {
    execSync("claude --version", { stdio: "ignore" });
    claudeOnPath = true;
  } catch {
    // claude not found
  }

  if (!claudeOnPath) {
    console.warn("Skipping plugin validation: 'claude' CLI not found.");
  } else {
    console.log("Validating plugin...");
    try {
      execSync("claude plugin validate .", { cwd: themeDir, stdio: "inherit" });
    } catch {
      throw new Error("Plugin validation failed. Check the errors above.");
    }
  }

  // Step 7: Package as .zip for distribution (usable with claude --plugin-dir)
  const zipName = `${stripScope(pkg.name)}.zip`;
  const zipPath = path.join(themeDir, zipName);
  // TODO: remove `as any` when @types/archiver supports v8 ZipArchive export

  // archiver v7+ uses named ESM exports; @types/archiver lags behind.
  const { ZipArchive } = (await import("archiver")) as any;
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const zip = new ZipArchive({ zlib: { level: 9 } });
    output.on("close", resolve);
    zip.on("error", reject);
    zip.pipe(output);
    zip.directory(path.join(themeDir, PLUGIN_PATHS.PLUGIN_CONFIG_DIR), PLUGIN_PATHS.PLUGIN_CONFIG_DIR);
    zip.directory(path.join(themeDir, PLUGIN_PATHS.SKILLS_ROOT), PLUGIN_PATHS.SKILLS_ROOT);
    zip.directory(path.join(themeDir, PLUGIN_PATHS.BIN_DIR), PLUGIN_PATHS.BIN_DIR);
    zip.directory(path.join(themeDir, PLUGIN_PATHS.HOOKS_DIR), PLUGIN_PATHS.HOOKS_DIR);
    zip.file(path.join(themeDir, PLUGIN_PATHS.RUNTIME_PACKAGE_JSON), { name: PLUGIN_PATHS.RUNTIME_PACKAGE_JSON });
    zip.file(themeTgzDest, { name: PLUGIN_PATHS.THEME_TGZ });
    zip.finalize();
  });

  console.log(`\nBuilt theme ${pkg.name}:`);
  console.log(`  dist/`);
  console.log(`  ${PLUGIN_PATHS.SKILL_MD}`);
  console.log(`  ${PLUGIN_PATHS.MANIFEST_JSON}`);
  console.log(`  ${PLUGIN_PATHS.REFERENCES_DIR}/ (${REFERENCE_FILES.length} docs)`);
  console.log(`  ${PLUGIN_PATHS.PLUGIN_JSON}`);
  console.log(`  ${PLUGIN_PATHS.HOOKS_JSON}`);
  console.log(`  ${PLUGIN_PATHS.BIN_TYCOSLIDE}`);
  console.log(`  ${PLUGIN_PATHS.RUNTIME_PACKAGE_JSON}`);
  console.log(`  ${PLUGIN_PATHS.THEME_TGZ}`);
  if (fs.existsSync(zipPath)) {
    console.log(`  ${zipName} (distributable plugin archive)`);
  }
}
