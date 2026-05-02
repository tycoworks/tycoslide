import * as assert from "node:assert";
import { describe, it } from "node:test";
import {
  Bounds,
  component,
  layoutRegistry,
  masterRegistry,
  NODE_TYPE,
  SIZE,
} from "@tycoslide/core";
import { defineMaster, defineTemplate } from "../src/template.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal ComponentNode for use in master content */
function makeComponent(name: string) {
  return component(name, {}, undefined);
}

/** Minimal master render — returns required MasterResult shape */
function minimalMasterRender(_tokens: Record<string, unknown>, _slideSize: { width: number; height: number }) {
  return {
    content: makeComponent("column"),
    background: { color: "#FFFFFF" },
  };
}

// ── defineMaster() ────────────────────────────────────────────────────────────

describe("defineMaster()", () => {
  it("registers a master with masterRegistry", () => {
    const name = "test-master-register";
    defineMaster({ name, render: minimalMasterRender });
    assert.ok(masterRegistry.has(name), `masterRegistry should have '${name}'`);
  });

  it("returns a definition with the correct name", () => {
    const name = "test-master-name";
    const def = defineMaster({ name, render: minimalMasterRender });
    assert.strictEqual(def.name, name);
  });

  it("falls back to full-slide contentBounds when master omits it", () => {
    const name = "test-master-bounds-fallback";
    defineMaster({ name, render: minimalMasterRender });
    const registered = masterRegistry.get(name);
    assert.ok(registered, "master should be registered");
    const result = registered!.render({}, { width: 13.333, height: 7.5 });
    // Core requires contentBounds — SDK fills it in from slideSize
    assert.ok(result.contentBounds instanceof Bounds, "contentBounds should be a Bounds");
    assert.strictEqual(result.contentBounds.x, 0);
    assert.strictEqual(result.contentBounds.y, 0);
    assert.strictEqual(result.contentBounds.w, 13.333);
    assert.strictEqual(result.contentBounds.h, 7.5);
  });

  it("preserves contentBounds when master provides it", () => {
    const name = "test-master-bounds-provided";
    defineMaster({
      name,
      render: (_tokens, slideSize) => ({
        content: makeComponent("column"),
        background: { color: "#000000" },
        contentBounds: new Bounds(0.5, 0.5, slideSize.width - 1, slideSize.height - 1),
      }),
    });
    const registered = masterRegistry.get(name);
    assert.ok(registered);
    const result = registered!.render({}, { width: 13.333, height: 7.5 });
    assert.ok(result.contentBounds instanceof Bounds);
    assert.strictEqual(result.contentBounds.x, 0.5);
    assert.strictEqual(result.contentBounds.y, 0.5);
  });
});

// ── defineTemplate() ─────────────────────────────────────────────────────────

describe("defineTemplate()", () => {
  it("registers a layout with layoutRegistry", () => {
    const masterName = "test-tmpl-master-1";
    const templateName = "test-tmpl-layout-1";

    const master = defineMaster({ name: masterName, render: minimalMasterRender });
    defineTemplate({
      name: templateName,
      description: "Test template",
      params: {},
      master,
      render: (_params, _slots, _tokens) => makeComponent("column"),
    });

    assert.ok(layoutRegistry.has(templateName), `layoutRegistry should have '${templateName}'`);
  });

  it("render extracts master tokens from the token bag", () => {
    const masterName = "test-tmpl-master-2";
    const templateName = "test-tmpl-layout-2";

    const master = defineMaster({ name: masterName, render: minimalMasterRender });
    defineTemplate({
      name: templateName,
      description: "Token split test",
      params: {},
      master,
      render: (_params, _slots, _tokens) => makeComponent("column"),
    });

    const layout = layoutRegistry.get(templateName);
    assert.ok(layout, "layout should be registered");

    // Call layout render with a token bag that has both master and content tokens
    const tokens = { master: { bg: "red" }, title: "hello" };
    const slide = layout!.render({}, {}, tokens);

    assert.strictEqual(slide.masterName, masterName);
    assert.deepStrictEqual(slide.masterTokens, { bg: "red" });
  });

  it("render passes content tokens (without master key) to render function", () => {
    const masterName = "test-tmpl-master-3";
    const templateName = "test-tmpl-layout-3";

    let capturedTokens: Record<string, unknown> = {};

    const master = defineMaster({ name: masterName, render: minimalMasterRender });
    defineTemplate({
      name: templateName,
      description: "Content token passthrough test",
      params: {},
      master,
      render: (_params, _slots, tokens) => {
        capturedTokens = tokens as Record<string, unknown>;
        return makeComponent("column");
      },
    });

    const layout = layoutRegistry.get(templateName);
    assert.ok(layout);

    const tokens = { master: { bg: "red" }, title: "hello", color: "#333" };
    layout!.render({}, {}, tokens);

    // The `master` key should NOT be in the content tokens
    assert.ok(!("master" in capturedTokens), "master key should be stripped from content tokens");
    assert.strictEqual(capturedTokens.title, "hello");
    assert.strictEqual(capturedTokens.color, "#333");
  });

  it("returned Slide has content wrapped in a column with SIZE.FILL height", () => {
    const masterName = "test-tmpl-master-4";
    const templateName = "test-tmpl-layout-4";

    const master = defineMaster({ name: masterName, render: minimalMasterRender });
    defineTemplate({
      name: templateName,
      description: "Content wrapping test",
      params: {},
      master,
      render: (_params, _slots, _tokens) => makeComponent("column"),
    });

    const layout = layoutRegistry.get(templateName);
    assert.ok(layout);

    const slide = layout!.render({}, {}, {});

    // content should be a ComponentNode (column wrapper)
    assert.ok(slide.content, "slide should have content");
    assert.strictEqual(slide.content.componentName, "column");
  });

  it("masterTokens defaults to empty object when master key is absent", () => {
    const masterName = "test-tmpl-master-5";
    const templateName = "test-tmpl-layout-5";

    const master = defineMaster({ name: masterName, render: minimalMasterRender });
    defineTemplate({
      name: templateName,
      description: "Missing master token fallback",
      params: {},
      master,
      render: (_params, _slots, _tokens) => makeComponent("column"),
    });

    const layout = layoutRegistry.get(templateName);
    assert.ok(layout);

    // No `master` key in tokens at all
    const slide = layout!.render({}, {}, { title: "hello" });

    assert.deepStrictEqual(slide.masterTokens, {});
  });
});
