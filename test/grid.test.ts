// Grid layout tests — validates GridColumn and GridRow public API
import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { GridColumn, GridRow } from '../src/core/grid-layout.js';
import { Bounds, ALIGN, type Component } from '../src/core/types.js';

function approx(actual: number, expected: number, msg: string, tolerance = 0.001): void {
  assert.ok(Math.abs(actual - expected) < tolerance, `${msg}: expected ~${expected}, got ${actual}`);
}

/** Minimal Component stub with a fixed height. */
function stub(height: number): Component {
  return {
    getHeight: () => height,
    prepare: () => () => {},
  };
}

// ============================================
// GridColumn
// ============================================

describe('GridColumn', () => {
  test('stacks children at content heights', () => {
    const col = new GridColumn([stub(3), stub(3), stub(3)], undefined, 0, ALIGN.START);
    const slots = col.getSlots(new Bounds(0, 0, 10, 9));
    assert.strictEqual(slots.length, 3);
    approx(slots[0].h, 3, 'slot 0 height');
    approx(slots[0].y, 0, 'slot 0 y');
    approx(slots[1].y, 3, 'slot 1 y');
    approx(slots[2].y, 6, 'slot 2 y');
    approx(slots[0].w, 10, 'full width preserved');
  });

  test('gap between children', () => {
    const col = new GridColumn([stub(3), stub(3)], undefined, 1, ALIGN.START);
    const slots = col.getSlots(new Bounds(0, 0, 10, 7));
    approx(slots[0].h, 3, 'slot 0 height');
    approx(slots[1].y, 4, 'slot 1 y = 3 + 1 gap');
    approx(slots[1].h, 3, 'slot 1 height');
  });

  test('proportional heights', () => {
    const col = new GridColumn([stub(0), stub(0)], [1, 2], 0, ALIGN.START);
    const slots = col.getSlots(new Bounds(0, 0, 10, 9));
    approx(slots[0].h, 3, 'first gets 1/3');
    approx(slots[1].h, 6, 'second gets 2/3');
    approx(slots[1].y, 3, 'second starts at 3');
  });

  test('getHeight sums content heights plus gaps', () => {
    const col = new GridColumn([stub(2), stub(3)], undefined, 0.5, ALIGN.START);
    approx(col.getHeight(10), 5.5, 'total = 2 + 3 + 0.5');
  });

  test('respects bounds offset', () => {
    const col = new GridColumn([stub(2), stub(2)], undefined, 0, ALIGN.START);
    const slots = col.getSlots(new Bounds(1, 2, 6, 4));
    approx(slots[0].x, 1, 'inherits x offset');
    approx(slots[0].y, 2, 'inherits y offset');
    approx(slots[1].y, 4, 'second at y offset + height');
  });

  test('compresses children with getMinHeight', () => {
    // Image-like: natural 3", min 0" (fully compressible)
    const compressible = {
      getHeight: () => 3,
      getMinHeight: () => 0,
      prepare: () => () => {},
    };
    // Text-like: natural 0.5", incompressible
    const fixed = stub(0.5);
    const col = new GridColumn([compressible, fixed], undefined, 0, ALIGN.START);
    // Available 2.5" < natural 3.5" → image compresses to 2"
    const slots = col.getSlots(new Bounds(0, 0, 10, 2.5));
    approx(slots[0].h, 2, 'compressible shrinks');
    approx(slots[1].h, 0.5, 'fixed preserved');
  });
});

// ============================================
// GridRow
// ============================================

