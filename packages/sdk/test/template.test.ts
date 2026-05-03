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

    assert.strictEqual(template.layout.name, templateName);
    assert.strictEqual(template.master, master);
    assert.deepStrictEqual(template.masterTokens, { bg: "red" });
    assert.deepStrictEqual(template.layoutTokens, { title: "hello" });
  });

  it("layout render delegates tokens directly to the Layout blueprint", () => {
    const templateName = "test-tmpl-passthrough";
    let capturedTokens: Record<string, unknown> = {};

    const template = defineTemplate({
      name: templateName,
      description: "Token passthrough test",
      layout: {
        params: {},
        render: (_params: any, _slots: any, tokens: any) => {
          capturedTokens = tokens as Record<string, unknown>;
          return makeComponent("column");
        },
      },
      master: { name: "m", render: minimalMasterRender },
      masterTokens: {},
      layoutTokens: { title: "hello", color: "#333" },
    });

    layoutRegistry.register([template.layout]);
    const layout = layoutRegistry.get(templateName);
    assert.ok(layout);

    // Core passes layoutTokens directly — no extra keys
    layout!.render({}, {}, { title: "hello", color: "#333" });

    assert.strictEqual(capturedTokens.title, "hello");
    assert.strictEqual(capturedTokens.color, "#333");
  });

  it("layout render returns SlideNode (content only)", () => {
    const templateName = "test-tmpl-slidenode";

    const template = defineTemplate({
      name: templateName,
      description: "SlideNode return test",
      layout: { params: {}, render: (_params: any, _slots: any, _tokens: any) => makeComponent("text") },
      master: { name: "m2", render: minimalMasterRender },
      masterTokens: {},
      layoutTokens: {},
    });

    layoutRegistry.register([template.layout]);
    const layout = layoutRegistry.get(templateName);
    assert.ok(layout);

    const result = layout!.render({}, {}, {});
    // Result is a SlideNode (ComponentNode), not a Slide
    assert.strictEqual((result as any).componentName, "text");
  });
});
