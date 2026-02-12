// PptxConfigBuilder Tests
// Tests for all translation methods in src/core/pptxConfigBuilder.ts

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { PptxConfigBuilder } from '../src/core/pptxConfigBuilder.js';
import { mockTheme } from './mocks.js';
import {
  NODE_TYPE,
  type PositionedNode,
  type TextNode,
  type LineNode,
  type ShapeNode,
  type TableNode,
  type TableCellData,
  type SlideNumberNode,
} from '../src/core/nodes.js';
import {
  TEXT_STYLE,
  HALIGN,
  VALIGN,
  ARROW_TYPE,
  DASH_TYPE,
  BORDER_STYLE,
  SHAPE,
  LINE_SHAPE,
} from '../src/core/types.js';
import { getParagraphGapRatio } from '../src/utils/text.js';
import { containFit } from '../src/utils/image.js';

// ============================================
// getParagraphGapRatio
// ============================================

describe('getParagraphGapRatio()', () => {
  test('returns 1.0 (CSS spec: 1em = fontSize)', () => {
    assert.strictEqual(getParagraphGapRatio(), 1.0);
  });
});

// ============================================
// HELPERS
// ============================================

const builder = new PptxConfigBuilder();
const theme = mockTheme();

function positioned(
  node: any,
  x: number,
  y: number,
  width: number,
  height: number
): PositionedNode {
  return { node, x, y, width, height };
}

// ============================================
// LINE TESTS - Regression test #1 and #2
// ============================================

describe('buildLineConfig()', () => {
  test('places arrows inside line sub-object', () => {
    const lineNode: LineNode = {
      type: NODE_TYPE.LINE,

      beginArrow: ARROW_TYPE.TRIANGLE,
      endArrow: ARROW_TYPE.TRIANGLE,
    };
    const pos = positioned(lineNode, 1, 2, 5, 0);

    const result = builder.buildLineConfig(lineNode, pos, theme);

    assert.strictEqual(result.shapeType, LINE_SHAPE);
    assert.ok(result.options.line, 'line sub-object should exist');
    const lineOpts = result.options.line as Record<string, unknown>;
    assert.strictEqual(lineOpts.beginArrowType, ARROW_TYPE.TRIANGLE);
    assert.strictEqual(lineOpts.endArrowType, ARROW_TYPE.TRIANGLE);
  });

  test('places dashType inside line sub-object', () => {
    const lineNode: LineNode = {
      type: NODE_TYPE.LINE,

      dashType: DASH_TYPE.DASH,
    };
    const pos = positioned(lineNode, 1, 2, 5, 0);

    const result = builder.buildLineConfig(lineNode, pos, theme);

    const lineOpts = result.options.line as Record<string, unknown>;
    assert.strictEqual(lineOpts.dashType, DASH_TYPE.DASH);
  });

  test('vertical line when height > width', () => {
    const lineNode: LineNode = {
      type: NODE_TYPE.LINE,

    };
    const pos = positioned(lineNode, 1, 2, 0.1, 5);

    const result = builder.buildLineConfig(lineNode, pos, theme);

    assert.strictEqual(result.options.w, 0);
    assert.strictEqual(result.options.h, 5);
  });

  test('horizontal line when width >= height', () => {
    const lineNode: LineNode = {
      type: NODE_TYPE.LINE,

    };
    const pos = positioned(lineNode, 1, 2, 5, 0.1);

    const result = builder.buildLineConfig(lineNode, pos, theme);

    assert.strictEqual(result.options.w, 5);
    assert.strictEqual(result.options.h, 0);
  });

  test('applies color and width from lineNode', () => {
    const lineNode: LineNode = {
      type: NODE_TYPE.LINE,

      color: 'FF0000',
      width: 3,
    };
    const pos = positioned(lineNode, 1, 2, 5, 0);

    const result = builder.buildLineConfig(lineNode, pos, theme);

    const lineOpts = result.options.line as Record<string, unknown>;
    assert.strictEqual(lineOpts.color, 'FF0000');
    assert.strictEqual(lineOpts.width, 3);
  });

  test('uses theme defaults when color and width not specified', () => {
    const lineNode: LineNode = {
      type: NODE_TYPE.LINE,

    };
    const pos = positioned(lineNode, 1, 2, 5, 0);

    const result = builder.buildLineConfig(lineNode, pos, theme);

    const lineOpts = result.options.line as Record<string, unknown>;
    assert.strictEqual(lineOpts.color, theme.colors.secondary);
    assert.strictEqual(lineOpts.width, theme.borders.width);
  });
});

// ============================================
// TABLE CELL TESTS - Regression test #3 and #4
// ============================================

