// Group tests — validates compressible padding wrapper
import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { group, GridColumn } from '../src/core/layout.js';
import { Bounds, ALIGN, GAP, type Component, type Theme } from '../src/core/types.js';

// Mock theme for testing
const mockTheme = {
  spacing: { unit: 0.125, gap: 0.25, gapTight: 0.125, gapLoose: 0.5, margin: 0.5 },
} as Theme;

function approx(actual: number, expected: number, msg: string, tolerance = 0.001): void {
  assert.ok(Math.abs(actual - expected) < tolerance, `${msg}: expected ~${expected}, got ${actual}`);
}

/** Stub component with configurable natural and min heights. */
function stub(height: number, minHeight?: number): Component {
  return {
    getHeight: () => height,
    getMinHeight: () => minHeight ?? height,
    getWidth: () => 1,
    prepare: () => () => {},
  };
}

/** Tracking component that records bounds passed to prepare(). */
function trackingStub(height: number, minHeight?: number): { component: Component; getBounds: () => Bounds | null } {
  let capturedBounds: Bounds | null = null;
  return {
    getBounds: () => capturedBounds,
    component: {
      getHeight: () => height,
      getMinHeight: () => minHeight ?? height,
      getWidth: () => 1,
      prepare: (b: Bounds) => { capturedBounds = b; return () => {}; },
    },
  };
}

// ============================================
// Height reporting
// ============================================

describe('Group height reporting', () => {
  test('getHeight adds padding to child height', () => {
    const child = stub(2);
    const g = group(mockTheme, { gap: GAP.NORMAL }, child);
    // Child at inner width would be 2", plus 0.25*2 padding = 2.5"
    approx(g.getHeight(10), 2.5, 'height = child + padding*2');
  });

  test('getMinHeight excludes padding (fully compressible)', () => {
    const child = stub(2, 1); // natural 2", min 1"
    const g = group(mockTheme, { gap: GAP.NORMAL }, child);
    // Min height is child's min only - padding compresses to zero
    approx(g.getMinHeight(10), 1, 'minHeight = child minHeight only');
  });

  test('getMinHeight with incompressible child', () => {
    const child = stub(2); // natural = min = 2"
    const g = group(mockTheme, { gap: GAP.NORMAL }, child);
    approx(g.getMinHeight(10), 2, 'minHeight = child minHeight');
  });

  test('default padding is 0', () => {
    const child = stub(1);
    const g = group(mockTheme, child);
    // Default padding = 0, height = child height
    approx(g.getHeight(10), 1, 'default padding = 0');
  });
});

// ============================================
// Padding compression
// ============================================

describe('Group padding compression', () => {
  test('full padding when plenty of room', () => {
    const tracker = trackingStub(2, 2);
    const g = group(mockTheme, { gap: GAP.NORMAL }, tracker.component);
    // Bounds: 10x4 - child needs 2", we have 4" → 2" excess → full padding
    g.prepare(new Bounds(0, 0, 10, 4));
    const inner = tracker.getBounds()!;
    approx(inner.x, 0.25, 'full hPad left');
    approx(inner.y, 0.25, 'full vPad top');
    approx(inner.w, 9.5, 'width reduced by hPad*2');
    approx(inner.h, 3.5, 'height reduced by vPad*2');
  });

  test('compressed padding when tight (snaps to unit)', () => {
    const tracker = trackingStub(2, 2);
    const g = group(mockTheme, { gap: GAP.NORMAL }, tracker.component);
    // Bounds: 10x2.3 - child needs 2", excess = 0.3"
    // rawVPad = min(0.25, 0.3/2) = 0.15
    // vPad = floor(0.15/0.125)*0.125 = 0.125 (snaps down)
    // ratio = 0.125/0.25 = 0.5
    // hPad = 0.25 * 0.5 = 0.125
    g.prepare(new Bounds(0, 0, 10, 2.3));
    const inner = tracker.getBounds()!;
    approx(inner.x, 0.125, 'compressed hPad');
    approx(inner.y, 0.125, 'compressed vPad');
    approx(inner.w, 9.75, 'width with compressed padding');
    approx(inner.h, 2.05, 'height with compressed padding');
  });

  test('zero padding when no room', () => {
    const tracker = trackingStub(2, 2);
    const g = group(mockTheme, { gap: GAP.NORMAL }, tracker.component);
    // Bounds: 10x2 - child needs exactly 2", no excess
    g.prepare(new Bounds(0, 0, 10, 2));
    const inner = tracker.getBounds()!;
    approx(inner.x, 0, 'zero hPad');
    approx(inner.y, 0, 'zero vPad');
    approx(inner.w, 10, 'full width to child');
    approx(inner.h, 2, 'full height to child');
  });

  test('zero padding when child overflows', () => {
    const tracker = trackingStub(3, 3);
    const g = group(mockTheme, { gap: GAP.NORMAL }, tracker.component);
    // Bounds: 10x2 - child needs 3", negative excess
    g.prepare(new Bounds(0, 0, 10, 2));
    const inner = tracker.getBounds()!;
    approx(inner.x, 0, 'zero hPad on overflow');
    approx(inner.y, 0, 'zero vPad on overflow');
    approx(inner.w, 10, 'full width');
    approx(inner.h, 2, 'full height');
  });

  test('respects bounds offset', () => {
    const tracker = trackingStub(2, 2);
    const g = group(mockTheme, { gap: GAP.NORMAL }, tracker.component);
    g.prepare(new Bounds(1, 2, 10, 4));
    const inner = tracker.getBounds()!;
    approx(inner.x, 1.25, 'offset x + padding');
    approx(inner.y, 2.25, 'offset y + padding');
  });
});

