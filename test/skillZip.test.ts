import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { renameSkill, zipDir } from "../dist/skillZip.js";

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
  it("zips the whole dir under one folder, skipping deps, hidden entries, and build artifacts", async () => {
    const root = mkdtempSync(join(tmpdir(), "skillzip-"));
    try {
      writeFileSync(join(root, "theme.json"), '{"ok":true}\n');
      writeFileSync(join(root, "package.json"), "{}\n");
      mkdirSync(join(root, "assets", "logos"), { recursive: true });
      writeFileSync(join(root, "assets", "logos", "a.png"), "PNG");
      mkdirSync(join(root, "template"));
      writeFileSync(join(root, "template", "corp.pptx"), "TEMPLATE"); // nested .pptx must be KEPT
      // should be excluded:
      mkdirSync(join(root, "node_modules"));
      writeFileSync(join(root, "node_modules", "junk.js"), "x");
      writeFileSync(join(root, ".env"), "SECRET=1");
      writeFileSync(join(root, "showcase.pptx"), "PPTX"); // root build output
      writeFileSync(join(root, "old.zip"), "ZIP");

      const zip = await JSZip.loadAsync(await zipDir(root, "mz-slides"));

      assert.ok(zip.file("mz-slides/theme.json"), "theme.json included");
      assert.ok(zip.file("mz-slides/package.json"), "package.json included");
      assert.ok(zip.file("mz-slides/assets/logos/a.png"), "nested asset included with its path");
      assert.ok(zip.file("mz-slides/template/corp.pptx"), "template .pptx (nested) kept");
      assert.equal(await zip.file("mz-slides/theme.json")?.async("string"), '{"ok":true}\n');

      assert.ok(!zip.file("mz-slides/node_modules/junk.js"), "node_modules excluded");
      assert.ok(!zip.file("mz-slides/.env"), "hidden file excluded");
      assert.ok(!zip.file("mz-slides/showcase.pptx"), "root .pptx build output excluded");
      assert.ok(!zip.file("mz-slides/old.zip"), "root .zip excluded");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("throws when the directory has nothing to zip", async () => {
    const root = mkdtempSync(join(tmpdir(), "skillzip-empty-"));
    try {
      await assert.rejects(zipDir(root, "x"), /No files to zip/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
