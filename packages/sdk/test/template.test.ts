import * as assert from "node:assert";
import { describe, it } from "node:test";
import { Bounds, component, type LayoutDefinition, type MasterDefinition } from "@tycoslide/core";
import { defineTemplate } from "../src/template.js";

const testLayouts = new Map<string, LayoutDefinition>();

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal ComponentNode for use in master content */
function makeComponent(name: string) {
  return component(name, {}, undefined);
}

// ── defineTemplate() ─────────────────────────────────────────────────────────

describe("defineTemplate()", () => {
  it("returns a Template with layout, master, and layoutTokens", () => {
    const templateName = "test-tmpl-layout-1";

    const mockMaster1: MasterDefinition = {
      name: "test-tmpl-master-1",
      content: makeComponent("bg"),
      contentBounds: new Bounds(0, 0, 13.333, 7.5),
      background: { color: "#FFF" },
    };

    const template = defineTemplate({
      name: templateName,
      description: "Test template",
      layout: { params: {}, render: (_params: any, _slots: any, _tokens: any) => makeComponent("column") },
      master: mockMaster1,
      layoutTokens: { title: "hello" },
    });

    assert.strictEqual(template.layout.name, templateName);
    assert.strictEqual(template.master.name, "test-tmpl-master-1");
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
      master: {
        name: "m",
        content: makeComponent("bg"),
        contentBounds: new Bounds(0, 0, 13.333, 7.5),
        background: { color: "#FFF" },
      },
      layoutTokens: { title: "hello", color: "#333" },
    });

    testLayouts.set(template.layout.name, template.layout);
    const layout = testLayouts.get(templateName);
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
      master: {
        name: "m2",
        content: makeComponent("bg"),
        contentBounds: new Bounds(0, 0, 13.333, 7.5),
        background: { color: "#FFF" },
      },
      layoutTokens: {},
    });

    testLayouts.set(template.layout.name, template.layout);
    const layout = testLayouts.get(templateName);
    assert.ok(layout);

    const result = layout!.render({}, {}, {});
    // Result is a SlideNode (ComponentNode), not a Slide
    assert.strictEqual((result as any).componentName, "text");
  });
});
