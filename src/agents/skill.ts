import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { type CompilerThemeConfig, TEMPLATE_DIR } from "../index.js";
import type { AssetCatalog } from "./catalog.js";
import { ASSETS_ARCHIVE, jsonFile, PACKAGE_JSON } from "./files.js";

/** Entries are stored, not deflated: assets are already-compressed images. */
const NO_COMPRESSION = { type: "nodebuffer", compression: "STORE" } as const;

/**
 * Pack `paths` (theme-relative, POSIX) into one archive, reading each through
 * `read`. Entries keep their declared paths, so expanding reproduces the layout
 * `theme.json` already refers to.
 */
export async function packAssets(paths: string[], read: (rel: string) => Buffer): Promise<Buffer> {
  const archive = new JSZip();
  for (const rel of paths) archive.file(rel, read(rel));
  return archive.generateAsync(NO_COMPRESSION);
}

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
  return jsonFile(skill);
}

/**
 * Every path a packaged theme needs, relative to `rootDir` and POSIX-separated,
 * split by how it ships.
 *
 * Derived from the theme config and its picture catalog rather than filtered out
 * of a directory walk: together they declare the template and every picture, so
 * an allowlist stays correct no matter what else sits in the working directory --
 * built decks, PDFs, slide PNGs, scratch files. Font paths are deliberately
 * absent when they name a package -- those resolve from node_modules, which
 * `npm install` restores -- but a `./`- or `/`-prefixed font path is a file the
 * theme owns, and mermaid reads it during a build, which never expands the
 * archive. Those ship plain.
 *
 * `archived` is the catalog's pictures, which collapse to one archive because
 * hosts cap how many FILES a skill may contain. `plain` is everything else,
 * including the catalog itself.
 */
function skillPaths(
  config: CompilerThemeConfig,
  catalog: AssetCatalog,
  shipped: string[],
): { plain: string[]; archived: string[] } {
  const archived = Object.values(catalog).flatMap((category) => Object.values(category).map((entry) => entry.path));
  const localFonts = (config.fonts ?? []).map((f) => f.path).filter((p) => p.startsWith(".") || p.startsWith("/"));
  return {
    plain: [...SUPPORT_FILES, ...shipped, `${TEMPLATE_DIR}/${config.template}`, ...localFonts],
    archived,
  };
}

/**
 * Zip a theme into an uploadable Agent Skill archive whose entries all live
 * under a single root folder (e.g. `acme-slides/theme.json`), matching Anthropic's
 * custom-skill format. `shipped` names the theme's top-level files that go in as
 * they are (the config, the catalog, and what `package` just wrote);
 * `packageJson` is the authored manifest from `skillPackageJson`. Optional
 * support files are skipped when absent; anything the config or catalog declares
 * but that is missing is an error.
 */
export async function zipDir(
  rootDir: string,
  folderName: string,
  config: CompilerThemeConfig,
  catalog: AssetCatalog,
  shipped: string[],
  packageJson: string,
): Promise<Buffer> {
  const zip = new JSZip();
  const folder = zip.folder(folderName);
  if (!folder) throw new Error(`Failed to create zip folder: ${folderName}`);

  folder.file(PACKAGE_JSON, packageJson);

  const { plain, archived } = skillPaths(config, catalog, shipped);
  const optional = new Set(SUPPORT_FILES);
  let count = 1;

  // `optional` is a plain-bucket concept (a lockfile a theme may not have). An
  // asset the catalog declares is never optional, so the archived loop calls
  // `required` and a missing one throws rather than silently vanishing.
  const required = (rel: string): Buffer => {
    const abs = join(rootDir, ...rel.split("/"));
    if (existsSync(abs)) return readFileSync(abs);
    throw new Error(`Theme declares "${rel}", but no such file exists`);
  };
  const read = (rel: string): Buffer | null => {
    if (optional.has(rel) && !existsSync(join(rootDir, ...rel.split("/")))) return null;
    return required(rel);
  };

  for (const rel of plain) {
    const content = read(rel);
    if (content === null) continue;
    folder.file(rel, content);
    count++;
  }

  if (archived.length > 0) {
    folder.file(ASSETS_ARCHIVE, await packAssets(archived, required));
    count++;
  }

  if (count === 0) throw new Error(`No files to zip in directory: ${rootDir}`);
  return zip.generateAsync({ type: "nodebuffer", compression: "STORE" });
}
