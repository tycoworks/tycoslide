// Layout Tests
// Tests for computeLayout with row, column, and group nodes
// Migrated from column.test.ts.old, row.test.ts.old, group.test.ts.old

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { mockMeasurer, mockTheme, approx } from './mocks.js';
import { Bounds } from '../src/core/bounds.js';
import { computeLayout, getNodeHeight } from '../src/core/compute-layout.js';
import { GAP, VALIGN, JUSTIFY } from '../src/core/types.js';
import { NODE_TYPE, type TextNode, type RowNode, type ColumnNode, type GroupNode, type ElementNode } from '../src/core/nodes.js';

// ============================================
// HELPER FACTORIES
// ============================================

/** Create a text node (simplest leaf node for testing containers) */
function textNode(content = 'test'): TextNode {
  return { type: NODE_TYPE.TEXT, content };
}

/** Create a row node */
function rowNode(children: ElementNode[], options?: {
  proportions?: number[];
  gap?: typeof GAP[keyof typeof GAP];
  vAlign?: typeof VALIGN[keyof typeof VALIGN];
}): RowNode {
  return {
    type: NODE_TYPE.ROW,
    children,
    proportions: options?.proportions,
    gap: options?.gap,
    vAlign: options?.vAlign,
  };
}

/** Create a column node */
function columnNode(children: ElementNode[], options?: {
  gap?: typeof GAP[keyof typeof GAP];
  justify?: typeof JUSTIFY[keyof typeof JUSTIFY];
}): ColumnNode {
  return {
    type: NODE_TYPE.COLUMN,
    children,
    gap: options?.gap,
    justify: options?.justify,
  };
}

/** Create a group node */
function groupNode(children: ElementNode[], options?: {
  columns?: number;
  gap?: typeof GAP[keyof typeof GAP];
}): GroupNode {
  return {
    type: NODE_TYPE.GROUP,
    children,
    columns: options?.columns,
    gap: options?.gap,
  };
}

// ============================================
// ROW LAYOUT TESTS
// ============================================

