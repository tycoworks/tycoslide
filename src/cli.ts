import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { buildDeck } from "./index.js";
import { generateManifest } from "./manifest.js";
import { compileDeck, loadThemeConfig, parseSlideDocument, RESERVED_KEY } from "./markdown/index.js";
import { renameSkill, zipDir } from "./skillZip.js";

const DEFAULT_CONFIG = "theme.json";
const MANIFEST_FILE = "manifest.json";
// The theme skill is written as lowercase skill.md (copied from tycoslide's own
// SKILL.md), so the skill folder can live at the theme repo root.
const SKILL_FILE = "skill.md";
const SYNTAX_FILE = "syntax.md";

const sdkDir = dirname(fileURLToPath(import.meta.url));
const skillMdPath = resolve(sdkDir, "..", "SKILL.md");
const syntaxMdPath = resolve(sdkDir, "..", SYNTAX_FILE);

const pkg = JSON.parse(readFileSync(resolve(sdkDir, "..", "package.json"), "utf-8"));
const program = new Command().name("tycoslide").description("PPTX template engine CLI").version(pkg.version);

program
  .command("build")
  .description("Build a PPTX deck from a Markdown spec")
  .argument("<deck>", "path to deck markdown file")
  .option(`-c, --config <path>`, "override theme config path (default: read from frontmatter)")
  .option("--no-notes", "omit speaker notes from the output (also strips any inherited template notes)")
  .action(async (deckPath: string, opts: { config?: string; notes: boolean }) => {
    const absDeckPath = resolve(process.cwd(), deckPath);
    let source: string;
    try {
      source = readFileSync(absDeckPath, "utf-8");
    } catch {
      throw new Error(`Deck file not found: ${deckPath}`);
    }

    const doc = parseSlideDocument(source);
    const themePath = doc.global.theme;
    const absConfigPath = opts.config
      ? resolve(process.cwd(), opts.config)
      : themePath
        ? resolve(dirname(absDeckPath), String(themePath))
        : undefined;
    if (!absConfigPath) {
      throw new Error(`${basename(deckPath)}: missing required "${RESERVED_KEY.THEME}" in global frontmatter`);
    }
    const config = loadThemeConfig(absConfigPath);
    const deck = await compileDeck(doc, config);
    // Always write the .pptx next to the input deck, named after it.
    const outName = basename(deckPath).replace(/\.md$/, ".pptx");
    deck.output = resolve(dirname(absDeckPath), outName);
    await buildDeck(deck, config, { excludeNotes: !opts.notes });
  });

program
  .command("package")
  .description("Generate the Agent Skill (manifest.json, SKILL.md, syntax.md) for AI agents")
  .option(`-c, --config <path>`, "path to theme config file", DEFAULT_CONFIG)
  .action(async (opts: { config: string }) => {
    const config = loadThemeConfig(resolve(process.cwd(), opts.config));

    const themePkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf-8"));
    if (!themePkg.name) {
      throw new Error('Cannot name the skill: the theme\'s package.json has no "name" field.');
    }
    // basename drops any npm scope, e.g. "@acme/mz-slides" -> "mz-slides".
    const skillName = basename(themePkg.name);

    const manifestJson = `${generateManifest(config)}\n`;
    writeFileSync(resolve(process.cwd(), MANIFEST_FILE), manifestJson);
    console.log(`WROTE ${MANIFEST_FILE}`);

    let skillMd: string;
    try {
      skillMd = renameSkill(readFileSync(skillMdPath, "utf-8"), skillName);
    } catch (err) {
      throw new Error(`${skillMdPath}: ${(err as Error).message}`);
    }
    writeFileSync(resolve(process.cwd(), SKILL_FILE), skillMd);
    console.log(`WROTE ${SKILL_FILE}`);

    const syntaxMd = readFileSync(syntaxMdPath, "utf-8");
    writeFileSync(resolve(process.cwd(), SYNTAX_FILE), syntaxMd);
    console.log(`WROTE ${SYNTAX_FILE}`);

    // Bundle the WHOLE theme so the skill is self-contained: unzip ->
    // `npm install` (pulls the engine + its deps) -> `npx tycoslide build`.
    const zipFile = `${skillName}.zip`;
    writeFileSync(resolve(process.cwd(), zipFile), await zipDir(process.cwd(), skillName));
    console.log(`WROTE ${zipFile}`);
  });

await program.parseAsync(process.argv);
