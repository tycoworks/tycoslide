import * as assert from "node:assert";
import { describe, it } from "node:test";
import type { Background, LayoutDefinition } from "@tycoslide/core";
import { defineTemplate } from "../src/template.js";

const testLayouts = new Map<string, LayoutDefinition>();

// ── defineTemplate() ─────────────────────────────────────────────────────────

describe("defineTemplate()", () => {
  it("returns a Template with layout, background, and layoutTokens", () => {
    const templateName = "test-tmpl-layout-1";

    const mockBackground: Background = { color: "#FFF" };

    const template = defineTemplate({
      name: templateName,
      description: "Test template",
      layout: {
        params: {},
        render: (_params: any, _slots: any, _tokens: any) =>
          ({ type: "component", componentName: "column", params: {}, content: undefined }) as any,
      },
      background: mockBackground,
      layoutTokens: { title: "hello" },
    });

    assert.strictEqual(template.layout.name, templateName);
    assert.deepStrictEqual(template.background, { color: "#FFF" });
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
          return { type: "component", componentName: "column", params: {}, content: undefined } as any;
        },
      },
      background: { color: "#FFF" },
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
      layout: {
        params: {},
        render: (_params: any, _slots: any, _tokens: any) =>
          ({ type: "component", componentName: "text", params: {}, content: undefined }) as any,
      },
      background: { color: "#FFF" },
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
