// ColumnLayout unit tests — validates content-sized default, proportional heights, and flex
// Uses mock content components to avoid font loading / image dependencies

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { column } from '../src/core/layout.js';
import { type Component, type Bounds, type Theme } from '../src/core/types.js';

// ============================================
// MOCK HELPERS
// ============================================

function mockTheme(gap = 0, gapSmall = 0): Theme {
  return { spacing: { gap, gapSmall } } as any;
}

const T = mockTheme();

function mockContent(minH: number, opts?: { maxH?: number; minW?: number }): Component {
  return {
    prepare: () => () => {},
    getMinimumHeight: () => minH,
    getMaximumHeight: () => opts?.maxH ?? minH,
    getMinimumWidth: () => opts?.minW ?? 0,
  };
}

/** Creates a component that records the bounds it receives in prepare() */
function trackingContent(minH: number, opts?: { maxH?: number }): { component: Component; bounds: Bounds[] } {
  const bounds: Bounds[] = [];
  return {
    bounds,
    component: {
      prepare: (b: Bounds) => { bounds.push({ ...b }); return () => {}; },
      getMinimumHeight: () => minH,
      getMaximumHeight: () => opts?.maxH ?? minH,
      getMinimumWidth: () => 0,
    },
  };
}

function approx(actual: number, expected: number, msg: string, tolerance = 0.1): void {
  assert.ok(Math.abs(actual - expected) < tolerance, `${msg}: expected ~${expected}, got ${actual}`);
}

// ============================================
// TESTS
// ============================================

describe('ColumnLayout', () => {

  // ------------------------------------------
  // 1. Content-sized default: children stack at natural heights
  // ------------------------------------------
  test('children are content-sized by default (no proportions)', () => {
    const t1 = trackingContent(1);
    const t2 = trackingContent(2);
    const col = column(T, t1.component, t2.component);
    col.prepare({ x: 0, y: 0, w: 10, h: 10 });
    approx(t1.bounds[0].h, 1, 'child 1 height (content-sized)');
    approx(t2.bounds[0].h, 2, 'child 2 height (content-sized)');
  });

  // ------------------------------------------
  // 2. Proportional heights
  // ------------------------------------------
  test('proportional heights (1:2 split)', () => {
    const t1 = trackingContent(1);
    const t2 = trackingContent(1);
    const col = column(T, [1, 2], [t1.component, t2.component]);
    col.prepare({ x: 0, y: 0, w: 10, h: 9 });
    approx(t1.bounds[0].h, 3, 'narrow child height');
    approx(t2.bounds[0].h, 6, 'tall child height');
  });

  // ------------------------------------------
  // 3. Children fill available width (stretch default)
  // ------------------------------------------
  test('children fill available width', () => {
    const t1 = trackingContent(1);
    const col = column(T, t1.component);
    col.prepare({ x: 0, y: 0, w: 10, h: 5 });
    approx(t1.bounds[0].w, 10, 'child width');
  });

  // ------------------------------------------
  // 4. Gap reduces available height for proportional
  // ------------------------------------------
  test('gap reduces available height for proportional children', () => {
    const t1 = trackingContent(1);
    const t2 = trackingContent(1);
    const t3 = trackingContent(1);
    // gap=0.5 via theme.spacing.gap (GAP.NORMAL is default)
    const col = column(mockTheme(0.5), [1, 1, 1], [t1.component, t2.component, t3.component]);
    // Total height 10, gap 0.5 × 2 = 1.0, remaining 9.0, each child 3.0
    col.prepare({ x: 0, y: 0, w: 10, h: 10 });
    approx(t1.bounds[0].h, 3, 'child 1 height with gap');
    approx(t2.bounds[0].h, 3, 'child 2 height with gap');
    approx(t3.bounds[0].h, 3, 'child 3 height with gap');
  });

  // ------------------------------------------
  // 5. getMaximumHeight sums children for content-sized
  // ------------------------------------------
  test('getMaximumHeight sums child max heights (content-sized)', () => {
    const col = column(T, mockContent(1, { maxH: 3 }), mockContent(2, { maxH: 4 }));
    assert.strictEqual(col.getMaximumHeight(10), 7);
  });

  // ------------------------------------------
  // 6. Proportional column getMaximumHeight sums content max heights
  //    (flex children still report their content's max, not Infinity)
  // ------------------------------------------
  test('getMaximumHeight sums content max heights for proportional column', () => {
    const col = column(T, [1, 1], [mockContent(1, { maxH: 3 }), mockContent(1, { maxH: 4 })]);
    assert.strictEqual(col.getMaximumHeight(10), 7);
  });

});
