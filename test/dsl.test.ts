// DSL Factory Function Tests
// Tests for all factory functions in src/dsl/
// All DSL functions return ComponentNode; tests expand to ElementNode where needed.

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import {
  markdown,
  text,
  image,
  line,
  shape,
  slideNumber,
  row,
  column,
  stack,
  grid,
  table,
  MARKDOWN_COMPONENT,
  TEXT_COMPONENT,
  IMAGE_COMPONENT,
  LINE_COMPONENT,
  SHAPE_COMPONENT,
  SLIDE_NUMBER_COMPONENT,
  ROW_COMPONENT,
  COLUMN_COMPONENT,
  STACK_COMPONENT,
  GRID_COMPONENT,
  TABLE_COMPONENT,
} from '../src/dsl/index.js';
import { card, CARD_COMPONENT } from '../src/dsl/card.js';
import { componentRegistry } from '../src/core/registry.js';
import { NODE_TYPE } from '../src/core/nodes.js';
import type { TextNode, ImageNode, LineNode, ShapeNode, SlideNumberNode, TableNode, ContainerNode, StackNode } from '../src/core/nodes.js';
import { DIRECTION } from '../src/core/types.js';
import {
  TEXT_STYLE,
  GAP,
  HALIGN,
  VALIGN,
  SIZE,
  SHAPE,
  ARROW_TYPE,
  DASH_TYPE,
} from '../src/core/types.js';
import { mockTheme as createMockTheme } from './mocks.js';

// Theme with highlights for text expansion
const theme = createMockTheme();
(theme as any).highlights = {};

/** Expand a ComponentNode to its ElementNode form */
async function expand(node: any) {
  return componentRegistry.expandTree(node, { theme });
}

// ============================================
// TEXT FACTORY FUNCTIONS
// ============================================

describe('markdown()', () => {
  test('returns ComponentNode', () => {
    const node = markdown('hello');
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, MARKDOWN_COMPONENT);
  });

  test('expands to correct NODE_TYPE', async () => {
    const node = await expand(markdown('hello')) as TextNode;
    assert.strictEqual(node.type, NODE_TYPE.TEXT);
  });

  test('sets content correctly after expansion', async () => {
    const node = await expand(markdown('hello world')) as TextNode;
    const runs = node.content as any[];
    assert.strictEqual(runs[0].text, 'hello world');
  });

  test('handles empty string content', async () => {
    const node = await expand(markdown('')) as TextNode;
    assert.ok(Array.isArray(node.content));
    assert.strictEqual((node.content as any[]).length, 0);
  });

  test('applies explicit alignment defaults', async () => {
    const node = await expand(markdown('test')) as TextNode;
    assert.strictEqual(node.style, undefined);
    assert.strictEqual(node.color, undefined);
    assert.strictEqual(node.hAlign, HALIGN.LEFT);   // Explicit default
    assert.strictEqual(node.vAlign, VALIGN.TOP);    // Explicit default
  });

  test('applies style prop', async () => {
    const node = await expand(markdown('test', { style: TEXT_STYLE.H1 })) as TextNode;
    assert.strictEqual(node.style, TEXT_STYLE.H1);
  });

  test('applies color prop', async () => {
    const node = await expand(markdown('test', { color: 'FF0000' })) as TextNode;
    assert.strictEqual(node.color, 'FF0000');
  });

  test('applies hAlign prop', async () => {
    const node = await expand(markdown('test', { hAlign: HALIGN.CENTER })) as TextNode;
    assert.strictEqual(node.hAlign, HALIGN.CENTER);
  });

  test('applies vAlign prop', async () => {
    const node = await expand(markdown('test', { vAlign: VALIGN.MIDDLE })) as TextNode;
    assert.strictEqual(node.vAlign, VALIGN.MIDDLE);
  });

  test('applies all props together', async () => {
    const node = await expand(markdown('test', {
      style: TEXT_STYLE.BODY,
      color: '00FF00',
      hAlign: HALIGN.RIGHT,
      vAlign: VALIGN.BOTTOM,
    })) as TextNode;
    assert.strictEqual(node.style, TEXT_STYLE.BODY);
    assert.strictEqual(node.color, '00FF00');
    assert.strictEqual(node.hAlign, HALIGN.RIGHT);
    assert.strictEqual(node.vAlign, VALIGN.BOTTOM);
  });
});

