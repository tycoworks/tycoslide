import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import JSZip from "jszip";
import { TEMPLATE_DIR } from "./engine/index.js";
import { ASSETS_ARCHIVE, PACKAGE_JSON } from "./files.js";
import type { CompilerThemeConfig } from "./markdown/types.js";

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

/**
 * Expand a packaged theme's archive into its directory, so the files the catalog
 * names are on disk before anything fills with them. Idempotent per file; loose
 * files win, so a stale archive never overwrites a theme's real assets; the
 * archive itself stays put. A theme with no archive -- every theme under
 * development -- returns immediately.
 */
export async function expandAssets(rootDir: string): Promise<void> {
  // An empty rootDir is a supported value elsewhere ("resolve nothing"), and it
  // would expand into the process working directory. Refuse rather than guess.
  if (!rootDir) return;

  const archivePath = join(rootDir, ASSETS_ARCHIVE);
  if (!existsSync(archivePath)) return;

  const archive = await JSZip.loadAsync(readFileSync(archivePath));
  for (const [rel, entry] of Object.entries(archive.files)) {
    if (entry.dir) continue;
    // JSZip collapses `..` and a leading `/` on load, but a backslash survives
    // verbatim and traverses on Windows. We wrote this archive, so an entry that
    // is not a plain theme-relative path means it was tampered with.
    if (rel.includes("\\")) {
      throw new Error(`${ASSETS_ARCHIVE} entry "${rel}" is not a theme-relative path`);
    }

    const abs = join(rootDir, ...rel.split("/"));
    if (existsSync(abs)) continue;
    mkdirSync(dirname(abs), { recursive: true });

    // Write-then-rename. A plain write is not atomic: a build killed partway
    // through 2,000 icons leaves a truncated file that `existsSync` then skips
    // forever. Rename is atomic within a filesystem, so a reader sees a whole
    // file or none, which also makes two concurrent builds in one directory safe.
    const partial = `${abs}.${process.pid}.tmp`;
    writeFileSync(partial, await entry.async("nodebuffer"));
    renameSync(partial, abs);
  }
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
  return `${JSON.stringify(skill, null, 2)}\n`;
}

/**
 * Every path a packaged theme needs, relative to `rootDir` and POSIX-separated,
 * split by how it ships.
 *
 * Derived from the theme config rather than filtered out of a directory walk:
 * the config already declares its template and its whole asset catalog, so an
 * allowlist stays correct no matter what else sits in the working directory --
 * built decks, PDFs, slide PNGs, scratch files. Font paths are deliberately
 * absent when they name a package -- those resolve from node_modules, which
 * `npm install` restores -- but a `./`- or `/`-prefixed font path is a file the
 * theme owns, and mermaid reads it during COMPILE, before any archive is
 * expanded. Those ship plain.
 *
 * `archived` is the asset catalog, which collapses to one archive because hosts
 * cap how many FILES a skill may contain. `plain` is everything read before or
 * without an expansion, including the catalog itself.
 */
function skillPaths(config: CompilerThemeConfig, generated: string[]): { plain: string[]; archived: string[] } {
  const archived = Object.values(config.assets).flatMap((category) =>
    Object.values(category).map((entry) => entry.path),
  );
  const localFonts = (config.fonts ?? []).map((f) => f.path).filter((p) => p.startsWith(".") || p.startsWith("/"));
  return {
    plain: [...SUPPORT_FILES, ...generated, `${TEMPLATE_DIR}/${config.template}`, ...localFonts],
    archived,
  };
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

  const { plain, archived } = skillPaths(config, generated);
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