describe('Row Layout', () => {
  const theme = mockTheme({ gap: 0 });
  const measurer = mockMeasurer({ lineHeight: 0.25 });

  // ------------------------------------------
  // 1. Three equal children get equal widths
  // ------------------------------------------
  test('three equal children get equal widths', () => {
    const node = rowNode([textNode('A'), textNode('B'), textNode('C')]);
    const bounds = new Bounds(0, 0, 9, 5);
    const positioned = computeLayout(node, bounds, theme, measurer);

    assert.strictEqual(positioned.children?.length, 3);
    approx(positioned.children![0].width, 3, 'child 1 width');
    approx(positioned.children![1].width, 3, 'child 2 width');
    approx(positioned.children![2].width, 3, 'child 3 width');
  });

  // ------------------------------------------
  // 2. Proportional widths (1:2 split)
  // ------------------------------------------
  test('proportional widths (1:2 split)', () => {
    const node = rowNode([textNode('A'), textNode('B')], { proportions: [1, 2] });
    const bounds = new Bounds(0, 0, 9, 5);
    const positioned = computeLayout(node, bounds, theme, measurer);

    assert.strictEqual(positioned.children?.length, 2);
    approx(positioned.children![0].width, 3, 'narrow child width');
    approx(positioned.children![1].width, 6, 'wide child width');
  });

  // ------------------------------------------
  // 3. Gap reduces available width
  // ------------------------------------------
  test('gap reduces available content width', () => {
    const themeWithGap = mockTheme({ gap: 0.5 });
    const node = rowNode([textNode('A'), textNode('B'), textNode('C')]);
    const bounds = new Bounds(0, 0, 10, 5);
    const positioned = computeLayout(node, bounds, themeWithGap, measurer);

    // Total width 10, gap 0.5 × 2 = 1.0, remaining 9.0, each child 3.0
    assert.strictEqual(positioned.children?.length, 3);
    approx(positioned.children![0].width, 3, 'child 1 width with gap');
    approx(positioned.children![1].width, 3, 'child 2 width with gap');
    approx(positioned.children![2].width, 3, 'child 3 width with gap');
  });

  // ------------------------------------------
  // 4. Children positioned at correct x offsets
  // ------------------------------------------
  test('children positioned at correct x offsets', () => {
    const node = rowNode([textNode('A'), textNode('B'), textNode('C')]);
    const bounds = new Bounds(1, 2, 9, 5);
    const positioned = computeLayout(node, bounds, theme, measurer);

    approx(positioned.children![0].x, 1, 'child 1 x');
    approx(positioned.children![1].x, 4, 'child 2 x');
    approx(positioned.children![2].x, 7, 'child 3 x');
  });

  // ------------------------------------------
  // 5. Row height is max child height
  // ------------------------------------------
  test('row height is max child height', () => {
    // Using measurer that returns 0.25 line height, 1 line = 0.25
    const node = rowNode([textNode('A'), textNode('B')]);
    const height = getNodeHeight(node, 10, theme, measurer);
    approx(height, 0.25, 'row height');
  });

  // ------------------------------------------
  // 6. Nested column in row gets correct width
  // ------------------------------------------
  test('nested column in row gets equal width', () => {
    const col = columnNode([textNode('A')]);
    const node = rowNode([col, textNode('B')]);
    const bounds = new Bounds(0, 0, 10, 5);
    const positioned = computeLayout(node, bounds, theme, measurer);

    approx(positioned.children![0].width, 5, 'column child width');
    approx(positioned.children![1].width, 5, 'text child width');
  });

  // ------------------------------------------
  // 7. vAlign TOP positions children at top
  // ------------------------------------------
  test('vAlign TOP positions children at top', () => {
    const node = rowNode([textNode('A'), textNode('B')], { vAlign: VALIGN.TOP });
    const bounds = new Bounds(0, 0, 10, 5);
    const positioned = computeLayout(node, bounds, theme, measurer);

    // Children should start at y=0 (top of row)
    approx(positioned.children![0].y, 0, 'child 1 y (top aligned)');
    approx(positioned.children![1].y, 0, 'child 2 y (top aligned)');
  });

  // ------------------------------------------
  // 8. vAlign BOTTOM positions children at bottom
  // ------------------------------------------
  test('vAlign BOTTOM positions children at bottom', () => {
    const node = rowNode([textNode('A'), textNode('B')], { vAlign: VALIGN.BOTTOM });
    const bounds = new Bounds(0, 0, 10, 5);
    const positioned = computeLayout(node, bounds, theme, measurer);

    // Children height is 0.25, row height is 0.25, so y = 0.25 - 0.25 = 0
    // (In this case they're the same height so no difference)
    approx(positioned.children![0].y, 0, 'child 1 y (bottom aligned)');
  });

  // ------------------------------------------
  // 9. vAlign MIDDLE centers children vertically
  // ------------------------------------------
  test('vAlign MIDDLE centers children vertically', () => {
    const node = rowNode([textNode('A'), textNode('B')], { vAlign: VALIGN.MIDDLE });
    const bounds = new Bounds(0, 0, 10, 5);
    const positioned = computeLayout(node, bounds, theme, measurer);

    // Row height = child height = 0.25, centered = (0.25 - 0.25) / 2 = 0
    approx(positioned.children![0].y, 0, 'child 1 y (middle aligned)');
  });
});

// ============================================
// COLUMN LAYOUT TESTS
// ============================================

