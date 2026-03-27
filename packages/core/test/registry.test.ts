import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { component, isComponentNode, NODE_TYPE } from "../src/core/model/nodes.js";
import type { Slide } from "../src/core/model/types.js";
import { componentRegistry, type LayoutDefinition, Registry } from "../src/core/rendering/registry.js";
import { mockTextStyle, mockTheme, noopCanvas } from "./mocks.js";

import { C, testComponents } from "./test-components.js";

// Register test components
componentRegistry.register(testComponents);

import { DASH_TYPE, HALIGN, SIZE, VALIGN } from "../src/core/model/types.js";

// ============================================
// GENERIC REGISTRY BASE CLASS
// ============================================

// Minimal stub slide for testing
const stubSlide: Slide = {
  masterName: "default",
  masterTokens: {},
  content: { type: NODE_TYPE.COMPONENT, componentName: "test", params: {}, content: undefined },
};

function makeLayout(name: string, render: (params: any, slots: any, tokens: any) => Slide): LayoutDefinition {
  return {
    name,
    description: `Test layout: ${name}`,
    params: {} as any,
    tokens: {},
    render,
  };
}

describe("Registry (generic base class)", () => {
  let registry: Registry<LayoutDefinition>;

  beforeEach(() => {
    registry = new Registry<LayoutDefinition>("Layout");
  });

  test("register and retrieve a definition", () => {
    const layout = makeLayout("title", () => stubSlide);
    registry.register(layout);
    assert.strictEqual(registry.has("title"), true);
    assert.strictEqual(registry.get("title"), layout);
  });

  test("has() returns false for unregistered name", () => {
    assert.strictEqual(registry.has("nonexistent"), false);
  });

  test("get() returns undefined for unregistered name", () => {
    assert.strictEqual(registry.get("nonexistent"), undefined);
  });

  test("idempotent registration (same identity)", () => {
    const render = () => stubSlide;
    const layout = makeLayout("title", render);
    registry.register(layout);
    registry.register(layout); // should not throw
    assert.strictEqual(registry.has("title"), true);
  });

  test("throws on duplicate name with different identity", () => {
    registry.register(makeLayout("title", () => stubSlide));
    assert.throws(() => registry.register(makeLayout("title", () => stubSlide)), /already registered/);
  });

  test("getRegisteredNames returns all names", () => {
    registry.register(makeLayout("title", () => stubSlide));
    registry.register(makeLayout("section", () => stubSlide));
    registry.register(makeLayout("content", () => stubSlide));
    const names = registry.getRegisteredNames();
    assert.deepStrictEqual(names.sort(), ["content", "section", "title"]);
  });

  test("getAll returns all definitions", () => {
    const a = makeLayout("a", () => stubSlide);
    const b = makeLayout("b", () => stubSlide);
    registry.register(a);
    registry.register(b);
    const all = registry.getAll();
    assert.strictEqual(all.length, 2);
    assert.ok(all.includes(a));
    assert.ok(all.includes(b));
  });
});

// ============================================
// COMPONENT REGISTRY (render / renderTree)
// ============================================

