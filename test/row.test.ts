// RowLayout unit tests — validates flex-based row layout, proportional sizing, and gap handling
// Uses mock content components to avoid font loading / image dependencies

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { RowLayout } from '../src/core/dsl.js';
import { ALIGN, type Component, type Bounds } from '../src/core/types.js';

// ============================================
// MOCK HELPERS
// ============================================

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
  // 1. Row expands to fill space (flex: 1)
  // ------------------------------------------
  test('getMaximumHeight returns Infinity (row expands to fill space)', () => {
    const r = new RowLayout(
      [mockContent(1), mockContent(1), mockContent(1)],
      [1, 1, 1],
      0,
      ALIGN.STRETCH,
      undefined,
    );
    assert.strictEqual(r.getMaximumHeight(10), Infinity);
  });

  // ------------------------------------------
  // 2. Three equal children get equal widths
  // ------------------------------------------
  test('three equal children get equal widths', () => {
    const t1 = trackingContent(1);
    const t2 = trackingContent(1);
    const t3 = trackingContent(1);
    const r = new RowLayout(
      [t1.component, t2.component, t3.component],
      [1, 1, 1],
      0,
      ALIGN.STRETCH,
      undefined,
    );
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
    const r = new RowLayout(
      [t1.component],
      [1],
      0,
      ALIGN.STRETCH,
      undefined,
    );
    r.prepare({ x: 0, y: 0, w: 10, h: 5 });
    approx(t1.bounds[0].h, 5, 'child height');
  });

  // ------------------------------------------
  // 4. Proportional widths
  // ------------------------------------------
  test('proportional widths (1:2 split)', () => {
    const t1 = trackingContent(1);
    const t2 = trackingContent(1);
    const r = new RowLayout(
      [t1.component, t2.component],
      [1, 2],
      0,
      ALIGN.STRETCH,
      undefined,
    );
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
    const r = new RowLayout(
      [t1.component, t2.component, t3.component],
      [1, 1, 1],
      0.5,
      ALIGN.STRETCH,
      undefined,
    );
    // Total width 10, gap 0.5 × 2 = 1.0, remaining 9.0, each child 3.0
    r.prepare({ x: 0, y: 0, w: 10, h: 5 });
    approx(t1.bounds[0].w, 3, 'child 1 width with gap');
    approx(t2.bounds[0].w, 3, 'child 2 width with gap');
    approx(t3.bounds[0].w, 3, 'child 3 width with gap');
  });

});
