// DSL Factory Function Tests
// Tests for all factory functions in src/dsl/
// All DSL functions return ComponentNode; tests render to ElementNode where needed.

import * as assert from "node:assert";
import { describe, test } from "node:test";
import type { ContainerNode, ImageNode, LineNode, ShapeNode, SlideNumberNode, StackNode, TableNode } from "tycoslide";
import {
  ARROW_TYPE,
  componentRegistry,
  DASH_TYPE,
  DIRECTION,
  GAP,
  HALIGN,
  NODE_TYPE,
  SHADOW_TYPE,
  SHAPE,
  SIZE,
  TEXT_STYLE,
  VALIGN,
} from "tycoslide";
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
    const node = image("photo.jpg");
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.Image);
  });

  test("renders to correct NODE_TYPE", async () => {
    const node = (await render(image("photo.jpg"))) as ImageNode;
    assert.strictEqual(node.type, NODE_TYPE.IMAGE);
  });

  test("sets src correctly", async () => {
    const node = (await render(image("test.png"))) as ImageNode;
    assert.strictEqual(node.src, "test.png");
  });

  // Asset path resolution (tested through image expansion)

  test("resolves $dot.path to string value", async () => {
    const assets = { icons: { rocket: "/path/to/rocket.svg" } };
    const node = (await componentRegistry.renderTree(image("$icons.rocket"), {
      theme,
      assets,
      canvas: noopCanvas(),
    })) as ImageNode;
    assert.strictEqual(node.src, "/path/to/rocket.svg");
  });

  test("resolves deeply nested asset path", async () => {
    const assets = { images: { heroes: { landing: "/hero.png" } } };
    const node = (await componentRegistry.renderTree(image("$images.heroes.landing"), {
      theme,
      assets,
      canvas: noopCanvas(),
    })) as ImageNode;
    assert.strictEqual(node.src, "/hero.png");
  });

  test("throws when assets not provided for asset reference", async () => {
    await assert.rejects(
      () => componentRegistry.renderTree(image("$icons.rocket"), { theme, canvas: noopCanvas() }),
      /asset reference.*no assets provided/,
    );
  });

  test("throws when asset key not found", async () => {
    const assets = { icons: { star: "/star.svg" } };
    await assert.rejects(
      () => componentRegistry.renderTree(image("$icons.rocket"), { theme, assets, canvas: noopCanvas() }),
      /could not be resolved/,
    );
  });

  test("throws when asset path resolves to object (with suggestions)", async () => {
    const assets = { icons: { rocket: "/rocket.svg", star: "/star.svg" } };
    await assert.rejects(
      () => componentRegistry.renderTree(image("$icons"), { theme, assets, canvas: noopCanvas() }),
      /resolved to an object.*Did you mean/,
    );
  });

  test("throws when traversal hits non-object mid-path", async () => {
    const assets = { icons: { rocket: "/rocket.svg" } };
    await assert.rejects(
      () => componentRegistry.renderTree(image("$icons.rocket.size"), { theme, assets, canvas: noopCanvas() }),
      /is not an object/,
    );
  });

  test("passes through non-asset paths unchanged", async () => {
    const node = (await render(image("https://example.com/photo.jpg"))) as ImageNode;
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
    assert.strictEqual(node.color, DEFAULT_LINE_TOKENS.color);
    assert.strictEqual(node.width, DEFAULT_LINE_TOKENS.width);
    assert.strictEqual(node.dashType, DASH_TYPE.SOLID);
    assert.strictEqual(node.beginArrow, undefined);
    assert.strictEqual(node.endArrow, undefined);
  });

  test("applies beginArrow prop", async () => {
    const node = (await render(line(DEFAULT_LINE_TOKENS, { beginArrow: ARROW_TYPE.ARROW }))) as LineNode;
    assert.strictEqual(node.beginArrow, ARROW_TYPE.ARROW);
  });

  test("applies endArrow prop", async () => {
    const node = (await render(line(DEFAULT_LINE_TOKENS, { endArrow: ARROW_TYPE.TRIANGLE }))) as LineNode;
    assert.strictEqual(node.endArrow, ARROW_TYPE.TRIANGLE);
  });

  test("applies both arrow props together", async () => {
    const node = (await render(
      line(DEFAULT_LINE_TOKENS, {
        beginArrow: ARROW_TYPE.DIAMOND,
        endArrow: ARROW_TYPE.STEALTH,
      }),
    )) as LineNode;
    assert.strictEqual(node.beginArrow, ARROW_TYPE.DIAMOND);
    assert.strictEqual(node.endArrow, ARROW_TYPE.STEALTH);
    // Token values still apply
    assert.strictEqual(node.color, DEFAULT_LINE_TOKENS.color);
    assert.strictEqual(node.width, DEFAULT_LINE_TOKENS.width);
    assert.strictEqual(node.dashType, DASH_TYPE.SOLID);
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
    const node = (await render(shape(DEFAULT_SHAPE_TOKENS, { shape: SHAPE.PLUS }))) as ShapeNode;
    assert.strictEqual(node.type, NODE_TYPE.SHAPE);
    assert.strictEqual(node.shape, SHAPE.PLUS);
  });

  test("uses token values for fill, defaults for omitted tokens", async () => {
    const node = (await render(shape(DEFAULT_SHAPE_TOKENS, { shape: SHAPE.RECT }))) as ShapeNode;
    assert.deepStrictEqual(node.fill, { color: "#333333", opacity: 100 });
    assert.deepStrictEqual(node.border, { color: "#000000", width: 0 });
    assert.strictEqual(node.cornerRadius, 0);
  });

  test("passes fill color from tokens", async () => {
    const tokens: ShapeTokens = { ...DEFAULT_SHAPE_TOKENS, fill: "#FF0000" };
    const node = (await render(shape(tokens, { shape: SHAPE.RECT }))) as ShapeNode;
    assert.deepStrictEqual(node.fill, { color: "#FF0000", opacity: 100 });
  });

  test("passes fill color with explicit opacity from tokens", async () => {
    const tokens: ShapeTokens = { ...DEFAULT_SHAPE_TOKENS, fill: "#FF0000", fillOpacity: 50 };
    const node = (await render(shape(tokens, { shape: SHAPE.RECT }))) as ShapeNode;
    assert.deepStrictEqual(node.fill, { color: "#FF0000", opacity: 50 });
  });

  test("passes border properties from tokens", async () => {
    const tokens: ShapeTokens = { ...DEFAULT_SHAPE_TOKENS, borderColor: "#0000FF", borderWidth: 2 };
    const node = (await render(shape(tokens, { shape: SHAPE.RECT }))) as ShapeNode;
    assert.strictEqual(node.border?.color, "#0000FF");
    assert.strictEqual(node.border?.width, 2);
  });


  test("passes corner radius from tokens", async () => {
    const tokens: ShapeTokens = { ...DEFAULT_SHAPE_TOKENS, cornerRadius: 0.125 };
    const node = (await render(shape(tokens, { shape: SHAPE.ROUND_RECT }))) as ShapeNode;
    assert.strictEqual(node.cornerRadius, 0.125);
  });

  test("passes specific shape with fill from tokens", async () => {
    const tokens: ShapeTokens = { ...DEFAULT_SHAPE_TOKENS, fill: "#FF0000", fillOpacity: 50 };
    const node = (await render(shape(tokens, { shape: SHAPE.TRAPEZOID }))) as ShapeNode;
    assert.strictEqual(node.shape, SHAPE.TRAPEZOID);
    assert.deepStrictEqual(node.fill, { color: "#FF0000", opacity: 50 });
  });

  test("applies all tokens and props together", async () => {
    const tokens: ShapeTokens = {
      fill: "#EEEEEE",
      fillOpacity: 80,
      borderColor: "#333333",
      borderWidth: 1,
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
    const node = (await render(shape(DEFAULT_SHAPE_TOKENS, { shape: SHAPE.RECT }))) as ShapeNode;
    assert.strictEqual(node.shadow, undefined);
  });

  test("passes shadow from tokens when present", async () => {
    const tokens: ShapeTokens = {
      ...DEFAULT_SHAPE_TOKENS,
      shadow: { type: SHADOW_TYPE.OUTER, color: "#000000", opacity: 25, blur: 8, offset: 3, angle: 315 },
    };
    const node = (await render(shape(tokens, { shape: SHAPE.ROUND_RECT }))) as ShapeNode;
    assert.ok(node.shadow);
    assert.strictEqual(node.shadow.type, SHADOW_TYPE.OUTER);
    assert.strictEqual(node.shadow.color, "#000000");
    assert.strictEqual(node.shadow.opacity, 25);
    assert.strictEqual(node.shadow.blur, 8);
    assert.strictEqual(node.shadow.offset, 3);
    assert.strictEqual(node.shadow.angle, 315);
  });

  test("shadow absent when not provided in tokens", async () => {
    const tokens = { fill: "#FF0000", fillOpacity: 100, borderColor: "#000000", borderWidth: 0, cornerRadius: 0 };
    const node = (await render(shape(tokens, { shape: SHAPE.RECT }))) as ShapeNode;
    assert.deepStrictEqual(node.fill, { color: "#FF0000", opacity: 100 });
    assert.deepStrictEqual(node.border, { color: "#000000", width: 0 });
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
    assert.strictEqual(node.style, TEXT_STYLE.FOOTER);
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
    const node = row(child1);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.Row);
  });

  test("accepts children without props", async () => {
    const node = row(child1, child2, child3);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.type, NODE_TYPE.CONTAINER);
    assert.strictEqual(rendered.direction, DIRECTION.ROW);
    assert.strictEqual(rendered.children.length, 3);
  });

  test("defaults to width: FILL, height: HUG", async () => {
    const node = row(child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.width, SIZE.FILL);
    assert.strictEqual(rendered.height, SIZE.HUG);
  });

  test("applies default vAlign", async () => {
    const node = row(child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.vAlign, VALIGN.TOP);
  });

  test("applies default hAlign", async () => {
    const node = row(child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.hAlign, HALIGN.LEFT);
  });

  test("applies hAlign prop", async () => {
    const node = row({ hAlign: HALIGN.CENTER }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.hAlign, HALIGN.CENTER);
  });

  test("applies vAlign prop", async () => {
    const node = row({ vAlign: VALIGN.MIDDLE }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.vAlign, VALIGN.MIDDLE);
  });

  test("applies padding prop", async () => {
    const node = row({ padding: 0.5 }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.padding, 0.5);
  });

  test("applies gap prop", async () => {
    const node = row({ gap: GAP.TIGHT }, child1, child2);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.gap, 0.125);
  });

  test("applies width prop", async () => {
    const node = row({ width: SIZE.FILL }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.width, SIZE.FILL);
  });

  test("applies height prop", async () => {
    const node = row({ height: 2.5 }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.height, 2.5);
  });

  test("distinguishes props from children", async () => {
    const node = row({ gap: GAP.TIGHT }, text("A", DEFAULT_TEXT_TOKENS));
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.children.length, 1);
    assert.strictEqual(rendered.gap, 0.125);
  });

  test("accepts props with children (props first)", async () => {
    const node = row({ gap: GAP.TIGHT }, text("A", DEFAULT_TEXT_TOKENS), text("B", DEFAULT_TEXT_TOKENS));
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.children.length, 2);
    assert.strictEqual(rendered.gap, 0.125);
  });

  test("applies all props together", async () => {
    const node = row(
      { gap: GAP.NORMAL, vAlign: VALIGN.MIDDLE },
      text("A", DEFAULT_TEXT_TOKENS),
      text("B", DEFAULT_TEXT_TOKENS),
    );
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.gap, 0.25);
    assert.strictEqual(rendered.vAlign, VALIGN.MIDDLE);
    assert.strictEqual(rendered.children.length, 2);
  });

  test("handles single child", async () => {
    const node = row(text("A", DEFAULT_TEXT_TOKENS));
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.children.length, 1);
  });

  test("handles empty children", async () => {
    const node = row();
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
    const node = column(child1);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.Column);
  });

  test("accepts children without props", async () => {
    const node = column(child1, child2, child3);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.type, NODE_TYPE.CONTAINER);
    assert.strictEqual(rendered.direction, DIRECTION.COLUMN);
    assert.strictEqual(rendered.children.length, 3);
  });

  test("defaults to width: FILL, height: HUG", async () => {
    const node = column(child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.width, SIZE.FILL);
    assert.strictEqual(rendered.height, SIZE.HUG);
  });

  test("applies default vAlign", async () => {
    const node = column(child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.vAlign, VALIGN.TOP);
  });

  test("applies default hAlign", async () => {
    const node = column(child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.hAlign, HALIGN.LEFT);
  });

  test("applies hAlign prop", async () => {
    const node = column({ hAlign: HALIGN.RIGHT }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.hAlign, HALIGN.RIGHT);
  });

  test("applies vAlign prop", async () => {
    const node = column({ vAlign: VALIGN.BOTTOM }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.vAlign, VALIGN.BOTTOM);
  });

  test("applies height prop", async () => {
    const node = column({ height: SIZE.FILL }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.height, SIZE.FILL);
  });

  test("applies width prop", async () => {
    const node = column({ width: 3.0 }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.width, 3.0);
  });

  test("applies gap prop", async () => {
    const node = column({ gap: GAP.LOOSE }, child1, child2);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.gap, 0.5);
  });

  test("applies padding prop", async () => {
    const node = column({ padding: 0.25 }, child1);
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.padding, 0.25);
  });

  test("applies numeric height", async () => {
    const node = column({ height: 2.5 }, text("A", DEFAULT_TEXT_TOKENS));
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.height, 2.5);
  });

  test("distinguishes props from children", async () => {
    const node = column({ gap: GAP.TIGHT }, text("A", DEFAULT_TEXT_TOKENS));
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.children.length, 1);
    assert.strictEqual(rendered.gap, 0.125);
  });

  test("accepts props with children (props first)", async () => {
    const node = column({ gap: GAP.TIGHT }, text("A", DEFAULT_TEXT_TOKENS), text("B", DEFAULT_TEXT_TOKENS));
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.children.length, 2);
    assert.strictEqual(rendered.gap, 0.125);
  });

  test("applies all props together", async () => {
    const node = column(
      { height: SIZE.FILL, gap: GAP.NORMAL, vAlign: VALIGN.MIDDLE, hAlign: HALIGN.CENTER },
      text("A", DEFAULT_TEXT_TOKENS),
      text("B", DEFAULT_TEXT_TOKENS),
    );
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.height, SIZE.FILL);
    assert.strictEqual(rendered.gap, 0.25);
    assert.strictEqual(rendered.vAlign, VALIGN.MIDDLE);
    assert.strictEqual(rendered.hAlign, HALIGN.CENTER);
    assert.strictEqual(rendered.children.length, 2);
  });

  test("handles single child", async () => {
    const node = column(text("A", DEFAULT_TEXT_TOKENS));
    const rendered = (await render(node)) as ContainerNode;
    assert.strictEqual(rendered.children.length, 1);
  });

  test("handles empty children", async () => {
    const node = column();
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
  const child5 = text("E", DEFAULT_TEXT_TOKENS);
  const _child6 = text("F", DEFAULT_TEXT_TOKENS);

  /** Expand grid ComponentNode to ContainerNode (column) and return its row children */
  async function renderGrid(gridNode: ReturnType<typeof grid>): Promise<ContainerNode[]> {
    const col = (await render(gridNode)) as ContainerNode;
    assert.strictEqual(col.type, NODE_TYPE.CONTAINER);
    return col.children as ContainerNode[];
  }

  test("returns a single ComponentNode", () => {
    const g = grid(2, child1, child2);
    assert.strictEqual(g.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(g.componentName, Component.Grid);
  });

  test("renders to ColumnNode containing rows", async () => {
    const col = (await render(grid(2, child1, child2))) as ContainerNode;
    assert.strictEqual(col.type, NODE_TYPE.CONTAINER);
    assert.strictEqual(col.children.length, 1); // 2 items / 2 cols = 1 row
    assert.strictEqual(col.children[0].type, NODE_TYPE.CONTAINER);
  });

  test("chunks children into rows (2 columns, 4 children = 2 rows)", async () => {
    const rows = await renderGrid(grid(2, child1, child2, child3, child4));
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].children.length, 2);
    assert.strictEqual(rows[1].children.length, 2);
  });

  test("applies gap to rows when specified", async () => {
    const rows = await renderGrid(grid({ columns: 2, gap: GAP.TIGHT }, child1, child2, child3, child4));
    assert.strictEqual(rows[0].gap, 0.125);
  });

  test("handles odd number of children (2 columns, 5 children = 3 rows)", async () => {
    const rows = await renderGrid(grid(2, child1, child2, child3, child4, child5));
    assert.strictEqual(rows.length, 3);
    assert.strictEqual(rows[2].children.length, 1);
  });

  test("accepts props object with columns", async () => {
    const rows = await renderGrid(grid({ columns: 2 }, child1, child2, child3));
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].children.length, 2);
    assert.strictEqual(rows[1].children.length, 1);
  });

  test("defaults to GAP.NORMAL when gap not specified", async () => {
    const rows = await renderGrid(grid(2, child1, child2));
    assert.strictEqual(rows[0].gap, 0.25);
  });

  test("preserves child order (each wrapped in column cell)", async () => {
    const rows = await renderGrid(grid(2, child1, child2));
    const firstRow = rows[0];
    // Each child is wrapped in a ContainerNode (column) with width: SIZE.FILL
    assert.strictEqual(firstRow.children.length, 2);
    const col0 = firstRow.children[0] as ContainerNode;
    assert.strictEqual(col0.type, NODE_TYPE.CONTAINER);
    assert.strictEqual(col0.width, SIZE.FILL);
    const col1 = firstRow.children[1] as ContainerNode;
    assert.strictEqual(col1.type, NODE_TYPE.CONTAINER);
    assert.strictEqual(col1.width, SIZE.FILL);
    // The original child (after expansion) is inside each column
    assert.strictEqual(col0.children.length, 1);
    assert.strictEqual(col1.children.length, 1);
  });

  test("wrapper column has height: SIZE.FILL", async () => {
    const col = (await render(grid(2, child1, child2))) as ContainerNode;
    assert.strictEqual(col.height, SIZE.FILL);
  });

  test("rows have height: SIZE.FILL", async () => {
    const rows = await renderGrid(grid(2, child1, child2));
    assert.strictEqual(rows[0].height, SIZE.FILL);
    assert.strictEqual(rows[0].vAlign, VALIGN.TOP);
  });

  test("cells have width and height: SIZE.FILL", async () => {
    const rows = await renderGrid(grid(2, child1, child2));
    const col0 = rows[0].children[0] as ContainerNode;
    assert.strictEqual(col0.height, SIZE.FILL);
    assert.strictEqual(col0.width, SIZE.FILL);
  });

  test("handles single row (columns >= children)", async () => {
    const rows = await renderGrid(grid(4, child1, child2));
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].children.length, 2);
  });

  test("handles empty children (renders to column with no rows)", async () => {
    const col = (await render(grid(2))) as ContainerNode;
    assert.strictEqual(col.type, NODE_TYPE.CONTAINER);
    assert.strictEqual(col.children.length, 0);
  });

  test("handles single child", async () => {
    const rows = await renderGrid(grid(2, child1));
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].children.length, 1);
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
    const node = table([["Header"]]);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.Table);
  });

  test("TableCellData cells preserve properties after expansion", async () => {
    const tNode = table([
      ["Header", { content: "colored cell", textStyle: TEXT_STYLE.SMALL, color: "#FF0000", hAlign: HALIGN.CENTER }],
    ]);
    tNode.tokens = { ...DEFAULT_TABLE_TOKENS };
    const node = (await render(tNode)) as TableNode;
    assert.strictEqual(node.type, NODE_TYPE.TABLE);
    const cell = node.rows[0][1];
    assert.deepStrictEqual(cell.content, [{ text: "colored cell" }]);
    assert.strictEqual(cell.textStyle, TEXT_STYLE.SMALL);
    assert.strictEqual(cell.color, "#FF0000");
    assert.strictEqual(cell.hAlign, HALIGN.CENTER);
    assert.ok(cell.resolvedStyle);
    assert.strictEqual(cell.resolvedStyle.fontSize, 12); // from mockTextStyle
    assert.strictEqual(cell.lineHeightMultiplier, 1.0); // from cellLineHeight token
  });

  test("TableCellData without vAlign resolves to table default", async () => {
    const tNode = table([[{ content: "cell with default vAlign" }]]);
    tNode.tokens = { ...DEFAULT_TABLE_TOKENS };
    const node = (await render(tNode)) as TableNode;
    const cell = node.rows[0][0];
    assert.strictEqual(cell.vAlign, VALIGN.MIDDLE);
  });

  test("string cells are fully resolved as TableCellData", async () => {
    const tNode = table([["plain string"]]);
    tNode.tokens = { ...DEFAULT_TABLE_TOKENS };
    const node = (await render(tNode)) as TableNode;
    const cell = node.rows[0][0];
    assert.deepStrictEqual(cell.content, [{ text: "plain string" }]);
    assert.strictEqual(cell.color, "#000000"); // resolved from table token cellTextColor
    assert.strictEqual(cell.textStyle, TEXT_STYLE.BODY); // resolved from table token
    assert.ok(cell.resolvedStyle);
    assert.strictEqual(cell.resolvedStyle.fontSize, 12); // from mockTextStyle
    assert.strictEqual(cell.lineHeightMultiplier, 1.0); // from cellLineHeight token
  });

  test("preserves table props", async () => {
    const tNode = table([["a"]], {
      headerRows: 1,
      headerColumns: 1,
    });
    tNode.tokens = { ...DEFAULT_TABLE_TOKENS };
    const node = (await render(tNode)) as TableNode;
    assert.strictEqual(node.headerRows, 1);
    assert.strictEqual(node.headerColumns, 1);
  });
});
