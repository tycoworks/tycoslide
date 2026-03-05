// PptxConfigBuilder Tests
// Tests for all translation methods in src/core/pptxConfigBuilder.ts

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { PptxConfigBuilder } from '../src/core/rendering/pptxConfigBuilder.js';
import { mockTheme, mockTextStyle } from './mocks.js';
import {
  NODE_TYPE,
  type PositionedNode,
  type TextNode,
  type LineNode,
  type ShapeNode,
  type TableNode,
  type TableCellData,
  type SlideNumberNode,
} from '../src/core/model/nodes.js';
import {
  TEXT_STYLE,
  HALIGN,
  VALIGN,
  ARROW_TYPE,
  DASH_TYPE,
  BORDER_STYLE,
  SHAPE,
  LINE_SHAPE,
  FONT_WEIGHT,
  STRIKE_TYPE,
  UNDERLINE_STYLE,
} from '../src/core/model/types.js';
import { getParagraphGapRatio } from '../src/utils/font.js';
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

const baseLineNode: LineNode = {
  type: NODE_TYPE.LINE,
  color: 'E7E0EC',
  width: 0.75,
  dashType: DASH_TYPE.SOLID,
};

describe('buildLineConfig()', () => {
  test('places arrows inside line sub-object', () => {
    const lineNode: LineNode = {
      ...baseLineNode,
      beginArrow: ARROW_TYPE.TRIANGLE,
      endArrow: ARROW_TYPE.TRIANGLE,
    };
    const pos = positioned(lineNode, 1, 2, 5, 0);

    const result = builder.buildLineConfig(lineNode, pos);

    assert.strictEqual(result.shapeType, LINE_SHAPE);
    assert.ok(result.options.line, 'line sub-object should exist');
    const lineOpts = result.options.line as Record<string, unknown>;
    assert.strictEqual(lineOpts.beginArrowType, ARROW_TYPE.TRIANGLE);
    assert.strictEqual(lineOpts.endArrowType, ARROW_TYPE.TRIANGLE);
  });

  test('places dashType inside line sub-object', () => {
    const lineNode: LineNode = {
      ...baseLineNode,
      dashType: DASH_TYPE.DASH,
    };
    const pos = positioned(lineNode, 1, 2, 5, 0);

    const result = builder.buildLineConfig(lineNode, pos);

    const lineOpts = result.options.line as Record<string, unknown>;
    assert.strictEqual(lineOpts.dashType, DASH_TYPE.DASH);
  });

  test('vertical line when height > width', () => {
    const lineNode: LineNode = { ...baseLineNode };
    const pos = positioned(lineNode, 1, 2, 0.1, 5);

    const result = builder.buildLineConfig(lineNode, pos);

    assert.strictEqual(result.options.w, 0);
    assert.strictEqual(result.options.h, 5);
  });

  test('horizontal line when width >= height', () => {
    const lineNode: LineNode = { ...baseLineNode };
    const pos = positioned(lineNode, 1, 2, 5, 0.1);

    const result = builder.buildLineConfig(lineNode, pos);

    assert.strictEqual(result.options.w, 5);
    assert.strictEqual(result.options.h, 0);
  });

  test('applies color and width from lineNode', () => {
    const lineNode: LineNode = {
      ...baseLineNode,
      color: 'FF0000',
      width: 3,
    };
    const pos = positioned(lineNode, 1, 2, 5, 0);

    const result = builder.buildLineConfig(lineNode, pos);

    const lineOpts = result.options.line as Record<string, unknown>;
    assert.strictEqual(lineOpts.color, 'FF0000');
    assert.strictEqual(lineOpts.width, 3);
  });
});

// ============================================
// TABLE CELL TESTS - Regression test #3 and #4
// ============================================

/** Base table node for tests — spread with overrides per test */
const baseTableNode: TableNode = {
  type: NODE_TYPE.TABLE,
  rows: [],
  borderStyle: BORDER_STYLE.FULL,
  borderColor: '333333',
  borderWidth: 1,
  headerBackground: 'FFFFFF',
  headerBackgroundOpacity: 0,
  headerTextStyle: TEXT_STYLE.BODY,
  cellBackground: 'FFFFFF',
  cellBackgroundOpacity: 0,
  cellTextStyle: TEXT_STYLE.BODY,
  cellPadding: 0.1,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
  linkColor: '0000FF',
  linkUnderline: true,
};

