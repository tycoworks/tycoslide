// Layout validation tests
// Verify Zod schema validation via validateLayout()

import assert from "node:assert";
import { describe, it } from "node:test";
import { z } from "zod";
import { validateLayout } from "../src/core/markdown/documentCompiler.js";
import { NODE_TYPE } from "../src/core/model/nodes.js";
import { param, schema } from "../src/core/model/param.js";
import type { LayoutDefinition } from "../src/core/rendering/registry.js";
import { testComponents } from "./test-components.js";

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
  render: (params: any, _slots: any) => ({
    type: NODE_TYPE.COMPONENT,
    componentName: "test",
    params: { text: params.title },
    content: undefined,
  }),
};

describe("validateLayout (params only)", () => {
  it("should return validated props for valid input", () => {
    const result = validateLayout(testLayout, { title: "Hello", count: 5 }, {}, testComponents);
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
      testComponents,
    );
    assert.deepStrictEqual(result.params.tags, ["a", "b"]);
    assert.strictEqual(result.params.active, true);
  });

  it("should accept optional fields when absent", () => {
    const result = validateLayout(testLayout, { title: "Hello", count: 1 }, {}, testComponents);
    assert.strictEqual(result.params.tags, undefined);
    assert.strictEqual(result.params.active, undefined);
  });

  it("should throw on missing required field", () => {
    assert.throws(
      () => validateLayout(testLayout, { count: 5 }, {}, testComponents),
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
      () => validateLayout(testLayout, { title: "Hello", count: "not a number" }, {}, testComponents),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("count"));
        return true;
      },
    );
  });

  it("should throw on negative number when positive required", () => {
    assert.throws(
      () => validateLayout(testLayout, { title: "Hello", count: -1 }, {}, testComponents),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("count"));
        return true;
      },
    );
  });

  it("should throw on invalid array element type", () => {
    assert.throws(
      () => validateLayout(testLayout, { title: "Hello", count: 1, tags: [123] }, {}, testComponents),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("tags"));
        return true;
      },
    );
  });

  it("should include layout name in error message", () => {
    assert.throws(
      () => validateLayout(testLayout, {}, {}, testComponents),
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
          testComponents,
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
    render: (params: any, _slots: any) => ({
      type: NODE_TYPE.COMPONENT,
      componentName: "test",
      params: { style: params.style },
      content: undefined,
    }),
  };

  it("should accept valid enum value", () => {
    const result = validateLayout(enumLayout, { style: "h1" }, {}, testComponents);
    assert.strictEqual(result.params.style, "h1");
  });

  it("should reject invalid enum value", () => {
    assert.throws(
      () => validateLayout(enumLayout, { style: "h99" }, {}, testComponents),
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
    render: (params: any, slots: any) => ({
      type: NODE_TYPE.COMPONENT,
      componentName: "test",
      params: { ...params, ...slots },
      content: undefined,
    }),
  };

  const layoutNoSlots: LayoutDefinition = {
    name: "noSlotTest",
    description: "Test layout with params only",
    params: { title: schema.string() },
    render: (params: any, _slots: any) => ({
      type: NODE_TYPE.COMPONENT,
      componentName: "test",
      params,
      content: undefined,
    }),
  };

  it("validates params and slots separately", () => {
    const result = validateLayout(layoutWithSlots, { title: "Hello" }, { body: "Content" }, testComponents);
    assert.strictEqual(result.params.title, "Hello");
    assert.ok(Array.isArray(result.slots.body));
    assert.strictEqual((result.slots.body as any[]).length, 1);
  });

  it("throws on missing required param", () => {
    assert.throws(
      () => validateLayout(layoutWithSlots, {}, { body: "Content" }, testComponents),
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
      () => validateLayout(layoutWithSlots, { title: "Hello" }, {}, testComponents),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("slots validation failed"));
        assert.ok(err.message.includes("body"));
        return true;
      },
    );
  });

  it("works for layout with no slots", () => {
    const result = validateLayout(layoutNoSlots, { title: "Hello" }, {}, testComponents);
    assert.strictEqual(result.params.title, "Hello");
  });

  it("rejects extra slot data when layout has no slots", () => {
    assert.throws(
      () => validateLayout(layoutNoSlots, { title: "Hello" }, { body: "some content" }, testComponents),
      /does not accept slots.*body/,
    );
  });
});
