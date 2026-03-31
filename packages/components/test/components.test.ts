// DSL Factory Function Tests
// Tests for all factory functions in src/dsl/
// All DSL functions return ComponentNode; tests render to ElementNode where needed.

import * as assert from "node:assert";
import { describe, test } from "node:test";
import type {
  ContainerNode,
  GridNode,
  ImageNode,
  LineNode,
  ShapeNode,
  SlideNumberNode,
  StackNode,
  TableNode,
} from "@tycoslide/core";
import {
  componentRegistry,
  DASH_TYPE,
  DIRECTION,
  HALIGN,
  NODE_TYPE,
  SHADOW_TYPE,
  SHAPE,
  SIZE,
  VALIGN,
} from "@tycoslide/core";
import { card } from "../src/card.js";
import {
  cardComponent,
  codeComponent,
  column,
  columnComponent,
  grid,
  gridComponent,
  image,
  imageComponent,
  line,
  lineComponent,
  listComponent,
  mermaidComponent,
  quoteComponent,
  row,
  rowComponent,
  type ShapeTokens,
  shape,
  shapeComponent,
  slideNumber,
  slideNumberComponent,
  stack,
  stackComponent,
  table,
  tableComponent,
  text,
  textComponent,
} from "../src/index.js";
import { Component } from "../src/names.js";
import {
  mockTheme as createMockTheme,
  DEFAULT_CARD_TOKENS,
  DEFAULT_IMAGE_TOKENS,
  DEFAULT_LINE_TOKENS,
  DEFAULT_SHAPE_TOKENS,
  DEFAULT_SLIDE_NUMBER_TOKENS,
  DEFAULT_TABLE_TOKENS,
  DEFAULT_TEXT_TOKENS,
  noopCanvas,
} from "./mocks.js";

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
  listComponent,
]);

// Theme for text expansion
const theme = createMockTheme();

/** Expand a ComponentNode to its ElementNode form */
async function render(node: any) {
  return componentRegistry.renderTree(node, { theme, canvas: noopCanvas() });
}

// ============================================
// TEXT FACTORY FUNCTIONS
// ============================================

// ============================================
// IMAGE
// ============================================

describe("image()", () => {
  test("returns ComponentNode", () => {
    const node = image("photo.jpg", DEFAULT_IMAGE_TOKENS);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.Image);
  });

  test("renders to correct NODE_TYPE", async () => {
    const node = (await render(image("photo.jpg", DEFAULT_IMAGE_TOKENS))) as ImageNode;
    assert.strictEqual(node.type, NODE_TYPE.IMAGE);
  });

  test("sets src correctly", async () => {
    const node = (await render(image("test.png", DEFAULT_IMAGE_TOKENS))) as ImageNode;
    assert.strictEqual(node.src, "test.png");
  });

  // Asset path resolution (tested through image expansion)

  test("resolves $dot.path to string value", async () => {
    const assets = { icons: { rocket: "/path/to/rocket.svg" } };
    const node = (await componentRegistry.renderTree(image("$icons.rocket", DEFAULT_IMAGE_TOKENS), {
      theme,
      assets,
      canvas: noopCanvas(),
    })) as ImageNode;
    assert.strictEqual(node.src, "/path/to/rocket.svg");
  });

  test("resolves deeply nested asset path", async () => {
    const assets = { images: { heroes: { landing: "/hero.png" } } };
    const node = (await componentRegistry.renderTree(image("$images.heroes.landing", DEFAULT_IMAGE_TOKENS), {
      theme,
      assets,
      canvas: noopCanvas(),
    })) as ImageNode;
    assert.strictEqual(node.src, "/hero.png");
  });

  test("throws when assets not provided for asset reference", async () => {
    await assert.rejects(
      () => componentRegistry.renderTree(image("$icons.rocket", DEFAULT_IMAGE_TOKENS), { theme, canvas: noopCanvas() }),
      /asset reference.*no assets provided/,
    );
  });

  test("throws when asset key not found", async () => {
    const assets = { icons: { star: "/star.svg" } };
    await assert.rejects(
      () => componentRegistry.renderTree(image("$icons.rocket", DEFAULT_IMAGE_TOKENS), { theme, assets, canvas: noopCanvas() }),
      /could not be resolved/,
    );
  });

  test("throws when asset path resolves to object (with suggestions)", async () => {
    const assets = { icons: { rocket: "/rocket.svg", star: "/star.svg" } };
    await assert.rejects(
      () => componentRegistry.renderTree(image("$icons", DEFAULT_IMAGE_TOKENS), { theme, assets, canvas: noopCanvas() }),
      /resolved to an object.*Did you mean/,
    );
  });

  test("throws when traversal hits non-object mid-path", async () => {
    const assets = { icons: { rocket: "/rocket.svg" } };
    await assert.rejects(
      () => componentRegistry.renderTree(image("$icons.rocket.size", DEFAULT_IMAGE_TOKENS), { theme, assets, canvas: noopCanvas() }),
      /is not an object/,
    );
  });

  test("passes through non-asset paths unchanged", async () => {
    const node = (await render(image("https://example.com/photo.jpg", DEFAULT_IMAGE_TOKENS))) as ImageNode;
    assert.strictEqual(node.src, "https://example.com/photo.jpg");
  });
});