// ============================================
// IMAGE
// ============================================

describe('image()', () => {
  test('returns ComponentNode', () => {
    const node = image('photo.jpg');
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, IMAGE_COMPONENT);
  });

  test('expands to correct NODE_TYPE', async () => {
    const node = await expand(image('photo.jpg')) as ImageNode;
    assert.strictEqual(node.type, NODE_TYPE.IMAGE);
  });

  test('sets src correctly', async () => {
    const node = await expand(image('test.png')) as ImageNode;
    assert.strictEqual(node.src, 'test.png');
  });

  test('applies no props by default', () => {
    const node = image('photo.jpg');
    assert.strictEqual((node.props as any).alt, undefined);
  });

  test('applies alt prop', async () => {
    const node = await expand(image('photo.jpg', { alt: 'A beautiful photo' })) as ImageNode;
    assert.strictEqual(node.alt, 'A beautiful photo');
  });
});

// ============================================
// LINE
// ============================================

describe('line()', () => {
  test('returns ComponentNode', () => {
    const node = line();
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, LINE_COMPONENT);
  });

  test('expands to correct NODE_TYPE', async () => {
    const node = await expand(line()) as LineNode;
    assert.strictEqual(node.type, NODE_TYPE.LINE);
  });

  test('applies no props by default', async () => {
    const node = await expand(line()) as LineNode;
    assert.strictEqual(node.color, undefined);
    assert.strictEqual(node.width, undefined);
    assert.strictEqual(node.dashType, undefined);
    assert.strictEqual(node.beginArrow, undefined);
    assert.strictEqual(node.endArrow, undefined);
  });

  test('applies color prop', async () => {
    const node = await expand(line({ color: 'FF0000' })) as LineNode;
    assert.strictEqual(node.color, 'FF0000');
  });

  test('applies width prop', async () => {
    const node = await expand(line({ width: 2 })) as LineNode;
    assert.strictEqual(node.width, 2);
  });

  test('applies dashType prop', async () => {
    const node = await expand(line({ dashType: DASH_TYPE.DASH })) as LineNode;
    assert.strictEqual(node.dashType, DASH_TYPE.DASH);
  });

  test('applies beginArrow prop', async () => {
    const node = await expand(line({ beginArrow: ARROW_TYPE.ARROW })) as LineNode;
    assert.strictEqual(node.beginArrow, ARROW_TYPE.ARROW);
  });

  test('applies endArrow prop', async () => {
    const node = await expand(line({ endArrow: ARROW_TYPE.TRIANGLE })) as LineNode;
    assert.strictEqual(node.endArrow, ARROW_TYPE.TRIANGLE);
  });

  test('applies all props together', async () => {
    const node = await expand(line({
      color: '0000FF',
      width: 3,
      dashType: DASH_TYPE.DASH_DOT,
      beginArrow: ARROW_TYPE.DIAMOND,
      endArrow: ARROW_TYPE.STEALTH,
    })) as LineNode;
    assert.strictEqual(node.color, '0000FF');
    assert.strictEqual(node.width, 3);
    assert.strictEqual(node.dashType, DASH_TYPE.DASH_DOT);
    assert.strictEqual(node.beginArrow, ARROW_TYPE.DIAMOND);
    assert.strictEqual(node.endArrow, ARROW_TYPE.STEALTH);
  });
});

// ============================================
// SHAPE (area shapes)
// ============================================

