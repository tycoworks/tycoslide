// Bounds unit tests — validates constructor overloads, inset, and immutability

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { Bounds } from '../src/core/bounds.js';

function approx(actual: number, expected: number, msg: string, tolerance = 0.001): void {
  assert.ok(Math.abs(actual - expected) < tolerance, `${msg}: expected ~${expected}, got ${actual}`);
}

describe('Bounds', () => {
  // ============================================
  // CONSTRUCTOR: 4-arg (explicit position)
  // ============================================

  test('4-arg constructor sets x, y, w, h directly', () => {
    const b = new Bounds(1, 2, 3, 4);
    assert.strictEqual(b.x, 1);
    assert.strictEqual(b.y, 2);
    assert.strictEqual(b.w, 3);
    assert.strictEqual(b.h, 4);
  });

  // ============================================
  // CONSTRUCTOR: 2-arg (dimensions, no margin)
  // ============================================

  test('2-arg constructor sets origin to 0,0 with full dimensions', () => {
    const b = new Bounds(10, 7.5);
    assert.strictEqual(b.x, 0);
    assert.strictEqual(b.y, 0);
    assert.strictEqual(b.w, 10);
    assert.strictEqual(b.h, 7.5);
  });

  // ============================================
  // CONSTRUCTOR: 3-arg (dimensions + margin)
  // ============================================

  test('3-arg constructor applies margin as inset', () => {
    const b = new Bounds(10, 7.5, 0.5);
    approx(b.x, 0.5, 'x');
    approx(b.y, 0.5, 'y');
    approx(b.w, 9, 'w');    // 10 - 0.5 * 2
    approx(b.h, 6.5, 'h');  // 7.5 - 0.5 * 2
  });

  test('3-arg constructor with zero margin is same as 2-arg', () => {
    const a = new Bounds(10, 7.5);
    const b = new Bounds(10, 7.5, 0);
    assert.strictEqual(a.x, b.x);
    assert.strictEqual(a.y, b.y);
    assert.strictEqual(a.w, b.w);
    assert.strictEqual(a.h, b.h);
  });

  // ============================================
  // INSET
  // ============================================

  test('inset returns a new Bounds shrunk by padding', () => {
    const original = new Bounds(1, 1, 8, 6);
    const inset = original.inset(0.5);
    approx(inset.x, 1.5, 'x');
    approx(inset.y, 1.5, 'y');
    approx(inset.w, 7, 'w');
    approx(inset.h, 5, 'h');
  });

  test('inset does not mutate the original', () => {
    const original = new Bounds(1, 1, 8, 6);
    original.inset(0.5);
    assert.strictEqual(original.x, 1);
    assert.strictEqual(original.y, 1);
    assert.strictEqual(original.w, 8);
    assert.strictEqual(original.h, 6);
  });

  test('inset with zero padding returns equal bounds', () => {
    const original = new Bounds(1, 2, 3, 4);
    const same = original.inset(0);
    assert.strictEqual(same.x, original.x);
    assert.strictEqual(same.y, original.y);
    assert.strictEqual(same.w, original.w);
    assert.strictEqual(same.h, original.h);
  });

  test('chained insets accumulate correctly', () => {
    const b = new Bounds(0, 0, 10, 10).inset(1).inset(1);
    approx(b.x, 2, 'x');
    approx(b.y, 2, 'y');
    approx(b.w, 6, 'w');
    approx(b.h, 6, 'h');
  });

  // ============================================
  // OFFSET
  // ============================================

  test('offset translates position by dx/dy', () => {
    const original = new Bounds(1, 2, 8, 6);
    const moved = original.offset(3, 4);
    approx(moved.x, 4, 'x');
    approx(moved.y, 6, 'y');
    approx(moved.w, 8, 'w unchanged');
    approx(moved.h, 6, 'h unchanged');
  });

  test('offset does not mutate the original', () => {
    const original = new Bounds(1, 2, 8, 6);
    original.offset(3, 4);
    assert.strictEqual(original.x, 1);
    assert.strictEqual(original.y, 2);
  });

  test('offset with zero values returns equal bounds', () => {
    const original = new Bounds(1, 2, 3, 4);
    const same = original.offset(0, 0);
    assert.strictEqual(same.x, original.x);
    assert.strictEqual(same.y, original.y);
    assert.strictEqual(same.w, original.w);
    assert.strictEqual(same.h, original.h);
  });

  test('offset with negative values moves bounds up/left', () => {
    const b = new Bounds(5, 5, 2, 2).offset(-3, -2);
    approx(b.x, 2, 'x moved left');
    approx(b.y, 3, 'y moved up');
  });
});