describe("ComponentRegistry", () => {
  const theme = mockTheme();

  describe("isComponentNode", () => {
    test("returns true for component nodes", () => {
      const node = component("test", { foo: 1 });
      assert.strictEqual(isComponentNode(node), true);
    });

    test("returns false for element nodes", () => {
      assert.strictEqual(isComponentNode({ type: NODE_TYPE.TEXT, content: [] }), false);
      assert.strictEqual(isComponentNode({ type: NODE_TYPE.CONTAINER }), false);
    });

    test("returns false for non-objects", () => {
      assert.strictEqual(isComponentNode(null), false);
      assert.strictEqual(isComponentNode(undefined), false);
      assert.strictEqual(isComponentNode("string"), false);
      assert.strictEqual(isComponentNode(42), false);
    });
  });

  describe("render", () => {
    test("renders a registered component", async () => {
      // text component requires tokens — provide them via node.tokens
      const textTokens = {
        color: "#000000",
        style: "body",
        linkColor: "#0000FF",
        linkUnderline: true,
        hAlign: HALIGN.LEFT,
        vAlign: VALIGN.TOP,
      };
      const node = component(C.Text, {}, "hello", textTokens);
      const rendered = await componentRegistry.render(node, { theme, canvas: noopCanvas() });
      assert.strictEqual((rendered as any).type, NODE_TYPE.TEXT);
    });

    test("throws for unknown component", async () => {
      const node = component("nonexistent-component", {});
      await assert.rejects(
        () => componentRegistry.render(node, { theme, canvas: noopCanvas() }),
        /Unknown component: 'nonexistent-component'/,
      );
    });
  });

  describe("renderTree", () => {
    test("passes primitives through unchanged", async () => {
      const textNode = {
        type: NODE_TYPE.TEXT,
        width: SIZE.FILL,
        height: SIZE.HUG,
        content: [],
        style: "body",
        resolvedStyle: mockTextStyle,
        color: "#000000",
        hAlign: HALIGN.LEFT,
        vAlign: VALIGN.TOP,
        lineHeightMultiplier: 1.2,
        bulletIndentPt: 0,
        linkColor: "#0000FF",
        linkUnderline: true,
      };
      const result = await componentRegistry.renderTree(textNode, { theme, canvas: noopCanvas() });
      assert.strictEqual(result, textNode);
    });

    test("recursively renders nested components", async () => {
      // Card requires tokens — provide them via node.tokens
      const cardTokens = {
        background: {
          fill: "#333333",
          fillOpacity: 0,
          border: { color: "#333333", width: 1, dashType: DASH_TYPE.SOLID },
          cornerRadius: 0.1,
        },
        padding: 0.25,
        spacing: 0.125,
        hAlign: HALIGN.CENTER,
        vAlign: VALIGN.TOP,
        title: {
          style: "h4",
          color: "#FFFFFF",
          linkColor: "#0000FF",
          linkUnderline: true,
          hAlign: HALIGN.CENTER,
          vAlign: VALIGN.TOP,
        },
        description: {
          style: "small",
          color: "#CCCCCC",
          linkColor: "#0000FF",
          linkUnderline: true,
          hAlign: HALIGN.CENTER,
          vAlign: VALIGN.TOP,
        },
      };
      const node = component(C.Card, { title: "Test" }, undefined, cardTokens);
      const rendered = await componentRegistry.renderTree(node, { theme, canvas: noopCanvas() });
      // Card render creates a Column containing a Text child
      assert.strictEqual(rendered.type, NODE_TYPE.CONTAINER);
      if (rendered.type === NODE_TYPE.CONTAINER) {
        assert.strictEqual(rendered.children[0].type, NODE_TYPE.TEXT);
      }
    });

    test("recurses into element children", async () => {
      // A container with a component child should render the child
      const textTokens = {
        color: "#000000",
        style: "body",
        linkColor: "#0000FF",
        linkUnderline: true,
        hAlign: HALIGN.LEFT,
        vAlign: VALIGN.TOP,
      };
      const node = component(C.Row, {}, [component(C.Text, {}, "hi", textTokens)]);
      const rendered = await componentRegistry.renderTree(node, { theme, canvas: noopCanvas() });
      assert.strictEqual(rendered.type, NODE_TYPE.CONTAINER);
      if (rendered.type === NODE_TYPE.CONTAINER) {
        assert.strictEqual(rendered.children[0].type, NODE_TYPE.TEXT);
      }
    });
  });

  describe("component() helper", () => {
    test("creates a ComponentNode with correct shape", () => {
      const node = component("myComp", { x: 1 });
      assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
      assert.strictEqual(node.componentName, "myComp");
      assert.deepStrictEqual(node.params, { x: 1 });
    });
  });
});