// ============================================
// LINE
// ============================================

describe("line()", () => {
  test("returns ComponentNode", () => {
    const node = line(DEFAULT_LINE_TOKENS);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.Line);
  });

  test("renders to correct NODE_TYPE", async () => {
    const node = (await render(line(DEFAULT_LINE_TOKENS))) as LineNode;
    assert.strictEqual(node.type, NODE_TYPE.LINE);
  });

  test("uses token values for color, width, dashType", async () => {
    const node = (await render(line(DEFAULT_LINE_TOKENS))) as LineNode;
    assert.strictEqual(node.stroke.color, DEFAULT_LINE_TOKENS.color);
    assert.strictEqual(node.stroke.width, DEFAULT_LINE_TOKENS.width);
    assert.strictEqual(node.stroke.dashType, DASH_TYPE.SOLID);
  });
});

// ============================================
// SHAPE (area shapes)
// ============================================

describe("shape()", () => {
  test("returns ComponentNode", () => {
    const node = shape(DEFAULT_SHAPE_TOKENS, { shape: SHAPE.ELLIPSE });
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.Shape);
  });

  test("renders to specified shape type", async () => {
    const node = (await render(shape(DEFAULT_SHAPE_TOKENS, { shape: SHAPE.TRIANGLE }))) as ShapeNode;
    assert.strictEqual(node.type, NODE_TYPE.SHAPE);
    assert.strictEqual(node.shape, SHAPE.TRIANGLE);
  });

  test("uses token values for fill, defaults for omitted tokens", async () => {
    const node = (await render(shape(DEFAULT_SHAPE_TOKENS, { shape: SHAPE.RECTANGLE }))) as ShapeNode;
    assert.deepStrictEqual(node.fill, { color: "#333333", opacity: 100 });
    assert.strictEqual(node.border, undefined);
    assert.strictEqual(node.cornerRadius, 0);
  });

  test("passes fill color from tokens", async () => {
    const tokens: ShapeTokens = { ...DEFAULT_SHAPE_TOKENS, fill: "#FF0000" };
    const node = (await render(shape(tokens, { shape: SHAPE.RECTANGLE }))) as ShapeNode;
    assert.deepStrictEqual(node.fill, { color: "#FF0000", opacity: 100 });
  });

  test("passes fill color with explicit opacity from tokens", async () => {
    const tokens: ShapeTokens = { ...DEFAULT_SHAPE_TOKENS, fill: "#FF0000", fillOpacity: 50 };
    const node = (await render(shape(tokens, { shape: SHAPE.RECTANGLE }))) as ShapeNode;
    assert.deepStrictEqual(node.fill, { color: "#FF0000", opacity: 50 });
  });

  test("passes border properties from tokens", async () => {
    const tokens: ShapeTokens = {
      ...DEFAULT_SHAPE_TOKENS,
      border: { color: "#0000FF", width: 2, dashType: DASH_TYPE.SOLID },
    };
    const node = (await render(shape(tokens, { shape: SHAPE.RECTANGLE }))) as ShapeNode;
    assert.strictEqual(node.border?.color, "#0000FF");
    assert.strictEqual(node.border?.width, 2);
  });

  test("passes corner radius from tokens", async () => {
    const tokens: ShapeTokens = { ...DEFAULT_SHAPE_TOKENS, cornerRadius: 0.125 };
    const node = (await render(shape(tokens, { shape: SHAPE.RECTANGLE }))) as ShapeNode;
    assert.strictEqual(node.cornerRadius, 0.125);
  });

  test("passes specific shape with fill from tokens", async () => {
    const tokens: ShapeTokens = { ...DEFAULT_SHAPE_TOKENS, fill: "#FF0000", fillOpacity: 50 };
    const node = (await render(shape(tokens, { shape: SHAPE.DIAMOND }))) as ShapeNode;
    assert.strictEqual(node.shape, SHAPE.DIAMOND);
    assert.deepStrictEqual(node.fill, { color: "#FF0000", opacity: 50 });
  });

  test("applies all tokens and props together", async () => {
    const tokens: ShapeTokens = {
      fill: "#EEEEEE",
      fillOpacity: 80,
      border: { color: "#333333", width: 1, dashType: DASH_TYPE.SOLID },
      cornerRadius: 0.25,
    };
    const node = (await render(shape(tokens, { shape: SHAPE.ELLIPSE }))) as ShapeNode;
    assert.strictEqual(node.shape, SHAPE.ELLIPSE);
    assert.deepStrictEqual(node.fill, { color: "#EEEEEE", opacity: 80 });
    assert.strictEqual(node.border?.color, "#333333");
    assert.strictEqual(node.border?.width, 1);
    assert.strictEqual(node.cornerRadius, 0.25);
  });

  test("no shadow when shadow token omitted", async () => {
    const node = (await render(shape(DEFAULT_SHAPE_TOKENS, { shape: SHAPE.RECTANGLE }))) as ShapeNode;
    assert.strictEqual(node.shadow, undefined);
  });

  test("passes shadow from tokens when present", async () => {
    const tokens: ShapeTokens = {
      ...DEFAULT_SHAPE_TOKENS,
      shadow: { type: SHADOW_TYPE.OUTER, color: "#000000", opacity: 25, blur: 8, offset: 3, angle: 315 },
    };
    const node = (await render(shape(tokens, { shape: SHAPE.RECTANGLE }))) as ShapeNode;
    assert.ok(node.shadow);
    assert.strictEqual(node.shadow.type, SHADOW_TYPE.OUTER);
    assert.strictEqual(node.shadow.color, "#000000");
    assert.strictEqual(node.shadow.opacity, 25);
    assert.strictEqual(node.shadow.blur, 8);
    assert.strictEqual(node.shadow.offset, 3);
    assert.strictEqual(node.shadow.angle, 315);
  });

  test("shadow absent when not provided in tokens", async () => {
    const tokens = { fill: "#FF0000", fillOpacity: 100, cornerRadius: 0 };
    const node = (await render(shape(tokens, { shape: SHAPE.RECTANGLE }))) as ShapeNode;
    assert.deepStrictEqual(node.fill, { color: "#FF0000", opacity: 100 });
    assert.strictEqual(node.border, undefined);
    assert.strictEqual(node.cornerRadius, 0);
    assert.strictEqual(node.shadow, undefined);
  });
});

