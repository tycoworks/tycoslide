// Box unit tests — validates Yoga layout, sizing, overflow detection, and layer inheritance
// Uses mock content components to avoid font loading / image dependencies

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { box } from '../src/core/box.js';
import { DIRECTION, LAYER, type Component, type Bounds } from '../src/core/types.js';
import { Canvas } from '../src/core/canvas.js';

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

const bounds: Bounds = { x: 0, y: 0, w: 10, h: 5 };

function approx(actual: number, expected: number, msg: string, tolerance = 0.01): void {
  assert.ok(Math.abs(actual - expected) < tolerance, `${msg}: expected ~${expected}, got ${actual}`);
}

// ============================================
// TESTS
// ============================================

describe('Box', () => {

  // ------------------------------------------
  // 1. Leaf node getMinimumHeight
  // ------------------------------------------
  test('leaf node returns content minimum height', () => {
    const b = box({ content: mockContent(1.5) });
    const h = b.getMinimumHeight(10);
    assert.strictEqual(h, 1.5);
  });

  // ------------------------------------------
  // 2. Container getMinimumHeight (column with gap)
  // ------------------------------------------
  test('column of two children sums heights plus gap', () => {
    const b = box({
      gap: 0.25,
      children: [
        box({ content: mockContent(1) }),
        box({ content: mockContent(2) }),
      ],
    });
    const h = b.getMinimumHeight(10);
    // 1 + 2 + 0.25 gap = 3.25
    assert.ok(Math.abs(h - 3.25) < 0.01, `Expected ~3.25, got ${h}`);
  });

  // ------------------------------------------
  // 3. Row vs column getMaximumHeight
  // ------------------------------------------
  test('row getMaximumHeight returns tallest child', () => {
    const b = box({
      direction: DIRECTION.ROW,
      children: [
        box({ content: mockContent(1, { maxH: 2 }) }),
        box({ content: mockContent(1, { maxH: 3 }) }),
      ],
    });
    assert.strictEqual(b.getMaximumHeight(10), 3);
  });

  test('column getMaximumHeight returns sum plus gaps', () => {
    const b = box({
      gap: 0.5,
      children: [
        box({ content: mockContent(1, { maxH: 2 }) }),
        box({ content: mockContent(1, { maxH: 3 }) }),
      ],
    });
    // 2 + 3 + 0.5 gap = 5.5
    assert.strictEqual(b.getMaximumHeight(10), 5.5);
  });

  // ------------------------------------------
  // 4. Flex spacer returns Infinity
  // ------------------------------------------
  test('empty box with flex returns Infinity for getMaximumHeight', () => {
    const b = box({ flex: 1 });
    assert.strictEqual(b.getMaximumHeight(10), Infinity);
  });

  // ------------------------------------------
  // 5. Overflow detection throws
  // ------------------------------------------
  test('vertical overflow throws with descriptive error', () => {
    // Two children each needing 3" in a 5" container = 6" total, triggers overflow
    const b = box({
      children: [
        box({ content: mockContent(3) }),
        box({ content: mockContent(3) }),
      ],
    });
    assert.throws(
      () => b.prepare({ x: 0, y: 0, w: 10, h: 5 }),
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
      getMinimumHeight: () => 1,
      getMaximumHeight: () => 1,
      getMinimumWidth: () => 0,
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
      getMinimumHeight: () => 1,
      getMaximumHeight: () => 1,
      getMinimumWidth: () => 0,
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
  // 7. Caching consistency: getMinimumHeight then prepare
  // ------------------------------------------
  test('getMinimumHeight then prepare with same width does not overflow', () => {
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
    const minH = b.getMinimumHeight(width);

    // prepare should not throw — if caching is broken, Yoga could
    // compute a slightly different height on a fresh tree, causing overflow
    assert.doesNotThrow(() => {
      b.prepare({ x: 0, y: 0, w: width, h: minH });
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

    const childBounds = b.getChildBounds({ x: 1, y: 2, w: 10, h: 3 });

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
    assert.deepStrictEqual(b.getChildBounds({ x: 0, y: 0, w: 10, h: 1 }), []);
  });

  // ------------------------------------------
  // 9. Explicit height pins both min and max
  // ------------------------------------------
  test('explicit height: getMinimumHeight returns height', () => {
    const b = box({ height: 3, content: mockContent(1) });
    approx(b.getMinimumHeight(10), 3, 'min height pinned to explicit height');
  });

  test('explicit height: getMaximumHeight returns height', () => {
    const b = box({ height: 3, content: mockContent(1, { maxH: 10 }) });
    assert.strictEqual(b.getMaximumHeight(10), 3);
  });

  test('height normalizes maxHeight (height wins over maxHeight)', () => {
    const b = box({ height: 5, maxHeight: 3, content: mockContent(1) });
    assert.strictEqual(b.getMaximumHeight(10), 5);
  });

  // ------------------------------------------
  // 10. maxHeight caps expansion
  // ------------------------------------------
  test('maxHeight caps getMaximumHeight', () => {
    const b = box({ maxHeight: 2, content: mockContent(1, { maxH: 10 }) });
    assert.strictEqual(b.getMaximumHeight(10), 2);
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
    const childBounds = b.getChildBounds({ x: 0, y: 0, w: 10, h: 10 });
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
    const childBounds = b.getChildBounds({ x: 0, y: 0, w: 10, h: 10 });
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
    const childBounds = b.getChildBounds({ x: 0, y: 0, w: 10, h: 10 });
    approx(childBounds[0].h, 3, 'capped child');
    approx(childBounds[1].h, 7, 'uncapped child gets remainder');
  });

});
