import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import JSZip from "jszip";

const FRONTMATTER = /^---\n([\s\S]*?)\n---/;
const NAME_LINE = /^name:[ \t]*.*$/m;

/**
 * Rewrite the `name:` value in a skill.md's leading YAML frontmatter so the
 * packaged skill is named after the consuming theme, not the source template.
 * Only the leading `---`…`---` block is touched; the body is left byte-for-byte.
 * Throws if there is no frontmatter or no `name:` line — the caller names the file.
 */
export function renameSkill(md: string, name: string): string {
  const block = md.match(FRONTMATTER);
  if (!block) throw new Error("skill.md has no YAML frontmatter block");
  if (!NAME_LINE.test(block[1])) throw new Error('skill.md frontmatter has no "name:" line');
  return md.replace(block[0], block[0].replace(NAME_LINE, `name: ${name}`));
}

// Never packaged: dependencies (npm install rebuilds them) and hidden entries
// (name starting with "." — covers VCS, tooling, caches, secrets like .env/.npmrc).
const EXCLUDE_DIRS = new Set(["node_modules"]);
// Build artifacts, dropped ONLY at the repo root: decks build to cwd
// (showcase.pptx, deck.pptx, the output .zip), while the template .pptx lives
// under template/ and must be kept — so these extensions are pruned top-level only.
const ROOT_ARTIFACT_EXTS = new Set([".pptx", ".pdf", ".zip"]);

/**
 * Zip an entire theme directory into an uploadable Agent Skill archive whose
 * entries all live under a single root folder (e.g. `mz-slides/theme.json`),
 * matching Anthropic's custom-skill format. Recursively includes every file
 * except node_modules, hidden entries (any name starting with `.`), and
 * top-level build artifacts (.pptx/.pdf/.zip at the repo root; the template
 * .pptx under template/ is kept). Subdirectory structure is preserved with
 * POSIX slashes. Fails fast if nothing is left to zip.
 */
export async function zipDir(rootDir: string, folderName: string): Promise<Buffer> {
  const zip = new JSZip();
  const folder = zip.folder(folderName);
  if (!folder) throw new Error(`Failed to create zip folder: ${folderName}`);

  let count = 0;
  const walk = (dir: string): void => {
    const atRoot = dir === rootDir;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.has(entry.name)) walk(abs);
      } else if (entry.isFile()) {
        if (atRoot && ROOT_ARTIFACT_EXTS.has(extname(entry.name))) continue;
        folder.file(relative(rootDir, abs).split(sep).join("/"), readFileSync(abs));
        count++;
      }
    }
  };
  walk(rootDir);

  if (count === 0) throw new Error(`No files to zip in directory: ${rootDir}`);
  return zip.generateAsync({ type: "nodebuffer" });
}
