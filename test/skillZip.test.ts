import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { AssetType } from "../dist/markdown/types.js";
import { ASSETS_ARCHIVE } from "../dist/files.js";
import { expandAssets } from "../dist/skillZip.js";
import { renameSkill, skillPackageJson, zipDir } from "../dist/skillZip.js";

/** Stand-in for the authored manifest; `skillPackageJson` is tested on its own below. */
const PKG_JSON = '{"name":"acme-slides"}\n';

const config = {
  layouts: [],
  template: "corp.pptx",
  assets: { logos: { a: { path: "assets/logos/a.png", type: AssetType.Icon, description: "A logo" } } },
};
const generated = ["theme.json", "manifest.json", "SKILL.md", "syntax.md"];

const seedTheme = (root: string): void => {
  for (const f of generated) writeFileSync(join(root, f), `${f}\n`);
  writeFileSync(join(root, "package.json"), "{}\n");
  mkdirSync(join(root, "assets", "logos"), { recursive: true });
  writeFileSync(join(root, "assets", "logos", "a.png"), "PNG");
  mkdirSync(join(root, "template"));
  writeFileSync(join(root, "template", "corp.pptx"), "TEMPLATE");
};


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
  it("packages exactly what the theme declares, under one folder", async () => {
    const root = mkdtempSync(join(tmpdir(), "skillzip-"));
    try {
      seedTheme(root);

      const zip = await JSZip.loadAsync(await zipDir(root, "acme-slides", config, generated, PKG_JSON));

      assert.ok(zip.file("acme-slides/theme.json"), "config included");
      assert.ok(zip.file("acme-slides/manifest.json"), "manifest included");
      assert.ok(zip.file("acme-slides/SKILL.md"), "SKILL.md included");
      assert.ok(zip.file("acme-slides/syntax.md"), "syntax.md included");
      // The theme dir holds `{}`; the zip must carry the AUTHORED manifest instead.
      // This is the regression guard for the copied-package.json bug: a copy would
      // ship the theme's postinstall and devDependency into a consumer's install.
      assert.equal(await zip.file("acme-slides/package.json")?.async("string"), PKG_JSON);
      // Assets are NOT direct entries: they ship inside one archive, because hosts
      // cap how many files a skill may contain.
      assert.equal(zip.file("acme-slides/assets/logos/a.png"), null, "assets are not loose entries");
      assert.ok(zip.file(`acme-slides/${ASSETS_ARCHIVE}`), "assets ship as one archive");
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

describe("assets archive", () => {
  // A host caps a skill at a number of FILES. A brand library is unbounded -- an
  // icon set alone runs to thousands -- so every declared asset ships inside one
  // archive, and `buildDeck` expands it before anything fills with it.
  const archiveOf = async (root: string): Promise<JSZip> => {
    const zip = await JSZip.loadAsync(await zipDir(root, "acme-slides", config, generated, PKG_JSON));
    const entry = zip.file(`acme-slides/${ASSETS_ARCHIVE}`);
    assert.ok(entry, "skill carries an assets archive");
    return JSZip.loadAsync(await entry.async("nodebuffer"));
  };

  it("collapses every declared asset into a single skill entry", async () => {
    const root = mkdtempSync(join(tmpdir(), "skillzip-archive-"));
    try {
      seedTheme(root);
      const zip = await JSZip.loadAsync(await zipDir(root, "acme-slides", config, generated, PKG_JSON));
      const loose = Object.keys(zip.files).filter((f) => f.includes("/assets/"));
      assert.deepEqual(loose, [], "no asset is a loose entry");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("stores each asset at its declared path, so nothing is rewritten on either side", async () => {
    const root = mkdtempSync(join(tmpdir(), "skillzip-archive-paths-"));
    try {
      seedTheme(root);
      const assets = await archiveOf(root);
      assert.ok(assets.file("assets/logos/a.png"), "the path theme.json declares");
      assert.equal(await assets.file("assets/logos/a.png")?.async("string"), "PNG");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("expands to the paths the catalog names", async () => {
    const root = mkdtempSync(join(tmpdir(), "expand-"));
    const target = mkdtempSync(join(tmpdir(), "expand-target-"));
    try {
      seedTheme(root);
      const assets = await archiveOf(root);
      writeFileSync(join(target, ASSETS_ARCHIVE), await assets.generateAsync({ type: "nodebuffer" }));

      await expandAssets(target);
      assert.equal(readFileSync(join(target, "assets", "logos", "a.png"), "utf-8"), "PNG");
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("never overwrites a file already on disk, so a stale archive cannot clobber a theme", async () => {
    const root = mkdtempSync(join(tmpdir(), "expand-loose-"));
    const target = mkdtempSync(join(tmpdir(), "expand-loose-target-"));
    try {
      seedTheme(root);
      const assets = await archiveOf(root);
      writeFileSync(join(target, ASSETS_ARCHIVE), await assets.generateAsync({ type: "nodebuffer" }));
      mkdirSync(join(target, "assets", "logos"), { recursive: true });
      writeFileSync(join(target, "assets", "logos", "a.png"), "NEWER");

      await expandAssets(target);
      assert.equal(readFileSync(join(target, "assets", "logos", "a.png"), "utf-8"), "NEWER");
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("is a no-op in a theme under development, which has no archive", async () => {
    const root = mkdtempSync(join(tmpdir(), "expand-none-"));
    try {
      seedTheme(root);
      await expandAssets(root);
      assert.equal(readFileSync(join(root, "assets", "logos", "a.png"), "utf-8"), "PNG");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("stores archive entries rather than deflating them", async () => {
    const root = mkdtempSync(join(tmpdir(), "skillzip-store-"));
    try {
      seedTheme(root);
      // Highly compressible, so DEFLATE would be obvious in the byte count.
      const payload = "A".repeat(20000);
      writeFileSync(join(root, "assets", "logos", "a.png"), payload);
      const assets = await archiveOf(root);
      const stored = await assets.file("assets/logos/a.png")?.async("nodebuffer");
      assert.equal(stored?.length, payload.length, "entry is stored, not deflated");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses an entry that is not a theme-relative path", async () => {
    const target = mkdtempSync(join(tmpdir(), "expand-traversal-"));
    try {
      const hostile = new JSZip();
      // JSZip collapses `..` on load; a backslash survives and traverses on Windows.
      hostile.file("..\\escaped.png", "X");
      writeFileSync(join(target, ASSETS_ARCHIVE), await hostile.generateAsync({ type: "nodebuffer" }));
      await assert.rejects(expandAssets(target), /not a theme-relative path/);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("does nothing when given no root, rather than expanding into the working directory", async () => {
    await expandAssets("");
  });

  it("packages a theme that declares no assets at all, with no archive", async () => {
    const root = mkdtempSync(join(tmpdir(), "skillzip-noassets-"));
    try {
      seedTheme(root);
      const bare = { ...config, assets: {} };
      const zip = await JSZip.loadAsync(await zipDir(root, "acme-slides", bare, generated, PKG_JSON));
      assert.equal(zip.file(`acme-slides/${ASSETS_ARCHIVE}`), null, "no archive when there is nothing to archive");
      assert.ok(zip.file("acme-slides/template/corp.pptx"), "the rest still packages");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