/** Base cell for tests — all required fields pre-resolved */
const baseCell: TableCellData = {
  content: 'test',
  color: '000000',
  textStyle: TEXT_STYLE.BODY,
  resolvedStyle: mockTextStyle,
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
  lineHeightMultiplier: 1.2,
  linkColor: '0000FF',
  linkUnderline: true,
};

describe('buildTableCell()', () => {
  test('preserves cell color in options and text fragments', () => {
    const cell: TableCellData = {
      ...baseCell,
      content: 'Red text',
      color: 'FF0000',
    };
    const tableNode: TableNode = { ...baseTableNode };

    const result = builder.buildTableCell(
      cell,
      0, 0, 1, 1,
      0, 0,
      tableNode
    );

    assert.strictEqual(result.options.color, 'FF0000');
    assert.strictEqual(result.text.length, 1);
    assert.strictEqual(result.text[0].options?.color, 'FF0000');
  });

  test('vAlign cascade: cell vAlign overrides table style', () => {
    const cell: TableCellData = {
      ...baseCell,
      content: 'Cell with override',
      vAlign: VALIGN.BOTTOM,
    };
    const tableNode: TableNode = { ...baseTableNode, vAlign: VALIGN.TOP };

    const result = builder.buildTableCell(
      cell,
      0, 0, 1, 1,
      0, 0,
      tableNode
    );

    assert.strictEqual(result.options.valign, VALIGN.BOTTOM);
  });

  test('vAlign: uses pre-resolved cell value directly', () => {
    const cell: TableCellData = {
      ...baseCell,
      content: 'Cell with default',
      vAlign: VALIGN.TOP,  // pre-resolved by expand
    };
    const tableNode: TableNode = { ...baseTableNode };

    const result = builder.buildTableCell(
      cell,
      0, 0, 1, 1,
      0, 0,
      tableNode
    );

    assert.strictEqual(result.options.valign, VALIGN.TOP);
  });

  test('hAlign cascade: cell hAlign overrides table style', () => {
    const cell: TableCellData = {
      ...baseCell,
      content: 'Right aligned',
      hAlign: HALIGN.RIGHT,
    };
    const tableNode: TableNode = { ...baseTableNode, hAlign: HALIGN.LEFT };

    const result = builder.buildTableCell(
      cell,
      0, 0, 1, 1,
      0, 0,
      tableNode
    );

    assert.strictEqual(result.options.align, HALIGN.RIGHT);
  });

  test('colspan and rowspan are passed through', () => {
    const cell: TableCellData = {
      ...baseCell,
      content: 'Merged cell',
      colspan: 2,
      rowspan: 3,
    };
    const tableNode: TableNode = { ...baseTableNode };

    const result = builder.buildTableCell(
      cell,
      0, 0, 1, 1,
      0, 0,
      tableNode
    );

    assert.strictEqual(result.options.colspan, 2);
    assert.strictEqual(result.options.rowspan, 3);
  });

  test('fill color applied from cell', () => {
    const cell: TableCellData = {
      ...baseCell,
      content: 'Cell with fill',
      fill: 'FFFF00',
    };
    const tableNode: TableNode = { ...baseTableNode };

    const result = builder.buildTableCell(
      cell,
      0, 0, 1, 1,
      0, 0,
      tableNode
    );

    assert.ok(result.options.fill);
    const fill = result.options.fill as { color: string; transparency: number };
    assert.strictEqual(fill.color, 'FFFF00');
    assert.strictEqual(fill.transparency, 0); // cell-level fill always fully opaque
  });

  test('header cell with opacity 0 produces no fill', () => {
    const cell: TableCellData = { ...baseCell, content: 'Header' };
    const tableNode: TableNode = {
      ...baseTableNode,
      headerBackground: 'EEEEEE',
      headerBackgroundOpacity: 0,
    };
    const result = builder.buildTableCell(cell, 0, 0, 1, 1, 1, 0, tableNode);
    assert.strictEqual(result.options.fill, undefined);
  });

  test('header cell with opacity 50 produces fill with transparency 50', () => {
    const cell: TableCellData = { ...baseCell, content: 'Header' };
    const tableNode: TableNode = {
      ...baseTableNode,
      headerBackground: 'AABBCC',
      headerBackgroundOpacity: 50,
    };
    const result = builder.buildTableCell(cell, 0, 0, 1, 1, 1, 0, tableNode);
    assert.ok(result.options.fill);
    const fill = result.options.fill as { color: string; transparency: number };
    assert.strictEqual(fill.color, 'AABBCC');
    assert.strictEqual(fill.transparency, 50);
  });

  test('non-header cell with cellBackgroundOpacity 0 produces no fill', () => {
    const cell: TableCellData = { ...baseCell, content: 'Data' };
    const tableNode: TableNode = {
      ...baseTableNode,
      cellBackground: 'DDDDDD',
      cellBackgroundOpacity: 0,
    };
    const result = builder.buildTableCell(cell, 1, 0, 2, 1, 1, 0, tableNode);
    assert.strictEqual(result.options.fill, undefined);
  });

  test('non-header cell with cellBackgroundOpacity 80 produces fill with transparency 20', () => {
    const cell: TableCellData = { ...baseCell, content: 'Data' };
    const tableNode: TableNode = {
      ...baseTableNode,
      cellBackground: 'DDDDDD',
      cellBackgroundOpacity: 80,
    };
    const result = builder.buildTableCell(cell, 1, 0, 2, 1, 1, 0, tableNode);
    assert.ok(result.options.fill);
    const fill = result.options.fill as { color: string; transparency: number };
    assert.strictEqual(fill.color, 'DDDDDD');
    assert.strictEqual(fill.transparency, 20);
  });

  test('header column cell (not header row) uses headerBackground', () => {
    const cell: TableCellData = { ...baseCell, content: 'Header Col' };
    const tableNode: TableNode = {
      ...baseTableNode,
      headerBackground: 'AABB00',
      headerBackgroundOpacity: 100,
    };
    const result = builder.buildTableCell(
      cell,
      1, 0, 2, 2,
      0, 1,  // headerRows=0, headerColumns=1 (col 0 is header)
      tableNode
    );
    const fill = result.options.fill as { color: string; transparency: number };
    assert.strictEqual(fill.color, 'AABB00');
  });

  test('header cell uses headerBackground from table style', () => {
    const cell: TableCellData = {
      ...baseCell,
      content: 'Header',
    };
    const tableNode: TableNode = { ...baseTableNode, headerBackground: 'EEEEEE', headerBackgroundOpacity: 100 };

    const result = builder.buildTableCell(
      cell,
      0, 0, 1, 1,
      1, 0,  // headerRows = 1, so row 0 is header
      tableNode
    );

    assert.ok(result.options.fill);
    const fill = result.options.fill as { color: string; transparency: number };
    assert.strictEqual(fill.color, 'EEEEEE');
    assert.strictEqual(fill.transparency, 0);
  });
});

