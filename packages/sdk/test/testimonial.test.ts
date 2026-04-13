import assert from "node:assert";
import { describe, it } from "node:test";
import { componentRegistry, HALIGN, NODE_TYPE, VALIGN } from "@tycoslide/core";
import { testimonial } from "../src/components/testimonial.js";
import type { TestimonialTokens } from "../src/index.js";
import {
  cardComponent,
  codeComponent,
  columnComponent,
  gridComponent,
  imageComponent,
  labelComponent,
  lineComponent,
  mermaidComponent,
  quoteComponent,
  rowComponent,
  shapeComponent,
  slideNumberComponent,
  stackComponent,
  tableComponent,
  testimonialComponent,
  textComponent,
} from "../src/index.js";
import { Component } from "../src/presets/names.js";
import { DEFAULT_TESTIMONIAL_TOKENS, mockTheme, noopCanvas } from "./mocks.js";

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
  testimonialComponent,
  labelComponent,
]);

describe("Testimonial Component", () => {
  const theme = mockTheme();

  describe("registration", () => {
    it("should be registered after register()", () => {
      assert.ok(componentRegistry.has(Component.Testimonial));
    });
  });

  describe("testimonial DSL function", () => {
    it("should create a component node with correct type", () => {
      const node = testimonial({ quote: "Test quote" }, DEFAULT_TESTIMONIAL_TOKENS);
      assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
      assert.strictEqual(node.componentName, Component.Testimonial);
    });

    it("should pass props correctly", () => {
      const node = testimonial(
        {
          quote: "A great quote",
          attribution: "— Author",
        },
        DEFAULT_TESTIMONIAL_TOKENS,
      );
      assert.strictEqual(node.params.quote, "A great quote");
      assert.strictEqual(node.params.attribution, "— Author");
    });
  });

  describe("expansion", () => {
    it("should render to stack with background and content", async () => {
      const node = testimonial({ quote: "Test" }, DEFAULT_TESTIMONIAL_TOKENS);
      const rendered = await componentRegistry.renderTree(node, { theme, canvas: noopCanvas() });

      // With background (default): stack(shape, column)
      assert.strictEqual(rendered.type, NODE_TYPE.STACK);
      if (rendered.type === NODE_TYPE.STACK) {
        assert.strictEqual(rendered.children.length, 2);
        assert.strictEqual(rendered.children[0].type, NODE_TYPE.SHAPE);
        assert.strictEqual(rendered.children[1].type, NODE_TYPE.CONTAINER);
      }
    });

    it("should render to column only when background is absent", async () => {
      const flatTokens: TestimonialTokens = {
        ...DEFAULT_TESTIMONIAL_TOKENS,
        background: undefined,
      };
      const node = testimonial({ quote: "Test" }, flatTokens);
      const rendered = await componentRegistry.renderTree(node, { theme, canvas: noopCanvas() });

      assert.strictEqual(rendered.type, NODE_TYPE.CONTAINER);
    });

    it("should include quote text as markdown", async () => {
      const node = testimonial({ quote: "A wise saying" }, DEFAULT_TESTIMONIAL_TOKENS);
      const rendered = await componentRegistry.renderTree(node, { theme, canvas: noopCanvas() });

      assert.strictEqual(rendered.type, NODE_TYPE.STACK);
      if (rendered.type === NODE_TYPE.STACK) {
        const contentColumn = rendered.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          // Quote text should be first child
          assert.ok(contentColumn.children.length >= 1);
          assert.strictEqual(contentColumn.children[0].type, NODE_TYPE.TEXT);
          if (contentColumn.children[0].type === NODE_TYPE.TEXT) {
            const runs = contentColumn.children[0].content as any[];
            assert.strictEqual(runs[0].text, "A wise saying");
          }
        }
      }
    });

    it("should include attribution when provided", async () => {
      const node = testimonial({ quote: "Quote text", attribution: "— Jane Smith" }, DEFAULT_TESTIMONIAL_TOKENS);
      const rendered = await componentRegistry.renderTree(node, { theme, canvas: noopCanvas() });

      assert.strictEqual(rendered.type, NODE_TYPE.STACK);
      if (rendered.type === NODE_TYPE.STACK) {
        const contentColumn = rendered.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentColumn.children.length, 2);
          // Attribution is plain text with RIGHT alignment and SMALL style
          const attribution = contentColumn.children[1];
          assert.strictEqual(attribution.type, NODE_TYPE.TEXT);
          if (attribution.type === NODE_TYPE.TEXT) {
            const runs = attribution.content as any[];
            assert.strictEqual(runs[0].text, "— Jane Smith");
            assert.strictEqual(attribution.hAlign, HALIGN.RIGHT);
            assert.strictEqual(attribution.style, "small");
          }
        }
      }
    });

    it("should include image when provided", async () => {
      const node = testimonial({ quote: "Quote text", image: "logo.png" }, DEFAULT_TESTIMONIAL_TOKENS);
      const rendered = await componentRegistry.renderTree(node, { theme, canvas: noopCanvas() });

      assert.strictEqual(rendered.type, NODE_TYPE.STACK);
      if (rendered.type === NODE_TYPE.STACK) {
        const contentColumn = rendered.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentColumn.children.length, 2);
          // Image is wrapped in a centering row
          assert.strictEqual(contentColumn.children[0].type, NODE_TYPE.CONTAINER);
          if (contentColumn.children[0].type === NODE_TYPE.CONTAINER) {
            assert.strictEqual(contentColumn.children[0].children[0].type, NODE_TYPE.IMAGE);
          }
          // Quote text is second
          assert.strictEqual(contentColumn.children[1].type, NODE_TYPE.TEXT);
        }
      }
    });

    it("should include all three children: image, quote, attribution", async () => {
      const node = testimonial(
        {
          quote: "Quote text",
          attribution: "— Author",
          image: "logo.png",
        },
        DEFAULT_TESTIMONIAL_TOKENS,
      );
      const rendered = await componentRegistry.renderTree(node, { theme, canvas: noopCanvas() });

      assert.strictEqual(rendered.type, NODE_TYPE.STACK);
      if (rendered.type === NODE_TYPE.STACK) {
        const contentColumn = rendered.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentColumn.children.length, 3);
          // Image is wrapped in a centering row
          assert.strictEqual(contentColumn.children[0].type, NODE_TYPE.CONTAINER);
          if (contentColumn.children[0].type === NODE_TYPE.CONTAINER) {
            assert.strictEqual(contentColumn.children[0].children[0].type, NODE_TYPE.IMAGE);
          }
          assert.strictEqual(contentColumn.children[1].type, NODE_TYPE.TEXT);
          assert.strictEqual(contentColumn.children[2].type, NODE_TYPE.TEXT);
        }
      }
    });

    it("should vertically center content", async () => {
      const node = testimonial({ quote: "Test" }, DEFAULT_TESTIMONIAL_TOKENS);
      const rendered = await componentRegistry.renderTree(node, { theme, canvas: noopCanvas() });

      assert.strictEqual(rendered.type, NODE_TYPE.STACK);
      if (rendered.type === NODE_TYPE.STACK) {
        const contentColumn = rendered.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentColumn.vAlign, VALIGN.MIDDLE);
        }
      }
    });

    it("should throw error when quote text is missing", () => {
      assert.rejects(async () => {
        const node = testimonial({} as any, DEFAULT_TESTIMONIAL_TOKENS);
        await componentRegistry.renderTree(node, { theme, canvas: noopCanvas() });
      }, /Testimonial component requires/);
    });
  });
});