describe('shape()', () => {
  test('returns ComponentNode', () => {
    const node = shape({ shape: SHAPE.ELLIPSE });
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, SHAPE_COMPONENT);
  });

  test('expands to specified shape type', async () => {
    const node = await expand(shape({ shape: SHAPE.PLUS })) as ShapeNode;
    assert.strictEqual(node.type, NODE_TYPE.SHAPE);
    assert.strictEqual(node.shape, SHAPE.PLUS);
  });

  test('applies no props by default', async () => {
    const node = await expand(shape({ shape: SHAPE.RECT })) as ShapeNode;
    assert.strictEqual(node.fill, undefined);
    assert.strictEqual(node.border, undefined);
    assert.strictEqual(node.cornerRadius, undefined);
  });

  test('passes fill color', async () => {
    const node = await expand(shape({ shape: SHAPE.RECT, fill: { color: 'FF0000' } })) as ShapeNode;
    assert.deepStrictEqual(node.fill, { color: 'FF0000' });
  });

  test('passes fill color with opacity', async () => {
    const node = await expand(shape({ shape: SHAPE.RECT, fill: { color: 'FF0000', opacity: 50 } })) as ShapeNode;
    assert.deepStrictEqual(node.fill, { color: 'FF0000', opacity: 50 });
  });

  test('passes border properties', async () => {
    const node = await expand(shape({
      shape: SHAPE.RECT,
      border: { color: '0000FF', width: 2 },
    })) as ShapeNode;
    assert.strictEqual(node.border?.color, '0000FF');
    assert.strictEqual(node.border?.width, 2);
  });

  test('passes selective border sides', async () => {
    const node = await expand(shape({
      shape: SHAPE.RECT,
      border: {
        color: '000000',
        width: 1,
        top: true,
        bottom: true,
        left: false,
        right: false,
      },
    })) as ShapeNode;
    assert.strictEqual(node.border?.top, true);
    assert.strictEqual(node.border?.bottom, true);
    assert.strictEqual(node.border?.left, false);
    assert.strictEqual(node.border?.right, false);
  });

  test('passes corner radius', async () => {
    const node = await expand(shape({ shape: SHAPE.ROUND_RECT, cornerRadius: 0.125 })) as ShapeNode;
    assert.strictEqual(node.cornerRadius, 0.125);
  });

  test('passes specific shape with fill', async () => {
    const node = await expand(shape({ shape: SHAPE.TRAPEZOID, fill: { color: 'FF0000', opacity: 50 } })) as ShapeNode;
    assert.strictEqual(node.shape, SHAPE.TRAPEZOID);
    assert.deepStrictEqual(node.fill, { color: 'FF0000', opacity: 50 });
  });

  test('applies all props together', async () => {
    const node = await expand(shape({
      shape: SHAPE.ELLIPSE,
      fill: { color: 'EEEEEE', opacity: 80 },
      border: { color: '333333', width: 1 },
      cornerRadius: 0.25,
    })) as ShapeNode;
    assert.strictEqual(node.shape, SHAPE.ELLIPSE);
    assert.deepStrictEqual(node.fill, { color: 'EEEEEE', opacity: 80 });
    assert.strictEqual(node.border?.color, '333333');
    assert.strictEqual(node.border?.width, 1);
    assert.strictEqual(node.cornerRadius, 0.25);
  });
});

// ============================================
// SLIDE NUMBER
// ============================================

describe('slideNumber()', () => {
  test('returns ComponentNode', () => {
    const node = slideNumber();
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, SLIDE_NUMBER_COMPONENT);
  });

  test('expands to correct NODE_TYPE', async () => {
    const node = await expand(slideNumber()) as SlideNumberNode;
    assert.strictEqual(node.type, NODE_TYPE.SLIDE_NUMBER);
  });

  test('applies no props by default', async () => {
    const node = await expand(slideNumber()) as SlideNumberNode;
    assert.strictEqual(node.style, undefined);
    assert.strictEqual(node.color, undefined);
    assert.strictEqual(node.hAlign, HALIGN.RIGHT);
  });

  test('applies style prop', async () => {
    const node = await expand(slideNumber({ style: TEXT_STYLE.FOOTER })) as SlideNumberNode;
    assert.strictEqual(node.style, TEXT_STYLE.FOOTER);
  });

  test('applies color prop', async () => {
    const node = await expand(slideNumber({ color: '666666' })) as SlideNumberNode;
    assert.strictEqual(node.color, '666666');
  });

  test('applies hAlign prop', async () => {
    const node = await expand(slideNumber({ hAlign: HALIGN.RIGHT })) as SlideNumberNode;
    assert.strictEqual(node.hAlign, HALIGN.RIGHT);
  });

  test('applies all props together', async () => {
    const node = await expand(slideNumber({
      style: TEXT_STYLE.SMALL,
      color: 'AAAAAA',
      hAlign: HALIGN.CENTER,
    })) as SlideNumberNode;
    assert.strictEqual(node.style, TEXT_STYLE.SMALL);
    assert.strictEqual(node.color, 'AAAAAA');
    assert.strictEqual(node.hAlign, HALIGN.CENTER);
  });
});

