// Box unit tests — validates Yoga layout, sizing, overflow detection, and layer inheritance
// Uses mock content components to avoid font loading / image dependencies

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { box } from '../src/core/box.js';
import { LAYER, type Component, Bounds } from '../src/core/types.js';
import { Canvas } from '../src/core/canvas.js';

// ============================================
// MOCK HELPERS
// ============================================

function mockContent(h: number, opts?: { minW?: number }): Component {
  return {
    prepare: () => () => {},
    getHeight: () => h,
    getWidth: () => opts?.minW ?? 0,
  };
}

const bounds = new Bounds(10, 5);

function approx(actual: number, expected: number, msg: string, tolerance = 0.01): void {
  assert.ok(Math.abs(actual - expected) < tolerance, `${msg}: expected ~${expected}, got ${actual}`);
}

// ============================================
// TESTS
// ============================================

describe('Box', () => {

  // ------------------------------------------
  // 1. Leaf node getHeight
  // ------------------------------------------
  test('leaf node returns content intrinsic height', () => {
    const b = box({ content: mockContent(1.5) });
    const h = b.getHeight(10);
    assert.strictEqual(h, 1.5);
  });

  // ------------------------------------------
  // 2. Container getHeight (column with gap)
  // ------------------------------------------
  test('column of two children sums heights plus gap', () => {
    const b = box({
      gap: 0.25,
      children: [
        box({ content: mockContent(1) }),
        box({ content: mockContent(2) }),
      ],
    });
    const h = b.getHeight(10);
    // 1 + 2 + 0.25 gap = 3.25
    assert.ok(Math.abs(h - 3.25) < 0.01, `Expected ~3.25, got ${h}`);
  });

  // ------------------------------------------
  // 5. Overflow detection throws
  // ------------------------------------------
  test('vertical overflow throws with descriptive error', () => {
    // Two children with explicit height (pinned, can't shrink) in a 5" container
    const b = box({
      children: [
        box({ height: 3, content: mockContent(3) }),
        box({ height: 3, content: mockContent(3) }),
      ],
    });
    assert.throws(
      () => b.prepare(new Bounds(10, 5)),
      (err: Error) => {
        assert.ok(err.message.includes('Vertical overflow'), `Expected "Vertical overflow", got: ${err.message}`);
        return true;
      },
    );
  });

  // ------------------------------------------
  // 6. Layer inheritance
  // ------------------------------------------
  test('child inherits parent layer', () => {
    const layers: string[] = [];
    const trackingContent: Component = {
      prepare: () => (canvas: any) => { layers.push(canvas.currentLayer); },
      getHeight: () => 1,
      getWidth: () => 0,
    };

    const b = box({
      layer: LAYER.MASTER,
      children: [box({ content: trackingContent })],
    });

    const canvas = new Canvas();
    const drawer = b.prepare(bounds);
    drawer(canvas);

    assert.strictEqual(layers[0], LAYER.MASTER);
  });

  test('child explicit layer overrides parent', () => {
    const layers: string[] = [];
    const trackingContent: Component = {
      prepare: () => (canvas: any) => { layers.push(canvas.currentLayer); },
      getHeight: () => 1,
      getWidth: () => 0,
    };

    const b = box({
      layer: LAYER.MASTER,
      children: [box({ layer: LAYER.SLIDE, content: trackingContent })],
    });

    const canvas = new Canvas();
    const drawer = b.prepare(bounds);
    drawer(canvas);

    assert.strictEqual(layers[0], LAYER.SLIDE);
  });

  // ------------------------------------------
  // 7. Caching consistency: getHeight then prepare
  // ------------------------------------------
  test('getHeight then prepare with same width does not overflow', () => {
    // Build a multi-level tree where Yoga rounding could produce
    // different results between independent builds
    const b = box({
      gap: 0.1,
      children: [
        box({ content: mockContent(0.7) }),
        box({ content: mockContent(0.8) }),
        box({ content: mockContent(0.9) }),
        box({ content: mockContent(0.6) }),
        box({ content: mockContent(0.5) }),
      ],
    });

    const width = 9.5;
    const minH = b.getHeight(width);

    // prepare should not throw — if caching is broken, Yoga could
    // compute a slightly different height on a fresh tree, causing overflow
    assert.doesNotThrow(() => {
      b.prepare(new Bounds(width, minH));
    });
  });

  // ------------------------------------------
  // 8. getChildBounds returns computed positions
  // ------------------------------------------
  test('getChildBounds returns correct positions for column children', () => {
    const b = box({
      children: [
        box({ content: mockContent(1) }),
        box({ content: mockContent(2) }),
      ],
    });

    const childBounds = b.getChildBounds(new Bounds(1, 2, 10, 3));

    assert.strictEqual(childBounds.length, 2);
    // First child at top of container
    assert.ok(Math.abs(childBounds[0].x - 1) < 0.01);
    assert.ok(Math.abs(childBounds[0].y - 2) < 0.01);
    assert.ok(Math.abs(childBounds[0].w - 10) < 0.01);
    assert.ok(Math.abs(childBounds[0].h - 1) < 0.01);
    // Second child below first
    assert.ok(Math.abs(childBounds[1].y - 3) < 0.01);
    assert.ok(Math.abs(childBounds[1].h - 2) < 0.01);
  });

  test('getChildBounds returns empty array for leaf node', () => {
    const b = box({ content: mockContent(1) });
    assert.deepStrictEqual(b.getChildBounds(new Bounds(10, 1)), []);
  });

  // ------------------------------------------
  // 9. Explicit height pins intrinsic height
  // ------------------------------------------
  test('explicit height: getHeight returns height', () => {
    const b = box({ height: 3, content: mockContent(1) });
    approx(b.getHeight(10), 3, 'intrinsic height pinned to explicit height');
  });

  // ------------------------------------------
  // 11. Height constraint in layout
  // ------------------------------------------
  test('height box gets exact height in column layout', () => {
    const b = box({
      children: [
        box({ height: 2, content: mockContent(1) }),
        box({ content: mockContent(1) }),
      ],
    });
    const childBounds = b.getChildBounds(new Bounds(10, 10));
    approx(childBounds[0].h, 2, 'fixed-height child');
    approx(childBounds[1].h, 1, 'content-sized child');
  });

  test('height box does not expand beyond explicit height', () => {
    const b = box({
      children: [
        box({ height: 2, content: mockContent(1) }),
        box({ flex: 1 }),
      ],
    });
    const childBounds = b.getChildBounds(new Bounds(10, 10));
    approx(childBounds[0].h, 2, 'height-constrained child');
    approx(childBounds[1].h, 8, 'flex spacer fills rest');
  });

  test('maxHeight caps flex child, remainder redistributed', () => {
    const b = box({
      children: [
        box({ flex: 1, maxHeight: 3, content: mockContent(1) }),
        box({ flex: 1, content: mockContent(1) }),
      ],
    });
    const childBounds = b.getChildBounds(new Bounds(10, 10));
    approx(childBounds[0].h, 3, 'capped child');
    approx(childBounds[1].h, 7, 'uncapped child gets remainder');
  });

  // ------------------------------------------
  // 12. CSS-like defaults: children shrink to fit
  // ------------------------------------------
  test('unpinned children shrink when content exceeds container', () => {
    // Two children each reporting getHeight=3, but container is only 5" tall.
    // With flex-shrink:1 and min-height:0, they should shrink to fit (not overflow).
    const b = box({
      children: [
        box({ content: mockContent(3) }),
        box({ content: mockContent(3) }),
      ],
    });
    assert.doesNotThrow(() => {
      b.prepare(new Bounds(10, 5));
    }, 'unpinned children should shrink to fit container');

    const childBounds = b.getChildBounds(new Bounds(10, 5));
    approx(childBounds[0].h, 2.5, 'first child shrinks to half container');
    approx(childBounds[1].h, 2.5, 'second child shrinks to half container');
  });

  test('flexShrink:0 protects child from shrinkage, sibling absorbs all', () => {
    // Image (3") + text (1") in 3" container. Text has flexShrink:0.
    // Image should absorb all 1" of shrinkage → image=2", text=1".
    const b = box({
      children: [
        box({ content: mockContent(3) }),                  // image: default shrink
        box({ flexShrink: 0, content: mockContent(1) }),   // text: won't shrink
      ],
    });
    const childBounds = b.getChildBounds(new Bounds(10, 3));
    approx(childBounds[0].h, 2, 'shrinkable child absorbs all shrinkage');
    approx(childBounds[1].h, 1, 'flexShrink:0 child stays at content height');
  });

  test('pinned children overflow when content exceeds container', () => {
    // Same scenario but with explicit height — children can't shrink, so overflow.
    const b = box({
      children: [
        box({ height: 3, content: mockContent(3) }),
        box({ height: 3, content: mockContent(3) }),
      ],
    });
    assert.throws(
      () => b.prepare(new Bounds(10, 5)),
      (err: Error) => err.message.includes('Vertical overflow'),
      'pinned children should overflow',
    );
  });

});
