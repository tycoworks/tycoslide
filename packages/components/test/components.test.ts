// DSL Factory Function Tests
// Tests for all factory functions in src/dsl/
// All DSL functions return ComponentNode; tests expand to ElementNode where needed.

import { describe, test, it } from 'node:test';
import * as assert from 'node:assert';
import {
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
} from '../src/index.js';
import { card } from '../src/card.js';
import { Component } from '../src/names.js';
import {
  componentRegistry,
  NODE_TYPE,
  CONTENT,
  DIRECTION,
  TEXT_STYLE,
  GAP,
  HALIGN,
  VALIGN,
  SIZE,
  SHAPE,
  ARROW_TYPE,
  DASH_TYPE,
} from 'tycoslide';
import type { TextNode, ImageNode, LineNode, ShapeNode, SlideNumberNode, TableNode, ContainerNode, StackNode } from 'tycoslide';
import { mockTheme as createMockTheme } from './mocks.js';

// Theme for text expansion
const theme = createMockTheme();

/** Expand a ComponentNode to its ElementNode form */
async function expand(node: any) {
  return componentRegistry.expandTree(node, { theme });
}

// ============================================
// TEXT FACTORY FUNCTIONS
// ============================================

describe('text() with CONTENT.PROSE', () => {
  test('returns ComponentNode', () => {
    const node = text('hello', { content: CONTENT.PROSE });
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.Text);
  });

  test('expands to correct NODE_TYPE', async () => {
    const node = await expand(text('hello', { content: CONTENT.PROSE })) as TextNode;
    assert.strictEqual(node.type, NODE_TYPE.TEXT);
  });

  test('sets content correctly after expansion', async () => {
    const node = await expand(text('hello world', { content: CONTENT.PROSE })) as TextNode;
    const runs = node.content as any[];
    assert.strictEqual(runs[0].text, 'hello world');
  });

  test('handles empty string content', async () => {
    const node = await expand(text('', { content: CONTENT.PROSE })) as TextNode;
    assert.ok(Array.isArray(node.content));
    assert.strictEqual((node.content as any[]).length, 0);
  });

  test('applies explicit alignment defaults and token defaults', async () => {
    const node = await expand(text('test', { content: CONTENT.PROSE })) as TextNode;
    assert.strictEqual(node.style, TEXT_STYLE.BODY); // from text token default
    assert.strictEqual(node.color, '000000');         // from text token default
    assert.strictEqual(node.hAlign, HALIGN.LEFT);     // explicit default
    assert.strictEqual(node.vAlign, VALIGN.TOP);      // explicit default
  });

  test('applies style prop', async () => {
    const node = await expand(text('test', { content: CONTENT.PROSE, style: TEXT_STYLE.H1 })) as TextNode;
    assert.strictEqual(node.style, TEXT_STYLE.H1);
  });

  test('applies color prop', async () => {
    const node = await expand(text('test', { content: CONTENT.PROSE, color: 'FF0000' })) as TextNode;
    assert.strictEqual(node.color, 'FF0000');
  });

  test('applies hAlign prop', async () => {
    const node = await expand(text('test', { content: CONTENT.PROSE, hAlign: HALIGN.CENTER })) as TextNode;
    assert.strictEqual(node.hAlign, HALIGN.CENTER);
  });

  test('applies vAlign prop', async () => {
    const node = await expand(text('test', { content: CONTENT.PROSE, vAlign: VALIGN.MIDDLE })) as TextNode;
    assert.strictEqual(node.vAlign, VALIGN.MIDDLE);
  });

  test('applies all props together', async () => {
    const node = await expand(text('test', {
      content: CONTENT.PROSE,
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

  test('pre-resolves resolvedStyle, bulletIndentPt, and lineHeightMultiplier at expand time', async () => {
    const node = await expand(text('hello', { content: CONTENT.PROSE })) as TextNode;
    assert.ok(node.resolvedStyle);
    assert.strictEqual(node.resolvedStyle.fontSize, 12); // from mockTextStyle for BODY style
    assert.strictEqual(node.bulletIndentPt, 18); // 12 * 1.5 (fontSize * bulletIndentMultiplier)
    assert.strictEqual(node.lineHeightMultiplier, 1.0); // from text token lineHeightMultiplier (lineSpacing default)
  });
});

// ============================================
// IMAGE
// ============================================

describe('image()', () => {
  test('returns ComponentNode', () => {
    const node = image('photo.jpg');
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.Image);
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

  // Asset path resolution (tested through image expansion)

  test('resolves asset.dot.path to string value', async () => {
    const assets = { icons: { rocket: '/path/to/rocket.svg' } };
    const node = await componentRegistry.expandTree(
      image('asset.icons.rocket'), { theme, assets },
    ) as ImageNode;
    assert.strictEqual(node.src, '/path/to/rocket.svg');
  });

  test('resolves deeply nested asset path', async () => {
    const assets = { images: { heroes: { landing: '/hero.png' } } };
    const node = await componentRegistry.expandTree(
      image('asset.images.heroes.landing'), { theme, assets },
    ) as ImageNode;
    assert.strictEqual(node.src, '/hero.png');
  });

  test('throws when assets not provided for asset reference', async () => {
    await assert.rejects(
      () => componentRegistry.expandTree(image('asset.icons.rocket'), { theme }),
      /asset reference.*no assets provided/,
    );
  });

  test('throws when asset key not found', async () => {
    const assets = { icons: { star: '/star.svg' } };
    await assert.rejects(
      () => componentRegistry.expandTree(image('asset.icons.rocket'), { theme, assets }),
      /could not be resolved/,
    );
  });

  test('throws when asset path resolves to object (with suggestions)', async () => {
    const assets = { icons: { rocket: '/rocket.svg', star: '/star.svg' } };
    await assert.rejects(
      () => componentRegistry.expandTree(image('asset.icons'), { theme, assets }),
      /resolved to an object.*Did you mean/,
    );
  });

  test('throws when traversal hits non-object mid-path', async () => {
    const assets = { icons: { rocket: '/rocket.svg' } };
    await assert.rejects(
      () => componentRegistry.expandTree(image('asset.icons.rocket.size'), { theme, assets }),
      /is not an object/,
    );
  });

  test('passes through non-asset paths unchanged', async () => {
    const node = await expand(image('https://example.com/photo.jpg')) as ImageNode;
    assert.strictEqual(node.src, 'https://example.com/photo.jpg');
  });

  test('pre-resolves maxScale from theme spacing.maxScaleFactor', async () => {
    const node = await expand(image('photo.jpg')) as ImageNode;
    assert.strictEqual(node.maxScale, 1.0); // from mockTheme spacing.maxScaleFactor default
  });
});

// ============================================
// LINE
// ============================================

describe('line()', () => {
  test('returns ComponentNode', () => {
    const node = line();
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.Line);
  });

  test('expands to correct NODE_TYPE', async () => {
    const node = await expand(line()) as LineNode;
    assert.strictEqual(node.type, NODE_TYPE.LINE);
  });

  test('uses theme token defaults for color, width, dashType', async () => {
    const node = await expand(line()) as LineNode;
    // color, width, dashType come from theme.components.line tokens
    assert.strictEqual(node.color, theme.colors.secondary);
    assert.strictEqual(node.width, theme.borders.width);
    assert.strictEqual(node.dashType, DASH_TYPE.SOLID);
    assert.strictEqual(node.beginArrow, undefined);
    assert.strictEqual(node.endArrow, undefined);
  });

  test('applies beginArrow prop', async () => {
    const node = await expand(line({ beginArrow: ARROW_TYPE.ARROW })) as LineNode;
    assert.strictEqual(node.beginArrow, ARROW_TYPE.ARROW);
  });

  test('applies endArrow prop', async () => {
    const node = await expand(line({ endArrow: ARROW_TYPE.TRIANGLE })) as LineNode;
    assert.strictEqual(node.endArrow, ARROW_TYPE.TRIANGLE);
  });

  test('applies both arrow props together', async () => {
    const node = await expand(line({
      beginArrow: ARROW_TYPE.DIAMOND,
      endArrow: ARROW_TYPE.STEALTH,
    })) as LineNode;
    assert.strictEqual(node.beginArrow, ARROW_TYPE.DIAMOND);
    assert.strictEqual(node.endArrow, ARROW_TYPE.STEALTH);
    // Token defaults still apply
    assert.strictEqual(node.color, theme.colors.secondary);
    assert.strictEqual(node.width, theme.borders.width);
    assert.strictEqual(node.dashType, DASH_TYPE.SOLID);
  });
});

// ============================================
// SHAPE (area shapes)
// ============================================

describe('shape()', () => {
  test('returns ComponentNode', () => {
    const node = shape({ shape: SHAPE.ELLIPSE });
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.Shape);
  });

  test('expands to specified shape type', async () => {
    const node = await expand(shape({ shape: SHAPE.PLUS })) as ShapeNode;
    assert.strictEqual(node.type, NODE_TYPE.SHAPE);
    assert.strictEqual(node.shape, SHAPE.PLUS);
  });

  test('uses token defaults when no explicit props', async () => {
    const node = await expand(shape({ shape: SHAPE.RECT })) as ShapeNode;
    // Shape now gets defaults from theme.components.shape tokens
    assert.deepStrictEqual(node.fill, { color: '333333', opacity: 100 });
    assert.deepStrictEqual(node.border, { color: 'FFFFFF', width: 0 });
    assert.strictEqual(node.cornerRadius, 0);
  });

  test('passes fill color (opacity defaults from token)', async () => {
    const node = await expand(shape({ shape: SHAPE.RECT, fill: 'FF0000' })) as ShapeNode;
    assert.deepStrictEqual(node.fill, { color: 'FF0000', opacity: 100 });
  });

  test('passes fill color with explicit opacity', async () => {
    const node = await expand(shape({ shape: SHAPE.RECT, fill: 'FF0000', fillOpacity: 50 })) as ShapeNode;
    assert.deepStrictEqual(node.fill, { color: 'FF0000', opacity: 50 });
  });

  test('passes border properties', async () => {
    const node = await expand(shape({
      shape: SHAPE.RECT,
      borderColor: '0000FF',
      borderWidth: 2,
    })) as ShapeNode;
    assert.strictEqual(node.border?.color, '0000FF');
    assert.strictEqual(node.border?.width, 2);
  });

  test('passes selective border sides', async () => {
    const node = await expand(shape({
      shape: SHAPE.RECT,
      borderColor: '000000',
      borderWidth: 1,
      borderTop: true,
      borderBottom: true,
      borderLeft: false,
      borderRight: false,
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
    const node = await expand(shape({ shape: SHAPE.TRAPEZOID, fill: 'FF0000', fillOpacity: 50 })) as ShapeNode;
    assert.strictEqual(node.shape, SHAPE.TRAPEZOID);
    assert.deepStrictEqual(node.fill, { color: 'FF0000', opacity: 50 });
  });

  test('applies all props together', async () => {
    const node = await expand(shape({
      shape: SHAPE.ELLIPSE,
      fill: 'EEEEEE',
      fillOpacity: 80,
      borderColor: '333333',
      borderWidth: 1,
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
    assert.strictEqual(node.componentName, Component.SlideNumber);
  });

  test('expands to correct NODE_TYPE', async () => {
    const node = await expand(slideNumber()) as SlideNumberNode;
    assert.strictEqual(node.type, NODE_TYPE.SLIDE_NUMBER);
  });

  test('uses theme token defaults for style, color, hAlign', async () => {
    const node = await expand(slideNumber()) as SlideNumberNode;
    // style, color, hAlign come from theme.components.slideNumber tokens
    assert.strictEqual(node.style, TEXT_STYLE.FOOTER);
    assert.strictEqual(node.color, '666666');
    assert.strictEqual(node.hAlign, HALIGN.RIGHT);
  });

  test('pre-resolves resolvedStyle at expand time', async () => {
    const node = await expand(slideNumber()) as SlideNumberNode;
    assert.ok(node.resolvedStyle);
    assert.strictEqual(node.resolvedStyle.fontSize, 12);
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
    assert.strictEqual(node.componentName, Component.Row);
  });

  test('accepts children without props', async () => {
    const node = row(child1, child2, child3);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.type, NODE_TYPE.CONTAINER);
    assert.strictEqual(expanded.direction, DIRECTION.ROW);
    assert.strictEqual(expanded.children.length, 3);
  });

  test('defaults to width: FILL, height: HUG', async () => {
    const node = row(child1);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.width, SIZE.FILL);
    assert.strictEqual(expanded.height, SIZE.HUG);
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
    assert.strictEqual(expanded.gap, 0.125);
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
    assert.strictEqual(expanded.gap, 0.125);
  });

  test('accepts props with children (props first)', async () => {
    const node = row({ gap: GAP.TIGHT }, text('A'), text('B'));
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.children.length, 2);
    assert.strictEqual(expanded.gap, 0.125);
  });

  test('applies all props together', async () => {
    const node = row({ gap: GAP.NORMAL, vAlign: VALIGN.MIDDLE }, text('A'), text('B'));
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.gap, 0.25);
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
    assert.strictEqual(node.componentName, Component.Column);
  });

  test('accepts children without props', async () => {
    const node = column(child1, child2, child3);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.type, NODE_TYPE.CONTAINER);
    assert.strictEqual(expanded.direction, DIRECTION.COLUMN);
    assert.strictEqual(expanded.children.length, 3);
  });

  test('defaults to width: FILL, height: HUG', async () => {
    const node = column(child1);
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.width, SIZE.FILL);
    assert.strictEqual(expanded.height, SIZE.HUG);
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
    assert.strictEqual(expanded.gap, 0.5);
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
    assert.strictEqual(expanded.gap, 0.125);
  });

  test('accepts props with children (props first)', async () => {
    const node = column({ gap: GAP.TIGHT }, text('A'), text('B'));
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.children.length, 2);
    assert.strictEqual(expanded.gap, 0.125);
  });

  test('applies all props together', async () => {
    const node = column({ height: SIZE.FILL, gap: GAP.NORMAL, vAlign: VALIGN.MIDDLE, hAlign: HALIGN.CENTER }, text('A'), text('B'));
    const expanded = await expand(node) as ContainerNode;
    assert.strictEqual(expanded.height, SIZE.FILL);
    assert.strictEqual(expanded.gap, 0.25);
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
    assert.strictEqual(node.componentName, Component.Stack);
  });

  test('expands to correct NODE_TYPE', async () => {
    const node = await expand(stack(child1)) as StackNode;
    assert.strictEqual(node.type, NODE_TYPE.STACK);
  });

  test('children are preserved', async () => {
    const node = await expand(stack(child1, child2)) as StackNode;
    assert.strictEqual(node.children.length, 2);
  });

  test('defaults to width: FILL, height: HUG', async () => {
    const node = await expand(stack(child1)) as StackNode;
    assert.strictEqual(node.width, SIZE.FILL);
    assert.strictEqual(node.height, SIZE.HUG);
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
    assert.strictEqual(g.componentName, Component.Grid);
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
    assert.strictEqual(rows[0].gap, 0.125);
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

  test('defaults to GAP.NORMAL when gap not specified', async () => {
    const rows = await expandGrid(grid(2, child1, child2));
    assert.strictEqual(rows[0].gap, 0.25);
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

  test('wrapper column has height: SIZE.FILL', async () => {
    const col = await expand(grid(2, child1, child2)) as ContainerNode;
    assert.strictEqual(col.height, SIZE.FILL);
  });

  test('rows have height: SIZE.FILL', async () => {
    const rows = await expandGrid(grid(2, child1, child2));
    assert.strictEqual(rows[0].height, SIZE.FILL);
    assert.strictEqual(rows[0].vAlign, VALIGN.TOP);
  });

  test('cells have width and height: SIZE.FILL', async () => {
    const rows = await expandGrid(grid(2, child1, child2));
    const col0 = rows[0].children[0] as ContainerNode;
    assert.strictEqual(col0.height, SIZE.FILL);
    assert.strictEqual(col0.width, SIZE.FILL);
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
    assert.strictEqual(node.componentName, Component.Card);
  });

  test('passes props to ComponentNode', () => {
    const node = card({
      title: 'Test Title',
      description: 'Test Description',
    });
    assert.strictEqual(node.props.title, 'Test Title');
    assert.strictEqual(node.props.description, 'Test Description');
  });

  test('preserves all props', () => {
    const props = {
      image: 'hero.jpg',
      title: 'Title',
      description: 'Description',
    };
    const node = card(props);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.Card);
    assert.strictEqual(node.props.image, 'hero.jpg');
    assert.strictEqual(node.props.title, 'Title');
    assert.strictEqual(node.props.description, 'Description');
  });

});

// ============================================
// TABLE FACTORY FUNCTIONS
// ============================================

describe('table() token defaults and theme overrides', () => {
  it('uses default token values from theme', async () => {
    const theme = createMockTheme();
    const node = await componentRegistry.expandTree(
      table([['A', 'B']], { headerRows: 1 }),
      { theme }
    ) as TableNode;
    assert.strictEqual(node.type, NODE_TYPE.TABLE);
    assert.strictEqual(node.borderStyle, 'full');
    assert.strictEqual(node.borderColor, theme.colors.secondary);
    assert.strictEqual(node.borderWidth, theme.borders.width);
    assert.strictEqual(node.cellPadding, theme.spacing.cellPadding);
    assert.strictEqual(node.cellTextStyle, 'body');
    assert.strictEqual(node.headerTextStyle, 'body');
  });

  it('applies theme.components.table overrides while keeping other defaults', async () => {
    const theme = createMockTheme({
      components: { table: { borderColor: 'FF0000', cellTextStyle: 'small' } },
    });
    const node = await componentRegistry.expandTree(
      table([['A', 'B']], { headerRows: 1 }),
      { theme }
    ) as TableNode;
    assert.strictEqual(node.borderColor, 'FF0000');
    assert.strictEqual(node.cellTextStyle, 'small');
    // Defaults still fill remaining tokens
    assert.strictEqual(node.borderStyle, 'full');
    assert.strictEqual(node.borderWidth, theme.borders.width);
    assert.strictEqual(node.cellPadding, theme.spacing.cellPadding);
    assert.strictEqual(node.headerTextStyle, 'body');
  });
});

describe('table()', () => {

  test('returns ComponentNode', () => {
    const node = table([['Header']]);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(node.componentName, Component.Table);
  });

  test('TableCellData cells preserve properties after expansion', async () => {
    const node = await expand(table([
      ['Header', { content: 'colored cell', textStyle: TEXT_STYLE.SMALL, color: 'FF0000', hAlign: HALIGN.CENTER }],
    ])) as TableNode;
    assert.strictEqual(node.type, NODE_TYPE.TABLE);
    const cell = node.rows[0][1];
    assert.deepStrictEqual(cell.content, [{ text: 'colored cell' }]);
    assert.strictEqual(cell.textStyle, TEXT_STYLE.SMALL);
    assert.strictEqual(cell.color, 'FF0000');
    assert.strictEqual(cell.hAlign, HALIGN.CENTER);
    assert.ok(cell.resolvedStyle);
    assert.strictEqual(cell.resolvedStyle.fontSize, 12); // from mockTextStyle
    assert.strictEqual(cell.lineHeightMultiplier, 1.0); // from theme.spacing.lineSpacing default
  });

  test('TableCellData without vAlign resolves to table default', async () => {
    const node = await expand(table([
      [{ content: 'cell with default vAlign' }],
    ])) as TableNode;
    const cell = node.rows[0][0];
    assert.strictEqual(cell.vAlign, VALIGN.MIDDLE);
  });

  test('string cells are fully resolved as TableCellData', async () => {
    const node = await expand(table([['plain string']])) as TableNode;
    const cell = node.rows[0][0];
    assert.deepStrictEqual(cell.content, [{ text: 'plain string' }]);
    assert.strictEqual(cell.color, '000000');           // resolved from theme.colors.text
    assert.strictEqual(cell.textStyle, TEXT_STYLE.BODY); // resolved from table token
    assert.ok(cell.resolvedStyle);
    assert.strictEqual(cell.resolvedStyle.fontSize, 12); // from mockTextStyle
    assert.strictEqual(cell.lineHeightMultiplier, 1.0); // from theme.spacing.lineSpacing default
  });

  test('preserves table props', async () => {
    const node = await expand(table([['a']], {
      headerRows: 1,
      headerColumns: 1,
    })) as TableNode;
    assert.strictEqual(node.headerRows, 1);
    assert.strictEqual(node.headerColumns, 1);
  });

});
