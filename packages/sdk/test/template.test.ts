import * as assert from "node:assert";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import type { Background } from "@tycoslide/core";
import type { LayoutConfig } from "@tycoslide/sdk";
import { AssetCatalog, defineTemplate, isAssetRef } from "../src/theme/template.js";

const testLayouts = new Map<string, LayoutConfig>();

// ── defineTemplate() ─────────────────────────────────────────────────────────

describe("defineTemplate()", () => {
  it("returns a Template with documentation, layout, background, and tokens", () => {
    const templateName = "test-tmpl-layout-1";

    const mockBackground: Background = { color: "#FFF" };

    const template = defineTemplate({
      name: templateName,
      documentation: { description: "Test template" },
      layout: {
        params: {},
        render: (_params: any, _slots: any, _tokens: any) =>
          ({ type: "component", componentName: "column", params: {}, content: undefined }) as any,
      },
      background: mockBackground,
      tokens: { title: "hello" },
    });

    assert.deepStrictEqual(template.documentation, { description: "Test template" });
    assert.strictEqual(template.layout.name, templateName);
    assert.deepStrictEqual(template.background, { color: "#FFF" });
    assert.deepStrictEqual(template.tokens, { title: "hello" });
  });

  it("layout render delegates tokens directly to the Layout blueprint", () => {
    const templateName = "test-tmpl-passthrough";
    let capturedTokens: Record<string, unknown> = {};

    const template = defineTemplate({
      name: templateName,
      documentation: { description: "Token passthrough test" },
      layout: {
        params: {},
        render: (_params: any, _slots: any, tokens: any) => {
          capturedTokens = tokens as Record<string, unknown>;
          return { type: "component", componentName: "column", params: {}, content: undefined } as any;
        },
      },
      background: { color: "#FFF" },
      tokens: { title: "hello", color: "#333" },
    });

    testLayouts.set(template.layout.name, template.layout);
    const layout = testLayouts.get(templateName);
    assert.ok(layout);

    // Core passes tokens directly — no extra keys
    layout!.render({}, {}, { title: "hello", color: "#333" });

    assert.strictEqual(capturedTokens.title, "hello");
    assert.strictEqual(capturedTokens.color, "#333");
  });

  it("layout render returns SlideNode (content only)", () => {
    const templateName = "test-tmpl-slidenode";

    const template = defineTemplate({
      name: templateName,
      documentation: { description: "SlideNode return test" },
      layout: {
        params: {},
        render: (_params: any, _slots: any, _tokens: any) =>
          ({ type: "component", componentName: "text", params: {}, content: undefined }) as any,
      },
      background: { color: "#FFF" },
      tokens: {},
    });

    testLayouts.set(template.layout.name, template.layout);
    const layout = testLayouts.get(templateName);
    assert.ok(layout);

    const result = layout!.render({}, {}, {});
    // Result is a SlideNode (ComponentNode), not a Slide
    assert.strictEqual((result as any).componentName, "text");
  });
});

// ── isAssetRef() ──────────────────────────────────────────────────────────────

describe("isAssetRef()", () => {
  it("matches valid $category.name references", () => {
    assert.strictEqual(isAssetRef("$icons.shield"), true);
    assert.strictEqual(isAssetRef("$tycoslide.logo"), true);
    assert.strictEqual(isAssetRef("$brand.logoWhite"), true);
  });

  it("rejects non-reference strings", () => {
    assert.strictEqual(isAssetRef("icons.shield"), false);
    assert.strictEqual(isAssetRef("$icons"), false);
    assert.strictEqual(isAssetRef("$icons.shield.extra"), false);
    assert.strictEqual(isAssetRef("plain text"), false);
    assert.strictEqual(isAssetRef(""), false);
  });
});

// ── AssetCatalog ─────────────────────────────────────────────────────────────

describe("AssetCatalog", () => {
  // Fake import.meta.url pointing to a "src/" subdirectory so ../ resolves to the mock root
  const fakeImportMetaUrl = pathToFileURL("/mock/package/src/assets.js").href;
  const catalog = new AssetCatalog(fakeImportMetaUrl, {
    icons: {
      shield: { path: "assets/icons/shield.png", documentation: { description: "Shield icon" } },
    },
  });

  it("resolves an entry to an absolute disk path", () => {
    assert.strictEqual(catalog.resolve(catalog.entries.icons.shield), "/mock/package/assets/icons/shield.png");
  });

  it("resolves a valid $category.name reference via resolveRef", () => {
    assert.strictEqual(catalog.resolveRef("$icons.shield"), "/mock/package/assets/icons/shield.png");
  });

  it("throws on malformed reference", () => {
    assert.throws(() => catalog.resolveRef("not-a-ref"), /must be in the form \$category\.name/);
  });

  it("throws on unknown asset name with available list", () => {
    assert.throws(() => catalog.resolveRef("$icons.missing"), /Unknown asset reference.*Available: shield/);
  });

  it("throws on unknown category", () => {
    assert.throws(() => catalog.resolveRef("$fake.thing"), /Unknown asset reference.*\$fake\.thing/);
  });
});