// ============================================
// ROW
// ============================================

describe('row()', () => {
  const child1 = text('A');
  const child2 = text('B');
  const child3 = text('C');

  test('returns ComponentNode', () => {
    const node = row(child1);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, ROW_COMPONENT);
  });

  test('accepts children without props', async () => {
    const node = row(child1, child2, child3);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.type, NODE_TYPE.CONTAINER);
    assert.strictEqual(expanded.direction, DIRECTION.ROW);
    assert.strictEqual(expanded.children.length, 3);
  });

  test('applies default vAlign', async () => {
    const node = row(child1);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.vAlign, VALIGN.TOP);
  });

  test('applies default hAlign', async () => {
    const node = row(child1);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.hAlign, HALIGN.LEFT);
  });

  test('applies hAlign prop', async () => {
    const node = row({ hAlign: HALIGN.CENTER }, child1);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.hAlign, HALIGN.CENTER);
  });

  test('applies vAlign prop', async () => {
    const node = row({ vAlign: VALIGN.MIDDLE }, child1);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.vAlign, VALIGN.MIDDLE);
  });

  test('applies padding prop', async () => {
    const node = row({ padding: 0.5 }, child1);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.padding, 0.5);
  });

  test('applies gap prop', async () => {
    const node = row({ gap: GAP.TIGHT }, child1, child2);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.gap, GAP.TIGHT);
  });

  test('applies width prop', async () => {
    const node = row({ width: SIZE.FILL }, child1);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.width, SIZE.FILL);
  });

  test('applies height prop', async () => {
    const node = row({ height: 2.5 }, child1);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.height, 2.5);
  });

  test('distinguishes props from children', async () => {
    const node = row({ gap: GAP.TIGHT }, text('A'));
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.children.length, 1);
    assert.strictEqual(expanded.gap, GAP.TIGHT);
  });

  test('accepts props with children (props first)', async () => {
    const node = row({ gap: GAP.TIGHT }, text('A'), text('B'));
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.children.length, 2);
    assert.strictEqual(expanded.gap, GAP.TIGHT);
  });

  test('applies all props together', async () => {
    const node = row({ gap: GAP.NORMAL, vAlign: VALIGN.MIDDLE }, text('A'), text('B'));
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.gap, GAP.NORMAL);
    assert.strictEqual(expanded.vAlign, VALIGN.MIDDLE);
    assert.strictEqual(expanded.children.length, 2);
  });

  test('handles single child', async () => {
    const node = row(text('A'));
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.children.length, 1);
  });

  test('handles empty children', async () => {
    const node = row();
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.children.length, 0);
  });
});

// ============================================
// COLUMN
// ============================================

