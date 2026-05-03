import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { SlideNode } from "../src/core/model/nodes.js";
import { component, isComponentNode, NODE_TYPE } from "../src/core/model/nodes.js";
import { type LayoutDefinition, Registry } from "../src/core/rendering/registry.js";

// ============================================
// GENERIC REGISTRY BASE CLASS
// ============================================

// Minimal stub content for testing
const stubContent: SlideNode = {
  type: NODE_TYPE.COMPONENT,
  componentName: "test",
  params: {},
  content: undefined,
};

function makeLayout(name: string, render: (params: any, slots: any, tokens: any) => SlideNode): LayoutDefinition {
  return {
    name,
    description: `Test layout: ${name}`,
    params: {} as any,
    render,
  };
}

describe("Registry (generic base class)", () => {
  let registry: Registry<LayoutDefinition>;

  beforeEach(() => {
    registry = new Registry<LayoutDefinition>("Layout");
  });

  test("register and retrieve a definition", () => {
    const layout = makeLayout("title", () => stubContent);
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
    const render = () => stubContent;
    const layout = makeLayout("title", render);
    registry.register(layout);
    registry.register(layout); // should not throw
    assert.strictEqual(registry.has("title"), true);
  });

  test("throws on duplicate name with different identity", () => {
    registry.register(makeLayout("title", () => stubContent));
    assert.throws(() => registry.register(makeLayout("title", () => stubContent)), /already registered/);
  });

  test("getRegisteredNames returns all names", () => {
    registry.register(makeLayout("title", () => stubContent));
    registry.register(makeLayout("section", () => stubContent));
    registry.register(makeLayout("content", () => stubContent));
    const names = registry.getRegisteredNames();
    assert.deepStrictEqual(names.sort(), ["content", "section", "title"]);
  });

  test("getAll returns all definitions", () => {
    const a = makeLayout("a", () => stubContent);
    const b = makeLayout("b", () => stubContent);
    registry.register(a);
    registry.register(b);
    const all = registry.getAll();
    assert.strictEqual(all.length, 2);
    assert.ok(all.includes(a));
    assert.ok(all.includes(b));
  });
});

describe("ComponentRegistry", () => {
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

  describe("component() helper", () => {
    test("creates a ComponentNode with correct shape", () => {
      const node = component("myComp", { x: 1 });
      assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
      assert.strictEqual(node.componentName, "myComp");
      assert.deepStrictEqual(node.params, { x: 1 });
    });
  });
});
