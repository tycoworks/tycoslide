import * as assert from "node:assert";
import { describe, it } from "node:test";
import { z } from "zod";
import { compileSkill, SKILL_PATHS } from "../src/skill/compiler.js";
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

describe("compileSkill()", () => {
  const result = compileSkill(testTheme, {
    name: "@tycoslide/theme-default",
    description: "Default theme with Inter font.",
    version: "1.0.0",
  });

  const skill = result.files[SKILL_PATHS.SKILL_MD];
  const plugin = JSON.parse(result.files[SKILL_PATHS.PLUGIN_JSON]);

  it("returns SKILL.md and plugin.json at correct paths", () => {
    assert.ok(result.files[SKILL_PATHS.SKILL_MD]);
    assert.ok(result.files[SKILL_PATHS.PLUGIN_JSON]);
  });

  it("SKILL.md contains theme name", () => {
    assert.ok(skill.includes("@tycoslide/theme-default"));
  });

  it("SKILL.md contains template table with all templates", () => {
    assert.ok(skill.includes("| `body` |"));
    assert.ok(skill.includes("| `stat` |"));
    assert.ok(skill.includes("| `cards` |"));
  });

  it("SKILL.md shows optional params with ? suffix", () => {
    assert.ok(skill.includes("`label?`: string"));
    assert.ok(skill.includes("`title?`: string"));
  });

  it("SKILL.md shows required params without ? suffix", () => {
    assert.ok(skill.includes("`value`: string"));
  });

  it("SKILL.md renders enum params as union", () => {
    assert.ok(skill.includes('"left" | "center" | "right"'));
  });

  it("SKILL.md renders array params with [] suffix", () => {
    assert.ok(skill.includes("object[]"));
  });

  it("SKILL.md renders slots for templates that have them", () => {
    assert.ok(skill.includes("| `body` | Markdown body with optional title."));
    // body template has slots: ["body"]
    assert.match(skill, /\| `body` \|[^|]+\|[^|]+\| body \|/);
  });

  it("SKILL.md contains template guidance from documentation", () => {
    assert.ok(skill.includes("Use when: General content"));
    assert.ok(skill.includes("Limit: 5-8 bullets max"));
  });

  it("SKILL.md contains whenNotToUse guidance", () => {
    assert.ok(skill.includes("Do not use when: Single stat or hero statement."));
  });

  it("SKILL.md contains gotchas", () => {
    assert.ok(skill.includes("Gotcha: Long titles wrap awkwardly."));
  });

  it("SKILL.md contains format name as section header", () => {
    assert.ok(skill.includes("### presentation"));
  });

  it("syntax example uses first template name (not hardcoded 'body')", () => {
    // First template is "body" here, but the point is it reads from the theme
    assert.ok(skill.includes("template: body"));
  });

  it("SKILL.md references doc-sourced reference files", () => {
    assert.ok(skill.includes("references/markdown-syntax.md"));
    assert.ok(skill.includes("references/troubleshooting.md"));
    assert.ok(skill.includes("references/cli.md"));
  });

  it("plugin.json contains correct metadata", () => {
    assert.strictEqual(plugin.name, "@tycoslide/theme-default");
    assert.strictEqual(plugin.version, "1.0.0");
  });

  it("result.plugin has correct metadata", () => {
    assert.strictEqual(result.plugin.name, "@tycoslide/theme-default");
    assert.strictEqual(result.plugin.description, "Default theme with Inter font.");
    assert.strictEqual(result.plugin.version, "1.0.0");
  });
});

describe("compileSkill() multi-format theme", () => {
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

  const result = compileSkill(multiFormatTheme, {
    name: "@company/theme-brand",
    description: "Brand theme.",
  });

  const skill = result.files[SKILL_PATHS.SKILL_MD];

  it("includes section headers for each format", () => {
    assert.ok(skill.includes("### presentation"));
    assert.ok(skill.includes("### factsheet"));
  });

  it("each format shows its own templates", () => {
    // presentation has body, factsheet has stat
    assert.ok(skill.includes("| `body` |"));
    assert.ok(skill.includes("| `stat` |"));
  });

  it("defaults version to 0.0.0 when omitted", () => {
    const plugin = JSON.parse(result.files[SKILL_PATHS.PLUGIN_JSON]);
    assert.strictEqual(plugin.version, "0.0.0");
  });

  it("syntax example uses first format name", () => {
    assert.ok(skill.includes("format: presentation"));
  });
});

describe("compileSkill() edge cases", () => {
  it("handles format with no templates (skips that format section)", () => {
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
    const result = compileSkill(emptyFormatTheme, {
      name: "empty-theme",
      description: "No templates.",
    });
    // Should not crash, just produce no template table for that format
    assert.ok(result.files[SKILL_PATHS.SKILL_MD]);
    assert.ok(!result.files[SKILL_PATHS.SKILL_MD].includes("### presentation"));
  });

  it("throws if ThemeDefinition has no formats", () => {
    const noFormats = { fonts: [mockFont], formats: {} } as ThemeDefinition;
    assert.throws(() => compileSkill(noFormats, { name: "test", description: "test" }), /at least one format/);
  });

  it("throws if options.name is empty", () => {
    assert.throws(() => compileSkill(testTheme, { name: "", description: "test" }), /options\.name is required/);
  });

  it("handles params with defaults", () => {
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
    const result = compileSkill(theme, { name: "test", description: "test" });
    const skill = result.files[SKILL_PATHS.SKILL_MD];
    // Default params should be marked optional and show enum values
    assert.ok(skill.includes("`size?`:"));
    assert.ok(skill.includes('"small" | "large"'));
  });
});
