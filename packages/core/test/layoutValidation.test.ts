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
  render: (params: any, _slots: any) => ({
    masterName: "default",
    masterVariant: "default",
    content: { type: NODE_TYPE.COMPONENT, componentName: "test", params: { text: params.title }, content: undefined },
  }),
};

describe("validateLayout (params only)", () => {
  it("should return validated props for valid input", () => {
    const result = validateLayout(testLayout, { title: "Hello", count: 5 }, {});
    assert.strictEqual(result.params.title, "Hello");
    assert.strictEqual(result.params.count, 5);
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
    assert.deepStrictEqual(result.params.tags, ["a", "b"]);
    assert.strictEqual(result.params.active, true);
  });

  it("should accept optional fields when absent", () => {
    const result = validateLayout(testLayout, { title: "Hello", count: 1 }, {});
    assert.strictEqual(result.params.tags, undefined);
    assert.strictEqual(result.params.active, undefined);
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

  it("should reject unknown fields in params", () => {
    assert.throws(
      () =>
        validateLayout(
          testLayout,
          {
            title: "Hello",
            count: 1,
            unknownField: "should be rejected",
          },
          {},
        ),
      /Unrecognized key.*unknownField/,
    );
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
    render: (params: any, _slots: any) => ({
      masterName: "default",
      masterVariant: "default",
      content: {
        type: NODE_TYPE.COMPONENT,
        componentName: "test",
        params: { style: params.style },
        content: undefined,
      },
    }),
  };

  it("should accept valid enum value", () => {
    const result = validateLayout(enumLayout, { style: "h1" }, {});
    assert.strictEqual(result.params.style, "h1");
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
    render: (params: any, slots: any) => ({
      masterName: "default",
      masterVariant: "default",
      content: {
        type: NODE_TYPE.COMPONENT,
        componentName: "test",
        params: { ...params, ...slots },
        content: undefined,
      },
    }),
  };

  const layoutNoSlots: LayoutDefinition = {
    name: "noSlotTest",
    description: "Test layout with params only",
    params: { title: schema.string() },
    tokens: {},
    render: (params: any, _slots: any) => ({
      masterName: "default",
      masterVariant: "default",
      content: { type: NODE_TYPE.COMPONENT, componentName: "test", params, content: undefined },
    }),
  };

  it("validates params and slots separately", () => {
    const result = validateLayout(layoutWithSlots, { title: "Hello" }, { body: "Content" });
    assert.strictEqual(result.params.title, "Hello");
    assert.ok(Array.isArray(result.slots.body));
    assert.strictEqual((result.slots.body as any[]).length, 1);
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
    assert.strictEqual(result.params.title, "Hello");
  });

  it("rejects extra slot data when layout has no slots", () => {
    assert.throws(
      () => validateLayout(layoutNoSlots, { title: "Hello" }, { body: "some content" }),
      /does not accept slots.*body/,
    );
  });
});
