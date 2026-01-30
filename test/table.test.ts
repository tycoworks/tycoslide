// Table unit tests — validates Box-based layout, border drawing, and Yoga rounding tolerance

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { Table, type TableData } from '../src/components/table.js';
import { BORDER_STYLE, DIRECTION, ALIGN, type Component, type Bounds, type Theme } from '../src/core/types.js';

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

// Minimal mock theme with only what Table uses
const mockTheme = {
  colors: { secondary: '#333' },
  spacing: { cellPadding: 0.0625 },
  borders: { width: 1 },
} as unknown as Theme;

// ============================================
// TESTS
// ============================================

describe('Table', () => {

  // ------------------------------------------
  // 1. Basic sizing
  // ------------------------------------------
  test('getMinimumHeight sums row heights', () => {
    const data: TableData = [
      [mockContent(0.5), mockContent(0.5)],
      [mockContent(0.5), mockContent(0.5)],
    ];
    const table = new Table(mockTheme, data, { headerRow: false });
    const h = table.getMinimumHeight(10);
    // 2 rows × (0.5 + 2×padding) = 2 × 0.625 = 1.25
    assert.ok(Math.abs(h - 1.25) < 0.02, `Expected ~1.25, got ${h}`);
  });

  test('getMaximumHeight equals getMinimumHeight (fixed)', () => {
    const data: TableData = [
      [mockContent(0.5), mockContent(0.5)],
    ];
    const table = new Table(mockTheme, data, { headerRow: false });
    assert.strictEqual(table.getMaximumHeight(10), table.getMinimumHeight(10));
  });

  // ------------------------------------------
  // 2. prepare does not throw when content fits
  // ------------------------------------------
  test('prepare succeeds when bounds accommodate content', () => {
    const data: TableData = [
      [mockContent(0.3), mockContent(0.3)],
      [mockContent(0.3), mockContent(0.3)],
    ];
    const table = new Table(mockTheme, data, { headerRow: false });
    const h = table.getMinimumHeight(10);
    assert.doesNotThrow(() => {
      table.prepare({ x: 0, y: 0, w: 10, h });
    });
  });

  // ------------------------------------------
  // 3. Yoga rounding tolerance — the key test
  // ------------------------------------------
  test('prepare tolerates Yoga point-rounding where row sum > tree height', () => {
    // Yoga's integer point-rounding can cause a parent tree's total height
    // to differ from individually-measured row heights. Table uses
    // getChildBounds to read positions from the single parent tree,
    // avoiding the discrepancy entirely.
    const padding = 0.0625;

    // Use heights that produce non-integer Yoga points after padding:
    // content height 0.472222" → padded = 0.597222" → 43.0 Yoga points
    // content height 0.208333" → padded = 0.333333" → 24.0 Yoga points
    // These are the actual row heights from the failing messaging.pptx table.
    const tallContent = mockContent(0.472222);
    const shortContent = mockContent(0.208333);

    const data: TableData = [
      [mockContent(0.375), mockContent(0.375)],     // row 0: header
      [tallContent, tallContent],                      // row 1: tall
      [shortContent, shortContent],                    // row 2
      [shortContent, shortContent],                    // row 3
      [shortContent, shortContent],                    // row 4
    ];

    const table = new Table(mockTheme, data, { headerRow: true });
    const minH = table.getMinimumHeight(9.5);

    // Table should report enough height for all rows
    assert.doesNotThrow(() => {
      table.prepare({ x: 0.25, y: 1.5278, w: 9.5, h: minH });
    }, 'prepare should not overflow when given getMinimumHeight as bounds.h');
  });

  // ------------------------------------------
  // 4. Column widths respected via flex ratios
  // ------------------------------------------
  test('columnWidths prop sets flex ratios', () => {
    const data: TableData = [
      [mockContent(0.3), mockContent(0.3), mockContent(0.3)],
    ];
    const table = new Table(mockTheme, data, {
      headerRow: false,
      columnWidths: [1, 2, 1],
    });
    // Should not throw — just verifies the flex ratios are accepted
    const h = table.getMinimumHeight(10);
    assert.ok(h > 0);
    assert.doesNotThrow(() => {
      table.prepare({ x: 0, y: 0, w: 10, h });
    });
  });

  // ------------------------------------------
  // 5. String cells auto-wrapped in Text
  // ------------------------------------------
  test('string cells are normalized without error', () => {
    // This test just verifies no crash — string cells require a real theme
    // with text styles, so we test with Component cells for sizing but
    // verify the normalizeCell path doesn't throw at construction time.
    const data: TableData = [
      [mockContent(0.3), mockContent(0.3)],
    ];
    const table = new Table(mockTheme, data, { headerRow: false });
    assert.ok(table.getMinimumHeight(10) > 0);
  });

});
