import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { renameSkill, zipDir } from "../dist/skillZip.js";
import { AssetType } from "../dist/markdown/types.js";

describe("renameSkill", () => {
  const source = "---\nname: slides\ndescription: >\n  Build decks.\n---\n\n# slides\n\nBody with name: not-a-header line.\n";

  it("rewrites the frontmatter name and leaves the body untouched", () => {
    const out = renameSkill(source, "mz-slides");
    assert.match(out, /^---\nname: mz-slides\n/);
    assert.ok(out.includes("Body with name: not-a-header line."));
    assert.ok(!out.includes("name: slides"));
  });

  it("throws when the frontmatter has no name: line", () => {
    const noName = "---\ndescription: >\n  Build decks.\n---\n\n# body\n";
    assert.throws(() => renameSkill(noName, "mz-slides"), /no "name:" line/);
  });
});

describe("zipDir", () => {
  const config = {
    layouts: [],
    template: "corp.pptx",
    assets: { logos: { a: { path: "assets/logos/a.png", type: AssetType.Icon, description: "A logo" } } },
  };
  const generated = ["theme.json", "manifest.json", "skill.md", "syntax.md"];

  const seedTheme = (root: string): void => {
    for (const f of generated) writeFileSync(join(root, f), `${f}\n`);
    writeFileSync(join(root, "package.json"), "{}\n");
    mkdirSync(join(root, "assets", "logos"), { recursive: true });
    writeFileSync(join(root, "assets", "logos", "a.png"), "PNG");
    mkdirSync(join(root, "template"));
    writeFileSync(join(root, "template", "corp.pptx"), "TEMPLATE");
  };

  it("packages exactly what the theme declares, under one folder", async () => {
    const root = mkdtempSync(join(tmpdir(), "skillzip-"));
    try {
      seedTheme(root);

      const zip = await JSZip.loadAsync(await zipDir(root, "mz-slides", config, generated));

      assert.ok(zip.file("mz-slides/theme.json"), "config included");
      assert.ok(zip.file("mz-slides/manifest.json"), "manifest included");
      assert.ok(zip.file("mz-slides/skill.md"), "skill.md included");
      assert.ok(zip.file("mz-slides/syntax.md"), "syntax.md included");
      assert.ok(zip.file("mz-slides/package.json"), "package.json included");
      assert.ok(zip.file("mz-slides/assets/logos/a.png"), "declared asset included with its path");
      assert.ok(zip.file("mz-slides/template/corp.pptx"), "source template kept");
      assert.equal(await zip.file("mz-slides/theme.json")?.async("string"), "theme.json\n");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("leaves out anything the theme does not declare, at any depth", async () => {
    const root = mkdtempSync(join(tmpdir(), "skillzip-extra-"));
    try {
      seedTheme(root);
      // Working files that share the directory. Built decks land next to their
      // source, so they appear in subdirectories, not just at the root.
      mkdirSync(join(root, "decks"));
      writeFileSync(join(root, "decks", "demo.md"), "DECK");
      writeFileSync(join(root, "decks", "demo.pptx"), "PPTX");
      writeFileSync(join(root, "decks", "demo.pdf"), "PDF");
      writeFileSync(join(root, "decks", "slide-01.png"), "PNG");
      writeFileSync(join(root, "showcase.pptx"), "PPTX");
      writeFileSync(join(root, "old.zip"), "ZIP");
      writeFileSync(join(root, ".env"), "SECRET=1");
      mkdirSync(join(root, "node_modules"));
      writeFileSync(join(root, "node_modules", "junk.js"), "x");

      const zip = await JSZip.loadAsync(await zipDir(root, "mz-slides", config, generated));

      assert.ok(!zip.file("mz-slides/decks/demo.pptx"), "built deck excluded");
      assert.ok(!zip.file("mz-slides/decks/demo.pdf"), "exported pdf excluded");
      assert.ok(!zip.file("mz-slides/decks/slide-01.png"), "slide png excluded");
      assert.ok(!zip.file("mz-slides/decks/demo.md"), "working deck source excluded");
      assert.ok(!zip.file("mz-slides/showcase.pptx"), "root build output excluded");
      assert.ok(!zip.file("mz-slides/old.zip"), "stray zip excluded");
      assert.ok(!zip.file("mz-slides/.env"), "secrets excluded");
      assert.ok(!zip.file("mz-slides/node_modules/junk.js"), "node_modules excluded");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("takes the lockfile when present so the install is reproducible", async () => {
    const root = mkdtempSync(join(tmpdir(), "skillzip-lock-"));
    try {
      seedTheme(root);
      writeFileSync(join(root, "package-lock.json"), "{}\n");
      const zip = await JSZip.loadAsync(await zipDir(root, "mz-slides", config, generated));
      assert.ok(zip.file("mz-slides/package-lock.json"), "lockfile included");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("throws naming the file when the theme declares something that is missing", async () => {
    const root = mkdtempSync(join(tmpdir(), "skillzip-missing-"));
    try {
      seedTheme(root);
      rmSync(join(root, "assets", "logos", "a.png"));
      await assert.rejects(
        zipDir(root, "mz-slides", config, generated),
        /assets\/logos\/a\.png.*no such file/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