describe('buildTableCell()', () => {
  test('preserves cell color in options and text fragments', () => {
    const cell: TableCellData = {
      content: 'Red text',
      color: 'FF0000',
    };
    const tableStyle: TableNode['style'] = {};

    const result = builder.buildTableCell(
      cell,
      0, 0, 1, 1,
      0, 0,
      tableStyle,
      theme
    );

    assert.strictEqual(result.options.color, 'FF0000');
    assert.strictEqual(result.text.length, 1);
    assert.strictEqual(result.text[0].options?.color, 'FF0000');
  });

  test('vAlign cascade: cell vAlign overrides table style', () => {
    const cell: TableCellData = {
      content: 'Cell with override',
      vAlign: VALIGN.BOTTOM,
    };
    const tableStyle: TableNode['style'] = {
      vAlign: VALIGN.TOP,
    };

    const result = builder.buildTableCell(
      cell,
      0, 0, 1, 1,
      0, 0,
      tableStyle,
      theme
    );

    assert.strictEqual(result.options.valign, VALIGN.BOTTOM);
  });

  test('vAlign cascade: cell without vAlign uses table style', () => {
    const cell: TableCellData = {
      content: 'Cell with default',
    };
    const tableStyle: TableNode['style'] = {
      vAlign: VALIGN.TOP,
    };

    const result = builder.buildTableCell(
      cell,
      0, 0, 1, 1,
      0, 0,
      tableStyle,
      theme
    );

    assert.strictEqual(result.options.valign, VALIGN.TOP);
  });

  test('vAlign cascade: cell without vAlign and no table style uses default MIDDLE', () => {
    const cell: TableCellData = {
      content: 'Cell with terminal default',
    };
    const tableStyle: TableNode['style'] = {};

    const result = builder.buildTableCell(
      cell,
      0, 0, 1, 1,
      0, 0,
      tableStyle,
      theme
    );

    assert.strictEqual(result.options.valign, VALIGN.MIDDLE);
  });

  test('hAlign cascade: cell hAlign overrides table style', () => {
    const cell: TableCellData = {
      content: 'Right aligned',
      hAlign: HALIGN.RIGHT,
    };
    const tableStyle: TableNode['style'] = {
      hAlign: HALIGN.LEFT,
    };

    const result = builder.buildTableCell(
      cell,
      0, 0, 1, 1,
      0, 0,
      tableStyle,
      theme
    );

    assert.strictEqual(result.options.align, HALIGN.RIGHT);
  });

  test('colspan and rowspan are passed through', () => {
    const cell: TableCellData = {
      content: 'Merged cell',
      colspan: 2,
      rowspan: 3,
    };
    const tableStyle: TableNode['style'] = {};

    const result = builder.buildTableCell(
      cell,
      0, 0, 1, 1,
      0, 0,
      tableStyle,
      theme
    );

    assert.strictEqual(result.options.colspan, 2);
    assert.strictEqual(result.options.rowspan, 3);
  });

  test('fill color applied from cell', () => {
    const cell: TableCellData = {
      content: 'Cell with fill',
      fill: 'FFFF00',
    };
    const tableStyle: TableNode['style'] = {};

    const result = builder.buildTableCell(
      cell,
      0, 0, 1, 1,
      0, 0,
      tableStyle,
      theme
    );

    assert.ok(result.options.fill);
    const fill = result.options.fill as { color: string };
    assert.strictEqual(fill.color, 'FFFF00');
  });

  test('header cell uses headerBackground from table style', () => {
    const cell: TableCellData = {
      content: 'Header',
    };
    const tableStyle: TableNode['style'] = {
      headerBackground: 'EEEEEE',
    };

    const result = builder.buildTableCell(
      cell,
      0, 0, 1, 1,
      1, 0,  // headerRows = 1, so row 0 is header
      tableStyle,
      theme
    );

    assert.ok(result.options.fill);
    const fill = result.options.fill as { color: string };
    assert.strictEqual(fill.color, 'EEEEEE');
  });
});

// ============================================
// BORDER STYLE TESTS - Regression test #5
// ============================================

