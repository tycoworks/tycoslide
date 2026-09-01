import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ASSETS_FILE, generateAssetCatalog, generateManifest } from "../dist/manifest.js";
import { SlotType } from "../dist/engine/types.js";
import type { CompilerConfig, CompilerLayout, CompilerSlot } from "../dist/markdown/types.js";

function config(layouts: CompilerLayout[]): CompilerConfig {
  return { layouts, assets: {}, template: "t.pptx", rootDir: "" };
}


/** Parse the manifest JSON and return the sole layout's parameter list. */
function manifestParams(layouts: CompilerLayout[]) {
  const manifest = JSON.parse(generateManifest(config(layouts)));
  return manifest.layouts[0].parameters;
}

function layout(name: string, parameters: CompilerLayout["parameters"]): CompilerLayout {
  return { name, slideNumber: 1, description: "", parameters, slots: [] };
}

describe("generateManifest parameter flattening", () => {
  it("flattens a text parameter's template keys into one entry per key", () => {
    const params = manifestParams([
      layout("welcome", [{ shapeName: "welcomeBar", template: "{lastname}, {firstname}" }]),
    ]);
    assert.deepEqual(params, [
      { key: "lastname" },
      { key: "firstname" },
    ]);
  });

  it("de-dupes a repeated template key to a single entry", () => {
    const params = manifestParams([
      layout("dup", [{ shapeName: "s", template: "{name}\n— {name}" }]),
    ]);
    assert.deepEqual(params, [{ key: "name" }]);
  });

  it("marks every flattened key required when the parameter is required", () => {
    const params = manifestParams([
      layout("req", [{ shapeName: "s", template: "{a}{b}", required: true }]),
    ]);
    assert.deepEqual(params, [
      { key: "a", required: true },
      { key: "b", required: true },
    ]);
  });

});

// A layout with the given slots (no parameters). description is omitted to
// exercise its optionality.
function slotLayout(name: string, slots: CompilerSlot[]): CompilerLayout {
  return { name, slideNumber: 1, parameters: [], slots };
}

function manifestSlots(slots: CompilerSlot[]) {
  const manifest = JSON.parse(generateManifest(config([slotLayout("L", slots)])));
  return manifest.layouts[0].slots;
}

describe("manifest / asset catalog split", () => {
  // The manifest is read WHOLE every session; the catalog grows with the theme's
  // picture count. Keeping them in one file spends the agent's context on pictures
  // before it has read a layout, which is what splitting them buys back.
  const withAssets = (): CompilerConfig => ({
    layouts: [layout("Title", [])],
    assets: {
      logos: { primary: { path: "assets/logos/p.png", type: "image", description: "Primary logo" } },
      icons: { check: { path: "assets/icons/check.png", type: "icon", description: "Check" } },
    },
    template: "t.pptx",
    rootDir: "",
  });

  it("keeps the catalog out of the manifest, leaving only a pointer to it", () => {
    const manifest = JSON.parse(generateManifest(withAssets()));
    assert.equal(manifest.assets, ASSETS_FILE);
    assert.equal(manifest.layouts.length, 1);
  });

  it("writes every category and entry to the catalog, unabridged", () => {
    const catalog = JSON.parse(generateAssetCatalog(withAssets()));
    assert.deepEqual(Object.keys(catalog).sort(), ["icons", "logos"]);
    assert.deepEqual(catalog.icons.check, {
      path: "assets/icons/check.png",
      type: "icon",
      description: "Check",
    });
  });

  it("does not grow the manifest as the catalog grows", () => {
    const many = withAssets();
    for (let i = 0; i < 500; i++) {
      many.assets.icons[`icon_${i}`] = { path: `assets/icons/${i}.png`, type: "icon", description: `Icon ${i}` };
    }
    assert.equal(generateManifest(many).length, generateManifest(withAssets()).length);
  });

  it("writes an empty catalog rather than nothing when a theme declares no assets", () => {
    assert.deepEqual(JSON.parse(generateAssetCatalog(config([]))), {});
  });
});

describe("generateManifest slot accepts advertising", () => {
  it("advertises a single-type slot's accepted engine type", () => {
    const slots = manifestSlots([
      { key: "body", accepts: [{ type: SlotType.Text, sourceSlide: 1, shapeName: "s" }] },
    ]);
    assert.deepEqual(slots, [{ key: "body", accepts: ["text"] }]);
  });

  it("advertises every accepted type of a multi-block (transplant) slot in order", () => {
    const slots = manifestSlots([
      {
        key: "body",
        frame: { x: 1, y: 2, cx: 3, cy: 4 },
        accepts: [
          { type: SlotType.Text, sourceSlide: 1, shapeName: "s0" },
          { type: SlotType.Table, sourceSlide: 5, shapeName: "s1", bodyRows: [1, 1] },
          { type: SlotType.Image, sourceSlide: 6, shapeName: "s2" },
        ],
      },
    ]);
    assert.deepEqual(slots, [{ key: "body", accepts: ["text", "table", "image"] }]);
  });

  it("marks a required slot, dropping shape/frame internals", () => {
    const slots = manifestSlots([
      {
        key: "table",
        required: true,
        accepts: [{ type: SlotType.Table, sourceSlide: 1, shapeName: "s", bodyRows: [1, 1] }],
      },
    ]);
    assert.deepEqual(slots, [{ key: "table", accepts: ["table"], required: true }]);
  });

  it("omits optional layout prose (description) when not declared", () => {
    const manifest = JSON.parse(generateManifest(config([slotLayout("L", [])])));
    const l = manifest.layouts[0];
    assert.equal("description" in l, false);
  });
});
