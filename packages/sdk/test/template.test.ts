import * as assert from "node:assert";
import { describe, it } from "node:test";
import { component, layoutRegistry } from "@tycoslide/core";
import { defineTemplate } from "../src/template.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal ComponentNode for use in master content */
function makeComponent(name: string) {
  return component(name, {}, undefined);
}

/** Minimal master render — returns MasterLayer shape */
function minimalMasterRender(_tokens: Record<string, unknown>, _slideSize: { width: number; height: number }) {
  return {
    content: makeComponent("column"),
    background: { color: "#FFFFFF" },
  };
}

/** A plain master object (no defineMaster registration) for use with defineTemplate */
const plainMaster = { name: "plain-master", render: minimalMasterRender };

// ── defineTemplate() ─────────────────────────────────────────────────────────

describe("defineTemplate()", () => {
  it("returns a Template with layout, master, masterTokens, and layoutTokens", () => {
    const masterName = "test-tmpl-master-1";
    const templateName = "test-tmpl-layout-1";

    const master = { name: masterName, render: minimalMasterRender };
    const template = defineTemplate({
      name: templateName,
      description: "Test template",
      layout: { params: {}, render: (_params: any, _slots: any, _tokens: any) => makeComponent("column") },
      master,
      masterTokens: { bg: "red" },
      layoutTokens: { title: "hello" },
    });

    assert.ok(template.layout, "template should have a layout");
    assert.strictEqual(template.layout.name, templateName);
    assert.strictEqual(template.master, master);
    assert.deepStrictEqual(template.masterTokens, { bg: "red" });
    assert.deepStrictEqual(template.layoutTokens, { title: "hello" });

    // Register manually for subsequent tests
    layoutRegistry.register([template.layout]);
    assert.ok(layoutRegistry.has(templateName), `layoutRegistry should have '${templateName}'`);
  });

  it("render extracts master tokens from the flat token bag", () => {
    const masterName = "test-tmpl-master-2";
    const templateName = "test-tmpl-layout-2";

    const template = defineTemplate({
      name: templateName,
      description: "Token split test",
      layout: { params: {}, render: (_params: any, _slots: any, _tokens: any) => makeComponent("column") },
      master: { name: masterName, render: minimalMasterRender },
      masterTokens: { bg: "red" },
      layoutTokens: {},
    });

    layoutRegistry.register([template.layout]);
    const layout = layoutRegistry.get(templateName);
    assert.ok(layout, "layout should be registered");

    // Core passes a flat token bag to the layout render at runtime
    const tokens = { master: { masterName: masterName, tokens: { bg: "red" } }, title: "hello" };
    const slide = layout!.render({}, {}, tokens);

    assert.strictEqual(slide.masterName, masterName);
    assert.deepStrictEqual(slide.masterTokens, { bg: "red" });
  });

  it("render passes content tokens (without master key) to render function", () => {
    const masterName = "test-tmpl-master-3";
    const templateName = "test-tmpl-layout-3";

    let capturedTokens: Record<string, unknown> = {};

    const template = defineTemplate({
      name: templateName,
      description: "Content token passthrough test",
      layout: {
        params: {},
        render: (_params: any, _slots: any, tokens: any) => {
          capturedTokens = tokens as Record<string, unknown>;
          return makeComponent("column");
        },
      },
      master: { name: masterName, render: minimalMasterRender },
      masterTokens: {},
      layoutTokens: { title: "hello", color: "#333" },
    });

    layoutRegistry.register([template.layout]);
    const layout = layoutRegistry.get(templateName);
    assert.ok(layout);

    // Core passes flat bag at runtime (assembled by templatesToLayouts)
    const tokens = { master: { masterName: masterName, tokens: {} }, title: "hello", color: "#333" };
    layout!.render({}, {}, tokens);

    // The `master` key should NOT be in the content tokens
    assert.ok(!("master" in capturedTokens), "master key should be stripped from content tokens");
    assert.strictEqual(capturedTokens.title, "hello");
    assert.strictEqual(capturedTokens.color, "#333");
  });

  it("returned Slide has content wrapped in a column with SIZE.FILL height", () => {
    const _masterName = "test-tmpl-master-4";
    const templateName = "test-tmpl-layout-4";

    const template = defineTemplate({
      name: templateName,
      description: "Content wrapping test",
      layout: { params: {}, render: (_params: any, _slots: any, _tokens: any) => makeComponent("column") },
      master: plainMaster,
      masterTokens: {},
      layoutTokens: {},
    });

    layoutRegistry.register([template.layout]);
    const layout = layoutRegistry.get(templateName);
    assert.ok(layout);

    const slide = layout!.render({}, {}, {});

    // content should be a ComponentNode (column wrapper)
    assert.ok(slide.content, "slide should have content");
    assert.strictEqual(slide.content.componentName, "column");
  });

  it("masterTokens defaults to empty object when master key is absent in flat bag", () => {
    const _masterName = "test-tmpl-master-5";
    const templateName = "test-tmpl-layout-5";

    const template = defineTemplate({
      name: templateName,
      description: "Missing master token fallback",
      layout: { params: {}, render: (_params: any, _slots: any, _tokens: any) => makeComponent("column") },
      master: plainMaster,
      masterTokens: {},
      layoutTokens: { title: "hello" },
    });

    layoutRegistry.register([template.layout]);
    const layout = layoutRegistry.get(templateName);
    assert.ok(layout);

    // No `master` key in the flat bag at runtime
    const slide = layout!.render({}, {}, { title: "hello" });

    assert.strictEqual(slide.masterName, "");
    assert.deepStrictEqual(slide.masterTokens, {});
  });

  it("master and tokens are preserved on the returned Template object", () => {
    const templateName = "test-tmpl-tokens-preserved";
    const master = { name: "m", render: minimalMasterRender };
    const masterTokens = { bg: "blue" };
    const layoutTokens = { color: "blue", size: 42 };

    const template = defineTemplate({
      name: templateName,
      description: "Token preservation test",
      layout: { params: {}, render: (_params: any, _slots: any, _tokens: any) => makeComponent("column") },
      master,
      masterTokens,
      layoutTokens,
    });

    assert.strictEqual(template.master, master);
    assert.deepStrictEqual(template.masterTokens, masterTokens);
    assert.deepStrictEqual(template.layoutTokens, layoutTokens);
  });
});
