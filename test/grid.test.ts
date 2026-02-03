// Grid layout tests — validates GridColumn, GridRow, stack primitives, and grid snapping
import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { GridColumn, GridRow } from '../src/core/layout.js';
import { snapUp, snapDown, fitHeights, STACK_JUSTIFY } from '../src/core/grid.js';
import { Bounds, ALIGN, type Component } from '../src/core/types.js';

function approx(actual: number, expected: number, msg: string, tolerance = 0.001): void {
  assert.ok(Math.abs(actual - expected) < tolerance, `${msg}: expected ~${expected}, got ${actual}`);
}

/** Minimal Component stub with a fixed height. */
function stub(height: number): Component {
  return {
    getHeight: () => height,
    getMinHeight: () => height,
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

  test('nested compression: row with compressible children in constrained column', () => {
    // Simulates Slide 4: column contains a fixed header + a row of cards with images.
    // The row's natural height (6") exceeds available space (3.5" - 0.5" header = 3").
    // Compression must propagate: Column → Row → compressible children.
    const compressible = {
      getHeight: () => 3,
      getMinHeight: () => 0,
      prepare: () => () => {},
    };
    const rowOfTwo = new GridRow([compressible, compressible], undefined, 0, ALIGN.START);
    const header = stub(0.5);
    const col = new GridColumn([header, rowOfTwo], undefined, 0, ALIGN.START);
    // Available 3.5" < natural 6.5" (0.5 header + 6.0 row)
    // Row should compress from 6" to 3" (images shrink), no throw
    const slots = col.getSlots(new Bounds(0, 0, 10, 3.5));
    approx(slots[0].h, 0.5, 'header preserved');
    approx(slots[1].h, 3, 'row compressed to fit');
  });

  test('getMinHeight propagates through nested column and row', () => {
    const compressible = {
      getHeight: () => 4,
      getMinHeight: () => 0,
      prepare: () => () => {},
    };
    const innerCol = new GridColumn([compressible, stub(0.5)], undefined, 0, ALIGN.START);
    // innerCol.getMinHeight should be 0 + 0.5 = 0.5
    approx(innerCol.getMinHeight(10), 0.5, 'column minHeight = sum of children minHeights');

    const row = new GridRow([innerCol, innerCol], undefined, 0, ALIGN.START);
    // row.getMinHeight should be max(0.5, 0.5) = 0.5
    approx(row.getMinHeight(10), 0.5, 'row minHeight = max of children minHeights');
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

// ============================================
// Grid Snapping
// ============================================

describe('grid snapping primitives', () => {
  const UNIT = 0.125; // Standard grid quantum

  test('snapUp rounds up to next grid unit', () => {
    approx(snapUp(0.28, UNIT), 0.375, 'rounds 0.28 up to 3 units');
    approx(snapUp(0.5, UNIT), 0.5, 'already aligned stays same');
    approx(snapUp(0.126, UNIT), 0.25, 'just over 1 unit rounds to 2');
    approx(snapUp(0.001, UNIT), 0.125, 'tiny value rounds to 1 unit');
    approx(snapUp(0, UNIT), 0, 'zero stays zero');
  });

  test('snapDown rounds down to previous grid unit', () => {
    approx(snapDown(0.28, UNIT), 0.25, 'rounds 0.28 down to 2 units');
    approx(snapDown(0.5, UNIT), 0.5, 'already aligned stays same');
    approx(snapDown(0.374, UNIT), 0.25, 'just under 3 units rounds to 2');
    approx(snapDown(0.124, UNIT), 0, 'just under 1 unit rounds to 0');
    approx(snapDown(0, UNIT), 0, 'zero stays zero');
  });

  test('fitHeights preserves heights when space allows', () => {
    const heights = [1, 2, 3];
    const result = fitHeights(heights, 10, 0.5); // plenty of space
    approx(result[0], 1, 'height 0 unchanged');
    approx(result[1], 2, 'height 1 unchanged');
    approx(result[2], 3, 'height 2 unchanged');
  });

  test('fitHeights compresses proportionally', () => {
    // Total = 6, available = 5, need to compress by 1
    // Compressible has budget of 3, fixed has budget of 0
    const heights = [3, 3];
    const minHeights = [0, 3]; // first compressible, second fixed
    const result = fitHeights(heights, 5, 0, minHeights);
    approx(result[0], 2, 'compressible shrinks by 1');
    approx(result[1], 3, 'fixed preserved');
  });
});

describe('GridColumn with grid snapping', () => {
  const UNIT = 0.125;

  /** Helper to check if value is grid-aligned */
  function isGridAligned(value: number, unit: number): boolean {
    const units = value / unit;
    return Math.abs(units - Math.round(units)) < 0.0001;
  }

  test('compressible content is grid-aligned, incompressible preserves minHeight', () => {
    // Incompressible text (minHeight = height) preserves its height even if not grid-aligned
    // Compressible images (minHeight = 0) snap to grid
    const text = {
      getHeight: () => 0.235, // Not on grid
      getMinHeight: () => 0.235, // Incompressible
      prepare: () => () => {},
    };
    const image = {
      getHeight: () => 3.5,
      getMinHeight: () => 0, // Fully compressible
      prepare: () => () => {},
    };

    const col = new GridColumn([text, image], undefined, 0.25, ALIGN.START, undefined, undefined, UNIT);
    const slots = col.getSlots(new Bounds(0, 0, 10, 3.5));

    // Text preserves minHeight (not grid-aligned, but content doesn't overflow)
    approx(slots[0].h, 0.235, 'text preserves minHeight');
    // Image is grid-aligned (compressible)
    assert.ok(isGridAligned(slots[1].h, UNIT), `image height ${slots[1].h} must be grid-aligned`);
  });

  test('identical incompressible content produces identical heights', () => {
    // When text has the SAME minHeight, results are identical
    const makeText = (h: number) => ({
      getHeight: () => h,
      getMinHeight: () => h,
      prepare: () => () => {},
    });
    const makeImage = () => ({
      getHeight: () => 3.5,
      getMinHeight: () => 0,
      prepare: () => () => {},
    });

    // Same minHeight = identical results
    const col1 = new GridColumn([makeText(0.235), makeImage()], undefined, 0.25, ALIGN.START, undefined, undefined, UNIT);
    const col2 = new GridColumn([makeText(0.235), makeImage()], undefined, 0.25, ALIGN.START, undefined, undefined, UNIT);

    const slots1 = col1.getSlots(new Bounds(0, 0, 10, 3.875));
    const slots2 = col2.getSlots(new Bounds(0, 0, 10, 3.875));

    // Both have identical heights
    approx(slots1[0].h, slots2[0].h, 'text heights identical when same minHeight');
    approx(slots1[1].h, slots2[1].h, 'image heights identical');

    // Images are grid-aligned
    assert.ok(isGridAligned(slots1[1].h, UNIT), 'image must be grid-aligned');
  });

  test('total height after snapping does not exceed available space', () => {
    const text = {
      getHeight: () => 0.235,
      getMinHeight: () => 0.235,
      prepare: () => () => {},
    };
    const image = {
      getHeight: () => 3.5,
      getMinHeight: () => 0,
      prepare: () => () => {},
    };

    const col = new GridColumn([text, image], undefined, 0.25, ALIGN.START, undefined, undefined, UNIT);
    const available = 3.5;
    const slots = col.getSlots(new Bounds(0, 0, 10, available));

    const totalUsed = slots[0].h + slots[1].h + 0.25; // heights + gap
    assert.ok(totalUsed <= available + 0.001, `total ${totalUsed} must not exceed available ${available}`);
  });
});

// ============================================
// Grid Alignment Invariants (Public Interface)
// ============================================

describe('GridColumn centering alignment', () => {
  const UNIT = 0.125;

  /** Helper to check if value is grid-aligned */
  function isGridAligned(value: number, unit: number): boolean {
    const units = value / unit;
    return Math.abs(units - Math.round(units)) < 0.0001;
  }

  test('CENTER justify produces grid-aligned Y positions', () => {
    // GridColumn with unit and CENTER justify
    const col = new GridColumn(
      [stub(1.0), stub(2.0)],
      undefined,  // no proportions
      0.125,      // gap
      ALIGN.START,
      undefined,  // no explicit height
      STACK_JUSTIFY.CENTER,
      UNIT,
    );

    const bounds = new Bounds(0, 0, 10, 5.625); // Standard 16:9 slide height
    const slots = col.getSlots(bounds);

    for (let i = 0; i < slots.length; i++) {
      assert.ok(
        isGridAligned(slots[i].y, UNIT),
        `slot ${i} Y position ${slots[i].y} must be grid-aligned`
      );
      assert.ok(
        isGridAligned(slots[i].h, UNIT),
        `slot ${i} height ${slots[i].h} must be grid-aligned`
      );
    }
  });

  test('CENTER justify with odd freeSpace snaps down', () => {
    // freeSpace would be 2.375, offset = 1.1875 → should snap to 1.125
    const col = new GridColumn(
      [stub(1.0), stub(2.0)],
      undefined,
      0.125,
      ALIGN.START,
      undefined,
      STACK_JUSTIFY.CENTER,
      UNIT,
    );

    const bounds = new Bounds(0, 0, 10, 5.5); // 5.5" available
    const slots = col.getSlots(bounds);

    assert.ok(
      isGridAligned(slots[0].y, UNIT),
      `first slot Y ${slots[0].y} must be grid-aligned`
    );
    // Verify it actually snapped down
    approx(slots[0].y, 1.125, 'offset should snap down from 1.1875 to 1.125');
  });

  test('END justify produces grid-aligned Y positions', () => {
    const col = new GridColumn(
      [stub(1.0), stub(2.0)],
      undefined,
      0.125,
      ALIGN.START,
      undefined,
      STACK_JUSTIFY.END,
      UNIT,
    );

    const bounds = new Bounds(0, 0, 10, 5.625);
    const slots = col.getSlots(bounds);

    for (let i = 0; i < slots.length; i++) {
      assert.ok(
        isGridAligned(slots[i].y, UNIT),
        `slot ${i} Y position ${slots[i].y} must be grid-aligned`
      );
    }
  });

  test('all slots in nested column-row layout are grid-aligned', () => {
    // Row of two columns, each with centered content
    const innerCol1 = new GridColumn([stub(1.0), stub(1.5)], undefined, 0.125, ALIGN.START, undefined, STACK_JUSTIFY.CENTER, UNIT);
    const innerCol2 = new GridColumn([stub(0.5), stub(2.0)], undefined, 0.125, ALIGN.START, undefined, STACK_JUSTIFY.CENTER, UNIT);
    const row = new GridRow([innerCol1, innerCol2], undefined, 0.25, ALIGN.START, undefined, undefined, UNIT);
    const outerCol = new GridColumn([stub(0.5), row], undefined, 0.125, ALIGN.START, undefined, undefined, UNIT);

    const bounds = new Bounds(0, 0, 10, 5.625);
    const outerSlots = outerCol.getSlots(bounds);

    // Check outer column slots
    for (let i = 0; i < outerSlots.length; i++) {
      assert.ok(
        isGridAligned(outerSlots[i].y, UNIT),
        `outer slot ${i} Y position ${outerSlots[i].y} must be grid-aligned`
      );
    }

    // Check row slots
    const rowSlots = row.getSlots(outerSlots[1]);
    for (let i = 0; i < rowSlots.length; i++) {
      assert.ok(
        isGridAligned(rowSlots[i].y, UNIT),
        `row slot ${i} Y position ${rowSlots[i].y} must be grid-aligned`
      );
    }

    // Check inner column slots (these use CENTER justify)
    const inner1Slots = innerCol1.getSlots(rowSlots[0]);
    for (let i = 0; i < inner1Slots.length; i++) {
      assert.ok(
        isGridAligned(inner1Slots[i].y, UNIT),
        `inner1 slot ${i} Y position ${inner1Slots[i].y} must be grid-aligned`
      );
    }
  });
});
