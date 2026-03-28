// Label Component Tests
// Tests for MDAST compile (heading → label), resolveLabelTokens, and renderLabel

import assert from "node:assert";
import { describe, it } from "node:test";
import { componentRegistry, HALIGN, NODE_TYPE, VALIGN } from "@tycoworks/tycoslide";
import type { Heading } from "mdast";
import {
  cardComponent,
  codeComponent,
  columnComponent,
  gridComponent,
  imageComponent,
  labelComponent,
  lineComponent,
  listComponent,
  mermaidComponent,
  quoteComponent,
  rowComponent,
  shapeComponent,
  slideNumberComponent,
  stackComponent,
  tableComponent,
  textComponent,
} from "../src/index.js";
import type { LabelSlotTokens, LabelTokens } from "../src/label.js";
import { label } from "../src/label.js";
import { Component } from "../src/names.js";
import { DEFAULT_LABEL_TOKENS, mockTheme, noopCanvas } from "./mocks.js";

// Register components explicitly
componentRegistry.register([
  textComponent,
  imageComponent,
  cardComponent,
  quoteComponent,
  tableComponent,
  codeComponent,
  mermaidComponent,
  lineComponent,
  shapeComponent,
  slideNumberComponent,
  rowComponent,
  columnComponent,
  stackComponent,
  gridComponent,
  listComponent,
  labelComponent,
]);

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
  // 3. resolveLabelTokens: flat tokens (DSL path, no headingDepth)
  // ============================================

  describe("resolveLabelTokens: flat tokens (DSL path)", () => {
    it("should return tokens unchanged when headingDepth is undefined", () => {
      const flatTokens: Record<string, unknown> = {
        color: "#FF0000",
        style: "body",
        hAlign: HALIGN.LEFT,
        vAlign: VALIGN.TOP,
      };
      const params: Record<string, unknown> = {};

      const result = labelComponent.resolveTokens!(flatTokens, params);
      assert.strictEqual(result, flatTokens, "should return the same object reference");
    });
  });

  // ============================================
  // 4. resolveLabelTokens: depth-keyed tokens (heading path)
  // ============================================

  describe("resolveLabelTokens: depth-keyed tokens (heading path)", () => {
    it("should return the entry for headingDepth 2 when tokens are depth-keyed", () => {
      const depth2Tokens: LabelTokens = {
        color: "#0000FF",
        style: "h2",
        hAlign: HALIGN.CENTER,
        vAlign: VALIGN.TOP,
      };
      const slotTokens: LabelSlotTokens = {
        1: { color: "#111111", style: "h1", hAlign: HALIGN.LEFT, vAlign: VALIGN.TOP },
        2: depth2Tokens,
        3: { color: "#333333", style: "h3", hAlign: HALIGN.LEFT, vAlign: VALIGN.TOP },
        4: { color: "#444444", style: "h4", hAlign: HALIGN.LEFT, vAlign: VALIGN.TOP },
        5: { color: "#555555", style: "small", hAlign: HALIGN.LEFT, vAlign: VALIGN.TOP },
        6: { color: "#666666", style: "footer", hAlign: HALIGN.LEFT, vAlign: VALIGN.TOP },
      };
      const params: Record<string, unknown> = { headingDepth: 2 };

      const result = labelComponent.resolveTokens!(slotTokens as unknown as Record<string, unknown>, params);
      assert.deepStrictEqual(result, depth2Tokens);
    });
  });

  // ============================================
  // 5. resolveLabelTokens: throws on missing depth entry
  // ============================================

  describe("resolveLabelTokens: throws on missing depth entry", () => {
    it("should throw when headingDepth is 3 but tokens have no entry for 3", () => {
      const partialTokens: Record<string, unknown> = {
        1: { color: "#111111", style: "h1", hAlign: HALIGN.LEFT, vAlign: VALIGN.TOP },
        2: { color: "#222222", style: "h2", hAlign: HALIGN.LEFT, vAlign: VALIGN.TOP },
        // depth 3 intentionally missing
      };
      const params: Record<string, unknown> = { headingDepth: 3 };

      assert.throws(
        () => labelComponent.resolveTokens!(partialTokens, params),
        (err: unknown) => {
          assert.ok(err instanceof Error);
          assert.ok(
            err.message.includes("headingDepth=3"),
            `Expected error message to mention headingDepth=3, got: ${err.message}`,
          );
          return true;
        },
      );
    });
  });

  // ============================================
  // 6. renderLabel: produces correct TextNode
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
      const rendered = (await componentRegistry.render(node, { theme, canvas: noopCanvas() })) as any;

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
      const rendered = (await componentRegistry.render(node, { theme, canvas: noopCanvas() })) as any;

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
        () => componentRegistry.render(node, { theme, canvas: noopCanvas() }),
        (err: unknown) => {
          assert.ok(err instanceof Error);
          assert.ok(err.message.includes("nonexistent_style"));
          return true;
        },
      );
    });

    it("should use DEFAULT_LABEL_TOKENS defaults correctly", async () => {
      const node = label("Default label", DEFAULT_LABEL_TOKENS);
      const rendered = (await componentRegistry.render(node, { theme, canvas: noopCanvas() })) as any;

      assert.strictEqual(rendered.type, NODE_TYPE.TEXT);
      assert.strictEqual(rendered.hAlign, HALIGN.LEFT);
      assert.strictEqual(rendered.vAlign, VALIGN.TOP);
      assert.strictEqual(rendered.color, "#000000");
      assert.strictEqual(rendered.style, "body");
    });
  });
});
