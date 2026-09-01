import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { TEMPLATE_DIR } from "./engine/index.js";
import type { CompilerThemeConfig } from "./markdown/types.js";

const FRONTMATTER = /^---\n([\s\S]*?)\n---/;
const NAME_LINE = /^name:[ \t]*.*$/m;

/**
 * Rewrite the `name:` value in a SKILL.md's leading YAML frontmatter so the
 * packaged skill is named after the consuming theme, not the source template.
 * Only the leading `---`…`---` block is touched; the body is left byte-for-byte.
 * Throws if there is no frontmatter or no `name:` line — the caller names the file.
 */
export function renameSkill(md: string, name: string): string {
  const block = md.match(FRONTMATTER);
  if (!block) throw new Error("SKILL.md has no YAML frontmatter block");
  if (!NAME_LINE.test(block[1])) throw new Error('SKILL.md frontmatter has no "name:" line');
  return md.replace(block[0], block[0].replace(NAME_LINE, `name: ${name}`));
}

/** The manifest a packaged skill installs from, authored rather than copied. */
const PACKAGE_JSON = "package.json";

/**
 * Files a packaged skill needs beyond the theme's own declarations. Only the
 * lockfile: `package.json` is authored by `skillPackageJson` rather than taken
 * from the theme directory.
 */
const SUPPORT_FILES = ["package-lock.json"];

/**
 * The `package.json` a packaged skill installs from — deliberately NOT the theme's
 * own. A theme repo's manifest is a development document: it carries the script
 * that regenerates the skill, and lists the engine as a devDependency because the
 * repo builds with it rather than shipping it.
 *
 * Copying that verbatim breaks the consumer twice. The build script runs as a
 * postinstall inside their container, so anything it touches that is read-only
 * fails their whole `npm install`. And under `--omit=dev` the engine is never
 * installed, so neither the postinstall nor `npx tycoslide build` can find it.
 *
 * What ships instead declares only what the skill needs to RUN: the theme's own
 * dependencies plus the engine, as runtime dependencies, and no scripts at all.
 */
export function skillPackageJson(theme: Record<string, unknown>, engine: { name: string; version: string }): string {
  const dependencies: Record<string, string> = {
    ...((theme.dependencies as Record<string, string>) ?? {}),
    [engine.name]: `^${engine.version}`,
  };
  const skill = {
    name: theme.name,
    version: theme.version,
    description: theme.description,
    private: true,
    dependencies: Object.fromEntries(Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b))),
  };
  return `${JSON.stringify(skill, null, 2)}\n`;
}

/**
 * Every path a packaged theme needs, relative to `rootDir` and POSIX-separated.
 *
 * Derived from the theme config rather than filtered out of a directory walk:
 * the config already declares its template and its whole asset catalog, so an
 * allowlist stays correct no matter what else sits in the working directory --
 * built decks, PDFs, slide PNGs, scratch files. Font paths are deliberately
 * absent: they resolve from node_modules, which `npm install` restores.
 */
function skillPaths(config: CompilerThemeConfig, generated: string[]): string[] {
  const assets = Object.values(config.assets).flatMap((category) => Object.values(category).map((entry) => entry.path));
  return [...SUPPORT_FILES, ...generated, `${TEMPLATE_DIR}/${config.template}`, ...assets];
}

/**
 * Zip a theme into an uploadable Agent Skill archive whose entries all live
 * under a single root folder (e.g. `acme-slides/theme.json`), matching Anthropic's
 * custom-skill format. `generated` names the files the caller just wrote (the
 * config, manifest, SKILL.md, syntax.md); `packageJson` is the authored manifest
 * from `skillPackageJson`. Optional support files are skipped when absent;
 * anything the config declares but that is missing is an error.
 */
export async function zipDir(
  rootDir: string,
  folderName: string,
  config: CompilerThemeConfig,
  generated: string[],
  packageJson: string,
): Promise<Buffer> {
  const zip = new JSZip();
  const folder = zip.folder(folderName);
  if (!folder) throw new Error(`Failed to create zip folder: ${folderName}`);

  folder.file(PACKAGE_JSON, packageJson);

  const optional = new Set(SUPPORT_FILES);
  let count = 1;
  for (const rel of skillPaths(config, generated)) {
    const abs = join(rootDir, ...rel.split("/"));
    if (!existsSync(abs)) {
      if (optional.has(rel)) continue;
      throw new Error(`Theme declares "${rel}", but no such file exists`);
    }
    folder.file(rel, readFileSync(abs));
    count++;
  }

  if (count === 0) throw new Error(`No files to zip in directory: ${rootDir}`);
  return zip.generateAsync({ type: "nodebuffer" });
}
