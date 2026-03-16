// Slot Compiler Tests
// Tests for compileSlot: slot markdown string → ComponentNode[]
//
// compileSlot is the slot compiler:
// - :::directives → dispatched through registry
// - Bare MDAST → compiled inline via compileBareMarkdown()

import assert from "node:assert";
import { describe, it } from "node:test";
import { compileSlot } from "../src/core/markdown/slotCompiler.js";
import { SYNTAX } from "../src/core/model/syntax.js";
import { componentRegistry, defineComponent } from "../src/core/rendering/registry.js";
import { C, testComponents } from "./test-components.js";

// Register test components before tests run
componentRegistry.register(testComponents);

/** Helper: get node as any to avoid unknown type errors in tests */
function node(nodes: any[], index: number): any {
  return nodes[index];
}

describe("Slot Compiler", () => {
  describe("bare MDAST compilation", () => {
    it("should compile a single paragraph to a text node", () => {
      const nodes = compileSlot("Hello world");
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Text);
      assert.strictEqual(node(nodes, 0).content, "Hello world");
    });

    it("should return multiple paragraphs as separate text nodes", () => {
      const nodes = compileSlot("First paragraph.\n\nSecond paragraph.");
      assert.strictEqual(nodes.length, 2);
      assert.strictEqual((nodes[0] as any).componentName, C.Text);
      assert.strictEqual((nodes[1] as any).componentName, C.Text);
    });

    it("should return heading + paragraph + list as separate nodes", () => {
      const md = "## Overview\n\nIntro paragraph.\n\n- Point one\n- Point two";
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 3);
      assert.strictEqual((nodes[0] as any).componentName, C.Text); // heading
      assert.strictEqual((nodes[1] as any).componentName, C.Text); // paragraph
      assert.strictEqual((nodes[2] as any).componentName, C.Text); // list
    });

    it("should compile a single heading to a text node with style", () => {
      const nodes = compileSlot("## Subheading");
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Text);
      assert.ok((nodes[0] as any).tokens?.style); // heading style now in node.tokens
    });

    it("should compile a GFM table to a table node", () => {
      const md = "| A | B |\n|---|---|\n| C | D |";
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Table);
    });

    it("should compile a list to a text component node", () => {
      const nodes = compileSlot("- First\n- Second\n- Third");
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Text);
    });
  });

  describe("bare MDAST + directive interleaving", () => {
    it("should split bare MDAST around a directive", () => {
      const md = "Before image.\n\n:::image\npic.png\n:::\n\nAfter image.";
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 3);
      assert.strictEqual((nodes[0] as any).componentName, C.Text);
      assert.strictEqual((nodes[1] as any).componentName, C.Image);
      assert.strictEqual((nodes[2] as any).componentName, C.Text);
    });

    it("should handle directive at start with trailing bare MDAST", () => {
      const md = ":::image\npic.png\n:::\n\nAfter image.";
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 2);
      assert.strictEqual((nodes[0] as any).componentName, C.Image);
      assert.strictEqual((nodes[1] as any).componentName, C.Text);
    });

    it("should handle bare MDAST followed by directive", () => {
      const md = "Some text.\n\n:::card\ntitle: Hello\n:::";
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 2);
      assert.strictEqual((nodes[0] as any).componentName, C.Text);
      assert.strictEqual((nodes[1] as any).componentName, C.Card);
    });
  });

  describe("empty input and thematic breaks", () => {
    it("should return empty array for empty input", () => {
      const nodes = compileSlot("");
      assert.strictEqual(nodes.length, 0);
    });

    it("should throw on thematic breaks in slot content", () => {
      const md = "Before\n\n---\n\nAfter";
      assert.throws(
        () => compileSlot(md),
        /horizontal rules.*not supported.*Use :::line/,
      );
    });
  });

  describe(":::image directive", () => {
    it("should compile :::image directive to an image() node", () => {
      const nodes = compileSlot(":::image\n/path/to/image.png\n:::");
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Image);
      assert.strictEqual(node(nodes, 0).content, "/path/to/image.png");
    });

    it("should compile $-prefixed asset reference in :::image directive", () => {
      const nodes = compileSlot(":::image\n$illustrations.integrate\n:::");
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Image);
      assert.strictEqual(node(nodes, 0).content, "$illustrations.integrate");
    });
  });

  describe(":::table directive", () => {
    it("should deserialize :::table with GFM table body", () => {
      const md = ":::table\n| A | B |\n|---|---|\n| C | D |\n:::";
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Table);
      // Body contains the raw GFM table text (parsed in render, not deserialize)
      assert.ok(node(nodes, 0).content.includes("| A | B |"));
    });

    it("should deserialize :::table without attributes as plain table", () => {
      const md = ":::table\n| X | Y |\n|---|---|\n| 1 | 2 |\n:::";
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Table);
      assert.ok(node(nodes, 0).content.includes("| X | Y |"));
    });

    it("should pass headerColumns from attributes with body", () => {
      const md = ':::table{headerColumns="1"}\n| A | B |\n|---|---|\n| C | D |\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(node(nodes, 0).params.headerColumns, 1);
      assert.ok(node(nodes, 0).content.includes("| A | B |"));
    });

    it("should reject unknown directive parameters", () => {
      const md = ':::table{foo="bar"}\n| A | B |\n|---|---|\n| C | D |\n:::';
      assert.throws(() => compileSlot(md), /Invalid parameters for component 'table'/);
    });
  });

  describe(":::line directive", () => {
    it("should compile :::line directive with empty body", () => {
      const md = ":::line\n:::";
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Line);
    });
  });

  describe("error cases", () => {
    it("should reject parameters on components that accept none", () => {
      const md = ':::image{foo="bar"}\nphoto.png\n:::';
      assert.throws(() => compileSlot(md), /does not accept parameters/);
    });

    it("should throw on unknown directive", () => {
      const md = ":::unknown\nsome body\n:::";
      assert.throws(() => compileSlot(md), /unknown directive ":::unknown"/);
    });

    it("should throw on container directives used in markdown", () => {
      const md = '::::row\n:::card{title="A"}\nBody\n:::\n::::';
      assert.throws(() => compileSlot(md), /unknown directive ":::row"/);
    });

    it("should throw on duplicate MDAST handler registration", () => {
      const dup = defineComponent({
        name: "duplicate-paragraph-handler",
        tokens: {},
        mdast: {
          nodeTypes: [SYNTAX.PARAGRAPH],
          compile: () => null,
        },
        render: () => ({}) as any,
      });
      assert.throws(() => componentRegistry.register(dup), /MDAST node type 'paragraph' already handled by/);
    });
  });
});
