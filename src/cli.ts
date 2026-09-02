import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { ASSETS_FILE, MANIFEST_FILE, SKILL_FILE, SYNTAX_FILE, THEME_CONFIG } from "./files.js";
import { buildDeck } from "./index.js";
import { generateAssetCatalog, generateManifest } from "./manifest.js";
import { compileDeck, loadThemeConfig, parseSlideDocument, RESERVED_KEY } from "./markdown/index.js";
import { renameSkill, skillPackageJson, zipDir } from "./skillZip.js";

const sdkDir = dirname(fileURLToPath(import.meta.url));
const skillMdPath = resolve(sdkDir, "..", SKILL_FILE);
const syntaxMdPath = resolve(sdkDir, "..", SYNTAX_FILE);

const pkg = JSON.parse(readFileSync(resolve(sdkDir, "..", "package.json"), "utf-8"));
const program = new Command().name("tycoslide").description("PPTX template engine CLI").version(pkg.version);

program
  .command("build")
  .description("Build a PPTX deck from a Markdown spec")
  .argument("<deck>", "path to deck markdown file")
  .option(`-c, --config <path>`, "override theme config path (default: read from frontmatter)")
  .option("--no-notes", "omit speaker notes from the output (also strips any inherited template notes)")
  .option("--browser-path <path>", "Chrome executable to render diagrams with (default: auto-detect)")
  .action(async (deckPath: string, opts: { config?: string; notes: boolean; browserPath?: string }) => {
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
    const config = { ...loadThemeConfig(absConfigPath), browserPath: opts.browserPath };
    const deck = await compileDeck(doc, config);
    // Always write the .pptx next to the input deck, named after it.
    const outName = basename(deckPath).replace(/\.md$/, ".pptx");
    deck.output = resolve(dirname(absDeckPath), outName);
    await buildDeck(deck, config, { excludeNotes: !opts.notes });
  });

program
  .command("package")
  .description("Generate the Agent Skill (manifest.json, SKILL.md, syntax.md) for AI agents")
  .option(`-c, --config <path>`, "path to theme config file", THEME_CONFIG)
  .action(async (opts: { config: string }) => {
    const config = loadThemeConfig(resolve(process.cwd(), opts.config));

    const themePkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf-8"));
    if (!themePkg.name) {
      throw new Error('Cannot name the skill: the theme\'s package.json has no "name" field.');
    }
    // basename drops any npm scope, e.g. "@acme/acme-slides" -> "acme-slides".
    const skillName = basename(themePkg.name);

    writeFileSync(resolve(process.cwd(), MANIFEST_FILE), `${generateManifest(config)}\n`);
    console.log(`WROTE ${MANIFEST_FILE}`);

    writeFileSync(resolve(process.cwd(), ASSETS_FILE), `${generateAssetCatalog(config)}\n`);
    console.log(`WROTE ${ASSETS_FILE}`);

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
    const generated = [opts.config, MANIFEST_FILE, ASSETS_FILE, SKILL_FILE, SYNTAX_FILE];
    const skillPkg = skillPackageJson(themePkg, { name: pkg.name, version: pkg.version });
    writeFileSync(resolve(process.cwd(), zipFile), await zipDir(process.cwd(), skillName, config, generated, skillPkg));
    console.log(`WROTE ${zipFile}`);
  });

// Everything below the CLI throws plain Errors carrying a written-for-humans
// message. Print that message and stop; a Node stack trace tells a deck author
// nothing about their deck, and buries the part that does.
try {
  await program.parseAsync(process.argv);
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