describe('column()', () => {
  const child1 = text('A');
  const child2 = text('B');
  const child3 = text('C');

  test('returns ComponentNode', () => {
    const node = column(child1);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, COLUMN_COMPONENT);
  });

  test('accepts children without props', async () => {
    const node = column(child1, child2, child3);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.type, NODE_TYPE.CONTAINER);
    assert.strictEqual(expanded.direction, DIRECTION.COLUMN);
    assert.strictEqual(expanded.children.length, 3);
  });

  test('applies default vAlign', async () => {
    const node = column(child1);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.vAlign, VALIGN.TOP);
  });

  test('applies default hAlign', async () => {
    const node = column(child1);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.hAlign, HALIGN.LEFT);
  });

  test('applies hAlign prop', async () => {
    const node = column({ hAlign: HALIGN.RIGHT }, child1);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.hAlign, HALIGN.RIGHT);
  });

  test('applies vAlign prop', async () => {
    const node = column({ vAlign: VALIGN.BOTTOM }, child1);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.vAlign, VALIGN.BOTTOM);
  });

  test('applies height prop', async () => {
    const node = column({ height: SIZE.FILL }, child1);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.height, SIZE.FILL);
  });

  test('applies width prop', async () => {
    const node = column({ width: 3.0 }, child1);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.width, 3.0);
  });

  test('applies gap prop', async () => {
    const node = column({ gap: GAP.LOOSE }, child1, child2);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.gap, GAP.LOOSE);
  });

  test('applies padding prop', async () => {
    const node = column({ padding: 0.25 }, child1);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.padding, 0.25);
  });

  test('applies numeric height', async () => {
    const node = column({ height: 2.5 }, text('A'));
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.height, 2.5);
  });

  test('distinguishes props from children', async () => {
    const node = column({ gap: GAP.TIGHT }, text('A'));
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.children.length, 1);
    assert.strictEqual(expanded.gap, GAP.TIGHT);
  });

  test('accepts props with children (props first)', async () => {
    const node = column({ gap: GAP.TIGHT }, text('A'), text('B'));
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.children.length, 2);
    assert.strictEqual(expanded.gap, GAP.TIGHT);
  });

  test('applies all props together', async () => {
    const node = column({ height: SIZE.FILL, gap: GAP.NORMAL, vAlign: VALIGN.MIDDLE, hAlign: HALIGN.CENTER }, text('A'), text('B'));
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.height, SIZE.FILL);
    assert.strictEqual(expanded.gap, GAP.NORMAL);
    assert.strictEqual(expanded.vAlign, VALIGN.MIDDLE);
    assert.strictEqual(expanded.hAlign, HALIGN.CENTER);
    assert.strictEqual(expanded.children.length, 2);
  });

  test('handles single child', async () => {
    const node = column(text('A'));
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.children.length, 1);
  });

  test('handles empty children', async () => {
    const node = column();
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.children.length, 0);
  });
});

// ============================================
// STACK
// ============================================

describe('stack()', () => {
  const child1 = text('A');
  const child2 = text('B');

  test('returns ComponentNode', () => {
    const node = stack(child1);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, STACK_COMPONENT);
  });

  test('expands to correct NODE_TYPE', async () => {
    const node = await expand(stack(child1)) as StackNode;
    assert.strictEqual(node.type, NODE_TYPE.STACK);
  });

  test('children are preserved', async () => {
    const node = await expand(stack(child1, child2)) as StackNode;
    assert.strictEqual(node.children.length, 2);
  });

  test('applies no size props by default', async () => {
    const node = await expand(stack(child1)) as StackNode;
    assert.strictEqual(node.width, undefined);
    assert.strictEqual(node.height, undefined);
  });

  test('passes width prop', async () => {
    const node = await expand(stack({ width: 5 }, child1)) as StackNode;
    assert.strictEqual(node.width, 5);
  });

  test('passes height prop', async () => {
    const node = await expand(stack({ height: 3 }, child1)) as StackNode;
    assert.strictEqual(node.height, 3);
  });

  test('passes width and height together', async () => {
    const node = await expand(stack({ width: 5, height: 3 }, child1, child2)) as StackNode;
    assert.strictEqual(node.width, 5);
    assert.strictEqual(node.height, 3);
    assert.strictEqual(node.children.length, 2);
  });

  test('passes SIZE.FILL for width', async () => {
    const node = await expand(stack({ width: SIZE.FILL }, child1)) as StackNode;
    assert.strictEqual(node.width, SIZE.FILL);
  });

  test('passes SIZE.FILL for height', async () => {
    const node = await expand(stack({ height: SIZE.FILL }, child1)) as StackNode;
    assert.strictEqual(node.height, SIZE.FILL);
  });
});

// ============================================
// GRID
// ============================================

