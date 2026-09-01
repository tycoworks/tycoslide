import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { renameSkill, skillPackageJson, zipDir } from "../dist/skillZip.js";

/** Stand-in for the authored manifest; `skillPackageJson` is tested on its own below. */
const PKG_JSON = '{"name":"acme-slides"}\n';
import { AssetType } from "../dist/markdown/types.js";

describe("renameSkill", () => {
  const source = "---\nname: slides\ndescription: >\n  Build decks.\n---\n\n# slides\n\nBody with name: not-a-header line.\n";

  it("rewrites the frontmatter name and leaves the body untouched", () => {
    const out = renameSkill(source, "acme-slides");
    assert.match(out, /^---\nname: acme-slides\n/);
    assert.ok(out.includes("Body with name: not-a-header line."));
    assert.ok(!out.includes("name: slides"));
  });

  it("throws when the frontmatter has no name: line", () => {
    const noName = "---\ndescription: >\n  Build decks.\n---\n\n# body\n";
    assert.throws(() => renameSkill(noName, "acme-slides"), /no "name:" line/);
  });
});

describe("skillPackageJson", () => {
  // A theme repo's package.json is a DEVELOPMENT document. Shipping it verbatim
  // fails a consumer's install two ways, both reproduced against a real zip:
  // `npm install` re-runs the build script inside their container, and
  // `--omit=dev` never installs the engine the script (and the build) needs.
  const theme = {
    name: "acme-slides",
    version: "0.6.0",
    description: "Branded slide decks.",
    private: true,
    scripts: { postinstall: "tycoslide package" },
    devDependencies: { "@tycoworks/tycoslide": "^0.12.0" },
    dependencies: { "@fontsource/inter": "^5.3.0" },
  };
  const engine = { name: "@tycoworks/tycoslide", version: "0.13.0" };
  const authored = () => JSON.parse(skillPackageJson(theme, engine));

  it("ships no scripts, so nothing of ours runs during someone else's install", () => {
    assert.equal(authored().scripts, undefined);
  });

  it("declares the engine as a runtime dependency, at the version that packaged the skill", () => {
    // "^0.13.0" is the packaging engine's version, NOT the theme's devDependency
    // range -- a skill installs the engine that generated it.
    assert.equal(authored().dependencies["@tycoworks/tycoslide"], "^0.13.0");
    assert.equal(authored().devDependencies, undefined);
  });

  it("carries the theme's own dependencies through", () => {
    assert.equal(authored().dependencies["@fontsource/inter"], "^5.3.0");
  });

  it("keeps the theme's identity and stays private", () => {
    const pkg = authored();
    assert.equal(pkg.name, "acme-slides");
    assert.equal(pkg.version, "0.6.0");
    assert.equal(pkg.private, true);
  });

  it("emits dependencies in a stable order, so a regenerated skill has no spurious diff", () => {
    const keys = Object.keys(authored().dependencies);
    assert.deepEqual(keys, [...keys].sort());
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

      const zip = await JSZip.loadAsync(await zipDir(root, "acme-slides", config, generated, PKG_JSON));

      assert.ok(zip.file("acme-slides/theme.json"), "config included");
      assert.ok(zip.file("acme-slides/manifest.json"), "manifest included");
      assert.ok(zip.file("acme-slides/skill.md"), "skill.md included");
      assert.ok(zip.file("acme-slides/syntax.md"), "syntax.md included");
      // The theme dir holds `{}`; the zip must carry the AUTHORED manifest instead.
      // This is the regression guard for the copied-package.json bug: a copy would
      // ship the theme's postinstall and devDependency into a consumer's install.
      assert.equal(await zip.file("acme-slides/package.json")?.async("string"), PKG_JSON);
      assert.ok(zip.file("acme-slides/assets/logos/a.png"), "declared asset included with its path");
      assert.ok(zip.file("acme-slides/template/corp.pptx"), "source template kept");
      assert.equal(await zip.file("acme-slides/theme.json")?.async("string"), "theme.json\n");
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

      const zip = await JSZip.loadAsync(await zipDir(root, "acme-slides", config, generated, PKG_JSON));

      assert.ok(!zip.file("acme-slides/decks/demo.pptx"), "built deck excluded");
      assert.ok(!zip.file("acme-slides/decks/demo.pdf"), "exported pdf excluded");
      assert.ok(!zip.file("acme-slides/decks/slide-01.png"), "slide png excluded");
      assert.ok(!zip.file("acme-slides/decks/demo.md"), "working deck source excluded");
      assert.ok(!zip.file("acme-slides/showcase.pptx"), "root build output excluded");
      assert.ok(!zip.file("acme-slides/old.zip"), "stray zip excluded");
      assert.ok(!zip.file("acme-slides/.env"), "secrets excluded");
      assert.ok(!zip.file("acme-slides/node_modules/junk.js"), "node_modules excluded");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("takes the lockfile when present so the install is reproducible", async () => {
    const root = mkdtempSync(join(tmpdir(), "skillzip-lock-"));
    try {
      seedTheme(root);
      writeFileSync(join(root, "package-lock.json"), "{}\n");
      const zip = await JSZip.loadAsync(await zipDir(root, "acme-slides", config, generated, PKG_JSON));
      assert.ok(zip.file("acme-slides/package-lock.json"), "lockfile included");
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
        zipDir(root, "acme-slides", config, generated, PKG_JSON),
        /assets\/logos\/a\.png.*no such file/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