describe('Column Layout', () => {
  const theme = mockTheme({ gap: 0 });
  const measurer = mockMeasurer({ lineHeight: 0.25 });

  // ------------------------------------------
  // 1. Children stack vertically with content height
  // ------------------------------------------
  test('children stack vertically with content height', () => {
    const node = columnNode([textNode('A'), textNode('B')]);
    const bounds = new Bounds(0, 0, 10, 10);
    const positioned = computeLayout(node, bounds, theme, measurer);

    assert.strictEqual(positioned.children?.length, 2);
    approx(positioned.children![0].height, 0.25, 'child 1 height (content-sized)');
    approx(positioned.children![1].height, 0.25, 'child 2 height (content-sized)');
  });

  // ------------------------------------------
  // 2. Children fill available width
  // ------------------------------------------
  test('children fill available width', () => {
    const node = columnNode([textNode('A')]);
    const bounds = new Bounds(0, 0, 10, 5);
    const positioned = computeLayout(node, bounds, theme, measurer);

    approx(positioned.children![0].width, 10, 'child width');
  });

  // ------------------------------------------
  // 3. Gap adds space between children
  // ------------------------------------------
  test('gap adds space between children', () => {
    const themeWithGap = mockTheme({ gap: 0.5 });
    const node = columnNode([textNode('A'), textNode('B'), textNode('C')]);
    const bounds = new Bounds(0, 0, 10, 10);
    const positioned = computeLayout(node, bounds, themeWithGap, measurer);

    // First child at y=0
    approx(positioned.children![0].y, 0, 'child 1 y');
    // Second child at y = 0.25 (height) + 0.5 (gap) = 0.75
    approx(positioned.children![1].y, 0.75, 'child 2 y');
    // Third child at y = 0.75 + 0.25 + 0.5 = 1.5
    approx(positioned.children![2].y, 1.5, 'child 3 y');
  });

  // ------------------------------------------
  // 4. Column total height sums children + gaps
  // ------------------------------------------
  test('column total height sums children and gaps', () => {
    const themeWithGap = mockTheme({ gap: 0.5 });
    const node = columnNode([textNode('A'), textNode('B'), textNode('C')]);
    const height = getNodeHeight(node, 10, themeWithGap, measurer);

    // 3 children × 0.25 + 2 gaps × 0.5 = 0.75 + 1.0 = 1.75
    approx(height, 1.75, 'column height');
  });

  // ------------------------------------------
  // 5. justify CENTER centers content vertically
  // ------------------------------------------
  test('justify CENTER centers content vertically', () => {
    const node = columnNode([textNode('A')], { justify: JUSTIFY.CENTER });
    const bounds = new Bounds(0, 0, 10, 5);
    const positioned = computeLayout(node, bounds, theme, measurer);

    // Content height = 0.25, bounds height = 5, centered = (5 - 0.25) / 2 = 2.375
    approx(positioned.children![0].y, 2.375, 'child y (centered)');
  });

  // ------------------------------------------
  // 6. justify END positions content at bottom
  // ------------------------------------------
  test('justify END positions content at bottom', () => {
    const node = columnNode([textNode('A')], { justify: JUSTIFY.END });
    const bounds = new Bounds(0, 0, 10, 5);
    const positioned = computeLayout(node, bounds, theme, measurer);

    // Content height = 0.25, bounds height = 5, end = 5 - 0.25 = 4.75
    approx(positioned.children![0].y, 4.75, 'child y (end)');
  });

  // ------------------------------------------
  // 7. Nested row in column gets full width
  // ------------------------------------------
  test('nested row in column gets full width', () => {
    const row = rowNode([textNode('A'), textNode('B')]);
    const node = columnNode([row]);
    const bounds = new Bounds(0, 0, 10, 5);
    const positioned = computeLayout(node, bounds, theme, measurer);

    approx(positioned.children![0].width, 10, 'row child width');
  });
});

// ============================================
// GROUP LAYOUT TESTS
// ============================================

