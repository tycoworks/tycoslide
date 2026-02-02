// Grid unit tests — validates pure rectangle subdivision
import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { slotGrid, splitV, splitH, splitRatio } from '../src/core/grid.js';
import { Bounds } from '../src/core/types.js';

function approx(actual: number, expected: number, msg: string, tolerance = 0.001): void {
  assert.ok(Math.abs(actual - expected) < tolerance, `${msg}: expected ~${expected}, got ${actual}`);
}

// ============================================
// slotGrid
// ============================================

describe('slotGrid', () => {
  test('2×3 grid divides evenly with no gap', () => {
    const cells = slotGrid(new Bounds(0, 0, 9, 6), { rows: 2, cols: 3 });
    assert.strictEqual(cells.length, 6);
    approx(cells[0].w, 3, 'cell width');
    approx(cells[0].h, 3, 'cell height');
    approx(cells[0].x, 0, 'first cell x');
    approx(cells[0].y, 0, 'first cell y');
    approx(cells[5].x, 6, 'last cell x');
    approx(cells[5].y, 3, 'last cell y');
  });

  test('gap reduces cell sizes', () => {
    // 9" wide, 2 cols, gap 1" → (9-1)/2 = 4" each
    const cells = slotGrid(new Bounds(0, 0, 9, 4), { rows: 1, cols: 2, gap: 1 });
    assert.strictEqual(cells.length, 2);
    approx(cells[0].w, 4, 'cell 0 width');
    approx(cells[1].w, 4, 'cell 1 width');
    approx(cells[1].x, 5, 'cell 1 x (4 + 1 gap)');
  });

  test('rowGap and colGap can differ', () => {
    const cells = slotGrid(new Bounds(0, 0, 10, 5), { rows: 2, cols: 2, rowGap: 1, colGap: 0.5 });
    // width: (10 - 0.5) / 2 = 4.75
    // height: (5 - 1) / 2 = 2
    approx(cells[0].w, 4.75, 'cell width');
    approx(cells[0].h, 2, 'cell height');
    approx(cells[1].x, 5.25, 'second column x (4.75 + 0.5)');
    approx(cells[2].y, 3, 'second row y (2 + 1)');
  });

  test('respects bounds offset', () => {
    const cells = slotGrid(new Bounds(1, 2, 6, 4), { rows: 1, cols: 2 });
    approx(cells[0].x, 1, 'first cell inherits x offset');
    approx(cells[0].y, 2, 'first cell inherits y offset');
    approx(cells[1].x, 4, 'second cell at offset + cellW');
  });
});

// ============================================
// splitV
// ============================================

describe('splitV', () => {
  test('splits into equal rows', () => {
    const rows = splitV(new Bounds(0, 0, 10, 9), 3);
    assert.strictEqual(rows.length, 3);
    approx(rows[0].h, 3, 'row 0 height');
    approx(rows[1].y, 3, 'row 1 y');
    approx(rows[2].y, 6, 'row 2 y');
    approx(rows[0].w, 10, 'full width preserved');
  });

  test('gap reduces row height', () => {
    // 9" tall, 3 rows, gap 0.5 → totalGap = 1, each row = (9-1)/3 ≈ 2.667
    const rows = splitV(new Bounds(0, 0, 10, 9), 3, 0.5);
    approx(rows[0].h, 2.667, 'row height with gap');
    approx(rows[1].y, 3.167, 'row 1 y = 2.667 + 0.5');
  });
});

// ============================================
// splitH
// ============================================

describe('splitH', () => {
  test('splits into equal columns', () => {
    const cols = splitH(new Bounds(0, 0, 10, 5), 2);
    assert.strictEqual(cols.length, 2);
    approx(cols[0].w, 5, 'col 0 width');
    approx(cols[1].x, 5, 'col 1 x');
    approx(cols[0].h, 5, 'full height preserved');
  });

  test('gap reduces column width', () => {
    // 10" wide, 2 cols, gap 2 → each = (10-2)/2 = 4
    const cols = splitH(new Bounds(0, 0, 10, 5), 2, 2);
    approx(cols[0].w, 4, 'col width with gap');
    approx(cols[1].x, 6, 'col 1 x = 4 + 2');
  });
});

// ============================================
// splitRatio
// ============================================

describe('splitRatio', () => {
  test('vertical 1:2 split', () => {
    const parts = splitRatio(new Bounds(0, 0, 10, 9), [1, 2], 'vertical');
    assert.strictEqual(parts.length, 2);
    approx(parts[0].h, 3, 'top part height (1/3)');
    approx(parts[1].h, 6, 'bottom part height (2/3)');
    approx(parts[1].y, 3, 'bottom part y');
    approx(parts[0].w, 10, 'full width preserved');
  });

  test('horizontal 1:1:1 split', () => {
    const parts = splitRatio(new Bounds(0, 0, 9, 5), [1, 1, 1], 'horizontal');
    assert.strictEqual(parts.length, 3);
    approx(parts[0].w, 3, 'each part width');
    approx(parts[1].x, 3, 'part 1 x');
    approx(parts[2].x, 6, 'part 2 x');
    approx(parts[0].h, 5, 'full height preserved');
  });

  test('gap between parts', () => {
    // 10" wide, [1, 1] horizontal, gap 2 → available = 8, each = 4
    const parts = splitRatio(new Bounds(0, 0, 10, 5), [1, 1], 'horizontal', 2);
    approx(parts[0].w, 4, 'part 0 width');
    approx(parts[1].w, 4, 'part 1 width');
    approx(parts[1].x, 6, 'part 1 x = 4 + 2 gap');
  });

  test('0 ratio gives zero-size slot', () => {
    const parts = splitRatio(new Bounds(0, 0, 10, 5), [0, 1], 'horizontal');
    approx(parts[0].w, 0, 'zero-ratio part');
    approx(parts[1].w, 10, 'remaining part gets all');
  });

  test('defaults to vertical', () => {
    const parts = splitRatio(new Bounds(0, 0, 10, 6), [1, 1]);
    approx(parts[0].h, 3, 'default vertical split');
    approx(parts[1].y, 3, 'second part y');
  });
});