// ============================================
// SLIDE NUMBER
// ============================================

describe("slideNumber()", () => {
  test("returns ComponentNode", () => {
    const node = slideNumber(DEFAULT_SLIDE_NUMBER_TOKENS);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.SlideNumber);
  });

  test("renders to correct NODE_TYPE", async () => {
    const node = (await render(slideNumber(DEFAULT_SLIDE_NUMBER_TOKENS))) as SlideNumberNode;
    assert.strictEqual(node.type, NODE_TYPE.SLIDE_NUMBER);
  });

  test("uses token values for style, color, hAlign", async () => {
    const node = (await render(slideNumber(DEFAULT_SLIDE_NUMBER_TOKENS))) as SlideNumberNode;
    assert.strictEqual(node.style, "footer");
    assert.strictEqual(node.color, "#666666");
    assert.strictEqual(node.hAlign, HALIGN.RIGHT);
  });

  test("pre-resolves resolvedStyle at render time", async () => {
    const node = (await render(slideNumber(DEFAULT_SLIDE_NUMBER_TOKENS))) as SlideNumberNode;
    assert.ok(node.resolvedStyle);
    assert.strictEqual(node.resolvedStyle.fontSize, 12);
  });
});

// ============================================
// ROW
// ============================================

describe("row()", () => {
  const child1 = text("A", DEFAULT_TEXT_TOKENS);
  const child2 = text("B", DEFAULT_TEXT_TOKENS);
  const child3 = text("C", DEFAULT_TEXT_TOKENS);

  test("returns ComponentNode", () => {
    const node = row({ spacing: 0 }, child1);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.Row);
  });

  test("accepts children with spacing: 0", async () => {
    const node = row({ spacing: 0 }, child1, child2, child3);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.type, NODE_TYPE.CONTAINER);
    assert.strictEqual(rendered.direction, DIRECTION.ROW);
    assert.strictEqual(rendered.children.length, 3);
  });

  test("defaults to width: FILL, height: HUG", async () => {
    const node = row({ spacing: 0 }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.width, SIZE.FILL);
    assert.strictEqual(rendered.height, SIZE.HUG);
  });

  test("applies default vAlign", async () => {
    const node = row({ spacing: 0 }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.vAlign, VALIGN.TOP);
  });

  test("applies default hAlign", async () => {
    const node = row({ spacing: 0 }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.hAlign, HALIGN.LEFT);
  });

  test("applies hAlign prop", async () => {
    const node = row({ spacing: 0, hAlign: HALIGN.CENTER }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.hAlign, HALIGN.CENTER);
  });

  test("applies vAlign prop", async () => {
    const node = row({ spacing: 0, vAlign: VALIGN.MIDDLE }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.vAlign, VALIGN.MIDDLE);
  });

  test("applies padding prop", async () => {
    const node = row({ spacing: 0, padding: 0.5 }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.padding, 0.5);
  });

  test("applies spacing prop", async () => {
    const node = row({ spacing: 0.125 }, child1, child2);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.spacing, 0.125);
  });

  test("applies width prop", async () => {
    const node = row({ spacing: 0, width: SIZE.FILL }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.width, SIZE.FILL);
  });

  test("applies height prop", async () => {
    const node = row({ spacing: 0, height: 2.5 }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.height, 2.5);
  });

  test("distinguishes props from children", async () => {
    const node = row({ spacing: 0.125 }, text("A", DEFAULT_TEXT_TOKENS));
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.children.length, 1);
    assert.strictEqual(rendered.spacing, 0.125);
  });

  test("accepts props with children (props first)", async () => {
    const node = row({ spacing: 0.125 }, text("A", DEFAULT_TEXT_TOKENS), text("B", DEFAULT_TEXT_TOKENS));
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.children.length, 2);
    assert.strictEqual(rendered.spacing, 0.125);
  });

  test("applies all props together", async () => {
    const node = row(
      { spacing: 0.25, vAlign: VALIGN.MIDDLE },
      text("A", DEFAULT_TEXT_TOKENS),
      text("B", DEFAULT_TEXT_TOKENS),
    );
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.spacing, 0.25);
    assert.strictEqual(rendered.vAlign, VALIGN.MIDDLE);
    assert.strictEqual(rendered.children.length, 2);
  });

  test("handles single child", async () => {
    const node = row({ spacing: 0 }, text("A", DEFAULT_TEXT_TOKENS));
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.children.length, 1);
  });

  test("handles empty children", async () => {
    const node = row({ spacing: 0 });
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.children.length, 0);
  });
});

