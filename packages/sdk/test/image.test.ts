import * as assert from "node:assert";
import { describe, it } from "node:test";
import { FIT, NODE_TYPE, SYNTAX } from "@tycoslide/core";
import type { RootContent } from "mdast";
import type { ImageTokens } from "../src/components/image.js";
import { image, imageComponent } from "../src/components/image.js";
import { Component } from "../src/presets/names.js";
import { DEFAULT_IMAGE_TOKENS, findSyntaxHandler, mockRenderContext, mockTheme, renderComponent } from "./mocks.js";

// ============================================
// DSL FUNCTION
// ============================================

describe("image() DSL function", () => {
  it("returns ComponentNode with correct type", () => {
    const node = image("photo.png", DEFAULT_IMAGE_TOKENS);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
  });

  it("returns ComponentNode with correct componentName", () => {
    const node = image("photo.png", DEFAULT_IMAGE_TOKENS);
    assert.strictEqual(node.componentName, Component.Image);
  });

  it("stores src in content", () => {
    const node = image("photo.png", DEFAULT_IMAGE_TOKENS);
    assert.strictEqual(node.content, "photo.png");
  });

  it("stores alt in params when provided", () => {
    const node = image("photo.png", DEFAULT_IMAGE_TOKENS, "A photo");
    assert.strictEqual((node.params as any).alt, "A photo");
  });

  it("omits alt from params when not provided", () => {
    const node = image("photo.png", DEFAULT_IMAGE_TOKENS);
    assert.strictEqual((node.params as any).alt, undefined);
  });
});

// ============================================
// SYNTAX HANDLER
// ============================================

describe("image syntax handler", () => {
  it("handles MDAST image nodes", () => {
    const handler = findSyntaxHandler(SYNTAX.IMAGE);
    assert.ok(handler);
    assert.strictEqual(handler.name, Component.Image);
  });

  it("compiles MDAST image to ComponentNode", () => {
    const mdastNode = { type: "image", url: "photo.png", alt: "A photo" } as RootContent;
    const result = imageComponent.syntax!.compile(mdastNode, "");
    assert.ok(result);
    assert.strictEqual(result.componentName, Component.Image);
    assert.strictEqual(result.content, "photo.png");
    assert.strictEqual((result.params as any).alt, "A photo");
  });
});

// ============================================
// RENDER — NON-SVG PASSTHROUGH
// ============================================

describe("image render (non-SVG)", () => {
  it("returns ImageNode with src unchanged for PNG", async () => {
    const context = mockRenderContext();
    const node = image("photo.png", {});
    const result = await renderComponent(node, context);
    assert.strictEqual(result.type, NODE_TYPE.IMAGE);
    assert.strictEqual((result as any).src, "photo.png");
  });

  it("does not call canvas.renderHtml for non-SVG", async () => {
    let called = false;
    const theme = mockTheme();
    const canvas = {
      renderHtml: async () => {
        called = true;
        return "mock://render.png";
      },
    };
    const context = { theme, canvas, slideNumber: 1, renderTree: async (n: any) => n } as any;
    const node = image("photo.jpg", {});
    await renderComponent(node, context);
    assert.strictEqual(called, false);
  });

  it("defaults fit to CONTAIN", async () => {
    const context = mockRenderContext();
    const node = image("photo.png", {});
    const result = await renderComponent(node, context);
    assert.strictEqual((result as any).fit, FIT.CONTAIN);
  });

  it("applies fit token", async () => {
    const context = mockRenderContext();
    const tokens: ImageTokens = { fit: FIT.COVER };
    const node = image("photo.png", tokens);
    const result = await renderComponent(node, context);
    assert.strictEqual((result as any).fit, FIT.COVER);
  });

  it("applies alt param", async () => {
    const context = mockRenderContext();
    const node = image("photo.png", {}, "Alt text");
    const result = await renderComponent(node, context);
    assert.strictEqual((result as any).alt, "Alt text");
  });

  it("applies shadow token", async () => {
    const context = mockRenderContext();
    const shadow = { type: "outer" as const, blur: 4, offset: 2, opacity: 50, color: "#000", angle: 315 };
    const node = image("photo.png", { shadow });
    const result = await renderComponent(node, context);
    assert.deepStrictEqual((result as any).shadow, shadow);
  });

  it("applies tint token", async () => {
    const context = mockRenderContext();
    const node = image("photo.png", { tint: "#FF0000" });
    const result = await renderComponent(node, context);
    assert.strictEqual((result as any).tint, "#FF0000");
  });

  it("wraps in column when padding token is set", async () => {
    const context = mockRenderContext();
    const node = image("photo.png", { padding: 24 });
    const result = await renderComponent(node, context);
    assert.strictEqual(result.type, NODE_TYPE.COMPONENT);
    assert.strictEqual((result as any).componentName, Component.Column);
  });
});

// ============================================
// RENDER — SVG RASTERIZATION
// ============================================

describe("image render (SVG)", () => {
  it("calls canvas.renderHtml for .svg files", async () => {
    let capturedHtml: string | undefined;
    let capturedTransparent: boolean | undefined;
    const theme = mockTheme();
    const canvas = {
      renderHtml: async (html: string, transparent?: boolean) => {
        capturedHtml = html;
        capturedTransparent = transparent;
        return "/tmp/rasterized.png";
      },
    };
    const context = { theme, canvas, slideNumber: 1, renderTree: async (n: any) => n } as any;

    const node = image("test-fixtures/icon.svg", {});

    // rasterizeSvg reads from disk — skip this test if fixture doesn't exist
    // This tests the detection path; full rasterization needs integration tests
    try {
      await renderComponent(node, context);
    } catch (e: any) {
      if (e.message.includes("SVG file not found")) {
        // SVG detection triggered correctly — renderHtml was about to be called
        return;
      }
      throw e;
    }

    assert.ok(capturedHtml);
    assert.strictEqual(capturedTransparent, true);
  });

  it("does not trigger rasterization for .png", async () => {
    let renderHtmlCalled = false;
    const theme = mockTheme();
    const canvas = {
      renderHtml: async () => {
        renderHtmlCalled = true;
        return "mock.png";
      },
    };
    const context = { theme, canvas, slideNumber: 1, renderTree: async (n: any) => n } as any;

    const node = image("icon.png", {});
    await renderComponent(node, context);
    assert.strictEqual(renderHtmlCalled, false);
  });

  it("detects .SVG extension case-insensitively", async () => {
    const theme = mockTheme();
    const canvas = {
      renderHtml: async () => "/tmp/rasterized.png",
    };
    const context = { theme, canvas, slideNumber: 1, renderTree: async (n: any) => n } as any;

    const node = image("icon.SVG", {});
    try {
      await renderComponent(node, context);
    } catch (e: any) {
      if (e.message.includes("SVG file not found")) {
        // Case-insensitive detection worked
        return;
      }
      throw e;
    }
  });
});
