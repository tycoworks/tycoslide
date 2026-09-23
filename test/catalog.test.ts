import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { loadAssetCatalog } from "../dist/agents/catalog.js";
import { ASSETS_FILE } from "../dist/agents/files.js";
import { ImageFit } from "../dist/engine/types.js";

/** A theme directory whose `assets.json` holds `content` verbatim. */
function themeWith(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), "tycoslide-catalog-"));
  writeFileSync(join(dir, ASSETS_FILE), content);
  return dir;
}

const entry = { path: "assets/logos/a.png", fit: ImageFit.Contain, description: "A logo" };
const catalogWith = (e: object) => JSON.stringify({ logos: { a: e } });

describe("loadAssetCatalog", () => {
  it("loads a valid catalog", () => {
    assert.deepEqual(loadAssetCatalog(themeWith(catalogWith(entry))), { logos: { a: entry } });
  });

  it("loads an empty catalog, for a theme with no pictures", () => {
    assert.deepEqual(loadAssetCatalog(themeWith("{}")), {});
  });

  const rejected: { name: string; content: string; message: RegExp }[] = [
    {
      name: "a fit that isn't one of the engine's",
      content: catalogWith({ ...entry, fit: "stretch" }),
      message: /invalid picture catalog[\s\S]*"contain"\|"cover"\|"scale-down"/,
    },
    {
      name: "an unknown key in an entry",
      content: catalogWith({ ...entry, size: "large" }),
      message: /Unknown key\(s\): size\. Valid keys: path, fit, description/,
    },
    {
      name: "an entry missing its fit",
      content: catalogWith({ path: entry.path, description: entry.description }),
      message: /invalid picture catalog[\s\S]*fit/,
    },
    { name: "invalid JSON", content: "{ logos:", message: /not found or invalid JSON/ },
  ];
  for (const { name, content, message } of rejected) {
    it(`rejects ${name}`, () => {
      assert.throws(() => loadAssetCatalog(themeWith(content)), message);
    });
  }

  it("fails when the theme has no catalog, naming the path", () => {
    const dir = mkdtempSync(join(tmpdir(), "tycoslide-catalog-"));
    assert.throws(() => loadAssetCatalog(dir), new RegExp(`not found or invalid JSON: ${join(dir, ASSETS_FILE)}`));
  });
});
