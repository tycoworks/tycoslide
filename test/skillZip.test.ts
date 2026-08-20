import assert from "node:assert/strict";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { renameSkill, zipSkill } from "../dist/skillZip.js";

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

describe("zipSkill", () => {
  it("packs the given files under a single root folder with round-tripping contents", async () => {
    const skillContent = "# Slides skill\n";
    const buf = await zipSkill("slides", [
      { name: "skill.md", content: skillContent },
      { name: "syntax.md", content: "syntax\n" },
      { name: "manifest.json", content: '{"ok":true}\n' },
    ]);
    const zip = await JSZip.loadAsync(buf);

    for (const name of ["slides/skill.md", "slides/syntax.md", "slides/manifest.json"]) {
      assert.ok(zip.file(name), `expected zip entry ${name}`);
    }
    assert.equal(await zip.file("slides/skill.md")?.async("string"), skillContent);
  });

  it("throws when the file list is empty", async () => {
    await assert.rejects(zipSkill("slides", []), /No files to zip/);
  });
});
