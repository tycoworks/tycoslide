import * as assert from "node:assert";
import { describe, it } from "node:test";
import { z } from "zod";
import { compileSkill } from "../src/skill/compiler.js";
import type { ThemeDefinition } from "../src/theme/index.js";
import { defineTemplate } from "../src/theme/template.js";

// ── Test theme fixture ──────────────────────────────────────────────────────

const mockFont = { name: "Inter", regular: { path: "inter.woff2", weight: 400 } };

const bodyTemplate = defineTemplate({
  name: "body",
  documentation: {
    description: "Markdown body with optional title.",
    whenToUse: "General content that does not fit other templates.",
    limits: ["5-8 bullets max"],
  },
  layout: {
    params: { title: z.string().optional(), eyebrow: z.string().optional() },
    render: () => ({ type: "component", componentName: "column", params: {}, content: undefined }) as any,
  },
  background: { color: "#FFFFFF" },
  tokens: {},
});

const statTemplate = defineTemplate({
  name: "stat",
  documentation: { description: "Single impressive number with label." },
  layout: {
    params: { value: z.string(), label: z.string().optional() },
    render: () => ({ type: "component", componentName: "column", params: {}, content: undefined }) as any,
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
      templates: [bodyTemplate, statTemplate],
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

  it("returns SKILL.md and plugin.json", () => {
    assert.ok(result.files["skills/tycoslide/SKILL.md"]);
    assert.ok(result.files[".claude-plugin/plugin.json"]);
  });

  it("SKILL.md contains theme name", () => {
    const skill = result.files["skills/tycoslide/SKILL.md"];
    assert.ok(skill.includes("@tycoslide/theme-default"));
  });

  it("SKILL.md contains template table with both templates", () => {
    const skill = result.files["skills/tycoslide/SKILL.md"];
    assert.ok(skill.includes("| `body` |"));
    assert.ok(skill.includes("| `stat` |"));
  });

  it("SKILL.md contains param info for stat template", () => {
    const skill = result.files["skills/tycoslide/SKILL.md"];
    assert.ok(skill.includes("`value`: string"));
    assert.ok(skill.includes("`label?`: string"));
  });

  it("SKILL.md contains template guidance from documentation", () => {
    const skill = result.files["skills/tycoslide/SKILL.md"];
    assert.ok(skill.includes("Use when: General content"));
    assert.ok(skill.includes("Limit: 5-8 bullets max"));
  });

  it("SKILL.md contains format name as section header", () => {
    const skill = result.files["skills/tycoslide/SKILL.md"];
    assert.ok(skill.includes("### presentation"));
  });

  it("SKILL.md uses first format name in syntax example", () => {
    const skill = result.files["skills/tycoslide/SKILL.md"];
    assert.ok(skill.includes("format: presentation"));
  });

  it("SKILL.md references doc-sourced reference files", () => {
    const skill = result.files["skills/tycoslide/SKILL.md"];
    assert.ok(skill.includes("references/markdown-syntax.md"));
    assert.ok(skill.includes("references/troubleshooting.md"));
    assert.ok(skill.includes("references/cli.md"));
  });

  it("plugin.json contains correct metadata", () => {
    const plugin = JSON.parse(result.files[".claude-plugin/plugin.json"]);
    assert.strictEqual(plugin.name, "@tycoslide/theme-default");
    assert.strictEqual(plugin.version, "1.0.0");
  });

  it("result.plugin has correct metadata", () => {
    assert.strictEqual(result.plugin.name, "@tycoslide/theme-default");
    assert.strictEqual(result.plugin.description, "Default theme with Inter font.");
    assert.strictEqual(result.plugin.version, "1.0.0");
  });
});