describe('buildCellBorder()', () => {
  test('BORDER_STYLE.INTERNAL - corner cell (0,0) in 3x3 table', () => {
    const tableStyle: TableNode['style'] = {
      borderStyle: BORDER_STYLE.INTERNAL,
      borderWidth: 1,
      borderColor: '000000',
    };

    const border = builder.buildCellBorder(tableStyle, theme, 0, 0, 3, 3);

    assert.ok(border);
    assert.strictEqual(border.length, 4);
    // [top, right, bottom, left]
    assert.strictEqual(border[0].type, 'none');   // top (first row)
    assert.strictEqual(border[1].type, 'solid');  // right (not last col)
    assert.strictEqual(border[2].type, 'solid');  // bottom (not last row)
    assert.strictEqual(border[3].type, 'none');   // left (first col)
  });

  test('BORDER_STYLE.INTERNAL - middle cell (1,1) in 3x3 table', () => {
    const tableStyle: TableNode['style'] = {
      borderStyle: BORDER_STYLE.INTERNAL,
      borderWidth: 1,
      borderColor: '000000',
    };

    const border = builder.buildCellBorder(tableStyle, theme, 1, 1, 3, 3);

    assert.ok(border);
    assert.strictEqual(border.length, 4);
    // All internal borders
    assert.strictEqual(border[0].type, 'solid');  // top
    assert.strictEqual(border[1].type, 'solid');  // right
    assert.strictEqual(border[2].type, 'solid');  // bottom
    assert.strictEqual(border[3].type, 'solid');  // left
  });

  test('BORDER_STYLE.INTERNAL - bottom-right cell (2,2) in 3x3 table', () => {
    const tableStyle: TableNode['style'] = {
      borderStyle: BORDER_STYLE.INTERNAL,
      borderWidth: 1,
      borderColor: '000000',
    };

    const border = builder.buildCellBorder(tableStyle, theme, 2, 2, 3, 3);

    assert.ok(border);
    assert.strictEqual(border.length, 4);
    // [top, right, bottom, left]
    assert.strictEqual(border[0].type, 'solid');  // top (not first row)
    assert.strictEqual(border[1].type, 'none');   // right (last col)
    assert.strictEqual(border[2].type, 'none');   // bottom (last row)
    assert.strictEqual(border[3].type, 'solid');  // left (not first col)
  });

  test('BORDER_STYLE.FULL - all borders solid', () => {
    const tableStyle: TableNode['style'] = {
      borderStyle: BORDER_STYLE.FULL,
      borderWidth: 1,
      borderColor: '000000',
    };

    const border = builder.buildCellBorder(tableStyle, theme, 1, 1, 3, 3);

    assert.ok(border);
    assert.strictEqual(border.length, 4);
    assert.strictEqual(border[0].type, 'solid');
    assert.strictEqual(border[1].type, 'solid');
    assert.strictEqual(border[2].type, 'solid');
    assert.strictEqual(border[3].type, 'solid');
  });

  test('BORDER_STYLE.HORIZONTAL - only top and bottom', () => {
    const tableStyle: TableNode['style'] = {
      borderStyle: BORDER_STYLE.HORIZONTAL,
      borderWidth: 1,
      borderColor: '000000',
    };

    const border = builder.buildCellBorder(tableStyle, theme, 1, 1, 3, 3);

    assert.ok(border);
    assert.strictEqual(border.length, 4);
    assert.strictEqual(border[0].type, 'solid');  // top
    assert.strictEqual(border[1].type, 'none');   // right
    assert.strictEqual(border[2].type, 'solid');  // bottom
    assert.strictEqual(border[3].type, 'none');   // left
  });

  test('BORDER_STYLE.VERTICAL - only left and right', () => {
    const tableStyle: TableNode['style'] = {
      borderStyle: BORDER_STYLE.VERTICAL,
      borderWidth: 1,
      borderColor: '000000',
    };

    const border = builder.buildCellBorder(tableStyle, theme, 1, 1, 3, 3);

    assert.ok(border);
    assert.strictEqual(border.length, 4);
    assert.strictEqual(border[0].type, 'none');   // top
    assert.strictEqual(border[1].type, 'solid');  // right
    assert.strictEqual(border[2].type, 'none');   // bottom
    assert.strictEqual(border[3].type, 'solid');  // left
  });

  test('BORDER_STYLE.NONE - returns undefined', () => {
    const tableStyle: TableNode['style'] = {
      borderStyle: BORDER_STYLE.NONE,
    };

    const border = builder.buildCellBorder(tableStyle, theme, 1, 1, 3, 3);

    assert.strictEqual(border, undefined);
  });

  test('border width and color applied correctly', () => {
    const tableStyle: TableNode['style'] = {
      borderStyle: BORDER_STYLE.FULL,
      borderWidth: 2.5,
      borderColor: 'FF0000',
    };

    const border = builder.buildCellBorder(tableStyle, theme, 0, 0, 1, 1);

    assert.ok(border);
    assert.strictEqual(border[0].pt, 2.5);
    assert.strictEqual(border[0].color, 'FF0000');
  });
});

// ============================================
// COLUMN WIDTHS TESTS - Regression test #6
// ============================================