// ============================================
// BORDER STYLE TESTS - Regression test #5
// ============================================

describe('buildCellBorder()', () => {
  test('BORDER_STYLE.INTERNAL - corner cell (0,0) in 3x3 table', () => {
    const tableNode: TableNode = { ...baseTableNode, borderStyle: BORDER_STYLE.INTERNAL, borderWidth: 1, borderColor: '000000' };

    const border = builder.buildCellBorder(tableNode, 0, 0, 3, 3);

    assert.ok(border);
    assert.strictEqual(border.length, 4);
    // [top, right, bottom, left]
    assert.strictEqual(border[0].type, 'none');   // top (first row)
    assert.strictEqual(border[1].type, 'solid');  // right (not last col)
    assert.strictEqual(border[2].type, 'solid');  // bottom (not last row)
    assert.strictEqual(border[3].type, 'none');   // left (first col)
  });

  test('BORDER_STYLE.INTERNAL - middle cell (1,1) in 3x3 table', () => {
    const tableNode: TableNode = { ...baseTableNode, borderStyle: BORDER_STYLE.INTERNAL, borderWidth: 1, borderColor: '000000' };

    const border = builder.buildCellBorder(tableNode, 1, 1, 3, 3);

    assert.ok(border);
    assert.strictEqual(border.length, 4);
    // All internal borders
    assert.strictEqual(border[0].type, 'solid');  // top
    assert.strictEqual(border[1].type, 'solid');  // right
    assert.strictEqual(border[2].type, 'solid');  // bottom
    assert.strictEqual(border[3].type, 'solid');  // left
  });

  test('BORDER_STYLE.INTERNAL - bottom-right cell (2,2) in 3x3 table', () => {
    const tableNode: TableNode = { ...baseTableNode, borderStyle: BORDER_STYLE.INTERNAL, borderWidth: 1, borderColor: '000000' };

    const border = builder.buildCellBorder(tableNode, 2, 2, 3, 3);

    assert.ok(border);
    assert.strictEqual(border.length, 4);
    // [top, right, bottom, left]
    assert.strictEqual(border[0].type, 'solid');  // top (not first row)
    assert.strictEqual(border[1].type, 'none');   // right (last col)
    assert.strictEqual(border[2].type, 'none');   // bottom (last row)
    assert.strictEqual(border[3].type, 'solid');  // left (not first col)
  });

  test('BORDER_STYLE.FULL - all borders solid', () => {
    const tableNode: TableNode = { ...baseTableNode, borderStyle: BORDER_STYLE.FULL, borderWidth: 1, borderColor: '000000' };

    const border = builder.buildCellBorder(tableNode, 1, 1, 3, 3);

    assert.ok(border);
    assert.strictEqual(border.length, 4);
    assert.strictEqual(border[0].type, 'solid');
    assert.strictEqual(border[1].type, 'solid');
    assert.strictEqual(border[2].type, 'solid');
    assert.strictEqual(border[3].type, 'solid');
  });

  test('BORDER_STYLE.HORIZONTAL - only top and bottom', () => {
    const tableNode: TableNode = { ...baseTableNode, borderStyle: BORDER_STYLE.HORIZONTAL, borderWidth: 1, borderColor: '000000' };

    const border = builder.buildCellBorder(tableNode, 1, 1, 3, 3);

    assert.ok(border);
    assert.strictEqual(border.length, 4);
    assert.strictEqual(border[0].type, 'solid');  // top
    assert.strictEqual(border[1].type, 'none');   // right
    assert.strictEqual(border[2].type, 'solid');  // bottom
    assert.strictEqual(border[3].type, 'none');   // left
  });

  test('BORDER_STYLE.VERTICAL - only left and right', () => {
    const tableNode: TableNode = { ...baseTableNode, borderStyle: BORDER_STYLE.VERTICAL, borderWidth: 1, borderColor: '000000' };

    const border = builder.buildCellBorder(tableNode, 1, 1, 3, 3);

    assert.ok(border);
    assert.strictEqual(border.length, 4);
    assert.strictEqual(border[0].type, 'none');   // top
    assert.strictEqual(border[1].type, 'solid');  // right
    assert.strictEqual(border[2].type, 'none');   // bottom
    assert.strictEqual(border[3].type, 'solid');  // left
  });

  test('BORDER_STYLE.NONE - returns undefined', () => {
    const tableNode: TableNode = { ...baseTableNode, borderStyle: BORDER_STYLE.NONE };

    const border = builder.buildCellBorder(tableNode, 1, 1, 3, 3);

    assert.strictEqual(border, undefined);
  });

  test('border width and color applied correctly', () => {
    const tableNode: TableNode = { ...baseTableNode, borderStyle: BORDER_STYLE.FULL, borderWidth: 2.5, borderColor: 'FF0000' };

    const border = builder.buildCellBorder(tableNode, 0, 0, 1, 1);

    assert.ok(border);
    assert.strictEqual(border[0].pt, 2.5);
    assert.strictEqual(border[0].color, 'FF0000');
  });
});

