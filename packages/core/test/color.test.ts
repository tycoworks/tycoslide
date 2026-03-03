import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { hexToRgba, bgColor } from '../src/utils/color.js';

describe('hexToRgba', () => {
  test('converts a standard hex color with full opacity', () => {
    assert.strictEqual(hexToRgba('FF0000', 1), 'rgba(255,0,0,1)');
  });

  test('converts a standard hex color with zero opacity', () => {
    assert.strictEqual(hexToRgba('FF0000', 0), 'rgba(255,0,0,0)');
  });

  test('converts a hex color with fractional opacity', () => {
    assert.strictEqual(hexToRgba('FF0000', 0.5), 'rgba(255,0,0,0.5)');
  });

  test('handles single-digit RGB components (zero-padded hex)', () => {
    assert.strictEqual(hexToRgba('010203', 1), 'rgba(1,2,3,1)');
  });

  test('converts blue channel correctly', () => {
    assert.strictEqual(hexToRgba('0000FF', 1), 'rgba(0,0,255,1)');
  });

  test('converts mixed color', () => {
    assert.strictEqual(hexToRgba('1A2B3C', 0.75), 'rgba(26,43,60,0.75)');
  });
});

describe('bgColor', () => {
  test('returns hex string when opacity is 100', () => {
    assert.strictEqual(bgColor('FF0000', 100), '#FF0000');
  });

  test('returns hex string with lowercase hex input when opacity is 100', () => {
    assert.strictEqual(bgColor('aabbcc', 100), '#aabbcc');
  });

  test('returns rgba string when opacity is less than 100', () => {
    assert.strictEqual(bgColor('FF0000', 50), 'rgba(255,0,0,0.5)');
  });

  test('returns rgba string when opacity is 0', () => {
    assert.strictEqual(bgColor('FF0000', 0), 'rgba(255,0,0,0)');
  });

  test('returns rgba string when opacity is 1 (near-transparent)', () => {
    assert.strictEqual(bgColor('0000FF', 1), 'rgba(0,0,255,0.01)');
  });

  test('returns rgba string when opacity is 99', () => {
    assert.strictEqual(bgColor('FFFFFF', 99), 'rgba(255,255,255,0.99)');
  });
});
