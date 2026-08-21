import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateManifest } from "../dist/manifest.js";
import { SlotType } from "../dist/engine/types.js";
import type { CompilerConfig, CompilerLayout, CompilerSlot } from "../dist/markdown/types.js";
import { ParameterType } from "../dist/markdown/types.js";

function config(layouts: CompilerLayout[]): CompilerConfig {
  return { layouts, assets: {}, template: "t.pptx", rootDir: "" };
}

const OPTIONS = { build: { command: "npx tycoslide build deck.md" } };

/** Parse the manifest JSON and return the sole layout's parameter list. */
function manifestParams(layouts: CompilerLayout[]) {
  const manifest = JSON.parse(generateManifest(config(layouts), OPTIONS));
  return manifest.layouts[0].parameters;
}

function layout(name: string, parameters: CompilerLayout["parameters"]): CompilerLayout {
  return { name, slideNumber: 1, description: "", parameters, slots: [] };
}

describe("generateManifest parameter flattening", () => {
  it("flattens a text parameter's template keys into one entry per key", () => {
    const params = manifestParams([
      layout("welcome", [{ shapeName: "welcomeBar", template: "{lastname}, {firstname}", type: ParameterType.Template }]),
    ]);
    assert.deepEqual(params, [
      { key: "lastname", type: ParameterType.Template },
      { key: "firstname", type: ParameterType.Template },
    ]);
  });

  it("de-dupes a repeated template key to a single entry", () => {
    const params = manifestParams([
      layout("dup", [{ shapeName: "s", template: "{name}\n— {name}", type: ParameterType.Template }]),
    ]);
    assert.deepEqual(params, [{ key: "name", type: ParameterType.Template }]);
  });

  it("marks every flattened key required when the parameter is required", () => {
    const params = manifestParams([
      layout("req", [{ shapeName: "s", template: "{a}{b}", type: ParameterType.Template, required: true }]),
    ]);
    assert.deepEqual(params, [
      { key: "a", type: ParameterType.Template, required: true },
      { key: "b", type: ParameterType.Template, required: true },
    ]);
  });

  it("does NOT surface a text parameter's limit per key (parameter-level, deferred to Phase 2)", () => {
    const params = manifestParams([
      layout("lim", [{ shapeName: "s", template: "{a}", type: ParameterType.Template, limit: { maxChars: 40 } }]),
    ]);
    assert.deepEqual(params, [{ key: "a", type: ParameterType.Template }]);
  });

  it("keeps an image parameter as a single keyed entry", () => {
    const params = manifestParams([
      layout("img", [{ key: "logo", shapeName: "logoPic", type: ParameterType.Image }]),
    ]);
    assert.deepEqual(params, [{ key: "logo", type: ParameterType.Image }]);
  });
});

// A layout with the given slots (no parameters). description is omitted to
// exercise its optionality.
function slotLayout(name: string, slots: CompilerSlot[]): CompilerLayout {
  return { name, slideNumber: 1, parameters: [], slots };
}

function manifestSlots(slots: CompilerSlot[]) {
  const manifest = JSON.parse(generateManifest(config([slotLayout("L", slots)]), OPTIONS));
  return manifest.layouts[0].slots;
}

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
          { type: SlotType.Table, sourceSlide: 5, shapeName: "s1" },
          { type: SlotType.Image, sourceSlide: 6, shapeName: "s2" },
        ],
      },
    ]);
    assert.deepEqual(slots, [{ key: "body", accepts: ["text", "table", "image"] }]);
  });

  it("marks a required slot and carries its limit, dropping shape/frame internals", () => {
    const slots = manifestSlots([
      {
        key: "table",
        required: true,
        limit: { maxItems: 5 },
        accepts: [{ type: SlotType.Table, sourceSlide: 1, shapeName: "s" }],
      },
    ]);
    assert.deepEqual(slots, [{ key: "table", accepts: ["table"], required: true, limit: { maxItems: 5 } }]);
  });

  it("omits optional layout prose (description) when not declared", () => {
    const manifest = JSON.parse(generateManifest(config([slotLayout("L", [])]), OPTIONS));
    const l = manifest.layouts[0];
    assert.equal("description" in l, false);
  });
});
