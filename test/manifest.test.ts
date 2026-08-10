import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateManifest } from "../dist/manifest.js";
import { FitMode } from "../dist/engine/types.js";
import type { CompilerConfig, CompilerLayout } from "../dist/markdown/types.js";
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
  return { name, slideNumber: 1, description: "", whenToUse: "", whenNotToUse: "", parameters, slots: [] };
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

  it("keeps an image parameter as a single keyed entry with its fit", () => {
    const params = manifestParams([
      layout("img", [{ key: "logo", shapeName: "logoPic", type: ParameterType.Image, fit: FitMode.Contain }]),
    ]);
    assert.deepEqual(params, [{ key: "logo", type: ParameterType.Image, fit: FitMode.Contain }]);
  });
});
