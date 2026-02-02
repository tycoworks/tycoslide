// ColumnLayout unit tests — validates content-sized default, proportional heights, and flex
// Uses mock content components to avoid font loading / image dependencies

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { column } from '../src/core/layout.js';
import { expand } from '../src/core/box.js';
import { ALIGN, DIRECTION, type Component, Bounds, type Theme, type AlignContext } from '../src/core/types.js';

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
      getWidth: () => 0,
    },
  };
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
    col.prepare(new Bounds(10, 10));
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
    col.prepare(new Bounds(10, 9));
    approx(t1.bounds[0].h, 3, 'narrow child height');
    approx(t2.bounds[0].h, 6, 'tall child height');
  });

  // ------------------------------------------
  // 3. Children fill available width (stretch default)
  // ------------------------------------------
  test('children fill available width', () => {
    const t1 = trackingContent(1);
    const col = column(T, t1.component);
    col.prepare(new Bounds(10, 5));
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
    col.prepare(new Bounds(10, 10));
    approx(t1.bounds[0].h, 3, 'child 1 height with gap');
    approx(t2.bounds[0].h, 3, 'child 2 height with gap');
    approx(t3.bounds[0].h, 3, 'child 3 height with gap');
  });

  // ------------------------------------------
  // 5. expand() in column fills remaining space
  // ------------------------------------------
  test('expand() in column fills remaining space', () => {
    const tContent = trackingContent(1);
    const tExpand = trackingContent(1);
    const col = column(T, tContent.component, expand(tExpand.component));
    col.prepare(new Bounds(10, 5));
    approx(tContent.bounds[0].h, 1, 'content-sized child height');
    approx(tExpand.bounds[0].h, 4, 'expanded child fills remaining');
  });

  // ------------------------------------------
  // 8. Multiple expand() children split equally
  // ------------------------------------------
  test('multiple expand() children split remaining space equally', () => {
    const tContent = trackingContent(1);
    const tExpand1 = trackingContent(0.5);
    const tExpand2 = trackingContent(0.5);
    const col = column(T, tContent.component, expand(tExpand1.component), expand(tExpand2.component));
    col.prepare(new Bounds(10, 5));
    approx(tContent.bounds[0].h, 1, 'content-sized child');
    approx(tExpand1.bounds[0].h, 2, 'first expanded child');
    approx(tExpand2.bounds[0].h, 2, 'second expanded child');
  });

  // ------------------------------------------
  // 7. height option on LayoutOptions
  // ------------------------------------------
  test('height option makes column exact height', () => {
    const col = column(T, { height: 3 }, mockContent(1));
    approx(col.getHeight(10), 3, 'column intrinsic height pinned');
  });

  test('height option with expand: exact height, expanded child fills remainder', () => {
    const tContent = trackingContent(1);
    const tExpand = trackingContent(0.5);
    const col = column(T, { height: 4 }, tContent.component, expand(tExpand.component));
    col.prepare(new Bounds(10, 10));
    approx(tContent.bounds[0].h, 1, 'content-sized child');
    approx(tExpand.bounds[0].h, 3, 'expanded child fills remaining in fixed-height column');
  });

  // ------------------------------------------
  // 8. Alignment context
  // ------------------------------------------
  test('alignment context defaults to COLUMN direction with CENTER align', () => {
    const t1 = trackingContentWithAlign(1);
    const col = column(T, t1.component);
    col.prepare(new Bounds(10, 5));
    assert.strictEqual(t1.aligns[0].direction, DIRECTION.COLUMN);
    assert.strictEqual(t1.aligns[0].align, ALIGN.CENTER);
  });

  test('alignment context respects ALIGN.START option', () => {
    const t1 = trackingContentWithAlign(1);
    const col = column(T, { align: ALIGN.START }, t1.component);
    col.prepare(new Bounds(10, 5));
    assert.strictEqual(t1.aligns[0].direction, DIRECTION.COLUMN);
    assert.strictEqual(t1.aligns[0].align, ALIGN.START);
  });

  test('alignment context respects ALIGN.END option', () => {
    const t1 = trackingContentWithAlign(1);
    const col = column(T, { align: ALIGN.END }, t1.component);
    col.prepare(new Bounds(10, 5));
    assert.strictEqual(t1.aligns[0].direction, DIRECTION.COLUMN);
    assert.strictEqual(t1.aligns[0].align, ALIGN.END);
  });

});
