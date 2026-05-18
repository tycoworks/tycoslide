import * as assert from "node:assert";
import { describe, it } from "node:test";
import { z } from "zod";
import { compilePlugin, PLUGIN_PATHS, stripScope } from "../src/plugin/compiler.js";
import type { ThemeDefinition } from "../src/theme/index.js";
import { defineTemplate } from "../src/theme/template.js";

// ── Test theme fixture ──────────────────────────────────────────────────────

const mockFont = { name: "Inter", regular: { path: "inter.woff2", weight: 400 } };

const stubRender = () => ({ type: "component", componentName: "column", params: {}, content: undefined }) as any;

const bodyTemplate = defineTemplate({
  name: "body",
  documentation: {
    description: "Markdown body with optional title.",
    whenToUse: "General content that does not fit other templates.",
    whenNotToUse: "Single stat or hero statement.",
    limits: ["5-8 bullets max"],
    gotchas: ["Long titles wrap awkwardly."],
  },
  layout: {
    params: { title: z.string().optional(), eyebrow: z.string().optional() },
    slots: ["body"] as const,
    render: stubRender,
  },
  background: { color: "#FFFFFF" },
  tokens: {},
});

const statTemplate = defineTemplate({
  name: "stat",
  documentation: { description: "Single impressive number with label." },
  layout: {
    params: { value: z.string(), label: z.string().optional() },
    render: stubRender,
  },
  background: { color: "#FFFFFF" },
  tokens: {},
});

const cardsTemplate = defineTemplate({
  name: "cards",
  documentation: { description: "Card grid with intro text." },
  layout: {
    params: {
      title: z.string(),
      cards: z.array(z.object({ heading: z.string(), body: z.string().optional() })),
      align: z.enum(["left", "center", "right"]).optional(),
    },
    render: stubRender,
  },
  background: { color: "#FFFFFF" },
  tokens: {},
});