describe('grid()', () => {
  const child1 = text('A');
  const child2 = text('B');
  const child3 = text('C');
  const child4 = text('D');
  const child5 = text('E');
  const child6 = text('F');

  /** Expand grid ComponentNode to ContainerNode (column) and return its row children */
  async function expandGrid(gridNode: ReturnType<typeof grid>): Promise<ContainerNode[]> {
    const col = await expand(gridNode) as ContainerNode;
    assert.strictEqual(col.type, NODE_TYPE.CONTAINER);
    return col.children as ContainerNode[];
  }

  test('returns a single ComponentNode', () => {
    const g = grid(2, child1, child2);
    assert.strictEqual(g.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(g.componentName, GRID_COMPONENT);
  });

  test('expands to ColumnNode containing rows', async () => {
    const col = await expand(grid(2, child1, child2)) as ContainerNode;
    assert.strictEqual(col.type, NODE_TYPE.CONTAINER);
    assert.strictEqual(col.children.length, 1); // 2 items / 2 cols = 1 row
    assert.strictEqual(col.children[0].type, NODE_TYPE.CONTAINER);
  });

  test('chunks children into rows (2 columns, 4 children = 2 rows)', async () => {
    const rows = await expandGrid(grid(2, child1, child2, child3, child4));
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].children.length, 2);
    assert.strictEqual(rows[1].children.length, 2);
  });

  test('applies gap to rows when specified', async () => {
    const rows = await expandGrid(grid({ columns: 2, gap: GAP.TIGHT }, child1, child2, child3, child4));
    assert.strictEqual(rows[0].gap, GAP.TIGHT);
  });

  test('handles odd number of children (2 columns, 5 children = 3 rows)', async () => {
    const rows = await expandGrid(grid(2, child1, child2, child3, child4, child5));
    assert.strictEqual(rows.length, 3);
    assert.strictEqual(rows[2].children.length, 1);
  });

  test('accepts props object with columns', async () => {
    const rows = await expandGrid(grid({ columns: 2 }, child1, child2, child3));
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].children.length, 2);
    assert.strictEqual(rows[1].children.length, 1);
  });

  test('does not apply gap when not specified', async () => {
    const rows = await expandGrid(grid(2, child1, child2));
    assert.strictEqual(rows[0].gap, undefined);
  });

  test('preserves child order (each wrapped in column cell)', async () => {
    const rows = await expandGrid(grid(2, child1, child2));
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

  test('fill: true sets height: SIZE.FILL on wrapper column', async () => {
    const col = await expand(grid({ columns: 2, fill: true }, child1, child2)) as ContainerNode;
    assert.strictEqual(col.height, SIZE.FILL);
  });

  test('fill: false does not set height on wrapper column', async () => {
    const col = await expand(grid(2, child1, child2)) as ContainerNode;
    assert.strictEqual(col.height, undefined);
  });

  test('fill: true sets height: SIZE.FILL and vAlign: TOP on each row', async () => {
    const rows = await expandGrid(grid({ columns: 2, fill: true }, child1, child2));
    assert.strictEqual(rows[0].height, SIZE.FILL);
    assert.strictEqual(rows[0].vAlign, VALIGN.TOP);
  });

  test('fill: true sets height: SIZE.FILL on cell columns', async () => {
    const rows = await expandGrid(grid({ columns: 2, fill: true }, child1, child2));
    const col0 = rows[0].children[0] as ContainerNode;
    assert.strictEqual(col0.height, SIZE.FILL);
    assert.strictEqual(col0.width, SIZE.FILL);
    const col1 = rows[0].children[1] as ContainerNode;
    assert.strictEqual(col1.height, SIZE.FILL);
    assert.strictEqual(col1.width, SIZE.FILL);
  });

  test('fill: false (default) does not set height on rows or cells', async () => {
    const rows = await expandGrid(grid(2, child1, child2));
    assert.strictEqual(rows[0].height, undefined);
    const col0 = rows[0].children[0] as ContainerNode;
    assert.strictEqual(col0.height, undefined);
  });

  test('handles single row (columns >= children)', async () => {
    const rows = await expandGrid(grid(4, child1, child2));
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].children.length, 2);
  });

  test('handles empty children (expands to column with no rows)', async () => {
    const col = await expand(grid(2)) as ContainerNode;
    assert.strictEqual(col.type, NODE_TYPE.CONTAINER);
    assert.strictEqual(col.children.length, 0);
  });

  test('handles single child', async () => {
    const rows = await expandGrid(grid(2, child1));
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].children.length, 1);
  });
});