// ============================================
// COLUMN
// ============================================

describe("column()", () => {
  const child1 = text("A", DEFAULT_TEXT_TOKENS);
  const child2 = text("B", DEFAULT_TEXT_TOKENS);
  const child3 = text("C", DEFAULT_TEXT_TOKENS);

  test("returns ComponentNode", () => {
    const node = column({ spacing: 0 }, child1);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.Column);
  });

  test("accepts children with spacing: 0", async () => {
    const node = column({ spacing: 0 }, child1, child2, child3);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.type, NODE_TYPE.CONTAINER);
    assert.strictEqual(rendered.direction, DIRECTION.COLUMN);
    assert.strictEqual(rendered.children.length, 3);
  });

  test("defaults to width: FILL, height: HUG", async () => {
    const node = column({ spacing: 0 }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.width, SIZE.FILL);
    assert.strictEqual(rendered.height, SIZE.HUG);
  });

  test("applies default vAlign", async () => {
    const node = column({ spacing: 0 }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.vAlign, VALIGN.TOP);
  });

  test("applies default hAlign", async () => {
    const node = column({ spacing: 0 }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.hAlign, HALIGN.LEFT);
  });

  test("applies hAlign prop", async () => {
    const node = column({ spacing: 0, hAlign: HALIGN.RIGHT }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.hAlign, HALIGN.RIGHT);
  });

  test("applies vAlign prop", async () => {
    const node = column({ spacing: 0, vAlign: VALIGN.BOTTOM }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.vAlign, VALIGN.BOTTOM);
  });

  test("applies height prop", async () => {
    const node = column({ spacing: 0, height: SIZE.FILL }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.height, SIZE.FILL);
  });

  test("applies width prop", async () => {
    const node = column({ spacing: 0, width: 3.0 }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.width, 3.0);
  });

  test("applies spacing prop", async () => {
    const node = column({ spacing: 0.5 }, child1, child2);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.spacing, 0.5);
  });

  test("applies padding prop", async () => {
    const node = column({ spacing: 0, padding: 0.25 }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.padding, 0.25);
  });

  test("applies numeric height", async () => {
    const node = column({ spacing: 0, height: 2.5 }, text("A", DEFAULT_TEXT_TOKENS));
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.height, 2.5);
  });

  test("distinguishes props from children", async () => {
    const node = column({ spacing: 0.125 }, text("A", DEFAULT_TEXT_TOKENS));
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.children.length, 1);
    assert.strictEqual(rendered.spacing, 0.125);
  });

  test("accepts props with children (props first)", async () => {
    const node = column({ spacing: 0.125 }, text("A", DEFAULT_TEXT_TOKENS), text("B", DEFAULT_TEXT_TOKENS));
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.children.length, 2);
    assert.strictEqual(rendered.spacing, 0.125);
  });

  test("applies all props together", async () => {
    const node = column(
      { height: SIZE.FILL, spacing: 0.25, vAlign: VALIGN.MIDDLE, hAlign: HALIGN.CENTER },
      text("A", DEFAULT_TEXT_TOKENS),
      text("B", DEFAULT_TEXT_TOKENS),
    );
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.height, SIZE.FILL);
    assert.strictEqual(rendered.spacing, 0.25);
    assert.strictEqual(rendered.vAlign, VALIGN.MIDDLE);
    assert.strictEqual(rendered.hAlign, HALIGN.CENTER);
    assert.strictEqual(rendered.children.length, 2);
  });

  test("handles single child", async () => {
    const node = column({ spacing: 0 }, text("A", DEFAULT_TEXT_TOKENS));
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.children.length, 1);
  });

  test("handles empty children", async () => {
    const node = column({ spacing: 0 });
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.children.length, 0);
  });
});