describe('buildColumnWidths()', () => {
  test('equal widths when columnWidths not specified', () => {
    const widths = builder.buildColumnWidths(undefined, 3, 6);

    assert.strictEqual(widths.length, 3);
    assert.strictEqual(widths[0], 2);
    assert.strictEqual(widths[1], 2);
    assert.strictEqual(widths[2], 2);
  });

  test('equal widths when columnWidths is empty array', () => {
    const widths = builder.buildColumnWidths([], 4, 8);

    assert.strictEqual(widths.length, 4);
    assert.strictEqual(widths[0], 2);
    assert.strictEqual(widths[1], 2);
    assert.strictEqual(widths[2], 2);
    assert.strictEqual(widths[3], 2);
  });

  test('proportional normalization when columnWidths specified', () => {
    // Proportions: [1, 2, 3] with total width 6
    // Sum = 6, so 1/6 * 6 = 1, 2/6 * 6 = 2, 3/6 * 6 = 3
    const widths = builder.buildColumnWidths([1, 2, 3], 3, 6);

    assert.strictEqual(widths.length, 3);
    assert.strictEqual(widths[0], 1);
    assert.strictEqual(widths[1], 2);
    assert.strictEqual(widths[2], 3);
  });

  test('proportional normalization with non-integer proportions', () => {
    // Proportions: [1.5, 2.5, 1] with total width 10
    // Sum = 5, so 1.5/5 * 10 = 3, 2.5/5 * 10 = 5, 1/5 * 10 = 2
    const widths = builder.buildColumnWidths([1.5, 2.5, 1], 3, 10);

    assert.strictEqual(widths.length, 3);
    assert.strictEqual(widths[0], 3);
    assert.strictEqual(widths[1], 5);
    assert.strictEqual(widths[2], 2);
  });

  test('equal proportions produce equal widths', () => {
    const widths = builder.buildColumnWidths([1, 1, 1], 3, 9);

    assert.strictEqual(widths.length, 3);
    assert.strictEqual(widths[0], 3);
    assert.strictEqual(widths[1], 3);
    assert.strictEqual(widths[2], 3);
  });
});

// ============================================
// RECTANGLE TESTS - Regression test #7
// ============================================

describe('buildShapeConfig() — area shapes', () => {
  test('returns null when no fill and no border', () => {
    const shapeNode: ShapeNode = {
      type: NODE_TYPE.SHAPE,
      shape: SHAPE.ROUND_RECT,
    };
    const pos = positioned(shapeNode, 1, 2, 5, 3);

    const result = builder.buildShapeConfig(shapeNode, pos, theme);

    assert.strictEqual(result, null);
  });

  test('returns ROUND_RECT shape type', () => {
    const shapeNode: ShapeNode = {
      type: NODE_TYPE.SHAPE,
      shape: SHAPE.ROUND_RECT,
      fill: { color: 'EEEEEE' },
    };
    const pos = positioned(shapeNode, 1, 2, 5, 3);

    const result = builder.buildShapeConfig(shapeNode, pos, theme);

    assert.ok(result);
    assert.strictEqual(result.shapeType, SHAPE.ROUND_RECT);
  });

  test('returns ROUND_RECT shape when cornerRadius specified', () => {
    const shapeNode: ShapeNode = {
      type: NODE_TYPE.SHAPE,
      shape: SHAPE.ROUND_RECT,
      fill: { color: 'EEEEEE' },
      cornerRadius: 0.125,
    };
    const pos = positioned(shapeNode, 1, 2, 5, 3);

    const result = builder.buildShapeConfig(shapeNode, pos, theme);

    assert.ok(result);
    assert.strictEqual(result.shapeType, SHAPE.ROUND_RECT);
    assert.strictEqual(result.options.rectRadius, 0.125);
  });

  test('applies fill color and transparency', () => {
    const shapeNode: ShapeNode = {
      type: NODE_TYPE.SHAPE,
      shape: SHAPE.ROUND_RECT,
      fill: { color: 'FF0000', opacity: 50 },
    };
    const pos = positioned(shapeNode, 1, 2, 5, 3);

    const result = builder.buildShapeConfig(shapeNode, pos, theme);

    assert.ok(result);
    assert.ok(result.options.fill);
    const fill = result.options.fill as { color: string; transparency: number };
    assert.strictEqual(fill.color, 'FF0000');
    assert.strictEqual(fill.transparency, 50);  // 100 - 50
  });

  test('applies border when all sides enabled', () => {
    const shapeNode: ShapeNode = {
      type: NODE_TYPE.SHAPE,
      shape: SHAPE.ROUND_RECT,
      fill: { color: 'FFFFFF' },
      border: {
        color: '000000',
        width: 2,
      },
    };
    const pos = positioned(shapeNode, 1, 2, 5, 3);

    const result = builder.buildShapeConfig(shapeNode, pos, theme);

    assert.ok(result);
    assert.ok(result.options.line);
    const line = result.options.line as { color: string; width: number };
    assert.strictEqual(line.color, '000000');
    assert.strictEqual(line.width, 2);
  });

  test('no border when any side explicitly disabled', () => {
    const shapeNode: ShapeNode = {
      type: NODE_TYPE.SHAPE,
      shape: SHAPE.ROUND_RECT,
      fill: { color: 'FFFFFF' },
      border: {
        color: '000000',
        width: 2,
        top: false,  // One side disabled
      },
    };
    const pos = positioned(shapeNode, 1, 2, 5, 3);

    const result = builder.buildShapeConfig(shapeNode, pos, theme);

    assert.ok(result);
    assert.strictEqual(result.options.line, undefined);
  });

  test('uses theme defaults for border color and width', () => {
    const shapeNode: ShapeNode = {
      type: NODE_TYPE.SHAPE,
      shape: SHAPE.ROUND_RECT,
      fill: { color: 'FFFFFF' },
      border: {},
    };
    const pos = positioned(shapeNode, 1, 2, 5, 3);

    const result = builder.buildShapeConfig(shapeNode, pos, theme);

    assert.ok(result);
    assert.ok(result.options.line);
    const line = result.options.line as { color: string; width: number };
    assert.strictEqual(line.color, theme.colors.secondary);
    assert.strictEqual(line.width, theme.borders.width);
  });
});

