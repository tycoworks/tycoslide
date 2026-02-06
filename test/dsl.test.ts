// DSL Factory Function Tests
// Tests for all factory functions in src/core/dsl.ts

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import {
  text,
  h1,
  h2,
  h3,
  h4,
  body,
  small,
  eyebrow,
  image,
  line,
  slideNumber,
  row,
  column,
  group,
  card,
  list,
  bulletList,
  numberedList,
  table,
} from '../src/core/dsl.js';
import { NODE_TYPE } from '../src/core/nodes.js';
import {
  TEXT_STYLE,
  GAP,
  HALIGN,
  VALIGN,
  JUSTIFY,
  SIZE,
  BORDER_STYLE,
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

describe('h1()', () => {
  test('returns correct NODE_TYPE', () => {
    const node = h1('heading');
    assert.strictEqual(node.type, NODE_TYPE.TEXT);
  });

  test('applies H1 style', () => {
    const node = h1('heading');
    assert.strictEqual(node.style, TEXT_STYLE.H1);
  });

  test('sets content correctly', () => {
    const node = h1('My Heading');
    assert.strictEqual(node.content, 'My Heading');
  });

  test('applies optional color prop', () => {
    const node = h1('heading', { color: 'FF0000' });
    assert.strictEqual(node.color, 'FF0000');
  });

  test('applies optional alignment props', () => {
    const node = h1('heading', { hAlign: HALIGN.CENTER, vAlign: VALIGN.TOP });
    assert.strictEqual(node.hAlign, HALIGN.CENTER);
    assert.strictEqual(node.vAlign, VALIGN.TOP);
  });

  test('style cannot be overridden via props', () => {
    const node = h1('heading', {});
    assert.strictEqual(node.style, TEXT_STYLE.H1);
  });
});

describe('h2()', () => {
  test('returns correct NODE_TYPE', () => {
    const node = h2('heading');
    assert.strictEqual(node.type, NODE_TYPE.TEXT);
  });

  test('applies H2 style', () => {
    const node = h2('heading');
    assert.strictEqual(node.style, TEXT_STYLE.H2);
  });

  test('sets content correctly', () => {
    const node = h2('Subheading');
    assert.strictEqual(node.content, 'Subheading');
  });

  test('applies optional props', () => {
    const node = h2('heading', { color: '0000FF' });
    assert.strictEqual(node.color, '0000FF');
  });
});

describe('h3()', () => {
  test('returns correct NODE_TYPE', () => {
    const node = h3('heading');
    assert.strictEqual(node.type, NODE_TYPE.TEXT);
  });

  test('applies H3 style', () => {
    const node = h3('heading');
    assert.strictEqual(node.style, TEXT_STYLE.H3);
  });

  test('sets content correctly', () => {
    const node = h3('Section Title');
    assert.strictEqual(node.content, 'Section Title');
  });
});

describe('h4()', () => {
  test('returns correct NODE_TYPE', () => {
    const node = h4('heading');
    assert.strictEqual(node.type, NODE_TYPE.TEXT);
  });

  test('applies H4 style', () => {
    const node = h4('heading');
    assert.strictEqual(node.style, TEXT_STYLE.H4);
  });

  test('sets content correctly', () => {
    const node = h4('Small Heading');
    assert.strictEqual(node.content, 'Small Heading');
  });
});

describe('body()', () => {
  test('returns correct NODE_TYPE', () => {
    const node = body('text');
    assert.strictEqual(node.type, NODE_TYPE.TEXT);
  });

  test('applies BODY style', () => {
    const node = body('text');
    assert.strictEqual(node.style, TEXT_STYLE.BODY);
  });

  test('sets content correctly', () => {
    const node = body('Body text here');
    assert.strictEqual(node.content, 'Body text here');
  });

  test('applies optional props', () => {
    const node = body('text', { color: 'AAAAAA', hAlign: HALIGN.LEFT });
    assert.strictEqual(node.color, 'AAAAAA');
    assert.strictEqual(node.hAlign, HALIGN.LEFT);
  });
});

describe('small()', () => {
  test('returns correct NODE_TYPE', () => {
    const node = small('text');
    assert.strictEqual(node.type, NODE_TYPE.TEXT);
  });

  test('applies SMALL style', () => {
    const node = small('text');
    assert.strictEqual(node.style, TEXT_STYLE.SMALL);
  });

  test('sets content correctly', () => {
    const node = small('Fine print');
    assert.strictEqual(node.content, 'Fine print');
  });
});

describe('eyebrow()', () => {
  test('returns correct NODE_TYPE', () => {
    const node = eyebrow('label');
    assert.strictEqual(node.type, NODE_TYPE.TEXT);
  });

  test('applies EYEBROW style', () => {
    const node = eyebrow('label');
    assert.strictEqual(node.style, TEXT_STYLE.EYEBROW);
  });

  test('sets content correctly', () => {
    const node = eyebrow('CATEGORY');
    assert.strictEqual(node.content, 'CATEGORY');
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
    assert.strictEqual(node.justify, undefined);
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

  test('applies justify prop', () => {
    const node = column({ justify: JUSTIFY.CENTER }, child1);
    assert.strictEqual(node.justify, JUSTIFY.CENTER);
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
        justify: JUSTIFY.END,
        hAlign: HALIGN.CENTER,
      },
      child1,
      child2,
      child3
    );
    assert.strictEqual(node.height, SIZE.FILL);
    assert.strictEqual(node.gap, GAP.NORMAL);
    assert.strictEqual(node.justify, JUSTIFY.END);
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
    const propsObj = { justify: JUSTIFY.START };
    const node = column(propsObj, child1);
    assert.strictEqual(node.justify, JUSTIFY.START);
    assert.strictEqual(node.children.length, 1);
  });
});

// ============================================
// GROUP
// ============================================

describe('group()', () => {
  const child1 = text('A');
  const child2 = text('B');
  const child3 = text('C');
  const child4 = text('D');

  test('returns correct NODE_TYPE', () => {
    const node = group(child1);
    assert.strictEqual(node.type, NODE_TYPE.GROUP);
  });

  test('accepts children without props', () => {
    const node = group(child1, child2, child3);
    assert.strictEqual(node.children.length, 3);
    assert.deepStrictEqual(node.children, [child1, child2, child3]);
  });

  test('applies no props by default when no props provided', () => {
    const node = group(child1);
    assert.strictEqual(node.columns, undefined);
    assert.strictEqual(node.gap, undefined);
  });

  test('accepts props with children (props first)', () => {
    const node = group({ columns: 2 }, child1, child2, child3, child4);
    assert.strictEqual(node.children.length, 4);
    assert.strictEqual(node.columns, 2);
  });

  test('applies columns prop', () => {
    const node = group({ columns: 3 }, child1, child2, child3);
    assert.strictEqual(node.columns, 3);
  });

  test('applies gap prop', () => {
    const node = group({ gap: GAP.LOOSE }, child1, child2);
    assert.strictEqual(node.gap, GAP.LOOSE);
  });

  test('applies all props together', () => {
    const node = group({ columns: 2, gap: GAP.TIGHT }, child1, child2, child3);
    assert.strictEqual(node.columns, 2);
    assert.strictEqual(node.gap, GAP.TIGHT);
    assert.strictEqual(node.children.length, 3);
  });

  test('handles single child', () => {
    const node = group(child1);
    assert.strictEqual(node.children.length, 1);
  });

  test('handles empty children', () => {
    const node = group();
    assert.strictEqual(node.children.length, 0);
  });

  test('distinguishes props from children', () => {
    const propsObj = { columns: 4 };
    const node = group(propsObj, child1, child2);
    assert.strictEqual(node.columns, 4);
    assert.strictEqual(node.children.length, 2);
  });
});

// ============================================
// CARD
// ============================================

describe('card()', () => {
  test('returns correct NODE_TYPE', () => {
    const node = card({});
    assert.strictEqual(node.type, NODE_TYPE.CARD);
  });

  test('creates empty card with no props', () => {
    const node = card({});
    assert.strictEqual(node.children.length, 0);
  });

  test('applies image prop - creates ImageNode child', () => {
    const node = card({ image: 'photo.jpg' });
    assert.strictEqual(node.children.length, 1);
    assert.strictEqual(node.children[0].type, NODE_TYPE.IMAGE);
    assert.strictEqual((node.children[0] as any).src, 'photo.jpg');
  });

  test('applies title prop - creates TextNode child', () => {
    const node = card({ title: 'Card Title' });
    assert.strictEqual(node.children.length, 1);
    assert.strictEqual(node.children[0].type, NODE_TYPE.TEXT);
    assert.strictEqual((node.children[0] as any).content, 'Card Title');
    assert.strictEqual((node.children[0] as any).style, TEXT_STYLE.H4); // default
  });

  test('applies titleStyle prop', () => {
    const node = card({ title: 'Title', titleStyle: TEXT_STYLE.H3 });
    assert.strictEqual((node.children[0] as any).style, TEXT_STYLE.H3);
  });

  test('applies titleColor prop', () => {
    const node = card({ title: 'Title', titleColor: 'FF0000' });
    assert.strictEqual((node.children[0] as any).color, 'FF0000');
  });

  test('applies description prop - creates TextNode child', () => {
    const node = card({ description: 'Card description' });
    assert.strictEqual(node.children.length, 1);
    assert.strictEqual(node.children[0].type, NODE_TYPE.TEXT);
    assert.strictEqual((node.children[0] as any).content, 'Card description');
    assert.strictEqual((node.children[0] as any).style, TEXT_STYLE.SMALL); // default
  });

  test('applies descriptionStyle prop', () => {
    const node = card({ description: 'Desc', descriptionStyle: TEXT_STYLE.BODY });
    assert.strictEqual((node.children[0] as any).style, TEXT_STYLE.BODY);
  });

  test('applies descriptionColor prop', () => {
    const node = card({ description: 'Desc', descriptionColor: '666666' });
    assert.strictEqual((node.children[0] as any).color, '666666');
  });

  test('applies background prop', () => {
    const node = card({ background: false });
    assert.strictEqual(node.background, false);
  });

  test('applies backgroundColor prop', () => {
    const node = card({ backgroundColor: 'EEEEEE' });
    assert.strictEqual(node.backgroundColor, 'EEEEEE');
  });

  test('applies backgroundOpacity prop', () => {
    const node = card({ backgroundOpacity: 50 });
    assert.strictEqual(node.backgroundOpacity, 50);
  });

  test('applies borderColor prop', () => {
    const node = card({ borderColor: '000000' });
    assert.strictEqual(node.borderColor, '000000');
  });

  test('applies borderWidth prop', () => {
    const node = card({ borderWidth: 2 });
    assert.strictEqual(node.borderWidth, 2);
  });

  test('applies cornerRadius prop', () => {
    const node = card({ cornerRadius: 0.25 });
    assert.strictEqual(node.cornerRadius, 0.25);
  });

  test('applies padding prop', () => {
    const node = card({ padding: 0.5 });
    assert.strictEqual(node.padding, 0.5);
  });

  test('applies all props together', () => {
    const node = card({
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
    });
    // Children: image, title, description (in order)
    assert.strictEqual(node.children.length, 3);
    assert.strictEqual(node.children[0].type, NODE_TYPE.IMAGE);
    assert.strictEqual((node.children[0] as any).src, 'hero.jpg');
    assert.strictEqual(node.children[1].type, NODE_TYPE.TEXT);
    assert.strictEqual((node.children[1] as any).content, 'Title');
    assert.strictEqual((node.children[1] as any).style, TEXT_STYLE.H2);
    assert.strictEqual((node.children[1] as any).color, 'FF0000');
    assert.strictEqual(node.children[2].type, NODE_TYPE.TEXT);
    assert.strictEqual((node.children[2] as any).content, 'Description');
    assert.strictEqual((node.children[2] as any).style, TEXT_STYLE.BODY);
    assert.strictEqual((node.children[2] as any).color, '333333');
    // Style props remain on the card
    assert.strictEqual(node.background, true);
    assert.strictEqual(node.backgroundColor, 'FFFFFF');
    assert.strictEqual(node.backgroundOpacity, 80);
    assert.strictEqual(node.borderColor, '000000');
    assert.strictEqual(node.borderWidth, 1);
    assert.strictEqual(node.cornerRadius, 0.125);
    assert.strictEqual(node.padding, 0.25);
  });

  test('custom children override image/title/description', () => {
    const customChildren = [text('Custom content')];
    const node = card({
      children: customChildren,
      title: 'Ignored', // should be ignored when children provided
    });
    assert.strictEqual(node.children.length, 1);
    assert.strictEqual((node.children[0] as any).content, 'Custom content');
  });
});

// ============================================
// LIST
// ============================================

describe('list()', () => {
  test('returns correct NODE_TYPE', () => {
    const node = list(['Item 1']);
    assert.strictEqual(node.type, NODE_TYPE.LIST);
  });

  test('sets items correctly', () => {
    const items = ['First', 'Second', 'Third'];
    const node = list(items);
    assert.deepStrictEqual(node.items, items);
  });

  test('handles empty items array', () => {
    const node = list([]);
    assert.strictEqual(node.items.length, 0);
  });

  test('handles TextNode items', () => {
    const textItem = text('Styled item');
    const node = list([textItem]);
    assert.strictEqual(node.items[0], textItem);
  });

  test('handles mixed string and TextNode items', () => {
    const textItem = text('Styled');
    const items = ['Plain', textItem, 'Another plain'];
    const node = list(items);
    assert.strictEqual(node.items.length, 3);
    assert.strictEqual(node.items[0], 'Plain');
    assert.strictEqual(node.items[1], textItem);
    assert.strictEqual(node.items[2], 'Another plain');
  });

  test('applies no props by default', () => {
    const node = list(['Item']);
    assert.strictEqual(node.style, undefined);
    assert.strictEqual(node.ordered, undefined);
    assert.strictEqual(node.color, undefined);
    assert.strictEqual(node.markerColor, undefined);
  });

  test('applies style prop', () => {
    const node = list(['Item'], { style: TEXT_STYLE.BODY });
    assert.strictEqual(node.style, TEXT_STYLE.BODY);
  });

  test('applies ordered prop', () => {
    const node = list(['Item'], { ordered: true });
    assert.strictEqual(node.ordered, true);
  });

  test('applies color prop', () => {
    const node = list(['Item'], { color: '333333' });
    assert.strictEqual(node.color, '333333');
  });

  test('applies markerColor prop', () => {
    const node = list(['Item'], { markerColor: 'FF0000' });
    assert.strictEqual(node.markerColor, 'FF0000');
  });

  test('applies all props together', () => {
    const node = list(['Item'], {
      style: TEXT_STYLE.SMALL,
      ordered: false,
      color: '666666',
      markerColor: '0000FF',
    });
    assert.strictEqual(node.style, TEXT_STYLE.SMALL);
    assert.strictEqual(node.ordered, false);
    assert.strictEqual(node.color, '666666');
    assert.strictEqual(node.markerColor, '0000FF');
  });
});

describe('bulletList()', () => {
  test('returns correct NODE_TYPE', () => {
    const node = bulletList(['Item']);
    assert.strictEqual(node.type, NODE_TYPE.LIST);
  });

  test('sets ordered to false', () => {
    const node = bulletList(['Item']);
    assert.strictEqual(node.ordered, false);
  });

  test('sets items correctly', () => {
    const items = ['A', 'B', 'C'];
    const node = bulletList(items);
    assert.deepStrictEqual(node.items, items);
  });

  test('applies optional props', () => {
    const node = bulletList(['Item'], { color: 'FF0000' });
    assert.strictEqual(node.color, 'FF0000');
    assert.strictEqual(node.ordered, false);
  });

  test('ordered cannot be overridden', () => {
    const node = bulletList(['Item'], {});
    assert.strictEqual(node.ordered, false);
  });
});

describe('numberedList()', () => {
  test('returns correct NODE_TYPE', () => {
    const node = numberedList(['Item']);
    assert.strictEqual(node.type, NODE_TYPE.LIST);
  });

  test('sets ordered to true', () => {
    const node = numberedList(['Item']);
    assert.strictEqual(node.ordered, true);
  });

  test('sets items correctly', () => {
    const items = ['First', 'Second', 'Third'];
    const node = numberedList(items);
    assert.deepStrictEqual(node.items, items);
  });

  test('applies optional props', () => {
    const node = numberedList(['Item'], { color: '0000FF' });
    assert.strictEqual(node.color, '0000FF');
    assert.strictEqual(node.ordered, true);
  });

  test('ordered cannot be overridden', () => {
    const node = numberedList(['Item'], {});
    assert.strictEqual(node.ordered, true);
  });
});

// ============================================
// TABLE
// ============================================

describe('table()', () => {
  const simpleData = [
    ['A', 'B', 'C'],
    ['D', 'E', 'F'],
  ];

  test('returns correct NODE_TYPE', () => {
    const node = table(simpleData);
    assert.strictEqual(node.type, NODE_TYPE.TABLE);
  });

  test('sets data correctly', () => {
    const node = table(simpleData);
    assert.deepStrictEqual(node.data, simpleData);
  });

  test('handles empty table', () => {
    const node = table([]);
    assert.strictEqual(node.data.length, 0);
  });

  test('handles TextNode cells', () => {
    const textCell = text('Styled cell');
    const data = [['Plain', textCell]];
    const node = table(data);
    assert.strictEqual(node.data[0][1], textCell);
  });

  test('applies no props by default', () => {
    const node = table(simpleData);
    assert.strictEqual(node.headerRow, undefined);
    assert.strictEqual(node.headerColumn, undefined);
    assert.strictEqual(node.borderStyle, undefined);
    assert.strictEqual(node.headerBackground, undefined);
    assert.strictEqual(node.cellBackground, undefined);
    assert.strictEqual(node.columnWidths, undefined);
    assert.strictEqual(node.hAlign, undefined);
    assert.strictEqual(node.vAlign, undefined);
  });

  test('applies headerRow prop', () => {
    const node = table(simpleData, { headerRow: true });
    assert.strictEqual(node.headerRow, true);
  });

  test('applies headerColumn prop', () => {
    const node = table(simpleData, { headerColumn: true });
    assert.strictEqual(node.headerColumn, true);
  });

  test('applies borderStyle prop', () => {
    const node = table(simpleData, { borderStyle: BORDER_STYLE.INTERNAL });
    assert.strictEqual(node.borderStyle, BORDER_STYLE.INTERNAL);
  });

  test('applies headerBackground prop', () => {
    const node = table(simpleData, { headerBackground: 'EEEEEE' });
    assert.strictEqual(node.headerBackground, 'EEEEEE');
  });

  test('applies cellBackground prop', () => {
    const node = table(simpleData, { cellBackground: 'FFFFFF' });
    assert.strictEqual(node.cellBackground, 'FFFFFF');
  });

  test('applies columnWidths prop', () => {
    const widths = [2, 3, 5];
    const node = table(simpleData, { columnWidths: widths });
    assert.deepStrictEqual(node.columnWidths, widths);
  });

  test('applies hAlign prop', () => {
    const node = table(simpleData, { hAlign: HALIGN.CENTER });
    assert.strictEqual(node.hAlign, HALIGN.CENTER);
  });

  test('applies vAlign prop', () => {
    const node = table(simpleData, { vAlign: VALIGN.MIDDLE });
    assert.strictEqual(node.vAlign, VALIGN.MIDDLE);
  });

  test('applies all props together', () => {
    const node = table(simpleData, {
      headerRow: true,
      headerColumn: true,
      borderStyle: BORDER_STYLE.FULL,
      headerBackground: 'DDDDDD',
      cellBackground: 'FAFAFA',
      columnWidths: [1, 2, 3],
      hAlign: HALIGN.RIGHT,
      vAlign: VALIGN.BOTTOM,
    });
    assert.strictEqual(node.headerRow, true);
    assert.strictEqual(node.headerColumn, true);
    assert.strictEqual(node.borderStyle, BORDER_STYLE.FULL);
    assert.strictEqual(node.headerBackground, 'DDDDDD');
    assert.strictEqual(node.cellBackground, 'FAFAFA');
    assert.deepStrictEqual(node.columnWidths, [1, 2, 3]);
    assert.strictEqual(node.hAlign, HALIGN.RIGHT);
    assert.strictEqual(node.vAlign, VALIGN.BOTTOM);
  });
});
