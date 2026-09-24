import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import JSZip from "jszip";
import type { AssetCatalog } from "../dist/agents/catalog.js";
import { ASSETS_ARCHIVE } from "../dist/agents/files.js";
import { renameSkill, skillPackageJson, zipDir } from "../dist/agents/skill.js";
import { ImageFit } from "../dist/engine/types.js";

/** Stand-ins for what `package` generates; `skillPackageJson` is tested on its own below. */
const generated = {
  "package.json": '{"name":"acme-slides"}\n',
  "SKILL.md": "---\nname: acme-slides\n---\n",
  "manifest.json": '{"layouts":[]}\n',
};

const config = { layouts: [], template: "corp.pptx" };
const catalog: AssetCatalog = {
  logos: { a: { path: "assets/logos/a.png", fit: ImageFit.ScaleDown, description: "A logo" } },
};
const themeFiles = ["theme.json", "assets.json"];

const seedTheme = (root: string): void => {
  for (const f of themeFiles) writeFileSync(join(root, f), `${f}\n`);
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
  // `npm install` runs its install scripts inside their container, and
  // `--omit=dev` never installs the engine the build needs.
  const theme = {
    name: "acme-slides",
    version: "0.6.0",
    description: "Branded slide decks.",
    private: true,
    scripts: { postinstall: "node setup.js" },
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
    const root = mkdtempSync(join(tmpdir(), "skill-"));
    try {
      seedTheme(root);

      const zip = await JSZip.loadAsync(await zipDir(root, "acme-slides", config, catalog, themeFiles, generated));

      assert.equal(await zip.file("acme-slides/theme.json")?.async("string"), "theme.json\n");
      assert.equal(await zip.file("acme-slides/assets.json")?.async("string"), "assets.json\n");
      assert.ok(zip.file("acme-slides/template/corp.pptx"), "source template kept");
      // Assets are NOT direct entries: they ship inside one archive, because hosts
      // cap how many files a skill may contain.
      assert.equal(zip.file("acme-slides/assets/logos/a.png"), null, "assets are not loose entries");
      assert.ok(zip.file(`acme-slides/${ASSETS_ARCHIVE}`), "assets ship as one archive");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("carries the generated files as given, over any file of the same name in the theme", async () => {
    const root = mkdtempSync(join(tmpdir(), "skill-generated-"));
    try {
      seedTheme(root);
      // The theme's own package.json is a development document; a copy would ship
      // its scripts and devDependencies into a consumer's install.
      const zip = await JSZip.loadAsync(await zipDir(root, "acme-slides", config, catalog, themeFiles, generated));
      for (const [name, content] of Object.entries(generated)) {
        assert.equal(await zip.file(`acme-slides/${name}`)?.async("string"), content, name);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("leaves out anything the theme does not declare, at any depth", async () => {
    const root = mkdtempSync(join(tmpdir(), "skill-extra-"));
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

      const zip = await JSZip.loadAsync(await zipDir(root, "acme-slides", config, catalog, themeFiles, generated));

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
    const root = mkdtempSync(join(tmpdir(), "skill-lock-"));
    try {
      seedTheme(root);
      writeFileSync(join(root, "package-lock.json"), "{}\n");
      const zip = await JSZip.loadAsync(await zipDir(root, "acme-slides", config, catalog, themeFiles, generated));
      assert.ok(zip.file("acme-slides/package-lock.json"), "lockfile included");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("throws naming the file when the theme declares something that is missing", async () => {
    const root = mkdtempSync(join(tmpdir(), "skill-missing-"));
    try {
      seedTheme(root);
      rmSync(join(root, "assets", "logos", "a.png"));
      await assert.rejects(
        zipDir(root, "acme-slides", config, catalog, themeFiles, generated),
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
  // archive, which an agent unzips to copy images into decks.
  const archiveOf = async (root: string): Promise<JSZip> => {
    const zip = await JSZip.loadAsync(await zipDir(root, "acme-slides", config, catalog, themeFiles, generated));
    const entry = zip.file(`acme-slides/${ASSETS_ARCHIVE}`);
    assert.ok(entry, "skill carries an assets archive");
    return JSZip.loadAsync(await entry.async("nodebuffer"));
  };

  it("collapses every declared asset into a single skill entry", async () => {
    const root = mkdtempSync(join(tmpdir(), "skill-archive-"));
    try {
      seedTheme(root);
      const zip = await JSZip.loadAsync(await zipDir(root, "acme-slides", config, catalog, themeFiles, generated));
      const loose = Object.keys(zip.files).filter((f) => f.includes("/assets/"));
      assert.deepEqual(loose, [], "no asset is a loose entry");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("stores each asset at its declared path, so nothing is rewritten on either side", async () => {
    const root = mkdtempSync(join(tmpdir(), "skill-archive-paths-"));
    try {
      seedTheme(root);
      const assets = await archiveOf(root);
      assert.ok(assets.file("assets/logos/a.png"), "the path the catalog declares");
      assert.equal(await assets.file("assets/logos/a.png")?.async("string"), "PNG");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("stores archive entries rather than deflating them", async () => {
    const root = mkdtempSync(join(tmpdir(), "skill-store-"));
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

  it("packages a theme that declares no assets at all, with no archive", async () => {
    const root = mkdtempSync(join(tmpdir(), "skill-noassets-"));
    try {
      seedTheme(root);
      const zip = await JSZip.loadAsync(await zipDir(root, "acme-slides", config, {}, themeFiles, generated));
      assert.equal(zip.file(`acme-slides/${ASSETS_ARCHIVE}`), null, "no archive when there is nothing to archive");
      assert.ok(zip.file("acme-slides/template/corp.pptx"), "the rest still packages");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
