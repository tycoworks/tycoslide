import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import type { DeckStep, ImageFill, StyledParagraph, TableFill, TemplateFill, TextFill } from "./engine/index.js";
import { FitMode, generate, SlotType } from "./engine/index.js";
import { buildDeck, toEngineConfig } from "./index.js";
import { generateManifest } from "./manifest.js";
import { toImageFill } from "./markdown/deckCompiler.js";
import {
  type CompilerConfig,
  CompilerSlotType,
  type CompilerThemeConfig,
  compileDeck,
  ParameterType,
  parseSlideDocument,
  RESERVED_KEY,
} from "./markdown/index.js";
import { templateKeys, templateToSegments } from "./markdown/textTemplate.js";

// ── Smoke content fixtures (used by the `smoke` subcommand) ──────────────────

const line = (text: string): StyledParagraph => ({ runs: [{ text }] });
const bulletLine = (text: string, level = 0): StyledParagraph => ({ runs: [{ text }], bullet: { level } });

const SMOKE_TABLE: TableFill = {
  headers: ["Feature", "Starter", "Pro", "Business", "Enterprise"].map(line),
  rows: [
    ["Users", "5", "25", "100", "Unlimited"].map(line),
    ["Storage", "1 GB", "10 GB", "100 GB", "1 TB"].map(line),
    ["Support", "Email", "Priority", "24/7", "Dedicated"].map(line),
  ],
};

const SMOKE_CODE: StyledParagraph[] = [
  { runs: [{ text: "SELECT name, total", color: "FF7B72" }] },
  { runs: [{ text: "FROM orders", color: "FF7B72" }] },
  { runs: [{ text: "WHERE created_at > now();", color: "FF7B72" }] },
];

const SMOKE_PROSE: StyledParagraph[] = [
  line("Sample intro line for this block."),
  bulletLine("First point"),
  bulletLine("Second point"),
];

function pickFirstAsset(config: CompilerConfig): string | undefined {
  for (const group of Object.values(config.assets)) {
    for (const entry of Object.values(group)) return entry.path;
  }
  return undefined;
}

function smokeSteps(config: CompilerConfig): DeckStep[] {
  const firstAsset = pickFirstAsset(config);
  const absAsset = firstAsset ? resolve(config.rootDir, firstAsset) : undefined;
  return config.layouts.map((layout): DeckStep => {
    const content: Record<string, TextFill | TableFill | ImageFill | TemplateFill> = {};
    // Parameters (frontmatter): text → a placeholder-filled template, image → the first asset.
    for (const p of layout.parameters) {
      switch (p.type) {
        case ParameterType.Image: {
          if (!absAsset) continue;
          content[p.key] = toImageFill(p, absAsset);
          break;
        }
        case ParameterType.Template: {
          // Text shapes carry no key — the engine slot is keyed by shapeName.
          const values = new Map(templateKeys(p.template).map((k) => [k, "Sample"]));
          content[p.shapeName] = { lines: templateToSegments(p.template, values, p.shapeName) };
          break;
        }
      }
    }
    // Slots (body regions): text → prose, table → table, code → code, mermaid → image.
    for (const s of layout.slots) {
      switch (s.type) {
        case CompilerSlotType.Table:
          content[s.key] = SMOKE_TABLE;
          break;
        case CompilerSlotType.Code:
          content[s.key] = { paragraphs: SMOKE_CODE };
          break;
        case CompilerSlotType.Mermaid: {
          // Mermaid slots don't declare fit; smoke fills them with a fixed
          // contained ImageFill so the projected engine slot (Image, contain)
          // stays consistent with the real renderer's output.
          if (!absAsset) continue;
          content[s.key] = { type: SlotType.Image, path: absAsset, fit: FitMode.Contain };
          break;
        }
        case CompilerSlotType.Text:
          content[s.key] = { paragraphs: SMOKE_PROSE };
          break;
      }
    }
    return { layout: layout.name, content };
  });
}

const DEFAULT_CONFIG = "theme.json";
const DEFAULT_SMOKE_OUTPUT = "smoke-all.pptx";
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
  .action(async (deckPath: string, opts: { config?: string }) => {
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
    const deck = compileDeck(doc, config.layouts, config.rootDir);
    if (!deck.output) deck.output = basename(deckPath).replace(/\.md$/, ".pptx");
    await buildDeck(deck, config);
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
  .command("smoke")
  .description("Generate one smoke-test slide per layout")
  .option(`-c, --config <path>`, "path to theme config file", DEFAULT_CONFIG)
  .option(`-o, --out <file>`, "output PPTX filename", DEFAULT_SMOKE_OUTPUT)
  .action(async (opts: { config: string; out: string }) => {
    const config = loadConfig(resolve(process.cwd(), opts.config));
    const steps = smokeSteps(config);
    await generate({ theme: opts.config, output: opts.out, steps }, toEngineConfig(config));
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