describe('Group Layout', () => {
  const theme = mockTheme({ gap: 0 });
  const measurer = mockMeasurer({ lineHeight: 0.25 });

  // ------------------------------------------
  // 1. Group arranges children in grid
  // ------------------------------------------
  test('group with 2 columns arranges 4 children in 2x2 grid', () => {
    const node = groupNode(
      [textNode('A'), textNode('B'), textNode('C'), textNode('D')],
      { columns: 2 }
    );
    const bounds = new Bounds(0, 0, 10, 10);
    const positioned = computeLayout(node, bounds, theme, measurer);

    assert.strictEqual(positioned.children?.length, 4);
    // Each cell is 5" wide (10 / 2)
    approx(positioned.children![0].width, 5, 'child 1 width');
    approx(positioned.children![1].width, 5, 'child 2 width');

    // Row 1: y = 0
    approx(positioned.children![0].y, 0, 'child 1 y (row 1)');
    approx(positioned.children![1].y, 0, 'child 2 y (row 1)');

    // Row 2: y = 0.25 (row height)
    approx(positioned.children![2].y, 0.25, 'child 3 y (row 2)');
    approx(positioned.children![3].y, 0.25, 'child 4 y (row 2)');
  });

  // ------------------------------------------
  // 2. Group x positions are correct
  // ------------------------------------------
  test('group children have correct x positions', () => {
    const node = groupNode(
      [textNode('A'), textNode('B'), textNode('C'), textNode('D')],
      { columns: 2 }
    );
    const bounds = new Bounds(1, 2, 10, 10);
    const positioned = computeLayout(node, bounds, theme, measurer);

    // Column 1: x = 1
    approx(positioned.children![0].x, 1, 'child 1 x (col 1)');
    approx(positioned.children![2].x, 1, 'child 3 x (col 1)');

    // Column 2: x = 1 + 5 = 6
    approx(positioned.children![1].x, 6, 'child 2 x (col 2)');
    approx(positioned.children![3].x, 6, 'child 4 x (col 2)');
  });

  // ------------------------------------------
  // 3. Group with gap reduces cell width
  // ------------------------------------------
  test('group with gap reduces cell width', () => {
    const themeWithGap = mockTheme({ gap: 1 });
    const node = groupNode(
      [textNode('A'), textNode('B')],
      { columns: 2 }
    );
    const bounds = new Bounds(0, 0, 10, 10);
    const positioned = computeLayout(node, bounds, themeWithGap, measurer);

    // Total width 10, gap 1, remaining 9, each cell 4.5
    approx(positioned.children![0].width, 4.5, 'child 1 width with gap');
    approx(positioned.children![1].width, 4.5, 'child 2 width with gap');
  });

  // ------------------------------------------
  // 4. Group height sums row heights + gaps
  // ------------------------------------------
  test('group height sums row heights and gaps', () => {
    const themeWithGap = mockTheme({ gap: 0.5 });
    const node = groupNode(
      [textNode('A'), textNode('B'), textNode('C'), textNode('D')],
      { columns: 2 }
    );
    const height = getNodeHeight(node, 10, themeWithGap, measurer);

    // 2 rows × 0.25 + 1 gap × 0.5 = 0.5 + 0.5 = 1.0
    approx(height, 1.0, 'group height');
  });

  // ------------------------------------------
  // 5. Default columns = number of children (single row)
  // ------------------------------------------
  test('default columns equals number of children', () => {
    const node = groupNode([textNode('A'), textNode('B'), textNode('C')]);
    const bounds = new Bounds(0, 0, 9, 10);
    const positioned = computeLayout(node, bounds, theme, measurer);

    // All children in one row, each 3" wide
    approx(positioned.children![0].width, 3, 'child 1 width');
    approx(positioned.children![1].width, 3, 'child 2 width');
    approx(positioned.children![2].width, 3, 'child 3 width');

    // All at same y
    approx(positioned.children![0].y, 0, 'child 1 y');
    approx(positioned.children![1].y, 0, 'child 2 y');
    approx(positioned.children![2].y, 0, 'child 3 y');
  });

  // ------------------------------------------
  // 6. Incomplete last row works correctly
  // ------------------------------------------
  test('incomplete last row positions correctly', () => {
    const node = groupNode(
      [textNode('A'), textNode('B'), textNode('C')],
      { columns: 2 }
    );
    const bounds = new Bounds(0, 0, 10, 10);
    const positioned = computeLayout(node, bounds, theme, measurer);

    assert.strictEqual(positioned.children?.length, 3);
    // Row 1: A, B
    approx(positioned.children![0].y, 0, 'child 1 y');
    approx(positioned.children![1].y, 0, 'child 2 y');
    // Row 2: C only
    approx(positioned.children![2].y, 0.25, 'child 3 y');
    approx(positioned.children![2].x, 0, 'child 3 x (col 1)');
  });
});

// ============================================
// GAP ENUM TESTS
// ============================================

describe('Gap Values', () => {
  const measurer = mockMeasurer({ lineHeight: 0.25 });

  test('GAP.TIGHT uses gapTight from theme', () => {
    const theme = mockTheme({ gap: 0.25, gapTight: 0.1 });
    const node = rowNode([textNode('A'), textNode('B')], { gap: GAP.TIGHT });
    const bounds = new Bounds(0, 0, 10, 5);
    const positioned = computeLayout(node, bounds, theme, measurer);

    // Width 10, gap 0.1, remaining 9.9, each child 4.95
    approx(positioned.children![0].width, 4.95, 'child 1 width with tight gap');
  });

  test('GAP.LOOSE uses gapLoose from theme', () => {
    const theme = mockTheme({ gap: 0.25, gapLoose: 0.5 });
    const node = rowNode([textNode('A'), textNode('B')], { gap: GAP.LOOSE });
    const bounds = new Bounds(0, 0, 10, 5);
    const positioned = computeLayout(node, bounds, theme, measurer);

    // Width 10, gap 0.5, remaining 9.5, each child 4.75
    approx(positioned.children![0].width, 4.75, 'child 1 width with loose gap');
  });

  test('GAP.NONE uses zero gap', () => {
    const theme = mockTheme({ gap: 0.25 });
    const node = rowNode([textNode('A'), textNode('B')], { gap: GAP.NONE });
    const bounds = new Bounds(0, 0, 10, 5);
    const positioned = computeLayout(node, bounds, theme, measurer);

    // Width 10, gap 0, each child 5
    approx(positioned.children![0].width, 5, 'child 1 width with no gap');
  });
});