// ============================================
// STACK
// ============================================

describe("stack()", () => {
  const child1 = text("A", DEFAULT_TEXT_TOKENS);
  const child2 = text("B", DEFAULT_TEXT_TOKENS);

  test("returns ComponentNode", () => {
    const node = stack(child1);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.Stack);
  });

  test("renders to correct NODE_TYPE", async () => {
    const node = (await render(stack(child1))) as StackNode;
    assert.strictEqual(node.type, NODE_TYPE.STACK);
  });

  test("children are preserved", async () => {
    const node = (await render(stack(child1, child2))) as StackNode;
    assert.strictEqual(node.children.length, 2);
  });

  test("defaults to width: FILL, height: HUG", async () => {
    const node = (await render(stack(child1))) as StackNode;
    assert.strictEqual(node.width, SIZE.FILL);
    assert.strictEqual(node.height, SIZE.HUG);
  });

  test("passes width prop", async () => {
    const node = (await render(stack({ width: 5 }, child1))) as StackNode;
    assert.strictEqual(node.width, 5);
  });

  test("passes height prop", async () => {
    const node = (await render(stack({ height: 3 }, child1))) as StackNode;
    assert.strictEqual(node.height, 3);
  });

  test("passes width and height together", async () => {
    const node = (await render(stack({ width: 5, height: 3 }, child1, child2))) as StackNode;
    assert.strictEqual(node.width, 5);
    assert.strictEqual(node.height, 3);
    assert.strictEqual(node.children.length, 2);
  });

  test("passes SIZE.FILL for width", async () => {
    const node = (await render(stack({ width: SIZE.FILL }, child1))) as StackNode;
    assert.strictEqual(node.width, SIZE.FILL);
  });

  test("passes SIZE.FILL for height", async () => {
    const node = (await render(stack({ height: SIZE.FILL }, child1))) as StackNode;
    assert.strictEqual(node.height, SIZE.FILL);
  });
});

