// Label Component Tests
// Tests for MDAST compile (heading → label), resolveLabelTokens, and renderLabel

import assert from "node:assert";
import { describe, it } from "node:test";
import { HALIGN, NODE_TYPE, VALIGN } from "@tycoslide/core";
import type { Heading } from "mdast";
import type { LabelTokens } from "../src/components/label.js";
import { label } from "../src/components/label.js";
import { labelComponent } from "../src/index.js";
import { Component } from "../src/presets/names.js";
import { DEFAULT_LABEL_TOKENS, mockTheme, noopCanvas, renderComponent } from "./mocks.js";

// ============================================
// HELPERS
// ============================================

/** Build a synthetic MDAST Heading node for use in compile tests. */
function makeHeading(depth: 1 | 2 | 3 | 4 | 5 | 6, text: string): Heading {
  const hashes = "#".repeat(depth);
  return {
    type: "heading",
    depth,
    children: [{ type: "text", value: text }],
    position: {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: hashes.length + 1 + text.length, offset: hashes.length + 1 + text.length },
    },
  };
}

/** Build the raw source string for a heading, as extractSource would see it. */
function headingSource(depth: 1 | 2 | 3 | 4 | 5 | 6, text: string): string {
  return `${"#".repeat(depth)} ${text}`;
}

// ============================================
// TESTS
// ============================================

describe("Label Component", () => {
  const theme = mockTheme();

  // ============================================
  // 1. MDAST compile: heading hash stripping across all depths
  // ============================================

  describe("MDAST compile: heading hash stripping", () => {
    const cases: Array<{ depth: 1 | 2 | 3 | 4 | 5 | 6; md: string }> = [
      { depth: 1, md: "# H1" },
      { depth: 2, md: "## H2" },
      { depth: 3, md: "### H3" },
      { depth: 4, md: "#### H4" },
      { depth: 5, md: "##### H5" },
      { depth: 6, md: "###### H6" },
    ];

    for (const { depth, md } of cases) {
      it(`should compile h${depth} to label component with correct depth and stripped content`, () => {
        const text = md.replace(/^#{1,6}\s*/, "");
        const headingNode = makeHeading(depth, text);
        const source = headingSource(depth, text);

        const result = labelComponent.mdast!.compile(headingNode, source);
        assert.ok(result !== null, `compile() returned null for h${depth}`);
        assert.strictEqual(result!.componentName, Component.Label);
        assert.strictEqual((result!.params as any).headingDepth, depth);
        assert.strictEqual(result!.content, text);
      });
    }
  });

  // ============================================
  // 2. MDAST compile: heading content preservation
  // ============================================

  describe("MDAST compile: heading content preservation", () => {
    it("should strip ## prefix and produce content 'Hello World'", () => {
      const headingNode = makeHeading(2, "Hello World");
      const source = headingSource(2, "Hello World");

      const result = labelComponent.mdast!.compile(headingNode, source);
      assert.ok(result !== null);
      assert.strictEqual(result!.content, "Hello World");
      assert.notStrictEqual(result!.content, "## Hello World");
    });
  });

  // ============================================
  // 3. renderLabel: produces correct TextNode
  // ============================================

  describe("renderLabel: produces correct TextNode", () => {
    it("should produce a TextNode with correct style, color, hAlign, vAlign, and content", async () => {
      const tokens: LabelTokens = {
        color: "#AABBCC",
        style: "h2",
        hAlign: HALIGN.CENTER,
        vAlign: VALIGN.MIDDLE,
      };
      const node = label("Section Title", tokens);
      const rendered = (await renderComponent(node, {
        theme,
        canvas: noopCanvas(),
        renderTree: async (n: any) => n,
      })) as any;

      assert.strictEqual(rendered.type, NODE_TYPE.TEXT);
      assert.strictEqual(rendered.style, "h2");
      assert.strictEqual(rendered.color, "#AABBCC");
      assert.strictEqual(rendered.hAlign, HALIGN.CENTER);
      assert.strictEqual(rendered.vAlign, VALIGN.MIDDLE);

      const runs = rendered.content as any[];
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, "Section Title");
    });

    it("should set linkColor equal to text color and linkUnderline to false", async () => {
      const tokens: LabelTokens = {
        color: "#FF0000",
        style: "body",
        hAlign: HALIGN.LEFT,
        vAlign: VALIGN.TOP,
      };
      const node = label("Link test", tokens);
      const rendered = (await renderComponent(node, {
        theme,
        canvas: noopCanvas(),
        renderTree: async (n: any) => n,
      })) as any;

      assert.strictEqual(rendered.linkColor, "#FF0000");
      assert.strictEqual(rendered.linkUnderline, false);
    });

    it("should throw when tokens reference a non-existent text style", async () => {
      const tokens: LabelTokens = {
        color: "#000000",
        style: "nonexistent_style" as any,
        hAlign: HALIGN.LEFT,
        vAlign: VALIGN.TOP,
      };
      const node = label("Bad style", tokens);
      await assert.rejects(
        () => renderComponent(node, { theme, canvas: noopCanvas(), renderTree: async (n: any) => n }),
        (err: unknown) => {
          assert.ok(err instanceof Error);
          assert.ok(err.message.includes("nonexistent_style"));
          return true;
        },
      );
    });

    it("should use DEFAULT_LABEL_TOKENS defaults correctly", async () => {
      const node = label("Default label", DEFAULT_LABEL_TOKENS);
      const rendered = (await renderComponent(node, {
        theme,
        canvas: noopCanvas(),
        renderTree: async (n: any) => n,
      })) as any;

      assert.strictEqual(rendered.type, NODE_TYPE.TEXT);
      assert.strictEqual(rendered.hAlign, HALIGN.LEFT);
      assert.strictEqual(rendered.vAlign, VALIGN.TOP);
      assert.strictEqual(rendered.color, "#000000");
      assert.strictEqual(rendered.style, "body");
    });
  });
});