describe('GridRow', () => {
  test('equal widths by default', () => {
    const row = new GridRow([stub(2), stub(2), stub(2)], undefined, 0, ALIGN.START);
    const slots = row.getSlots(new Bounds(0, 0, 9, 6));
    assert.strictEqual(slots.length, 3);
    approx(slots[0].w, 3, 'each gets 1/3 width');
    approx(slots[1].x, 3, 'second at x=3');
    approx(slots[2].x, 6, 'third at x=6');
    approx(slots[0].h, 6, 'full height preserved');
  });

  test('gap reduces column widths', () => {
    // 9" wide, 2 cols, gap 1 → (9-1)/2 = 4
    const row = new GridRow([stub(2), stub(2)], undefined, 1, ALIGN.START);
    const slots = row.getSlots(new Bounds(0, 0, 9, 4));
    approx(slots[0].w, 4, 'each (9-1)/2 = 4');
    approx(slots[1].x, 5, 'second at 4 + 1 gap');
  });

  test('proportional widths', () => {
    const row = new GridRow([stub(2), stub(2)], [1, 2], 0, ALIGN.START);
    const slots = row.getSlots(new Bounds(0, 0, 9, 5));
    approx(slots[0].w, 3, 'first gets 1/3');
    approx(slots[1].w, 6, 'second gets 2/3');
    approx(slots[1].x, 3, 'second starts at 3');
  });

  test('proportional widths with gap', () => {
    // 10" wide, [1, 1], gap 2 → available = 8, each = 4
    const row = new GridRow([stub(2), stub(2)], [1, 1], 2, ALIGN.START);
    const slots = row.getSlots(new Bounds(0, 0, 10, 5));
    approx(slots[0].w, 4, 'each (10-2)/2 = 4');
    approx(slots[1].x, 6, 'second at 4 + 2 gap');
  });
});

// ============================================
// Grid composition (rows in column — Table pattern)
// ============================================

describe('grid composition', () => {
  test('2×3 grid via rows in column', () => {
    const row0 = new GridRow([stub(3), stub(3), stub(3)], undefined, 0, ALIGN.START);
    const row1 = new GridRow([stub(3), stub(3), stub(3)], undefined, 0, ALIGN.START);
    const col = new GridColumn([row0, row1], undefined, 0, ALIGN.START);

    const rowSlots = col.getSlots(new Bounds(0, 0, 9, 6));
    assert.strictEqual(rowSlots.length, 2);
    approx(rowSlots[0].h, 3, 'row 0 height');
    approx(rowSlots[0].y, 0, 'row 0 y');
    approx(rowSlots[1].y, 3, 'row 1 y');

    const colSlots = row0.getSlots(rowSlots[0]);
    assert.strictEqual(colSlots.length, 3);
    approx(colSlots[0].w, 3, 'cell width');
    approx(colSlots[1].x, 3, 'col 1 x');
    approx(colSlots[2].x, 6, 'col 2 x');
  });

  test('grid with row and column gaps', () => {
    const row0 = new GridRow([stub(2), stub(2)], undefined, 0.5, ALIGN.START);
    const row1 = new GridRow([stub(2), stub(2)], undefined, 0.5, ALIGN.START);
    const col = new GridColumn([row0, row1], undefined, 1, ALIGN.START);

    const rowSlots = col.getSlots(new Bounds(0, 0, 10, 5));
    approx(rowSlots[0].h, 2, 'row height');
    approx(rowSlots[1].y, 3, 'row 1 y = 2 + 1 gap');

    const colSlots = row0.getSlots(rowSlots[0]);
    approx(colSlots[0].w, 4.75, 'cell width = (10-0.5)/2');
    approx(colSlots[1].x, 5.25, 'col 1 x = 4.75 + 0.5');
  });

  test('respects bounds offset in grid', () => {
    const row = new GridRow([stub(4), stub(4)], undefined, 0, ALIGN.START);
    const col = new GridColumn([row], undefined, 0, ALIGN.START);

    const rowSlots = col.getSlots(new Bounds(1, 2, 6, 4));
    approx(rowSlots[0].x, 1, 'row inherits x offset');
    approx(rowSlots[0].y, 2, 'row inherits y offset');

    const colSlots = row.getSlots(rowSlots[0]);
    approx(colSlots[0].x, 1, 'cell 0 inherits x offset');
    approx(colSlots[1].x, 4, 'cell 1 at offset + cellW');
  });
});
