// DSL Factory Function Tests
// Tests for all factory functions in src/core/dsl.ts

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import {
  text,
  image,
  line,
  slideNumber,
  row,
  column,
  grid,
  card,
} from '../src/core/dsl.js';
import { NODE_TYPE } from '../src/core/nodes.js';
import {
  TEXT_STYLE,
  GAP,
  HALIGN,
  VALIGN,
  SIZE,
  ARROW_TYPE,
  DASH_TYPE,
} from '../src/core/types.js';

// ============================================
// TEXT FACTORY FUNCTIONS
// ============================================

describe('text()', () => {
  test('returns correct NODE_TYPE', () => {
    const node = text('hello');
    assert.strictEqual(node.type, NODE_TYPE.TEXT);
  });

  test('sets content correctly', () => {
    const node = text('hello world');
    assert.strictEqual(node.content, 'hello world');
  });

  test('handles empty string content', () => {
    const node = text('');
    assert.strictEqual(node.content, '');
  });

  test('handles array content (styled runs)', () => {
    const content = ['plain', { text: 'bold', weight: 'bold' as const }];
    const node = text(content);
    assert.deepStrictEqual(node.content, content);
  });

  test('applies no props by default', () => {
    const node = text('test');
    assert.strictEqual(node.style, undefined);
    assert.strictEqual(node.color, undefined);
    assert.strictEqual(node.hAlign, undefined);
    assert.strictEqual(node.vAlign, undefined);
  });

  test('applies style prop', () => {
    const node = text('test', { style: TEXT_STYLE.H1 });
    assert.strictEqual(node.style, TEXT_STYLE.H1);
  });

  test('applies color prop', () => {
    const node = text('test', { color: 'FF0000' });
    assert.strictEqual(node.color, 'FF0000');
  });

  test('applies hAlign prop', () => {
    const node = text('test', { hAlign: HALIGN.CENTER });
    assert.strictEqual(node.hAlign, HALIGN.CENTER);
  });

  test('applies vAlign prop', () => {
    const node = text('test', { vAlign: VALIGN.MIDDLE });
    assert.strictEqual(node.vAlign, VALIGN.MIDDLE);
  });

  test('applies all props together', () => {
    const node = text('test', {
      style: TEXT_STYLE.BODY,
      color: '00FF00',
      hAlign: HALIGN.RIGHT,
      vAlign: VALIGN.BOTTOM,
    });
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
  test('returns correct NODE_TYPE', () => {
    const node = image('photo.jpg');
    assert.strictEqual(node.type, NODE_TYPE.IMAGE);
  });

  test('sets src correctly', () => {
    const node = image('test.png');
    assert.strictEqual(node.src, 'test.png');
  });

  test('applies no props by default', () => {
    const node = image('photo.jpg');
    assert.strictEqual(node.alt, undefined);
  });

  test('applies alt prop', () => {
    const node = image('photo.jpg', { alt: 'A beautiful photo' });
    assert.strictEqual(node.alt, 'A beautiful photo');
  });
});

// ============================================
// LINE
// ============================================

describe('line()', () => {
  test('returns correct NODE_TYPE', () => {
    const node = line();
    assert.strictEqual(node.type, NODE_TYPE.LINE);
  });

  test('applies no props by default', () => {
    const node = line();
    assert.strictEqual(node.color, undefined);
    assert.strictEqual(node.width, undefined);
    assert.strictEqual(node.dashType, undefined);
    assert.strictEqual(node.beginArrow, undefined);
    assert.strictEqual(node.endArrow, undefined);
  });

  test('applies color prop', () => {
    const node = line({ color: 'FF0000' });
    assert.strictEqual(node.color, 'FF0000');
  });

  test('applies width prop', () => {
    const node = line({ width: 2 });
    assert.strictEqual(node.width, 2);
  });

  test('applies dashType prop', () => {
    const node = line({ dashType: DASH_TYPE.DASH });
    assert.strictEqual(node.dashType, DASH_TYPE.DASH);
  });

  test('applies beginArrow prop', () => {
    const node = line({ beginArrow: ARROW_TYPE.ARROW });
    assert.strictEqual(node.beginArrow, ARROW_TYPE.ARROW);
  });

  test('applies endArrow prop', () => {
    const node = line({ endArrow: ARROW_TYPE.TRIANGLE });
    assert.strictEqual(node.endArrow, ARROW_TYPE.TRIANGLE);
  });

  test('applies all props together', () => {
    const node = line({
      color: '0000FF',
      width: 3,
      dashType: DASH_TYPE.DASH_DOT,
      beginArrow: ARROW_TYPE.DIAMOND,
      endArrow: ARROW_TYPE.STEALTH,
    });
    assert.strictEqual(node.color, '0000FF');
    assert.strictEqual(node.width, 3);
    assert.strictEqual(node.dashType, DASH_TYPE.DASH_DOT);
    assert.strictEqual(node.beginArrow, ARROW_TYPE.DIAMOND);
    assert.strictEqual(node.endArrow, ARROW_TYPE.STEALTH);
  });
});

// ============================================
// SLIDE NUMBER
// ============================================

describe('slideNumber()', () => {
  test('returns correct NODE_TYPE', () => {
    const node = slideNumber();
    assert.strictEqual(node.type, NODE_TYPE.SLIDE_NUMBER);
  });

  test('applies no props by default', () => {
    const node = slideNumber();
    assert.strictEqual(node.style, undefined);
    assert.strictEqual(node.color, undefined);
    assert.strictEqual(node.hAlign, undefined);
  });

  test('applies style prop', () => {
    const node = slideNumber({ style: TEXT_STYLE.FOOTER });
    assert.strictEqual(node.style, TEXT_STYLE.FOOTER);
  });

  test('applies color prop', () => {
    const node = slideNumber({ color: '666666' });
    assert.strictEqual(node.color, '666666');
  });

  test('applies hAlign prop', () => {
    const node = slideNumber({ hAlign: HALIGN.RIGHT });
    assert.strictEqual(node.hAlign, HALIGN.RIGHT);
  });

  test('applies all props together', () => {
    const node = slideNumber({
      style: TEXT_STYLE.SMALL,
      color: 'AAAAAA',
      hAlign: HALIGN.CENTER,
    });
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

  test('returns correct NODE_TYPE', () => {
    const node = row(child1);
    assert.strictEqual(node.type, NODE_TYPE.ROW);
  });

  test('accepts children without props', () => {
    const node = row(child1, child2, child3);
    assert.strictEqual(node.children.length, 3);
    assert.deepStrictEqual(node.children, [child1, child2, child3]);
  });

  test('applies no props by default when no props provided', () => {
    const node = row(child1);
    assert.strictEqual(node.width, undefined);
    assert.strictEqual(node.gap, undefined);
    assert.strictEqual(node.vAlign, undefined);
  });

  test('accepts props with children (props first)', () => {
    const node = row({ gap: GAP.TIGHT }, child1, child2);
    assert.strictEqual(node.children.length, 2);
    assert.strictEqual(node.gap, GAP.TIGHT);
  });

  test('applies gap prop', () => {
    const node = row({ gap: GAP.LOOSE }, child1, child2);
    assert.strictEqual(node.gap, GAP.LOOSE);
  });

  test('applies vAlign prop', () => {
    const node = row({ vAlign: VALIGN.BOTTOM }, child1);
    assert.strictEqual(node.vAlign, VALIGN.BOTTOM);
  });

  test('applies all props together', () => {
    const node = row(
      { gap: GAP.NORMAL, vAlign: VALIGN.MIDDLE },
      child1,
      child2
    );
    assert.strictEqual(node.gap, GAP.NORMAL);
    assert.strictEqual(node.vAlign, VALIGN.MIDDLE);
    assert.strictEqual(node.children.length, 2);
  });

  test('handles single child', () => {
    const node = row(child1);
    assert.strictEqual(node.children.length, 1);
    assert.strictEqual(node.children[0], child1);
  });

  test('handles empty children', () => {
    const node = row();
    assert.strictEqual(node.children.length, 0);
  });

  test('distinguishes props from children (props object has no type)', () => {
    const propsObj = { gap: GAP.TIGHT };
    const node = row(propsObj, child1);
    assert.strictEqual(node.gap, GAP.TIGHT);
    assert.strictEqual(node.children.length, 1);
  });
});

// ============================================
// COLUMN
// ============================================

describe('column()', () => {
  const child1 = text('A');
  const child2 = text('B');
  const child3 = text('C');

  test('returns correct NODE_TYPE', () => {
    const node = column(child1);
    assert.strictEqual(node.type, NODE_TYPE.COLUMN);
  });

  test('accepts children without props', () => {
    const node = column(child1, child2, child3);
    assert.strictEqual(node.children.length, 3);
    assert.deepStrictEqual(node.children, [child1, child2, child3]);
  });

  test('applies no props by default when no props provided', () => {
    const node = column(child1);
    assert.strictEqual(node.height, undefined);
    assert.strictEqual(node.gap, undefined);
    assert.strictEqual(node.vAlign, undefined);
    assert.strictEqual(node.hAlign, undefined);
  });

  test('accepts props with children (props first)', () => {
    const node = column({ gap: GAP.LOOSE }, child1, child2);
    assert.strictEqual(node.children.length, 2);
    assert.strictEqual(node.gap, GAP.LOOSE);
  });

  test('applies height: SIZE.FILL prop', () => {
    const node = column({ height: SIZE.FILL }, child1, child2);
    assert.strictEqual(node.height, SIZE.FILL);
  });

  test('applies height: number prop', () => {
    const node = column({ height: 2.5 }, child1, child2);
    assert.strictEqual(node.height, 2.5);
  });

  test('applies gap prop', () => {
    const node = column({ gap: GAP.TIGHT }, child1, child2);
    assert.strictEqual(node.gap, GAP.TIGHT);
  });

  test('applies vAlign prop', () => {
    const node = column({ vAlign: VALIGN.MIDDLE }, child1);
    assert.strictEqual(node.vAlign, VALIGN.MIDDLE);
  });

  test('applies hAlign prop', () => {
    const node = column({ hAlign: HALIGN.RIGHT }, child1);
    assert.strictEqual(node.hAlign, HALIGN.RIGHT);
  });

  test('applies all props together', () => {
    const node = column(
      {
        height: SIZE.FILL,
        gap: GAP.NORMAL,
        vAlign: VALIGN.BOTTOM,
        hAlign: HALIGN.CENTER,
      },
      child1,
      child2,
      child3
    );
    assert.strictEqual(node.height, SIZE.FILL);
    assert.strictEqual(node.gap, GAP.NORMAL);
    assert.strictEqual(node.vAlign, VALIGN.BOTTOM);
    assert.strictEqual(node.hAlign, HALIGN.CENTER);
    assert.strictEqual(node.children.length, 3);
  });

  test('handles single child', () => {
    const node = column(child1);
    assert.strictEqual(node.children.length, 1);
  });

  test('handles empty children', () => {
    const node = column();
    assert.strictEqual(node.children.length, 0);
  });

  test('distinguishes props from children', () => {
    const propsObj = { vAlign: VALIGN.TOP };
    const node = column(propsObj, child1);
    assert.strictEqual(node.vAlign, VALIGN.TOP);
    assert.strictEqual(node.children.length, 1);
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

  test('returns ColumnNode', () => {
    const node = grid(2, child1, child2);
    assert.strictEqual(node.type, NODE_TYPE.COLUMN);
  });

  test('chunks children into rows (2 columns, 4 children = 2 rows)', () => {
    const node = grid(2, child1, child2, child3, child4);
    assert.strictEqual(node.children.length, 2);
    // First row has 2 children
    assert.strictEqual(node.children[0].type, NODE_TYPE.ROW);
    assert.strictEqual((node.children[0] as any).children.length, 2);
    // Second row has 2 children
    assert.strictEqual(node.children[1].type, NODE_TYPE.ROW);
    assert.strictEqual((node.children[1] as any).children.length, 2);
  });

  test('chunks children into rows (3 columns, 5 children = 2 rows, last row partial)', () => {
    const node = grid(3, child1, child2, child3, child4, child5);
    assert.strictEqual(node.children.length, 2);
    // First row has 3 children
    assert.strictEqual((node.children[0] as any).children.length, 3);
    // Second row has 2 children (partial)
    assert.strictEqual((node.children[1] as any).children.length, 2);
  });

  test('accepts props object with columns', () => {
    const node = grid({ columns: 2 }, child1, child2, child3, child4);
    assert.strictEqual(node.children.length, 2);
  });

  test('applies gap to both rows and column when specified', () => {
    const node = grid({ columns: 2, gap: GAP.TIGHT }, child1, child2, child3, child4);
    assert.strictEqual(node.gap, GAP.TIGHT);
    assert.strictEqual((node.children[0] as any).gap, GAP.TIGHT);
  });

  test('does not apply gap when not specified', () => {
    const node = grid(2, child1, child2);
    assert.strictEqual(node.gap, undefined);
    assert.strictEqual((node.children[0] as any).gap, undefined);
  });

  test('handles single row (columns >= children)', () => {
    const node = grid(4, child1, child2);
    assert.strictEqual(node.children.length, 1);
    assert.strictEqual((node.children[0] as any).children.length, 2);
  });

  test('handles empty children', () => {
    const node = grid(2);
    assert.strictEqual(node.children.length, 0);
  });

  test('handles single child', () => {
    const node = grid(3, child1);
    assert.strictEqual(node.children.length, 1);
    assert.strictEqual((node.children[0] as any).children.length, 1);
  });

  test('preserves child order', () => {
    const node = grid(2, child1, child2, child3, child4);
    const row1 = node.children[0] as any;
    const row2 = node.children[1] as any;
    assert.strictEqual(row1.children[0], child1);
    assert.strictEqual(row1.children[1], child2);
    assert.strictEqual(row2.children[0], child3);
    assert.strictEqual(row2.children[1], child4);
  });
});

// ============================================
// CARD
// ============================================

describe('card()', () => {
  test('returns ComponentNode with correct type', () => {
    const node = card({});
    assert.strictEqual(node.type, 'component');
    assert.strictEqual(node.componentName, 'card');
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
    assert.strictEqual(node.type, 'component');
    assert.strictEqual(node.componentName, 'card');
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

