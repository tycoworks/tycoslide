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

});