// ============================================
// Integration with GridColumn (compression)
// ============================================

describe('Group compression via GridColumn', () => {
  test('group compresses when column space is tight', () => {
    // Simulate: column with text + group + text that would overflow
    // without compression but fits when group padding compresses.
    const tracker = trackingStub(2, 2); // incompressible row
    const g = group(mockTheme, { gap: GAP.NORMAL }, tracker.component);
    // g.getHeight = 2 + 0.5 = 2.5"
    // g.getMinHeight = 2"
    // budget = 0.5"

    // Verify height reporting
    approx(g.getHeight(10), 2.5, 'group natural height includes padding');
    approx(g.getMinHeight(10), 2, 'group min height excludes padding');

    // Now test actual compression in prepare
    // Give group only 2.25" (less than natural 2.5", more than min 2")
    g.prepare(new Bounds(0, 0, 10, 2.25));
    const inner = tracker.getBounds()!;

    // Should compress padding: excess = 2.25 - 2 = 0.25, rawVPad = 0.125
    // vPad = floor(0.125/0.125)*0.125 = 0.125, ratio = 0.5, hPad = 0.125
    approx(inner.y, 0.125, 'compressed vPad');
    approx(inner.h, 2, 'child gets min height');
  });

  test('GridColumn compresses group via fitHeights when space is tight', () => {
    // Setup: text (1") + group(row 2" with 0.5" padding) + text (1")
    // Natural = 1 + 2.5 + 1 = 4.5"
    // Min = 1 + 2 + 1 = 4" (group padding compresses)
    // Give 4.25" → should compress group by 0.25"

    const text1 = stub(1);
    const text2 = stub(1);
    const tracker = trackingStub(2, 2);
    const g = group(mockTheme, { gap: GAP.NORMAL }, tracker.component);

    // Create column WITH unit to enable snapping + compression
    const col = new GridColumn([text1, g, text2], undefined, 0, ALIGN.CENTER, undefined, undefined);

    // Verify column natural height
    approx(col.getHeight(10), 4.5, 'column natural height');
    approx(col.getMinHeight(10), 4, 'column min height');

    // Give tight bounds - should compress
    const slots = col.getSlots(new Bounds(0, 0, 10, 4.25));

    // text1 gets 1", group gets 2.25" (compressed from 2.5"), text2 gets 1"
    approx(slots[0].h, 1, 'text1 height');
    approx(slots[1].h, 2.25, 'group compressed height');
    approx(slots[2].h, 1, 'text2 height');
  });
});

// ============================================
// Grid mode
// ============================================

describe('Group grid mode', () => {
  test('grid mode creates single row for 3 items', () => {
    const c1 = stub(1), c2 = stub(1), c3 = stub(1);
    const g = group(mockTheme, 3, c1, c2, c3);
    // Grid mode returns raw grid structure (no auto-inset)
    const height = g.getHeight(10);
    approx(height, 1, 'height equals row height (no padding)');
  });

  test('grid mode creates multi-row for 6 items with 3 columns', () => {
    const items = Array.from({ length: 6 }, () => stub(1));
    const g = group(mockTheme, 3, ...items);
    // 2 rows of 3, with gap between rows (gap = 0.25")
    const height = g.getHeight(10);
    // 2 rows × 1" + 1 gap × 0.25" = 2.25"
    approx(height, 2.25, 'height spans 2 rows plus gap');
  });

  test('grid mode has no auto-inset', () => {
    const tracker = trackingStub(1);
    const g = group(mockTheme, 3, tracker.component, stub(1), stub(1));
    g.prepare(new Bounds(0, 0, 10, 4));
    const inner = tracker.getBounds()!;
    // No auto-inset, x should be 0
    approx(inner.x, 0, 'grid mode has no auto-inset');
  });

  test('grid mode with 2 columns creates 2x2 for 4 items', () => {
    const items = Array.from({ length: 4 }, () => stub(1));
    const g = group(mockTheme, 2, ...items);
    const height = g.getHeight(10);
    // 2 rows × 1" + 1 gap × 0.25" = 2.25"
    approx(height, 2.25, 'height spans 2 rows plus gap');
  });
});

// ============================================
// Edge cases
// ============================================

describe('Group edge cases', () => {
  test('zero padding requested (GAP.NONE)', () => {
    const tracker = trackingStub(2, 2);
    const g = group(mockTheme, { gap: GAP.NONE }, tracker.component);
    g.prepare(new Bounds(0, 0, 10, 4));
    const inner = tracker.getBounds()!;
    approx(inner.x, 0, 'no padding');
    approx(inner.y, 0, 'no padding');
    approx(inner.w, 10, 'full width');
    approx(inner.h, 4, 'full height');
  });

  test('compressible child affects minHeight', () => {
    const child = stub(4, 1); // natural 4", min 1"
    const g = group(mockTheme, { gap: GAP.NORMAL }, child);
    // getHeight uses natural: 4 + 0.5 = 4.5
    approx(g.getHeight(10), 4.5, 'natural height');
    // getMinHeight uses min: 1 (no padding)
    approx(g.getMinHeight(10), 1, 'min height excludes padding');
  });
});
