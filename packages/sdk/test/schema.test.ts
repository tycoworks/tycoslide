// Component Schema Tests
// Tests that real component .schema properties work correctly with Zod
// Moved from core/test/defineComponent.test.ts — these test component schemas, not the define() API

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { param, schema } from "@tycoslide/core";
import { z } from "zod";
import { cardComponent } from "../src/components/card.js";
import { imageComponent } from "../src/components/image.js";
import { mermaidComponent } from "../src/components/mermaid.js";
import { quoteComponent } from "../src/components/quote.js";
import { textComponent } from "../src/components/text.js";

describe("Component .schema properties", () => {
  describe("real component .schema properties", () => {
    test("textComponent.schema is z.string()", () => {
      assert.ok(textComponent.schema);
      assert.strictEqual(textComponent.schema.safeParse("**bold**").success, true);
      assert.strictEqual(textComponent.schema.safeParse("plain").success, true);
      assert.strictEqual(textComponent.schema.safeParse(42).success, false);
    });

    test("imageComponent.schema is z.string()", () => {
      assert.ok(imageComponent.schema);
      assert.strictEqual(imageComponent.schema.safeParse("logo.png").success, true);
      assert.strictEqual(imageComponent.schema.safeParse(42).success, false);
    });

    test("mermaidComponent.schema is z.string()", () => {
      assert.ok(mermaidComponent.schema);
      assert.strictEqual(mermaidComponent.schema.safeParse("flowchart LR\n  A-->B").success, true);
      assert.strictEqual(mermaidComponent.schema.safeParse(42).success, false);
    });

    test("cardComponent.schema is content schema (optional string)", () => {
      assert.ok(cardComponent.schema);
      // Card now has content: schema.string().optional() — schema is the content type
      assert.strictEqual(cardComponent.schema.safeParse("some body text").success, true);
      assert.strictEqual(cardComponent.schema.safeParse(undefined).success, true);
      assert.strictEqual(cardComponent.schema.safeParse(42).success, false);
    });

    test("quoteComponent.schema is content schema (optional string)", () => {
      assert.ok(quoteComponent.schema);
      // Quote now has content: schema.string().optional() — schema is the content type
      assert.strictEqual(quoteComponent.schema.safeParse("quote body").success, true);
      assert.strictEqual(quoteComponent.schema.safeParse(undefined).success, true);
      assert.strictEqual(quoteComponent.schema.safeParse(42).success, false);
    });
  });

  describe("component .schema in layout params", () => {
    test("textComponent.schema usable in schema.array()", () => {
      const arr = schema.array(textComponent.schema);
      const result = arr.safeParse(["**bold**", "plain text"]);
      assert.strictEqual(result.success, true);
    });

    test("cardComponent.schema usable in schema.array()", () => {
      // Card schema is now optional string (content type), not ZodObject
      const arr = schema.array(cardComponent.schema);
      const result = arr.safeParse(["body 1", "body 2"]);
      assert.strictEqual(result.success, true);
    });

    test("mixed component schemas in layout params object", () => {
      const layoutParams = z.object({
        title: textComponent.schema,
        eyebrow: param.optional(textComponent.schema),
        logo: param.optional(imageComponent.schema),
        cards: schema.array(cardComponent.schema),
      });

      const result = layoutParams.safeParse({
        title: "**Welcome**",
        logo: "logo.png",
        cards: ["card body 1"],
      });
      assert.strictEqual(result.success, true);
    });
  });
});