// ============================================
// TEXT CONFIG TESTS - Regression test #8
// ============================================

describe('buildTextConfig()', () => {
  test('does not include align option when text has bullets', () => {
    const textNode: TextNode = {
      type: NODE_TYPE.TEXT,
      content: [
        { text: 'Item 1', bullet: true },
        { text: 'Item 2', bullet: true },
      ],
      hAlign: HALIGN.CENTER,
      vAlign: VALIGN.TOP,
    };
    const pos = positioned(textNode, 1, 2, 5, 3);

    const result = builder.buildTextConfig(textNode, pos, theme);

    assert.strictEqual(result.options.align, undefined);
    assert.strictEqual(result.options.valign, VALIGN.TOP);
  });

  test('includes align option when text has no bullets', () => {
    const textNode: TextNode = {
      type: NODE_TYPE.TEXT,
      content: 'Plain text',
      hAlign: HALIGN.CENTER,
      vAlign: VALIGN.TOP,
    };
    const pos = positioned(textNode, 1, 2, 5, 3);

    const result = builder.buildTextConfig(textNode, pos, theme);

    assert.strictEqual(result.options.align, HALIGN.CENTER);
    assert.strictEqual(result.options.valign, VALIGN.TOP);
  });

  test('applies text style from theme', () => {
    const textNode: TextNode = {
      type: NODE_TYPE.TEXT,
      content: 'Styled text',
      style: TEXT_STYLE.H1,
      hAlign: HALIGN.LEFT,
      vAlign: VALIGN.TOP,
    };
    const pos = positioned(textNode, 1, 2, 5, 3);

    const result = builder.buildTextConfig(textNode, pos, theme);

    const h1Style = theme.textStyles[TEXT_STYLE.H1];
    assert.strictEqual(result.options.fontSize, h1Style.fontSize);
    assert.strictEqual(result.options.fontFace, h1Style.fontFamily.normal.name);
  });

  test('applies color override from node', () => {
    const textNode: TextNode = {
      type: NODE_TYPE.TEXT,
      content: 'Colored text',
      color: 'FF0000',
      hAlign: HALIGN.LEFT,
      vAlign: VALIGN.TOP,
    };
    const pos = positioned(textNode, 1, 2, 5, 3);

    const result = builder.buildTextConfig(textNode, pos, theme);

    assert.strictEqual(result.options.color, 'FF0000');
  });

  test('applies custom line height multiplier from node', () => {
    const textNode: TextNode = {
      type: NODE_TYPE.TEXT,
      content: 'Text with custom spacing',
      lineHeightMultiplier: 1.5,
      hAlign: HALIGN.LEFT,
      vAlign: VALIGN.TOP,
    };
    const pos = positioned(textNode, 1, 2, 5, 3);

    const result = builder.buildTextConfig(textNode, pos, theme);

    assert.strictEqual(result.options.lineSpacingMultiple, 1.5);
  });

  test('uses bulletSpacing for bullet text', () => {
    const textNode: TextNode = {
      type: NODE_TYPE.TEXT,
      content: [{ text: 'Bullet', bullet: true }],
      hAlign: HALIGN.LEFT,
      vAlign: VALIGN.TOP,
    };
    const pos = positioned(textNode, 1, 2, 5, 3);

    const result = builder.buildTextConfig(textNode, pos, theme);

    assert.strictEqual(result.options.lineSpacingMultiple, theme.spacing.bulletSpacing);
  });
});

// ============================================
// TEXT FRAGMENTS TESTS
// ============================================

