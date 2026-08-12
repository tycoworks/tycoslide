import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { buildDeck } from "./index.js";
import { generateManifest } from "./manifest.js";
import {
  type CompilerConfig,
  type CompilerThemeConfig,
  compileDeck,
  parseSlideDocument,
  RESERVED_KEY,
} from "./markdown/index.js";

const DEFAULT_CONFIG = "theme.json";
const SKILL_DIR = "skills/slides";
const PLUGIN_DIR = ".claude-plugin";
const PLUGIN_FILE = "plugin.json";
const MANIFEST_FILE = "manifest.json";
const SKILL_FILE = "SKILL.md";
const SYNTAX_FILE = "syntax.md";
const BUILD_COMMAND = "npx tycoslide build";

const sdkDir = dirname(fileURLToPath(import.meta.url));
const skillMdPath = resolve(sdkDir, "..", SKILL_FILE);
const syntaxMdPath = resolve(sdkDir, "..", SYNTAX_FILE);

function loadConfig(absPath: string): CompilerConfig {
  let raw: CompilerThemeConfig;
  try {
    raw = JSON.parse(readFileSync(absPath, "utf-8")) as CompilerThemeConfig;
  } catch {
    throw new Error(`Config file not found or invalid JSON: ${absPath}`);
  }
  return { ...raw, rootDir: dirname(absPath) };
}

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
    const config = loadConfig(absConfigPath);
    const deck = compileDeck(doc, config.layouts, config.rootDir, config.assets);
    if (!deck.output) deck.output = basename(deckPath).replace(/\.md$/, ".pptx");
    await buildDeck(deck, config, { excludeNotes: !opts.notes });
  });

program
  .command("manifest")
  .description("Generate manifest.json from theme config")
  .option(`-c, --config <path>`, "path to theme config file", DEFAULT_CONFIG)
  .option(`-o, --out <file>`, "write to file instead of stdout")
  .action(async (opts: { config: string; out?: string }) => {
    const config = loadConfig(resolve(process.cwd(), opts.config));
    const json = generateManifest(config, { build: { command: BUILD_COMMAND } });
    if (opts.out) {
      writeFileSync(resolve(process.cwd(), opts.out), `${json}\n`);
      console.log(`WROTE ${opts.out}`);
    } else {
      process.stdout.write(`${json}\n`);
    }
  });

program
  .command("plugin")
  .description("Generate plugin package (plugin.json, manifest.json, SKILL.md, syntax.md) for AI agents")
  .option(`-c, --config <path>`, "path to theme config file", DEFAULT_CONFIG)
  .action(async (opts: { config: string }) => {
    const config = loadConfig(resolve(process.cwd(), opts.config));
    const cwd = process.cwd();

    const pkg = JSON.parse(readFileSync(resolve(cwd, "package.json"), "utf-8"));
    const pluginMeta: Record<string, unknown> = {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description ?? "",
      skills: "./skills",
    };
    if (pkg.author) pluginMeta.author = pkg.author;
    const pluginDir = resolve(cwd, PLUGIN_DIR);
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(resolve(pluginDir, PLUGIN_FILE), `${JSON.stringify(pluginMeta, null, 2)}\n`);
    console.log(`WROTE ${PLUGIN_DIR}/${PLUGIN_FILE}`);

    const skillDir = resolve(cwd, SKILL_DIR);
    mkdirSync(skillDir, { recursive: true });
    const json = generateManifest(config, { build: { command: BUILD_COMMAND } });
    writeFileSync(resolve(skillDir, MANIFEST_FILE), `${json}\n`);
    console.log(`WROTE ${SKILL_DIR}/${MANIFEST_FILE}`);
    copyFileSync(skillMdPath, resolve(skillDir, SKILL_FILE));
    console.log(`WROTE ${SKILL_DIR}/${SKILL_FILE}`);
    copyFileSync(syntaxMdPath, resolve(skillDir, SYNTAX_FILE));
    console.log(`WROTE ${SKILL_DIR}/${SYNTAX_FILE}`);
  });

await program.parseAsync(process.argv);