// ============================================
// CARD
// ============================================

describe('card()', () => {
  test('returns ComponentNode with correct type', () => {
    const node = card({});
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, CARD_COMPONENT);
  });

  test('passes props to ComponentNode', () => {
    const node = card({
      title: 'Test Title',
      backgroundColor: 'EEEEEE',
    });
    assert.strictEqual(node.props.title, 'Test Title');
    assert.strictEqual(node.props.backgroundColor, 'EEEEEE');
  });

  test('preserves all props', () => {
    const props = {
      image: 'hero.jpg',
      title: 'Title',
      titleStyle: TEXT_STYLE.H2,
      titleColor: 'FF0000',
      description: 'Description',
      descriptionStyle: TEXT_STYLE.BODY,
      descriptionColor: '333333',
      background: true,
      backgroundColor: 'FFFFFF',
      backgroundOpacity: 80,
      borderColor: '000000',
      borderWidth: 1,
      cornerRadius: 0.125,
      padding: 0.25,
    };
    const node = card(props);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, CARD_COMPONENT);
    assert.strictEqual(node.props.image, 'hero.jpg');
    assert.strictEqual(node.props.title, 'Title');
    assert.strictEqual(node.props.titleStyle, TEXT_STYLE.H2);
    assert.strictEqual(node.props.titleColor, 'FF0000');
    assert.strictEqual(node.props.description, 'Description');
    assert.strictEqual(node.props.descriptionStyle, TEXT_STYLE.BODY);
    assert.strictEqual(node.props.descriptionColor, '333333');
    assert.strictEqual(node.props.background, true);
    assert.strictEqual(node.props.backgroundColor, 'FFFFFF');
    assert.strictEqual(node.props.backgroundOpacity, 80);
    assert.strictEqual(node.props.borderColor, '000000');
    assert.strictEqual(node.props.borderWidth, 1);
    assert.strictEqual(node.props.cornerRadius, 0.125);
    assert.strictEqual(node.props.padding, 0.25);
  });

});

// ============================================
// TABLE FACTORY FUNCTIONS
// ============================================

describe('table()', () => {

  test('returns ComponentNode', () => {
    const node = table([['Header']]);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, TABLE_COMPONENT);
  });

  test('TableCellData cells preserve properties after expansion', async () => {
    const node = await expand(table([
      ['Header', { content: 'colored cell', textStyle: TEXT_STYLE.SMALL, color: 'FF0000', hAlign: HALIGN.CENTER }],
    ])) as TableNode;
    assert.strictEqual(node.type, NODE_TYPE.TABLE);
    const cell = node.rows[0][1];
    assert.strictEqual(cell.content, 'colored cell');
    assert.strictEqual(cell.textStyle, TEXT_STYLE.SMALL);
    assert.strictEqual(cell.color, 'FF0000');
    assert.strictEqual(cell.hAlign, HALIGN.CENTER);
  });

  test('TableCellData without vAlign leaves vAlign undefined', async () => {
    const node = await expand(table([
      [{ content: 'cell with default vAlign' }],
    ])) as TableNode;
    const cell = node.rows[0][0];
    assert.strictEqual(cell.vAlign, undefined);
  });

  test('string cells are wrapped as TableCellData', async () => {
    const node = await expand(table([['plain string']])) as TableNode;
    const cell = node.rows[0][0];
    assert.strictEqual(cell.content, 'plain string');
    assert.strictEqual(cell.color, undefined);
    assert.strictEqual(cell.textStyle, undefined);
  });

  test('preserves table props', async () => {
    const node = await expand(table([['a']], {
      columnWidths: [1, 2],
      headerRows: 1,
      headerColumns: 1,
    })) as TableNode;
    assert.deepStrictEqual(node.columnWidths, [1, 2]);
    assert.strictEqual(node.headerRows, 1);
    assert.strictEqual(node.headerColumns, 1);
  });

});

