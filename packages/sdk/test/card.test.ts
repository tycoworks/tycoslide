import assert from "node:assert";
import { describe, it } from "node:test";
import { componentRegistry, NODE_TYPE } from "@tycoslide/core";
import { card } from "../src/components/card.js";
import type { CardTokens } from "../src/index.js";
import {
  cardComponent,
  codeComponent,
  columnComponent,
  gridComponent,
  imageComponent,
  lineComponent,
  mermaidComponent,
  quoteComponent,
  rowComponent,
  shapeComponent,
  slideNumberComponent,
  stackComponent,
  tableComponent,
  textComponent,
} from "../src/index.js";
import { Component } from "../src/presets/names.js";
import { DEFAULT_CARD_TOKENS, mockTheme, noopCanvas } from "./mocks.js";

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
]);

describe("Card Component", () => {
  const theme = mockTheme();

  describe("registration", () => {
    it("should be registered after register()", () => {
      assert.ok(componentRegistry.has(Component.Card));
    });
  });

  describe("card DSL function", () => {
    it("should create a component node with correct type", () => {
      const node = card({ title: "Test" }, DEFAULT_CARD_TOKENS);
      assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
      assert.strictEqual(node.componentName, Component.Card);
    });

    it("should pass props correctly", () => {
      const node = card(
        {
          title: "My Title",
          description: "My description",
        },
        DEFAULT_CARD_TOKENS,
      );
      assert.strictEqual(node.params.title, "My Title");
      assert.strictEqual(node.params.description, "My description");
    });
  });

  describe("expansion", () => {
    it("should render to stack with background and content", async () => {
      const node = card({ title: "Test" }, DEFAULT_CARD_TOKENS);
      const rendered = await componentRegistry.renderTree(node, { theme, canvas: noopCanvas() });

      // With background (default): stack(rectangle, column)
      assert.strictEqual(rendered.type, NODE_TYPE.STACK);
      if (rendered.type === NODE_TYPE.STACK) {
        assert.strictEqual(rendered.children.length, 2);
        assert.strictEqual(rendered.children[0].type, NODE_TYPE.SHAPE);
        assert.strictEqual(rendered.children[1].type, NODE_TYPE.CONTAINER);
      }
    });

    it("should render to column only when background is absent", async () => {
      const flatTokens: CardTokens = {
        ...DEFAULT_CARD_TOKENS,
        background: undefined,
      };
      const node = card({ title: "Test" }, flatTokens);
      const rendered = await componentRegistry.renderTree(node, { theme, canvas: noopCanvas() });

      assert.strictEqual(rendered.type, NODE_TYPE.CONTAINER);
    });

    it("should build children from title prop", async () => {
      const node = card({ title: "My Title" }, DEFAULT_CARD_TOKENS);
      const rendered = await componentRegistry.renderTree(node, { theme, canvas: noopCanvas() });

      assert.strictEqual(rendered.type, NODE_TYPE.STACK);
      if (rendered.type === NODE_TYPE.STACK) {
        const contentColumn = rendered.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentColumn.children.length, 1);
          assert.strictEqual(contentColumn.children[0].type, NODE_TYPE.TEXT);
          if (contentColumn.children[0].type === NODE_TYPE.TEXT) {
            // After renderTree, content is NormalizedRun[]
            const runs = contentColumn.children[0].content as any[];
            assert.strictEqual(runs[0].text, "My Title");
          }
        }
      }
    });

    it("should build children from title and description props", async () => {
      const node = card(
        {
          title: "Title",
          description: "Description",
        },
        DEFAULT_CARD_TOKENS,
      );
      const rendered = await componentRegistry.renderTree(node, { theme, canvas: noopCanvas() });

      assert.strictEqual(rendered.type, NODE_TYPE.STACK);
      if (rendered.type === NODE_TYPE.STACK) {
        const contentColumn = rendered.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentColumn.children.length, 2);
          if (contentColumn.children[0].type === NODE_TYPE.TEXT) {
            const runs0 = contentColumn.children[0].content as any[];
            assert.strictEqual(runs0[0].text, "Title");
          }
          if (contentColumn.children[1].type === NODE_TYPE.TEXT) {
            const runs1 = contentColumn.children[1].content as any[];
            assert.strictEqual(runs1[0].text, "Description");
          }
        }
      }
    });

    it("should return empty column when no content", async () => {
      const node = card({}, DEFAULT_CARD_TOKENS);
      const rendered = await componentRegistry.renderTree(node, { theme, canvas: noopCanvas() });

      assert.strictEqual(rendered.type, NODE_TYPE.STACK);
      if (rendered.type === NODE_TYPE.STACK) {
        const contentColumn = rendered.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentColumn.children.length, 0);
        }
      }
    });
  });
});
