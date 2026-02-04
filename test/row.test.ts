// RowLayout unit tests — validates flex-based row layout, proportional sizing, and gap handling
// Uses mock content components to avoid font loading / image dependencies

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { row, column } from '../src/core/layout.js';

import { ALIGN, DIRECTION, VALIGN, type Component, Bounds, type Theme, type AlignContext } from '../src/core/types.js';

// ============================================
// MOCK HELPERS
// ============================================

function mockTheme(gap = 0, gapSmall = 0): Theme {
  return { spacing: { gap, gapSmall } } as any;
}

const T = mockTheme();

function mockContent(h: number, opts?: { minW?: number }): Component {
  return {
    prepare: () => () => {},
    getHeight: () => h,
    getMinHeight: () => h,
    getWidth: () => opts?.minW ?? 0,
  };
}

/** Creates a component that records the bounds it receives in prepare() */
function trackingContent(h: number): { component: Component; bounds: Bounds[] } {
  const bounds: Bounds[] = [];
  return {
    bounds,
    component: {
      prepare: (b: Bounds) => { bounds.push(b); return () => {}; },
      getHeight: () => h,
      getMinHeight: () => h,
      getWidth: () => 0,
    },
  };
}

function approx(actual: number, expected: number, msg: string, tolerance = 0.1): void {
  assert.ok(Math.abs(actual - expected) < tolerance, `${msg}: expected ~${expected}, got ${actual}`);
}

/** Creates a component that records bounds and alignContext from prepare() */
function trackingContentWithAlign(h: number): {
  component: Component; bounds: Bounds[]; aligns: AlignContext[];
} {
  const bounds: Bounds[] = [];
  const aligns: AlignContext[] = [];
  return {
    bounds,
    aligns,
    component: {
      prepare: (b: Bounds, ac?: AlignContext) => {
        bounds.push(b);
        if (ac) aligns.push({ ...ac });
        return () => {};
      },
      getHeight: () => h,
      getMinHeight: () => h,
      getWidth: () => 0,
    },
  };
}

// ============================================
// TESTS
// ============================================

describe('RowLayout', () => {

  // ------------------------------------------
  // 1. Three equal children get equal widths
  // ------------------------------------------
  test('three equal children get equal widths', () => {
    const t1 = trackingContent(1);
    const t2 = trackingContent(1);
    const t3 = trackingContent(1);
    const r = row(T, t1.component, t2.component, t3.component);
    r.prepare(new Bounds(9, 5));
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
    r.prepare(new Bounds(10, 5));
    approx(t1.bounds[0].h, 5, 'child height');
  });

  // ------------------------------------------
  // 4. Proportional widths
  // ------------------------------------------
  test('proportional widths (1:2 split)', () => {
    const t1 = trackingContent(1);
    const t2 = trackingContent(1);
    const r = row(T, [1, 2], [t1.component, t2.component]);
    r.prepare(new Bounds(9, 5));
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
    r.prepare(new Bounds(10, 5));
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
    r.prepare(new Bounds(10, 5));
    // Both children should get equal width (5 each)
    approx(t1.bounds[0].w, 5, 'column child width');
    approx(t2.bounds[0].w, 5, 'plain child width');
  });

  // ------------------------------------------
  // 7. proportions give unequal sizing — [0, 1] makes first child content-sized
  // ------------------------------------------
  test('proportions [0, 1] in row makes first child content-sized', () => {
    // Content child with known minimum width
    const tContent = trackingContent(2);
    tContent.component.getWidth = () => 3;  // reports 3" content width

    const tFlex = trackingContent(1);

    // row([0, 1], [contentChild, flexChild])
    const r = row(T, [0, 1], [tContent.component, tFlex.component]);
    r.prepare(new Bounds(10, 5));

    // Content child should get its content width (~3), not half (5)
    approx(tContent.bounds[0].w, 3, 'content-sized child width');
    // Flex child should fill the remaining space (~7)
    approx(tFlex.bounds[0].w, 7, 'flex child width');
  });

  // ------------------------------------------
  // 7. height option on LayoutOptions
  // ------------------------------------------
  test('height option makes row exact height', () => {
    const r = row(T, { height: 2 }, mockContent(1), mockContent(1));
    approx(r.getHeight(10), 2, 'row intrinsic height pinned');
  });

  // ------------------------------------------
  // 9. Alignment context
  // ------------------------------------------
  test('alignment context defaults to ROW direction with CENTER vAlign', () => {
    const t1 = trackingContentWithAlign(1);
    const r = row(T, t1.component);
    r.prepare(new Bounds(10, 5));
    assert.strictEqual(t1.aligns[0].parentDirection, DIRECTION.ROW);
    assert.strictEqual(t1.aligns[0].vAlign, VALIGN.MIDDLE);
  });

  test('alignment context respects ALIGN.START option (vAlign TOP)', () => {
    const t1 = trackingContentWithAlign(1);
    const r = row(T, { align: ALIGN.START }, t1.component);
    r.prepare(new Bounds(10, 5));
    assert.strictEqual(t1.aligns[0].parentDirection, DIRECTION.ROW);
    assert.strictEqual(t1.aligns[0].vAlign, VALIGN.TOP);
  });

  test('alignment context respects ALIGN.END option (vAlign BOTTOM)', () => {
    const t1 = trackingContentWithAlign(1);
    const r = row(T, { align: ALIGN.END }, t1.component);
    r.prepare(new Bounds(10, 5));
    assert.strictEqual(t1.aligns[0].parentDirection, DIRECTION.ROW);
    assert.strictEqual(t1.aligns[0].vAlign, VALIGN.BOTTOM);
  });

});
