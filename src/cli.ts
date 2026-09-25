import { readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { registerAgentCommands } from "./agents/commands.js";
import { PACKAGE_JSON } from "./agents/files.js";
import { buildDeck } from "./index.js";
import { compileDeck, loadThemeConfig, parseSlideDocument, RESERVED_KEY } from "./markdown/index.js";

// The CLI is the one module that wires both layers: `build` from the core, and
// the agent layer's commands registered onto the same program.
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(packageRoot, PACKAGE_JSON), "utf-8"));
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
    const config = { ...loadThemeConfig(absConfigPath), browserPath: opts.browserPath, deckDir: dirname(absDeckPath) };
    const deck = await compileDeck(doc, config);
    // Always write the .pptx next to the input deck, named after it.
    const outName = basename(deckPath).replace(/\.md$/, ".pptx");
    deck.output = resolve(dirname(absDeckPath), outName);
    await buildDeck(deck, config, { excludeNotes: !opts.notes });
  });

registerAgentCommands(program, { root: packageRoot, name: pkg.name, version: pkg.version });

// Everything below the CLI throws plain Errors carrying a written-for-humans
// message. Print that message and stop; a Node stack trace tells a deck author
// nothing about their deck, and buries the part that does.
try {
  await program.parseAsync(process.argv);
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
