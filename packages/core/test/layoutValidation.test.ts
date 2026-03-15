// Layout validation tests
// Verify Zod schema validation via validateLayout()

import assert from "node:assert";
import { describe, it } from "node:test";
import { z } from "zod";
import { validateLayout } from "../src/core/markdown/documentCompiler.js";
import { componentRegistry, type LayoutDefinition } from "../src/core/rendering/registry.js";
import { testComponents } from "./test-components.js";

// Register test components before tests run
componentRegistry.register(testComponents);

import { NODE_TYPE } from "../src/core/model/nodes.js";
import { param, schema } from "../src/core/model/param.js";

// Create a test layout with a known schema shape
const testShape = {
  title: schema.string(),
  count: z.number().int().positive(),
  tags: param.optional(schema.array(schema.string())),
  active: param.optional(schema.boolean()),
};

const testLayout: LayoutDefinition = {
  name: "test",
  description: "Test layout for validation",
  params: testShape,
  tokens: {},
  render: (props) => ({
    masterName: "default",
    masterVariant: "default",
    content: { type: NODE_TYPE.COMPONENT, componentName: "test", props: { text: props.title } },
  }),
};

describe("validateLayout (params only)", () => {
  it("should return validated props for valid input", () => {
    const result = validateLayout(testLayout, { title: "Hello", count: 5 }, {});
    assert.strictEqual(result.title, "Hello");
    assert.strictEqual(result.count, 5);
  });

  it("should accept optional fields when present", () => {
    const result = validateLayout(
      testLayout,
      {
        title: "Hello",
        count: 3,
        tags: ["a", "b"],
        active: true,
      },
      {},
    );
    assert.deepStrictEqual(result.tags, ["a", "b"]);
    assert.strictEqual(result.active, true);
  });

  it("should accept optional fields when absent", () => {
    const result = validateLayout(testLayout, { title: "Hello", count: 1 }, {});
    assert.strictEqual(result.tags, undefined);
    assert.strictEqual(result.active, undefined);
  });

  it("should throw on missing required field", () => {
    assert.throws(
      () => validateLayout(testLayout, { count: 5 }, {}),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("Layout 'test'"));
        assert.ok(err.message.includes("validation failed"));
        assert.ok(err.message.includes("title"));
        return true;
      },
    );
  });

  it("should throw on wrong type", () => {
    assert.throws(
      () => validateLayout(testLayout, { title: "Hello", count: "not a number" }, {}),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("count"));
        return true;
      },
    );
  });

  it("should throw on negative number when positive required", () => {
    assert.throws(
      () => validateLayout(testLayout, { title: "Hello", count: -1 }, {}),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("count"));
        return true;
      },
    );
  });

  it("should throw on invalid array element type", () => {
    assert.throws(
      () => validateLayout(testLayout, { title: "Hello", count: 1, tags: [123] }, {}),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("tags"));
        return true;
      },
    );
  });

  it("should include layout name in error message", () => {
    assert.throws(
      () => validateLayout(testLayout, {}, {}),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("'test'"));
        return true;
      },
    );
  });

  it("should strip unknown fields via Zod passthrough behavior", () => {
    // By default z.object is strict about output but allows extra input keys
    const result = validateLayout(
      testLayout,
      {
        title: "Hello",
        count: 1,
        unknownField: "should be stripped",
      },
      {},
    );
    assert.strictEqual(result.title, "Hello");
    assert.strictEqual((result as any).unknownField, undefined);
  });
});

describe("validateLayout with enum schema", () => {
  const enumShape = {
    style: schema.enum(["h1", "h2", "h3", "body"]),
  };
  const enumLayout: LayoutDefinition = {
    name: "enumTest",
    description: "Test enum validation",
    params: enumShape,
    tokens: {},
    render: (props) => ({
      masterName: "default",
      masterVariant: "default",
      content: { type: NODE_TYPE.COMPONENT, componentName: "test", props: { style: props.style } },
    }),
  };

  it("should accept valid enum value", () => {
    const result = validateLayout(enumLayout, { style: "h1" }, {});
    assert.strictEqual(result.style, "h1");
  });

  it("should reject invalid enum value", () => {
    assert.throws(
      () => validateLayout(enumLayout, { style: "h99" }, {}),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("style"));
        return true;
      },
    );
  });
});

describe("validateLayout (params and slots)", () => {
  const layoutWithSlots: LayoutDefinition = {
    name: "slotTest",
    description: "Test layout with params and slots",
    params: { title: schema.string() },
    slots: ["body"],
    tokens: {},
    render: (props) => ({
      masterName: "default",
      masterVariant: "default",
      content: { type: NODE_TYPE.COMPONENT, componentName: "test", props },
    }),
  };

  const layoutNoSlots: LayoutDefinition = {
    name: "noSlotTest",
    description: "Test layout with params only",
    params: { title: schema.string() },
    tokens: {},
    render: (props) => ({
      masterName: "default",
      masterVariant: "default",
      content: { type: NODE_TYPE.COMPONENT, componentName: "test", props },
    }),
  };

  it("validates params and slots separately then merges", () => {
    const result = validateLayout(layoutWithSlots, { title: "Hello" }, { body: "Content" });
    assert.strictEqual(result.title, "Hello");
    assert.ok(Array.isArray(result.body));
    assert.strictEqual(result.body.length, 1);
  });

  it("throws on missing required param", () => {
    assert.throws(
      () => validateLayout(layoutWithSlots, {}, { body: "Content" }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("params validation failed"));
        assert.ok(err.message.includes("title"));
        return true;
      },
    );
  });

  it("throws on missing required slot", () => {
    assert.throws(
      () => validateLayout(layoutWithSlots, { title: "Hello" }, {}),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("slots validation failed"));
        assert.ok(err.message.includes("body"));
        return true;
      },
    );
  });

  it("works for layout with no slots", () => {
    const result = validateLayout(layoutNoSlots, { title: "Hello" }, {});
    assert.strictEqual(result.title, "Hello");
  });

  it("ignores extra slot data when layout has no slots", () => {
    const result = validateLayout(layoutNoSlots, { title: "Hello" }, { body: "some content" });
    assert.strictEqual(result.title, "Hello");
    assert.strictEqual(result.body, undefined);
  });
});