describe('buildTextFragments()', () => {
  test('converts string content to single fragment', () => {
    const fragments = builder.buildTextFragments(
      'Plain text',
      TEXT_STYLE.BODY,
      theme
    );

    assert.strictEqual(fragments.length, 1);
    assert.strictEqual(fragments[0].text, 'Plain text');
  });

  test('preserves color from text run', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Colored', color: 'FF0000' }],
      TEXT_STYLE.BODY,
      theme
    );

    assert.strictEqual(fragments.length, 1);
    assert.strictEqual(fragments[0].options?.color, 'FF0000');
  });

  test('applies bold formatting', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Bold text', bold: true }],
      TEXT_STYLE.BODY,
      theme
    );

    assert.strictEqual(fragments.length, 1);
    assert.strictEqual(fragments[0].options?.bold, true);
  });

  test('applies italic formatting', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Italic text', italic: true }],
      TEXT_STYLE.BODY,
      theme
    );

    assert.strictEqual(fragments.length, 1);
    assert.strictEqual(fragments[0].options?.italic, true);
  });

  test('applies highlight background', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Highlighted', highlight: { bg: 'FFFF00', text: '000000' } }],
      TEXT_STYLE.BODY,
      theme
    );

    assert.strictEqual(fragments.length, 1);
    assert.strictEqual(fragments[0].options?.highlight, 'FFFF00');
    assert.strictEqual(fragments[0].options?.color, '000000');
  });

  test('applies bullet formatting', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Bullet item', bullet: true }],
      TEXT_STYLE.BODY,
      theme
    );

    assert.strictEqual(fragments.length, 1);
    assert.strictEqual(fragments[0].options?.bullet, true);
  });

  test('shifts breakLine to previous fragment for pptxgenjs', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Line 1' }, { text: 'Line 2', breakLine: true }],
      TEXT_STYLE.BODY,
      theme
    );

    assert.strictEqual(fragments.length, 2);
    // pptxgenjs breakLine means "break AFTER this run", so it shifts to previous fragment
    assert.strictEqual(fragments[0].options?.breakLine, true);
    assert.strictEqual(fragments[1].options?.breakLine, undefined);
  });

  test('adds paraSpaceBefore on paragraph break fragment', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Paragraph 1' }, { text: 'Paragraph 2', breakLine: true }],
      TEXT_STYLE.BODY,
      theme
    );

    assert.strictEqual(fragments.length, 2);
    // breakLine shifted to fragment 0
    assert.strictEqual(fragments[0].options?.breakLine, true);
    // paraSpaceBefore on fragment 1 (the new paragraph's first run)
    // fontSize is 12 from mockTheme, getParagraphGapRatio() returns 1.0
    assert.strictEqual(fragments[1].options?.paraSpaceBefore, 12);
  });

  test('paraSpaceBefore matches fontSize for any text style', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'A' }, { text: 'B', breakLine: true }],
      TEXT_STYLE.H1,
      theme
    );

    const h1FontSize = theme.textStyles[TEXT_STYLE.H1].fontSize;
    assert.strictEqual(fragments[1].options?.paraSpaceBefore, h1FontSize);
  });

  test('does not apply breakLine when bullet present', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Bullet', bullet: true, breakLine: true }],
      TEXT_STYLE.BODY,
      theme
    );

    assert.strictEqual(fragments.length, 1);
    assert.strictEqual(fragments[0].options?.bullet, true);
    assert.strictEqual(fragments[0].options?.breakLine, undefined);
  });

  test('does not add paraSpaceBefore when bullet present with breakLine', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Bullet', bullet: true, breakLine: true }],
      TEXT_STYLE.BODY,
      theme
    );

    assert.strictEqual(fragments[0].options?.paraSpaceBefore, undefined);
  });

  test('multiple paragraph breaks each get paraSpaceBefore', () => {
    const fragments = builder.buildTextFragments(
      [
        { text: 'Para 1' },
        { text: 'Para 2', breakLine: true },
        { text: 'Para 3', breakLine: true },
      ],
      TEXT_STYLE.BODY,
      theme
    );

    assert.strictEqual(fragments.length, 3);
    // Both paragraph-start fragments get paraSpaceBefore
    assert.strictEqual(fragments[1].options?.paraSpaceBefore, 12);
    assert.strictEqual(fragments[2].options?.paraSpaceBefore, 12);
    // breakLine shifted to previous fragments
    assert.strictEqual(fragments[0].options?.breakLine, true);
    assert.strictEqual(fragments[1].options?.breakLine, true);
  });

  test('color override applies to all fragments', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Run 1' }, { text: 'Run 2' }],
      TEXT_STYLE.BODY,
      theme,
      'FF0000'
    );

    assert.strictEqual(fragments.length, 2);
    assert.strictEqual(fragments[0].options?.color, 'FF0000');
    assert.strictEqual(fragments[1].options?.color, 'FF0000');
  });
});

