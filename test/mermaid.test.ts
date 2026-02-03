// Mermaid component tests — validates diagram rendering, sizing, and theme integration
// Note: These are integration tests that require @mermaid-js/mermaid-cli to be installed

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { existsSync } from 'node:fs';
import { Mermaid } from '../dist/components/mermaid.js';
import { DIRECTION, ALIGN, type Theme, Bounds } from '../dist/core/types.js';

// ============================================
// MOCK HELPERS
// ============================================

function mockTheme(minDisplayDPI = 96): Theme {
  return {
    spacing: { minDisplayDPI },
    colors: {
      background: '120E22',
      text: 'FFFFFF',
      primary: '7C5CD0',
      secondary: 'BDB0E0',
      accent1: '08F0D4',
      accent2: 'FB00E6',
    },
  } as any;
}

function approx(actual: number, expected: number, msg: string, tolerance = 0.01): void {
  assert.ok(Math.abs(actual - expected) < tolerance, `${msg}: expected ~${expected}, got ${actual}`);
}

/** Creates a simple mock canvas that captures addImage calls */
function mockCanvas(): { calls: any[]; canvas: any } {
  const calls: any[] = [];
  return {
    calls,
    canvas: { addImage: (opts: any) => calls.push(opts) },
  };
}

// Simple flowchart for testing
const SIMPLE_DIAGRAM = `flowchart LR
  A[Start] --> B[Process]
  B --> C[End]`;

// ============================================
// TESTS
// ============================================

describe('Mermaid', () => {

  // ------------------------------------------
  // 1. Constructor renders diagram and stores dimensions
  // ------------------------------------------
  test('constructor renders diagram to PNG with valid dimensions', () => {
    const mermaid = new Mermaid(mockTheme(), SIMPLE_DIAGRAM);

    assert.ok(mermaid.pixelWidth > 0, 'pixelWidth should be positive');
    assert.ok(mermaid.pixelHeight > 0, 'pixelHeight should be positive');
    assert.ok(mermaid.aspectRatio > 0, 'aspectRatio should be positive');
    approx(mermaid.aspectRatio, mermaid.pixelWidth / mermaid.pixelHeight, 'aspectRatio calculation');
  });

  // ------------------------------------------
  // 2. Constructor throws on invalid mermaid syntax
  // ------------------------------------------
  test('constructor throws on invalid mermaid syntax', () => {
    assert.throws(
      () => new Mermaid(mockTheme(), 'this is not valid mermaid syntax %%%'),
      /Mermaid rendering failed/,
    );
  });

  // ------------------------------------------
  // 3. getHeight returns natural height capped by DPI
  // ------------------------------------------
  test('getHeight returns natural height when under DPI cap', () => {
    const mermaid = new Mermaid(mockTheme(96), SIMPLE_DIAGRAM);
    const width = 4; // inches

    const height = mermaid.getHeight(width);
    const naturalHeight = width / mermaid.aspectRatio;
    const dpiCap = mermaid.pixelHeight / 96;

    // Should be min of natural height and DPI cap
    const expected = Math.min(naturalHeight, dpiCap);
    approx(height, expected, 'getHeight should respect DPI cap');
  });

  // ------------------------------------------
  // 4. getMinHeight returns 0 (fully compressible)
  // ------------------------------------------
  test('getMinHeight returns 0', () => {
    const mermaid = new Mermaid(mockTheme(), SIMPLE_DIAGRAM);
    assert.strictEqual(mermaid.getMinHeight(10), 0);
  });

  // ------------------------------------------
  // 5. getWidth returns width for given height
  // ------------------------------------------
  test('getWidth returns correct width for height', () => {
    const mermaid = new Mermaid(mockTheme(), SIMPLE_DIAGRAM);
    const height = 3;
    const width = mermaid.getWidth(height);
    approx(width, height * mermaid.aspectRatio, 'getWidth calculation');
  });

  // ------------------------------------------
  // 6. prepare returns drawer that adds image to canvas
  // ------------------------------------------
  test('prepare adds image to canvas centered in bounds', () => {
    const mermaid = new Mermaid(mockTheme(), SIMPLE_DIAGRAM);
    const bounds = new Bounds(1, 1, 6, 4);
    const { calls, canvas } = mockCanvas();

    const drawer = mermaid.prepare(bounds);
    drawer(canvas);

    assert.strictEqual(calls.length, 1, 'should add exactly one image');
    const call = calls[0];
    assert.ok(call.path, 'should have path');
    assert.ok(existsSync(call.path), 'rendered PNG should exist');
    assert.ok(call.x >= bounds.x, 'x should be within bounds');
    assert.ok(call.y >= bounds.y, 'y should be within bounds');
    assert.ok(call.w <= bounds.w, 'width should fit in bounds');
    assert.ok(call.h <= bounds.h, 'height should fit in bounds');
  });

  // ------------------------------------------
  // 7. prepare respects alignment context
  // ------------------------------------------
  test('prepare respects ALIGN.START in column context', () => {
    const mermaid = new Mermaid(mockTheme(), SIMPLE_DIAGRAM);
    const bounds = new Bounds(0, 0, 10, 8);
    const { calls, canvas } = mockCanvas();

    const drawer = mermaid.prepare(bounds, { direction: DIRECTION.COLUMN, align: ALIGN.START });
    drawer(canvas);

    assert.strictEqual(calls.length, 1);
    // In column context with ALIGN.START, image should be left-aligned (x near 0)
    approx(calls[0].x, 0, 'should be left-aligned', 0.1);
  });

  // ------------------------------------------
  // 8. scale prop affects output size
  // ------------------------------------------
  test('scale prop affects pixel dimensions', () => {
    const theme = mockTheme();
    const mermaid1 = new Mermaid(theme, SIMPLE_DIAGRAM, { scale: 1 });
    const mermaid2 = new Mermaid(theme, SIMPLE_DIAGRAM, { scale: 2 });

    // Scale 2 should produce roughly 2x the pixels
    const ratio = mermaid2.pixelWidth / mermaid1.pixelWidth;
    assert.ok(ratio > 1.5 && ratio < 2.5, `scale 2 should be ~2x larger, got ${ratio}x`);
  });

});
