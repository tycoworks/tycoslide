import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { loadAssetCatalog } from "../dist/agents/skill.js";
import { ASSETS_FILE } from "../dist/agents/files.js";
import { ImageFit, SlotType } from "../dist/engine/types.js";
import { compileMarkdownDeck, parseThemeConfig } from "../dist/markdown/index.js";
import type { CompilerConfig, CompilerLayout } from "../dist/markdown/types.js";

// The shipped docs' and skills' examples, checked against the real loaders and
// compiler so a change to either fails here rather than in a reader's first build.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The first fenced block of `lang` after `heading` in a doc, by its path in the repo. */
function exampleAfter(doc: string, heading: string, lang: string): string {
  const text = readFileSync(join(ROOT, doc), "utf-8");
  const start = text.indexOf(heading);
  assert.notEqual(start, -1, `${doc} has no "${heading}"`);
  const match = new RegExp(`\`\`\`${lang}\\n([\\s\\S]*?)\\n\`\`\``).exec(text.slice(start));
  assert.ok(match, `${doc} has no ${lang} block after "${heading}"`);
  return match[1];
}

describe("docs/theme.md", () => {
  it("has a minimal example that loads", () => {
    const config = parseThemeConfig(JSON.parse(exampleAfter("docs/theme.md", "## Minimal complete example", "json")), "theme.json");
    assert.deepEqual(
      config.layouts.map((layout) => layout.name),
      ["Composed", "TextOnly"],
    );
  });
});

describe("docs/markdown.md", () => {
  it("has a full example that compiles", async () => {
    // The layouts the example names, each on its own slide.
    const text = (key: string, slide: number) => ({ key, accepts: [{ type: SlotType.Text, sourceSlide: slide, shapeName: key }] });
    const layout = (name: string, slideNumber: number, params: string[], slots: CompilerLayout["slots"]): CompilerLayout => ({
      name,
      slideNumber,
      parameters: params.map((key) => ({ shapeName: key, template: `{${key}}` })),
      slots,
    });
    const deckDir = mkdtempSync(join(tmpdir(), "tycoslide-docs-"));
    mkdirSync(join(deckDir, "assets"));
    writeFileSync(join(deckDir, "assets", "office-floor-plan.png"), "");
    const config: CompilerConfig = {
      template: "",
      rootDir: deckDir,
      deckDir,
      layouts: [
        layout("Title", 1, ["title", "subtitle"], []),
        layout("Body", 2, ["title"], [text("body", 2)]),
        layout("TwoColumn", 3, ["title"], [text("left", 3), text("right", 3)]),
        layout("ImageSlide", 4, ["title"], [
          { key: "hero", accepts: [{ type: SlotType.Image, sourceSlide: 4, shapeName: "hero", fit: ImageFit.Contain }] },
        ]),
      ],
    };

    const deck = await compileMarkdownDeck(exampleAfter("docs/markdown.md", "## Full Example", "markdown"), config);
    assert.deepEqual(
      deck.steps.map((step) => step.layout),
      ["Title", "Body", "TwoColumn", "ImageSlide"],
    );
  });
});

describe("skills/create-theme/SKILL.md", () => {
  it("has a catalog example that loads", () => {
    const themeDir = mkdtempSync(join(tmpdir(), "tycoslide-docs-"));
    writeFileSync(join(themeDir, ASSETS_FILE), exampleAfter("skills/create-theme/SKILL.md", "### 1.4 Draft", "json"));
    assert.deepEqual(Object.keys(loadAssetCatalog(themeDir)), ["brand"]);
  });
});