// ============================================
// SLIDE NUMBER TESTS
// ============================================

describe('buildSlideNumberOptions()', () => {
  test('applies default FOOTER style', () => {
    const slideNumNode: SlideNumberNode = {
      type: NODE_TYPE.SLIDE_NUMBER,
      hAlign: HALIGN.RIGHT,
    };
    const pos = positioned(slideNumNode, 1, 2, 2, 0.3);

    const result = builder.buildSlideNumberOptions(slideNumNode, pos, theme);

    const footerStyle = theme.textStyles[TEXT_STYLE.FOOTER];
    assert.strictEqual(result.fontSize, footerStyle.fontSize);
    assert.strictEqual(result.fontFace, footerStyle.fontFamily.normal.name);
  });

  test('applies custom style', () => {
    const slideNumNode: SlideNumberNode = {
      type: NODE_TYPE.SLIDE_NUMBER,
      style: TEXT_STYLE.SMALL,
      hAlign: HALIGN.RIGHT,
    };
    const pos = positioned(slideNumNode, 1, 2, 2, 0.3);

    const result = builder.buildSlideNumberOptions(slideNumNode, pos, theme);

    const smallStyle = theme.textStyles[TEXT_STYLE.SMALL];
    assert.strictEqual(result.fontSize, smallStyle.fontSize);
  });

  test('applies color override', () => {
    const slideNumNode: SlideNumberNode = {
      type: NODE_TYPE.SLIDE_NUMBER,
      color: 'FF0000',
      hAlign: HALIGN.RIGHT,
    };
    const pos = positioned(slideNumNode, 1, 2, 2, 0.3);

    const result = builder.buildSlideNumberOptions(slideNumNode, pos, theme);

    assert.strictEqual(result.color, 'FF0000');
  });

  test('applies hAlign from node', () => {
    const slideNumNode: SlideNumberNode = {
      type: NODE_TYPE.SLIDE_NUMBER,
      hAlign: HALIGN.CENTER,
    };
    const pos = positioned(slideNumNode, 1, 2, 2, 0.3);

    const result = builder.buildSlideNumberOptions(slideNumNode, pos, theme);

    assert.strictEqual(result.align, HALIGN.CENTER);
  });

  test('valign is always MIDDLE', () => {
    const slideNumNode: SlideNumberNode = {
      type: NODE_TYPE.SLIDE_NUMBER,
      hAlign: HALIGN.RIGHT,
    };
    const pos = positioned(slideNumNode, 1, 2, 2, 0.3);

    const result = builder.buildSlideNumberOptions(slideNumNode, pos, theme);

    assert.strictEqual(result.valign, VALIGN.MIDDLE);
  });

  test('position and dimensions applied', () => {
    const slideNumNode: SlideNumberNode = {
      type: NODE_TYPE.SLIDE_NUMBER,
      hAlign: HALIGN.RIGHT,
    };
    const pos = positioned(slideNumNode, 1.5, 2.5, 3, 0.4);

    const result = builder.buildSlideNumberOptions(slideNumNode, pos, theme);

    assert.strictEqual(result.x, 1.5);
    assert.strictEqual(result.y, 2.5);
    assert.strictEqual(result.w, 3);
    assert.strictEqual(result.h, 0.4);
  });
});

// ============================================
// INTEGRATION: text() → expandTree → buildTextFragments
// End-to-end: markdown string in, PPTX fragments out
// Uses public text() API instead of internal parseMarkdown/mdastToRuns
// ============================================

import { text } from '../src/dsl/text.js';
import { componentRegistry } from '../src/core/registry.js';
import type { NormalizedRun } from '../src/core/types.js';

/** Expand a text() component to get its NormalizedRun[] content */
async function expandTextToRuns(markdown: string): Promise<NormalizedRun[]> {
  const node = text(markdown);
  const expanded = await componentRegistry.expandTree(node, { theme });
  assert.strictEqual(expanded.type, NODE_TYPE.TEXT);
  return (expanded as TextNode).content as NormalizedRun[];
}