const testTheme: ThemeDefinition = {
  fonts: [mockFont],
  formats: {
    presentation: {
      slide: { width: 960, height: 540 },
      textStyles: {},
      templates: [bodyTemplate, statTemplate, cardsTemplate],
    },
  },
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe("compilePlugin()", () => {
  const result = compilePlugin(testTheme, {
    name: "@tycoslide/theme-default",
    description: "Default theme with Inter font.",
    version: "1.0.0",
  });

  it("returns all plugin files at correct paths", () => {
    assert.ok(result.files[PLUGIN_PATHS.MANIFEST_JSON]);
    assert.ok(result.files[PLUGIN_PATHS.PLUGIN_JSON]);
    assert.ok(result.files[PLUGIN_PATHS.HOOKS_JSON]);
    assert.ok(result.files[PLUGIN_PATHS.BIN_TYCOSLIDE]);
    assert.ok(result.files[PLUGIN_PATHS.RUNTIME_PACKAGE_JSON]);
    assert.strictEqual(Object.keys(result.files).length, 5);
  });

  it("result.plugin has correct metadata", () => {
    assert.strictEqual(result.plugin.name, "tycoslide-theme-default");
    assert.strictEqual(result.plugin.description, "Default theme with Inter font.");
    assert.strictEqual(result.plugin.version, "1.0.0");
  });
});

// ── Manifest tests ──────────────────────────────────────────────────────────

describe("compilePlugin() manifest.json", () => {
  const result = compilePlugin(testTheme, {
    name: "@tycoslide/theme-default",
    description: "Default theme with Inter font.",
    version: "1.0.0",
  });

  const manifest = JSON.parse(result.files[PLUGIN_PATHS.MANIFEST_JSON]);

  it("manifest.json is in result.files at the correct path", () => {
    assert.ok(result.files[PLUGIN_PATHS.MANIFEST_JSON]);
    assert.strictEqual(PLUGIN_PATHS.MANIFEST_JSON, "skills/build/manifest.json");
  });

  it("manifest contains theme metadata (name, description, version)", () => {
    assert.strictEqual(manifest.theme.name, "@tycoslide/theme-default");
    assert.strictEqual(manifest.theme.description, "Default theme with Inter font.");
    assert.strictEqual(manifest.theme.version, "1.0.0");
  });

  it("manifest contains format sections with templates", () => {
    assert.ok(manifest.formats.presentation);
    assert.ok(Array.isArray(manifest.formats.presentation.templates));
    assert.strictEqual(manifest.formats.presentation.templates.length, 3);
  });

  it("format sections have slide dimensions", () => {
    assert.deepStrictEqual(manifest.formats.presentation.slide, { width: 960, height: 540 });
  });

  it("template entries have correct params from introspection", () => {
    const bodyEntry = manifest.formats.presentation.templates.find((t: { name: string }) => t.name === "body");
    assert.ok(bodyEntry);
    const titleParam = bodyEntry.params.find((p: { name: string }) => p.name === "title");
    assert.ok(titleParam);
    assert.strictEqual(titleParam.type, "string");
    assert.strictEqual(titleParam.required, false);
  });

  it("required params are marked required", () => {
    const statEntry = manifest.formats.presentation.templates.find((t: { name: string }) => t.name === "stat");
    assert.ok(statEntry);
    const valueParam = statEntry.params.find((p: { name: string }) => p.name === "value");
    assert.ok(valueParam);
    assert.strictEqual(valueParam.required, true);
  });

  it("template entries have documentation fields", () => {
    const bodyEntry = manifest.formats.presentation.templates.find((t: { name: string }) => t.name === "body");
    assert.ok(bodyEntry);
    assert.strictEqual(bodyEntry.description, "Markdown body with optional title.");
    assert.strictEqual(bodyEntry.whenToUse, "General content that does not fit other templates.");
    assert.strictEqual(bodyEntry.whenNotToUse, "Single stat or hero statement.");
    assert.deepStrictEqual(bodyEntry.limits, ["5-8 bullets max"]);
    assert.deepStrictEqual(bodyEntry.gotchas, ["Long titles wrap awkwardly."]);
  });

  it("template entries without optional doc fields omit those keys", () => {
    const statEntry = manifest.formats.presentation.templates.find((t: { name: string }) => t.name === "stat");
    assert.ok(statEntry);
    assert.strictEqual(statEntry.whenToUse, undefined);
    assert.strictEqual(statEntry.whenNotToUse, undefined);
    assert.strictEqual(statEntry.limits, undefined);
    assert.strictEqual(statEntry.gotchas, undefined);
  });

  it("template entries have slots", () => {
    const bodyEntry = manifest.formats.presentation.templates.find((t: { name: string }) => t.name === "body");
    assert.ok(bodyEntry);
    assert.deepStrictEqual(bodyEntry.slots, ["body"]);
  });

  it("templates without slots have empty slots array", () => {
    const statEntry = manifest.formats.presentation.templates.find((t: { name: string }) => t.name === "stat");
    assert.ok(statEntry);
    assert.deepStrictEqual(statEntry.slots, []);
  });

  it("array-of-object params have itemType and objectShape", () => {
    const cardsEntry = manifest.formats.presentation.templates.find((t: { name: string }) => t.name === "cards");
    assert.ok(cardsEntry);
    const cardsParam = cardsEntry.params.find((p: { name: string }) => p.name === "cards");
    assert.ok(cardsParam);
    assert.strictEqual(cardsParam.type, "array");
    assert.strictEqual(cardsParam.itemType, "object");
  });

  it("enum params have enumValues", () => {
    const cardsEntry = manifest.formats.presentation.templates.find((t: { name: string }) => t.name === "cards");
    assert.ok(cardsEntry);
    const alignParam = cardsEntry.params.find((p: { name: string }) => p.name === "align");
    assert.ok(alignParam);
    assert.strictEqual(alignParam.type, "enum");
    assert.deepStrictEqual(alignParam.enumValues, ["left", "center", "right"]);
    assert.strictEqual(alignParam.required, false);
  });

  it("assets object is present and empty when theme has no assets", () => {
    assert.deepStrictEqual(manifest.assets, {});
  });

  it("assets from theme definition appear in manifest with $ref syntax", () => {
    const themeWithAssets: ThemeDefinition = {
      fonts: [mockFont],
      formats: {
        presentation: {
          slide: { width: 960, height: 540 },
          textStyles: {},
          templates: [bodyTemplate],
        },
      },
      assets: {
        icons: {
          star: { path: "/path/to/star.png", documentation: { description: "Star icon" } },
          heart: {
            path: "/path/to/heart.png",
            documentation: { description: "Heart icon", whenToUse: "Favorites" },
          },
        },
        logos: {
          brand: { path: "/path/to/brand.png", documentation: { description: "Brand logo" } },
        },
      },
    };
    const assetResult = compilePlugin(themeWithAssets, {
      name: "asset-theme",
      description: "Theme with assets.",
      version: "1.0.0",
    });
    const assetManifest = JSON.parse(assetResult.files[PLUGIN_PATHS.MANIFEST_JSON]);

    assert.strictEqual(assetManifest.assets.icons.length, 2);
    assert.deepStrictEqual(assetManifest.assets.icons[0], {
      name: "star",
      ref: "$icons.star",
      description: "Star icon",
    });
    assert.deepStrictEqual(assetManifest.assets.icons[1], {
      name: "heart",
      ref: "$icons.heart",
      description: "Heart icon",
      whenToUse: "Favorites",
    });
    assert.strictEqual(assetManifest.assets.logos.length, 1);
    assert.strictEqual(assetManifest.assets.logos[0].ref, "$logos.brand");
  });
});

describe("compilePlugin() manifest.json multi-format", () => {
  const multiFormatTheme: ThemeDefinition = {
    fonts: [mockFont],
    formats: {
      presentation: {
        slide: { width: 960, height: 540 },
        textStyles: {},
        templates: [bodyTemplate],
      },
      factsheet: {
        slide: { width: 816, height: 1056 },
        textStyles: {},
        templates: [statTemplate],
      },
    },
  };

  const result = compilePlugin(multiFormatTheme, {
    name: "@company/theme-brand",
    description: "Brand theme.",
    version: "2.0.0",
  });

  const manifest = JSON.parse(result.files[PLUGIN_PATHS.MANIFEST_JSON]);

  it("multi-format theme produces multiple format sections", () => {
    assert.ok(manifest.formats.presentation);
    assert.ok(manifest.formats.factsheet);
  });

  it("each format section has its own slide dimensions", () => {
    assert.deepStrictEqual(manifest.formats.presentation.slide, { width: 960, height: 540 });
    assert.deepStrictEqual(manifest.formats.factsheet.slide, { width: 816, height: 1056 });
  });

  it("each format section has its own templates", () => {
    assert.strictEqual(manifest.formats.presentation.templates.length, 1);
    assert.strictEqual(manifest.formats.presentation.templates[0].name, "body");
    assert.strictEqual(manifest.formats.factsheet.templates.length, 1);
    assert.strictEqual(manifest.formats.factsheet.templates[0].name, "stat");
  });

  it("version is passed through from options", () => {
    assert.strictEqual(manifest.theme.version, "2.0.0");
  });
});

describe("compilePlugin() edge cases", () => {
  it("handles format with no templates", () => {
    const emptyFormatTheme: ThemeDefinition = {
      fonts: [mockFont],
      formats: {
        presentation: {
          slide: { width: 960, height: 540 },
          textStyles: {},
          templates: [],
        },
      },
    };
    const result = compilePlugin(emptyFormatTheme, {
      name: "empty-theme",
      description: "No templates.",
      version: "0.1.0",
    });
    assert.ok(result.files[PLUGIN_PATHS.MANIFEST_JSON]);
  });

  it("throws if ThemeDefinition has no formats", () => {
    const noFormats = { fonts: [mockFont], formats: {} } as ThemeDefinition;
    assert.throws(
      () => compilePlugin(noFormats, { name: "test", description: "test", version: "1.0.0" }),
      /at least one format/,
    );
  });

  it("throws if options.name is empty", () => {
    assert.throws(
      () => compilePlugin(testTheme, { name: "", description: "test", version: "1.0.0" }),
      /options\.name is required/,
    );
  });

  it("throws if options.version is empty", () => {
    assert.throws(
      () => compilePlugin(testTheme, { name: "test", description: "test", version: "" }),
      /options\.version is required/,
    );
  });

  it("handles params with defaults (reflected in manifest)", () => {
    const defaultTemplate = defineTemplate({
      name: "hero",
      documentation: { description: "Hero slide." },
      layout: {
        params: { size: z.enum(["small", "large"]).default("large") },
        render: stubRender,
      },
      background: { color: "#000" },
      tokens: {},
    });
    const theme: ThemeDefinition = {
      fonts: [mockFont],
      formats: {
        presentation: { slide: { width: 960, height: 540 }, textStyles: {}, templates: [defaultTemplate] },
      },
    };
    const result = compilePlugin(theme, { name: "test", description: "test", version: "1.0.0" });
    const manifest = JSON.parse(result.files[PLUGIN_PATHS.MANIFEST_JSON]);
    const heroEntry = manifest.formats.presentation.templates.find((t: { name: string }) => t.name === "hero");
    assert.ok(heroEntry);
    const sizeParam = heroEntry.params.find((p: { name: string }) => p.name === "size");
    assert.ok(sizeParam);
    assert.strictEqual(sizeParam.required, false);
    assert.deepStrictEqual(sizeParam.enumValues, ["small", "large"]);
  });
});

// ── Content tests ────────────────────────────────────────────────────────────

describe("compilePlugin() hooks.json content", () => {
  const result = compilePlugin(testTheme, {
    name: "@tycoslide/theme-default",
    description: "Default theme with Inter font.",
    version: "1.0.0",
  });

  const hooks = JSON.parse(result.files[PLUGIN_PATHS.HOOKS_JSON]);

  it("hooks.json has SessionStart array", () => {
    assert.ok(hooks.hooks);
    assert.ok(Array.isArray(hooks.hooks.SessionStart));
    assert.ok(hooks.hooks.SessionStart.length > 0);
  });

  it("hooks.json SessionStart command includes npm-error.log redirection", () => {
    const command: string = hooks.hooks.SessionStart[0].hooks[0].command;
    assert.ok(command.includes("npm-error.log"), `Expected npm-error.log in command, got: ${command}`);
  });

  it("hooks.json SessionStart command includes exit 1 on failure", () => {
    const command: string = hooks.hooks.SessionStart[0].hooks[0].command;
    assert.ok(command.includes("exit 1"), `Expected 'exit 1' in command, got: ${command}`);
  });
});

describe("compilePlugin() bin/tycoslide content", () => {
  const result = compilePlugin(testTheme, {
    name: "@tycoslide/theme-default",
    description: "Default theme with Inter font.",
    version: "1.0.0",
  });

  const binContent: string = result.files[PLUGIN_PATHS.BIN_TYCOSLIDE];

  it("bin/tycoslide has shebang line", () => {
    assert.ok(binContent.startsWith("#!/usr/bin/env bash"), `Expected shebang, got: ${binContent.slice(0, 30)}`);
  });

  it("bin/tycoslide references PLUGIN_PATHS.CLI_ENTRY", () => {
    assert.ok(
      binContent.includes(PLUGIN_PATHS.CLI_ENTRY),
      `Expected CLI_ENTRY path "${PLUGIN_PATHS.CLI_ENTRY}" in bin, got: ${binContent}`,
    );
  });

  it("bin/tycoslide exports NODE_PATH", () => {
    assert.ok(binContent.includes("NODE_PATH"), `Expected NODE_PATH export in bin, got: ${binContent}`);
  });
});

describe("compilePlugin() runtime-package.json content", () => {
  it("runtime-package.json has dependencies with @tycoslide/cli", () => {
    const result = compilePlugin(testTheme, {
      name: "@tycoslide/theme-default",
      description: "Default theme with Inter font.",
      version: "1.0.0",
    });
    const runtimePkg = JSON.parse(result.files[PLUGIN_PATHS.RUNTIME_PACKAGE_JSON]);
    assert.ok(runtimePkg.dependencies, "Expected dependencies field");
    assert.ok(runtimePkg.dependencies["@tycoslide/cli"], "Expected @tycoslide/cli in dependencies");
  });

  it("runtime-package.json carries through theme dependencies", () => {
    const result = compilePlugin(testTheme, {
      name: "@tycoslide/theme-default",
      description: "Default theme with Inter font.",
      version: "1.0.0",
      dependencies: {
        "@tycoslide/sdk": "^1.0.0",
        "some-other-dep": "^2.0.0",
      },
    });
    const runtimePkg = JSON.parse(result.files[PLUGIN_PATHS.RUNTIME_PACKAGE_JSON]);
    assert.ok(runtimePkg.dependencies["@tycoslide/sdk"], "Expected @tycoslide/sdk carried through");
    assert.strictEqual(
      runtimePkg.dependencies["some-other-dep"],
      undefined,
      "Non-tycoslide deps should not be carried through",
    );
  });
});

describe("stripScope() utility", () => {
  it("strips npm scope from scoped package name", () => {
    assert.strictEqual(stripScope("@tycoslide/theme-default"), "tycoslide-theme-default");
  });

  it("leaves plain name unchanged", () => {
    assert.strictEqual(stripScope("plain-name"), "plain-name");
  });

  it("converts @scope/name to scope-name", () => {
    assert.strictEqual(stripScope("@scope/name"), "scope-name");
  });
});