// ============================================
// GRID
// ============================================

describe("grid()", () => {
  const child1 = text("A", DEFAULT_TEXT_TOKENS);
  const child2 = text("B", DEFAULT_TEXT_TOKENS);
  const child3 = text("C", DEFAULT_TEXT_TOKENS);
  const child4 = text("D", DEFAULT_TEXT_TOKENS);

  test("returns a single ComponentNode", () => {
    const g = grid({ columns: 2, spacing: 0.25 }, child1, child2);
    assert.strictEqual(g.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(g.componentName, Component.Grid);
  });

  test("renders to GridNode", async () => {
    const node = (await render(grid({ columns: 2, spacing: 0.25 }, child1, child2))) as GridNode;
    assert.strictEqual(node.type, NODE_TYPE.GRID);
  });

  test("sets columns from params", async () => {
    const node = (await render(grid({ columns: 3, spacing: 0.25 }, child1, child2))) as GridNode;
    assert.strictEqual(node.columns, 3);
  });

  test("sets spacing from params", async () => {
    const node = (await render(grid({ columns: 2, spacing: 0.125 }, child1, child2))) as GridNode;
    assert.strictEqual(node.spacing, 0.125);
  });

  test("defaults to height: SIZE.FILL", async () => {
    const node = (await render(grid({ columns: 2, spacing: 0.25 }, child1, child2))) as GridNode;
    assert.strictEqual(node.height, SIZE.FILL);
  });

  test("passes height through from params", async () => {
    const node = (await render(grid({ columns: 2, spacing: 0.25, height: SIZE.HUG }, child1, child2))) as GridNode;
    assert.strictEqual(node.height, SIZE.HUG);
  });

  test("width is SIZE.FILL", async () => {
    const node = (await render(grid({ columns: 2, spacing: 0.25 }, child1, child2))) as GridNode;
    assert.strictEqual(node.width, SIZE.FILL);
  });

  test("children are flat (not chunked into rows)", async () => {
    const node = (await render(grid({ columns: 2, spacing: 0.25 }, child1, child2, child3, child4))) as GridNode;
    assert.strictEqual(node.children.length, 4);
  });

  test("handles empty children", async () => {
    const node = (await render(grid({ columns: 2, spacing: 0.25 }))) as GridNode;
    assert.strictEqual(node.type, NODE_TYPE.GRID);
    assert.strictEqual(node.children.length, 0);
  });

  test("handles single child", async () => {
    const node = (await render(grid({ columns: 2, spacing: 0.25 }, child1))) as GridNode;
    assert.strictEqual(node.children.length, 1);
  });
});

// ============================================
// CARD
// ============================================

describe("card()", () => {
  test("returns ComponentNode with correct type", () => {
    const node = card({}, DEFAULT_CARD_TOKENS);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.Card);
  });

  test("passes props to ComponentNode", () => {
    const node = card(
      {
        title: "Test Title",
        description: "Test Description",
      },
      DEFAULT_CARD_TOKENS,
    );
    assert.strictEqual(node.params.title, "Test Title");
    assert.strictEqual(node.params.description, "Test Description");
  });

  test("preserves all props", () => {
    const props = {
      image: "hero.jpg",
      title: "Title",
      description: "Description",
    };
    const node = card(props, DEFAULT_CARD_TOKENS);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.Card);
    assert.strictEqual(node.params.image, "hero.jpg");
    assert.strictEqual(node.params.title, "Title");
    assert.strictEqual(node.params.description, "Description");
  });
});

