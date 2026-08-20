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

/**
 * Build an uploadable Agent Skill zip whose entries live under a single root
 * folder (e.g. `mz-slides/skill.md`), matching Anthropic's custom-skill format.
 * Each entry is written from an explicit in-memory list rather than a directory
 * scan, so the zip contains exactly the files the caller passes — nothing else.
 */
export async function zipSkill(
  folderName: string,
  files: { name: string; content: string | Buffer }[],
): Promise<Buffer> {
  if (files.length === 0) throw new Error(`No files to zip for skill folder: ${folderName}`);

  const zip = new JSZip();
  const folder = zip.folder(folderName);
  if (!folder) throw new Error(`Failed to create zip folder: ${folderName}`);

  for (const file of files) {
    folder.file(file.name, file.content);
  }
  return zip.generateAsync({ type: "nodebuffer" });
}