// ============================================
// COLUMN WIDTHS TESTS - Regression test #6
// ============================================

describe('buildColumnWidths()', () => {
  test('equal widths for 3 columns', () => {
    const widths = builder.buildColumnWidths(3, 6);

    assert.strictEqual(widths.length, 3);
    assert.strictEqual(widths[0], 2);
    assert.strictEqual(widths[1], 2);
    assert.strictEqual(widths[2], 2);
  });

  test('equal widths for 4 columns', () => {
    const widths = builder.buildColumnWidths(4, 8);

    assert.strictEqual(widths.length, 4);
    assert.strictEqual(widths[0], 2);
    assert.strictEqual(widths[1], 2);
    assert.strictEqual(widths[2], 2);
    assert.strictEqual(widths[3], 2);
  });
});

// ============================================
// RECTANGLE TESTS - Regression test #7
// ============================================

const baseShapeNode: ShapeNode = {
  type: NODE_TYPE.SHAPE,
  shape: SHAPE.ROUND_RECT,
  fill: { color: 'EEEEEE', opacity: 100 },
  border: { color: 'E7E0EC', width: 0.75 },
  cornerRadius: 0,
};

describe('buildShapeConfig() — area shapes', () => {
  test('returns ROUND_RECT shape type', () => {
    const shapeNode: ShapeNode = { ...baseShapeNode };
    const pos = positioned(shapeNode, 1, 2, 5, 3);

    const result = builder.buildShapeConfig(shapeNode, pos);

    assert.ok(result);
    assert.strictEqual(result.shapeType, SHAPE.ROUND_RECT);
  });

  test('returns ROUND_RECT shape when cornerRadius specified', () => {
    const shapeNode: ShapeNode = { ...baseShapeNode, cornerRadius: 0.125 };
    const pos = positioned(shapeNode, 1, 2, 5, 3);

    const result = builder.buildShapeConfig(shapeNode, pos);

    assert.ok(result);
    assert.strictEqual(result.shapeType, SHAPE.ROUND_RECT);
    assert.strictEqual(result.options.rectRadius, 0.125);
  });

  test('applies fill color and transparency', () => {
    const shapeNode: ShapeNode = { ...baseShapeNode, fill: { color: 'FF0000', opacity: 50 } };
    const pos = positioned(shapeNode, 1, 2, 5, 3);

    const result = builder.buildShapeConfig(shapeNode, pos);

    assert.ok(result);
    assert.ok(result.options.fill);
    const fill = result.options.fill as { color: string; transparency: number };
    assert.strictEqual(fill.color, 'FF0000');
    assert.strictEqual(fill.transparency, 50);  // 100 - 50
  });

  test('applies border when all sides enabled', () => {
    const shapeNode: ShapeNode = { ...baseShapeNode, border: { color: '000000', width: 2 } };
    const pos = positioned(shapeNode, 1, 2, 5, 3);

    const result = builder.buildShapeConfig(shapeNode, pos);

    assert.ok(result);
    assert.ok(result.options.line);
    const line = result.options.line as { color: string; width: number };
    assert.strictEqual(line.color, '000000');
    assert.strictEqual(line.width, 2);
  });

  test('no border when any side explicitly disabled', () => {
    const shapeNode: ShapeNode = { ...baseShapeNode, border: { color: '000000', width: 2, top: false } };
    const pos = positioned(shapeNode, 1, 2, 5, 3);

    const result = builder.buildShapeConfig(shapeNode, pos);

    assert.ok(result);
    assert.strictEqual(result.options.line, undefined);
  });
});