// ============================================
// TABLE FACTORY FUNCTIONS
// ============================================

describe("table()", () => {
  test("returns ComponentNode", () => {
    const node = table([["Header"]], DEFAULT_TABLE_TOKENS);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.Table);
  });

  test("TableCellData cells preserve properties after expansion", async () => {
    const tNode = table(
      [["Header", { content: "colored cell", textStyle: "small", color: "#FF0000", hAlign: HALIGN.CENTER }]],
      DEFAULT_TABLE_TOKENS,
    );
    const node = (await render(tNode)) as TableNode;
    assert.strictEqual(node.type, NODE_TYPE.TABLE);
    const cell = node.rows[0][1];
    assert.deepStrictEqual(cell.content, [{ text: "colored cell" }]);
    assert.strictEqual(cell.textStyle, "small");
    assert.strictEqual(cell.color, "#FF0000");
    assert.strictEqual(cell.hAlign, HALIGN.CENTER);
    assert.ok(cell.resolvedStyle);
    assert.strictEqual(cell.resolvedStyle.fontSize, 12); // from mockTextStyle
  });

  test("TableCellData without vAlign resolves to table default", async () => {
    const tNode = table([[{ content: "cell with default vAlign" }]], DEFAULT_TABLE_TOKENS);
    const node = (await render(tNode)) as TableNode;
    const cell = node.rows[0][0];
    assert.strictEqual(cell.vAlign, VALIGN.MIDDLE);
  });

  test("string cells are fully resolved as TableCellData", async () => {
    const tNode = table([["plain string"]], DEFAULT_TABLE_TOKENS);
    const node = (await render(tNode)) as TableNode;
    const cell = node.rows[0][0];
    assert.deepStrictEqual(cell.content, [{ text: "plain string" }]);
    assert.strictEqual(cell.color, "#000000"); // resolved from table token cellTextColor
    assert.strictEqual(cell.textStyle, "body"); // resolved from table token
    assert.ok(cell.resolvedStyle);
    assert.strictEqual(cell.resolvedStyle.fontSize, 12); // from mockTextStyle
  });

  test("headerRow token presence puts headerRow on TableNode", async () => {
    const tNode = table([["a", "b"]], DEFAULT_TABLE_TOKENS);
    const node = (await render(tNode)) as TableNode;
    assert.ok(node.headerRow); // DEFAULT_TABLE_TOKENS has headerRow set
    assert.strictEqual(node.headerCol, undefined); // no headerCol in DEFAULT_TABLE_TOKENS
  });

  test("headerCol token presence puts headerCol on TableNode", async () => {
    const tokens = {
      ...DEFAULT_TABLE_TOKENS,
      headerCol: {
        textStyle: "body",
        textColor: "#000000",
        background: "#EEEEEE",
        backgroundOpacity: 100,
      },
    };
    const tNode = table([["a", "b"]], tokens);
    const node = (await render(tNode)) as TableNode;
    assert.ok(node.headerRow);
    assert.ok(node.headerCol);
    assert.strictEqual(node.headerCol.background, "#EEEEEE");
  });

  test("no header tokens means no header zones", async () => {
    const { headerRow: _, ...noHeaderTokens } = DEFAULT_TABLE_TOKENS;
    const tNode = table([["a", "b"]], noHeaderTokens as typeof DEFAULT_TABLE_TOKENS);
    const node = (await render(tNode)) as TableNode;
    assert.strictEqual(node.headerRow, undefined);
    assert.strictEqual(node.headerCol, undefined);
  });

  test("intersection cell [0,0] uses headerRow styling over headerCol", async () => {
    const tokens = {
      ...DEFAULT_TABLE_TOKENS,
      headerRow: {
        textStyle: "h1",
        textColor: "#FF0000",
        background: "#AAAAAA",
        backgroundOpacity: 100,
      },
      headerCol: {
        textStyle: "h2",
        textColor: "#00FF00",
        background: "#BBBBBB",
        backgroundOpacity: 100,
      },
    };
    const tNode = table(
      [
        ["corner", "col header"],
        ["row header", "data"],
      ],
      tokens,
    );
    const node = (await render(tNode)) as TableNode;
    const corner = node.rows[0][0];
    assert.strictEqual(corner.textStyle, "h1", "intersection cell should use headerRow textStyle");
    assert.strictEqual(corner.color, "#FF0000", "intersection cell should use headerRow textColor");
  });

  test("headerCol token controls text styling for column header cells", async () => {
    const { headerRow: _, ...noHeaderRow } = DEFAULT_TABLE_TOKENS;
    const tokens = {
      ...noHeaderRow,
      headerCol: {
        textStyle: "h3",
        textColor: "#PURPLE",
        background: "#CCCCCC",
        backgroundOpacity: 100,
      },
    };
    const tNode = table(
      [
        ["row header", "data 1"],
        ["row header 2", "data 2"],
      ],
      tokens as typeof DEFAULT_TABLE_TOKENS,
    );
    const node = (await render(tNode)) as TableNode;
    const colHeaderCell = node.rows[0][0];
    assert.strictEqual(colHeaderCell.textStyle, "h3", "column header cell should use headerCol textStyle");
    assert.strictEqual(colHeaderCell.color, "#PURPLE", "column header cell should use headerCol textColor");
    const dataCell = node.rows[0][1];
    assert.strictEqual(
      dataCell.textStyle,
      DEFAULT_TABLE_TOKENS.cellTextStyle,
      "non-header cell should use cell defaults",
    );
  });

  test("headerRow.hAlign overrides shared hAlign", async () => {
    const tokens = {
      ...DEFAULT_TABLE_TOKENS,
      headerRow: {
        textStyle: "body",
        textColor: "#000000",
        background: "#FFFFFF",
        backgroundOpacity: 100,
        hAlign: HALIGN.CENTER,
      },
    };
    const tNode = table([["header"], ["data"]], tokens);
    const node = (await render(tNode)) as TableNode;
    assert.strictEqual(node.rows[0][0].hAlign, HALIGN.CENTER, "headerRow.hAlign should override shared hAlign");
    assert.strictEqual(node.rows[1][0].hAlign, DEFAULT_TABLE_TOKENS.hAlign, "data cell should use shared hAlign");
  });

  test("headerRow.hAlign fallback to shared hAlign when omitted", async () => {
    const tokens = {
      ...DEFAULT_TABLE_TOKENS,
      headerRow: {
        textStyle: "body",
        textColor: "#000000",
        background: "#FFFFFF",
        backgroundOpacity: 100,
        // hAlign intentionally omitted
      },
    };
    const tNode = table([["header"], ["data"]], tokens);
    const node = (await render(tNode)) as TableNode;
    assert.strictEqual(
      node.rows[0][0].hAlign,
      DEFAULT_TABLE_TOKENS.hAlign,
      "should fall back to shared hAlign when headerRow.hAlign omitted",
    );
  });
});
