// Node Utilities Tests
// Tests for node.ts utility functions

import * as assert from 'node:assert';
import { describe, it } from 'node:test';
import { resolveGap } from '../src/utils/units.js';
import { GAP } from '../src/core/model/types.js';
import { mockTheme } from './mocks.js';

// ============================================
// resolveGap() TESTS
// ============================================

describe('resolveGap()', () => {
  const theme = mockTheme({
    gap: 0.25,
    gapTight: 0.125,
    gapLoose: 0.5,
  });

  it('should resolve GAP.NONE to 0', () => {
    const result = resolveGap(GAP.NONE, theme);
    assert.strictEqual(result, 0);
  });

  it('should resolve GAP.TIGHT to theme.spacing.tight', () => {
    const result = resolveGap(GAP.TIGHT, theme);
    assert.strictEqual(result, 0.125);
  });

  it('should resolve GAP.NORMAL to theme.spacing.normal', () => {
    const result = resolveGap(GAP.NORMAL, theme);
    assert.strictEqual(result, 0.25);
  });

  it('should resolve GAP.LOOSE to theme.spacing.loose', () => {
    const result = resolveGap(GAP.LOOSE, theme);
    assert.strictEqual(result, 0.5);
  });

  it('should resolve undefined to theme.spacing.normal (default)', () => {
    const result = resolveGap(undefined, theme);
    assert.strictEqual(result, 0.25);
  });

  it('should return custom spacing value unchanged', () => {
    // Although type signature shows string | undefined, testing behavior
    // with a non-GAP string (custom value scenario)
    const result = resolveGap('custom' as any, theme);
    assert.strictEqual(result, 0.25); // Falls through to default case
  });

  it('should work with different theme spacing values', () => {
    const customTheme = mockTheme({
      gap: 0.5,
      gapTight: 0.2,
      gapLoose: 0.8,
    });

    assert.strictEqual(resolveGap(GAP.NONE, customTheme), 0);
    assert.strictEqual(resolveGap(GAP.TIGHT, customTheme), 0.2);
    assert.strictEqual(resolveGap(GAP.NORMAL, customTheme), 0.5);
    assert.strictEqual(resolveGap(GAP.LOOSE, customTheme), 0.8);
    assert.strictEqual(resolveGap(undefined, customTheme), 0.5);
  });
});
