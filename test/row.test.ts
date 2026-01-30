// RowLayout unit tests — validates flex-based row layout, proportional sizing, and gap handling
// Uses mock content components to avoid font loading / image dependencies

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { row, column } from '../src/core/layout.js';
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

describe('RowLayout', () => {

  // ------------------------------------------
  // 1. Row is content-sized by default (use expand() to stretch)
  // ------------------------------------------
  test('getMaximumHeight returns tallest child max (row is content-sized)', () => {
    const r = row(T, mockContent(1), mockContent(2), mockContent(1));
    assert.strictEqual(r.getMaximumHeight(10), 2);
  });

  // ------------------------------------------
  // 2. Three equal children get equal widths
  // ------------------------------------------
  test('three equal children get equal widths', () => {
    const t1 = trackingContent(1);
    const t2 = trackingContent(1);
    const t3 = trackingContent(1);
    const r = row(T, t1.component, t2.component, t3.component);
    r.prepare({ x: 0, y: 0, w: 9, h: 5 });
    approx(t1.bounds[0].w, 3, 'child 1 width');
    approx(t2.bounds[0].w, 3, 'child 2 width');
    approx(t3.bounds[0].w, 3, 'child 3 width');
  });

  // ------------------------------------------
  // 3. Children fill available height
  // ------------------------------------------
  test('children fill available height', () => {
    const t1 = trackingContent(1);
    const r = row(T, t1.component);
    r.prepare({ x: 0, y: 0, w: 10, h: 5 });
    approx(t1.bounds[0].h, 5, 'child height');
  });

  // ------------------------------------------
  // 4. Proportional widths
  // ------------------------------------------
  test('proportional widths (1:2 split)', () => {
    const t1 = trackingContent(1);
    const t2 = trackingContent(1);
    const r = row(T, [1, 2], [t1.component, t2.component]);
    r.prepare({ x: 0, y: 0, w: 9, h: 5 });
    approx(t1.bounds[0].w, 3, 'narrow child width');
    approx(t2.bounds[0].w, 6, 'wide child width');
  });

  // ------------------------------------------
  // 5. Gap reduces available width
  // ------------------------------------------
  test('gap reduces available content width', () => {
    const t1 = trackingContent(1);
    const t2 = trackingContent(1);
    const t3 = trackingContent(1);
    // gap=0.5 via theme.spacing.gap (GAP.NORMAL is default)
    const r = row(mockTheme(0.5), t1.component, t2.component, t3.component);
    // Total width 10, gap 0.5 × 2 = 1.0, remaining 9.0, each child 3.0
    r.prepare({ x: 0, y: 0, w: 10, h: 5 });
    approx(t1.bounds[0].w, 3, 'child 1 width with gap');
    approx(t2.bounds[0].w, 3, 'child 2 width with gap');
    approx(t3.bounds[0].w, 3, 'child 3 width with gap');
  });

  // ------------------------------------------
  // 6. Box children (e.g. column()) get equal flex like any other child
  // ------------------------------------------
  test('Box children (from column()) get equal width in row', () => {
    const t1 = trackingContent(1);
    const t2 = trackingContent(1);
    // column() returns Box — it must still get flex in the row
    const col = column(T, t1.component);
    const r = row(T, col, t2.component);
    r.prepare({ x: 0, y: 0, w: 10, h: 5 });
    // Both children should get equal width (5 each)
    approx(t1.bounds[0].w, 5, 'column child width');
    approx(t2.bounds[0].w, 5, 'plain child width');
  });

});