// ============================================
// TEXT CONFIG TESTS - Regression test #8
// ============================================

const baseTextNode: TextNode = {
  type: NODE_TYPE.TEXT,
  content: 'Text',
  style: TEXT_STYLE.BODY,
  resolvedStyle: mockTextStyle,
  color: '333333',
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.TOP,
  lineHeightMultiplier: 1.2,
  bulletIndentPt: 0,
  linkColor: '0000FF',
  linkUnderline: true,
};

describe('buildTextConfig()', () => {
  test('does not include align option when text has bullets', () => {
    const textNode: TextNode = {
      ...baseTextNode,
      content: [
        { text: 'Item 1', bullet: true },
        { text: 'Item 2', bullet: true },
      ],
      hAlign: HALIGN.CENTER,
    };
    const pos = positioned(textNode, 1, 2, 5, 3);

    const result = builder.buildTextConfig(textNode, pos);

    assert.strictEqual(result.options.align, undefined);
    assert.strictEqual(result.options.valign, VALIGN.TOP);
  });

  test('includes align option when text has no bullets', () => {
    const textNode: TextNode = {
      ...baseTextNode,
      content: 'Plain text',
      hAlign: HALIGN.CENTER,
    };
    const pos = positioned(textNode, 1, 2, 5, 3);

    const result = builder.buildTextConfig(textNode, pos);

    assert.strictEqual(result.options.align, HALIGN.CENTER);
    assert.strictEqual(result.options.valign, VALIGN.TOP);
  });

  test('applies fontSize and fontFace from resolvedStyle', () => {
    const textNode: TextNode = {
      ...baseTextNode,
      content: 'Styled text',
      style: TEXT_STYLE.H1,
    };
    const pos = positioned(textNode, 1, 2, 5, 3);

    const result = builder.buildTextConfig(textNode, pos);

    const h1Style = theme.textStyles[TEXT_STYLE.H1];
    assert.strictEqual(result.options.fontSize, h1Style.fontSize);
    assert.strictEqual(result.options.fontFace, h1Style.fontFamily.normal.name);
  });

  test('applies color override from node', () => {
    const textNode: TextNode = {
      ...baseTextNode,
      content: 'Colored text',
      color: 'FF0000',
    };
    const pos = positioned(textNode, 1, 2, 5, 3);

    const result = builder.buildTextConfig(textNode, pos);

    assert.strictEqual(result.options.color, 'FF0000');
  });

  test('applies custom line height multiplier from node', () => {
    const textNode: TextNode = {
      ...baseTextNode,
      content: 'Text with custom spacing',
      lineHeightMultiplier: 1.5,
    };
    const pos = positioned(textNode, 1, 2, 5, 3);

    const result = builder.buildTextConfig(textNode, pos);

    assert.strictEqual(result.options.lineSpacingMultiple, 1.5);
  });

  test('bullet text uses lineHeightMultiplier from node (set by expand to bulletSpacing)', () => {
    // The expand function sets lineHeightMultiplier to bulletSpacing for bullet text.
    // The renderer just passes it through — no special bullet logic needed here.
    // Use a distinct value (1.5) to prove the node's value wins, not a coincidence.
    const textNode: TextNode = {
      ...baseTextNode,
      content: [{ text: 'Bullet', bullet: true }],
      lineHeightMultiplier: 1.5,
    };
    const pos = positioned(textNode, 1, 2, 5, 3);

    const result = builder.buildTextConfig(textNode, pos);

    assert.strictEqual(result.options.lineSpacingMultiple, 1.5);
  });
});