describe('Integration: text() → PPTX fragments', () => {
  const fontSize = theme.textStyles[TEXT_STYLE.BODY].fontSize; // 12

  test('two paragraphs produce correct PPTX fragments with paragraph spacing', async () => {
    const runs = await expandTextToRuns('First paragraph.\n\nSecond paragraph.');
    const fragments = builder.buildTextFragments(runs, TEXT_STYLE.BODY, theme);

    assert.strictEqual(fragments.length, 2);

    // Fragment 0: "First paragraph." — gets breakLine (shifted from run 1)
    assert.strictEqual(fragments[0].text, 'First paragraph.');
    assert.strictEqual(fragments[0].options?.breakLine, true);
    assert.strictEqual(fragments[0].options?.paraSpaceBefore, undefined);

    // Fragment 1: "Second paragraph." — gets paraSpaceBefore = fontSize
    assert.strictEqual(fragments[1].text, 'Second paragraph.');
    assert.strictEqual(fragments[1].options?.breakLine, undefined);
    assert.strictEqual(fragments[1].options?.paraSpaceBefore, fontSize);
  });

  test('three paragraphs chain correctly', async () => {
    const runs = await expandTextToRuns('Para 1.\n\nPara 2.\n\nPara 3.');
    const fragments = builder.buildTextFragments(runs, TEXT_STYLE.BODY, theme);

    assert.strictEqual(fragments.length, 3);

    // Fragment 0: breakLine (shifted from run 1), no spacing
    assert.strictEqual(fragments[0].text, 'Para 1.');
    assert.strictEqual(fragments[0].options?.breakLine, true);
    assert.strictEqual(fragments[0].options?.paraSpaceBefore, undefined);

    // Fragment 1: paraSpaceBefore, AND breakLine (shifted from run 2)
    assert.strictEqual(fragments[1].text, 'Para 2.');
    assert.strictEqual(fragments[1].options?.breakLine, true);
    assert.strictEqual(fragments[1].options?.paraSpaceBefore, fontSize);

    // Fragment 2: paraSpaceBefore only
    assert.strictEqual(fragments[2].text, 'Para 3.');
    assert.strictEqual(fragments[2].options?.breakLine, undefined);
    assert.strictEqual(fragments[2].options?.paraSpaceBefore, fontSize);
  });

  test('paragraph followed by bullets: no paraSpaceBefore on bullets', async () => {
    const runs = await expandTextToRuns('Intro.\n\n- Bullet one\n- Bullet two');
    const fragments = builder.buildTextFragments(runs, TEXT_STYLE.BODY, theme);

    assert.strictEqual(fragments.length, 3);
    assert.strictEqual(fragments[0].text, 'Intro.');
    assert.strictEqual(fragments[1].text, 'Bullet one');
    assert.ok(fragments[1].options?.bullet, 'Bullet run should have bullet');
    // Bullets don't get paragraph spacing — they have their own line break mechanism
    assert.strictEqual(fragments[1].options?.paraSpaceBefore, undefined);
  });
});

// ============================================
// containFit() TESTS
// Image contain-fit: fit rectangle with aspect ratio inside bounding box, centered
// ============================================

describe('containFit()', () => {
  test('wide image in square box (letterbox — height shrinks, centered vertically)', () => {
    // 2:1 aspect ratio image in a 4x4 box → fits to 4x2, centered vertically
    const result = containFit(0, 0, 4, 4, 2);
    assert.strictEqual(result.w, 4);
    assert.strictEqual(result.h, 2);
    assert.strictEqual(result.x, 0);
    assert.strictEqual(result.y, 1); // (4 - 2) / 2
  });

  test('tall image in square box (pillarbox — width shrinks, centered horizontally)', () => {
    // 1:2 aspect ratio image in a 4x4 box → fits to 2x4, centered horizontally
    const result = containFit(0, 0, 4, 4, 0.5);
    assert.strictEqual(result.w, 2);
    assert.strictEqual(result.h, 4);
    assert.strictEqual(result.x, 1); // (4 - 2) / 2
    assert.strictEqual(result.y, 0);
  });

  test('exact fit (no offset needed)', () => {
    // 2:1 aspect ratio image in a 4x2 box → exact fit
    const result = containFit(0, 0, 4, 2, 2);
    assert.strictEqual(result.w, 4);
    assert.strictEqual(result.h, 2);
    assert.strictEqual(result.x, 0);
    assert.strictEqual(result.y, 0);
  });

  test('preserves origin offset', () => {
    // Same as letterbox but with non-zero origin
    const result = containFit(1, 2, 4, 4, 2);
    assert.strictEqual(result.w, 4);
    assert.strictEqual(result.h, 2);
    assert.strictEqual(result.x, 1);     // origin preserved
    assert.strictEqual(result.y, 2 + 1); // origin + centering offset
  });

  test('square image in landscape box (pillarbox)', () => {
    // 1:1 aspect ratio in 6x2 box → fits to 2x2, centered horizontally
    const result = containFit(0, 0, 6, 2, 1);
    assert.strictEqual(result.w, 2);
    assert.strictEqual(result.h, 2);
    assert.strictEqual(result.x, 2); // (6 - 2) / 2
    assert.strictEqual(result.y, 0);
  });
});
