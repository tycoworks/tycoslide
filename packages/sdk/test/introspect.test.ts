import * as assert from "node:assert";
import { describe, it } from "node:test";
import { param, schema } from "../src/authoring/param.js";
import { introspectParams } from "../src/plugin/introspect.js";

describe("introspectParams()", () => {
  it("classifies required string param", () => {
    const params = { title: schema.string() };
    const result = introspectParams(params);
    assert.deepStrictEqual(result, [{ name: "title", type: "string", required: true }]);
  });

  it("classifies optional string param", () => {
    const params = { subtitle: param.optional(schema.string()) };
    const result = introspectParams(params);
    assert.deepStrictEqual(result, [{ name: "subtitle", type: "string", required: false }]);
  });

  it("classifies number and boolean params", () => {
    const params = {
      count: schema.number(),
      visible: param.optional(schema.boolean()),
    };
    const result = introspectParams(params);
    assert.strictEqual(result[0].type, "number");
    assert.strictEqual(result[0].required, true);
    assert.strictEqual(result[1].type, "boolean");
    assert.strictEqual(result[1].required, false);
  });

  it("classifies enum with values", () => {
    const params = { align: schema.enum(["left", "center", "right"]) };
    const result = introspectParams(params);
    assert.strictEqual(result[0].type, "enum");
    assert.deepStrictEqual(result[0].enumValues, ["left", "center", "right"]);
  });

  it("classifies array with item type", () => {
    const params = { items: schema.array(schema.string()) };
    const result = introspectParams(params);
    assert.strictEqual(result[0].type, "array");
    assert.strictEqual(result[0].itemType, "string");
  });

  it("classifies object with nested shape", () => {
    const params = {
      card: schema.object({ title: schema.string(), count: param.optional(schema.number()) }),
    };
    const result = introspectParams(params);
    assert.strictEqual(result[0].type, "object");
    assert.ok(result[0].objectShape);
    assert.strictEqual(result[0].objectShape!.length, 2);
    assert.strictEqual(result[0].objectShape![0].name, "title");
    assert.strictEqual(result[0].objectShape![0].type, "string");
    assert.strictEqual(result[0].objectShape![1].name, "count");
    assert.strictEqual(result[0].objectShape![1].required, false);
  });

  it("classifies array of objects with nested shape", () => {
    const params = {
      cards: schema.array(schema.object({ title: schema.string() })),
    };
    const result = introspectParams(params);
    assert.strictEqual(result[0].type, "array");
    assert.strictEqual(result[0].itemType, "object");
    assert.ok(result[0].objectShape);
    assert.strictEqual(result[0].objectShape![0].name, "title");
  });

  it("handles empty param shape", () => {
    const result = introspectParams({});
    assert.deepStrictEqual(result, []);
  });

  it("handles default values as non-required", () => {
    const params = { size: schema.number().default(12) };
    const result = introspectParams(params);
    assert.strictEqual(result[0].required, false);
    assert.strictEqual(result[0].type, "number");
  });
});