// ============================================
// TEXT FRAGMENTS TESTS
// ============================================

describe('buildTextFragments()', () => {
  test('converts string content to single fragment', () => {
    const fragments = builder.buildTextFragments(
      'Plain text',
      mockTextStyle,
      '000000'
    );

    assert.strictEqual(fragments.length, 1);
    assert.strictEqual(fragments[0].text, 'Plain text');
  });

  test('preserves color from text run', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Colored', color: 'FF0000' }],
      mockTextStyle,
      '000000'
    );

    assert.strictEqual(fragments.length, 1);
    assert.strictEqual(fragments[0].options?.color, 'FF0000');
  });

  test('applies bold formatting', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Bold text', bold: true }],
      mockTextStyle,
      '000000'
    );

    assert.strictEqual(fragments.length, 1);
    assert.strictEqual(fragments[0].options?.bold, true);
  });

  test('applies italic formatting', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Italic text', italic: true }],
      mockTextStyle,
      '000000'
    );

    assert.strictEqual(fragments.length, 1);
    assert.strictEqual(fragments[0].options?.italic, true);
  });

  test('applies highlight background', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Highlighted', highlight: { bg: 'FFFF00', text: '000000' } }],
      mockTextStyle,
      '000000'
    );

    assert.strictEqual(fragments.length, 1);
    assert.strictEqual(fragments[0].options?.highlight, 'FFFF00');
    assert.strictEqual(fragments[0].options?.color, '000000');
  });

  test('applies bullet formatting', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Bullet item', bullet: true }],
      mockTextStyle,
      '000000'
    );

    assert.strictEqual(fragments.length, 1);
    assert.strictEqual(fragments[0].options?.bullet, true);
  });

  test('applies strikethrough as STRIKE_TYPE.SINGLE', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Struck', strikethrough: true }],
      mockTextStyle,
      '000000'
    );

    assert.strictEqual(fragments.length, 1);
    assert.strictEqual(fragments[0].options?.strike, STRIKE_TYPE.SINGLE);
  });

  test('applies underline as UNDERLINE_STYLE.SINGLE', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Underlined', underline: true }],
      mockTextStyle,
      '000000'
    );

    assert.strictEqual(fragments.length, 1);
    assert.deepStrictEqual(fragments[0].options?.underline, { style: UNDERLINE_STYLE.SINGLE });
  });

  test('applies hyperlink with link token color and underline', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Click', hyperlink: 'https://example.com' }],
      mockTextStyle,
      '000000',
      'FF00FF',  // linkColor
      true       // linkUnderline
    );

    assert.strictEqual(fragments.length, 1);
    assert.deepStrictEqual(fragments[0].options?.hyperlink, { url: 'https://example.com' });
    assert.strictEqual(fragments[0].options?.color, 'FF00FF');
    assert.deepStrictEqual(fragments[0].options?.underline, { style: UNDERLINE_STYLE.SINGLE });
  });

  test('hyperlink: explicit run.color wins over linkColor token', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Accent link', hyperlink: 'https://example.com', color: 'AA0000' }],
      mockTextStyle,
      '000000',
      'FF00FF',  // linkColor — should be overridden
      true
    );

    assert.strictEqual(fragments[0].options?.color, 'AA0000');
  });

  test('hyperlink: explicit run.underline wins over linkUnderline token', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Already underlined', hyperlink: 'https://example.com', underline: true }],
      mockTextStyle,
      '000000',
      'FF00FF',
      true  // linkUnderline — should not double
    );

    // underline should be set exactly once (from run.underline, not duplicated by token)
    assert.deepStrictEqual(fragments[0].options?.underline, { style: UNDERLINE_STYLE.SINGLE });
  });

  test('shifts paragraphBreak to previous fragment for pptxgenjs', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Line 1' }, { text: 'Line 2', paragraphBreak: true }],
      mockTextStyle,
      '000000'
    );

    assert.strictEqual(fragments.length, 2);
    // pptxgenjs breakLine means "break AFTER this run", so it shifts to previous fragment
    assert.strictEqual(fragments[0].options?.breakLine, true);
    assert.strictEqual(fragments[1].options?.breakLine, undefined);
  });

  test('adds paraSpaceBefore on paragraph break fragment', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Paragraph 1' }, { text: 'Paragraph 2', paragraphBreak: true }],
      mockTextStyle,
      '000000'
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
      [{ text: 'A' }, { text: 'B', paragraphBreak: true }],
      mockTextStyle,
      '000000'
    );

    const h1FontSize = theme.textStyles[TEXT_STYLE.H1].fontSize;
    assert.strictEqual(fragments[1].options?.paraSpaceBefore, h1FontSize);
  });

  test('does not apply paragraphBreak when bullet present', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Bullet', bullet: true, paragraphBreak: true }],
      mockTextStyle,
      '000000'
    );

    assert.strictEqual(fragments.length, 1);
    assert.strictEqual(fragments[0].options?.bullet, true);
    assert.strictEqual(fragments[0].options?.breakLine, undefined);
  });

  test('does not add paraSpaceBefore when bullet present with paragraphBreak', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Bullet', bullet: true, paragraphBreak: true }],
      mockTextStyle,
      '000000'
    );

    assert.strictEqual(fragments[0].options?.paraSpaceBefore, undefined);
  });

  test('multiple paragraph breaks each get paraSpaceBefore', () => {
    const fragments = builder.buildTextFragments(
      [
        { text: 'Para 1' },
        { text: 'Para 2', paragraphBreak: true },
        { text: 'Para 3', paragraphBreak: true },
      ],
      mockTextStyle,
      '000000'
    );

    assert.strictEqual(fragments.length, 3);
    // Both paragraph-start fragments get paraSpaceBefore
    assert.strictEqual(fragments[1].options?.paraSpaceBefore, 12);
    assert.strictEqual(fragments[2].options?.paraSpaceBefore, 12);
    // breakLine shifted to previous fragments
    assert.strictEqual(fragments[0].options?.breakLine, true);
    assert.strictEqual(fragments[1].options?.breakLine, true);
  });

  test('softBreak sets softBreakBefore on its own fragment without shifting to previous', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Line 1' }, { text: 'Line 2', softBreak: true }],
      mockTextStyle,
      '000000'
    );

    assert.strictEqual(fragments.length, 2);
    // softBreakBefore goes directly on the lineBreak fragment (no backward shift)
    assert.strictEqual(fragments[1].options?.softBreakBefore, true);
    // Previous fragment must NOT get breakLine
    assert.strictEqual(fragments[0].options?.breakLine, undefined);
    // lineBreak fragment must NOT get paraSpaceBefore
    assert.strictEqual(fragments[1].options?.paraSpaceBefore, undefined);
  });

  test('color override applies to all fragments', () => {
    const fragments = builder.buildTextFragments(
      [{ text: 'Run 1' }, { text: 'Run 2' }],
      mockTextStyle,
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

const baseSlideNumNode: SlideNumberNode = {
  type: NODE_TYPE.SLIDE_NUMBER,
  style: TEXT_STYLE.FOOTER,
  resolvedStyle: mockTextStyle,
  color: '999999',
  hAlign: HALIGN.RIGHT,
  vAlign: VALIGN.MIDDLE,
};

describe('buildSlideNumberOptions()', () => {
  test('applies FOOTER style from node', () => {
    const pos = positioned(baseSlideNumNode, 1, 2, 2, 0.3);

    const result = builder.buildSlideNumberOptions(baseSlideNumNode, pos);

    const footerStyle = theme.textStyles[TEXT_STYLE.FOOTER];
    assert.strictEqual(result.fontSize, footerStyle.fontSize);
    assert.strictEqual(result.fontFace, footerStyle.fontFamily.normal.name);
  });

  test('applies custom style', () => {
    const slideNumNode: SlideNumberNode = {
      ...baseSlideNumNode,
      style: TEXT_STYLE.SMALL,
    };
    const pos = positioned(slideNumNode, 1, 2, 2, 0.3);

    const result = builder.buildSlideNumberOptions(slideNumNode, pos);

    const smallStyle = theme.textStyles[TEXT_STYLE.SMALL];
    assert.strictEqual(result.fontSize, smallStyle.fontSize);
  });

  test('applies color override', () => {
    const slideNumNode: SlideNumberNode = {
      ...baseSlideNumNode,
      color: 'FF0000',
    };
    const pos = positioned(slideNumNode, 1, 2, 2, 0.3);

    const result = builder.buildSlideNumberOptions(slideNumNode, pos);

    assert.strictEqual(result.color, 'FF0000');
  });

  test('applies hAlign from node', () => {
    const slideNumNode: SlideNumberNode = {
      ...baseSlideNumNode,
      hAlign: HALIGN.CENTER,
    };
    const pos = positioned(slideNumNode, 1, 2, 2, 0.3);

    const result = builder.buildSlideNumberOptions(slideNumNode, pos);

    assert.strictEqual(result.align, HALIGN.CENTER);
  });

  test('valign comes from node (non-default value)', () => {
    const slideNumNode: SlideNumberNode = {
      ...baseSlideNumNode,
      vAlign: VALIGN.TOP,
    };
    const pos = positioned(slideNumNode, 1, 2, 2, 0.3);
    const result = builder.buildSlideNumberOptions(slideNumNode, pos);
    assert.strictEqual(result.valign, VALIGN.TOP);
  });

  test('uses defaultWeight from resolvedStyle for font selection', () => {
    // SlideNumber node with bold resolvedStyle (pre-resolved by expand)
    const boldFontFamily = {
      normal: { name: 'Inter', path: '/fonts/inter-normal.woff2' },
      bold: { name: 'Inter Bold', path: '/fonts/inter-bold.woff2' },
    };
    const boldNode: SlideNumberNode = {
      ...baseSlideNumNode,
      resolvedStyle: { fontSize: 12, fontFamily: boldFontFamily, defaultWeight: FONT_WEIGHT.BOLD },
    };
    const pos = positioned(boldNode, 1, 2, 2, 0.3);
    const result = builder.buildSlideNumberOptions(boldNode, pos);
    assert.strictEqual(result.fontFace, 'Inter Bold');
  });

  test('position and dimensions applied', () => {
    const pos = positioned(baseSlideNumNode, 1.5, 2.5, 3, 0.4);

    const result = builder.buildSlideNumberOptions(baseSlideNumNode, pos);

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

import type { NormalizedRun } from '../src/core/model/types.js';

describe('buildTextFragments with multi-paragraph runs', () => {
  const fontSize = theme.textStyles[TEXT_STYLE.BODY].fontSize; // 12

  test('two paragraphs produce correct PPTX fragments with paragraph spacing', () => {
    const runs: NormalizedRun[] = [
      { text: 'First paragraph.' },
      { text: 'Second paragraph.', paragraphBreak: true },
    ];
    const fragments = builder.buildTextFragments(runs, mockTextStyle, '000000');

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

  test('three paragraphs chain correctly', () => {
    const runs: NormalizedRun[] = [
      { text: 'Para 1.' },
      { text: 'Para 2.', paragraphBreak: true },
      { text: 'Para 3.', paragraphBreak: true },
    ];
    const fragments = builder.buildTextFragments(runs, mockTextStyle, '000000');

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

  test('paragraph followed by bullets: no paraSpaceBefore on bullets', () => {
    const runs: NormalizedRun[] = [
      { text: 'Intro.' },
      { text: 'Bullet one', bullet: true },
      { text: 'Bullet two', bullet: true },
    ];
    const fragments = builder.buildTextFragments(runs, mockTextStyle, '000000');

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
