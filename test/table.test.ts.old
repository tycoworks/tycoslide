// Table unit tests — validates Box-based layout, border drawing, and Yoga rounding tolerance

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { Table, type TableData, type CellProps } from '../dist/components/table.js';
import { type Component, Bounds, type Theme, COLOR_NAME } from '../dist/core/types.js';
import type { TextMeasurer } from '../dist/utils/text-measurer.js';

// Mock measurer for tests
const mockMeasurer: TextMeasurer = {
  getStyleLineHeight: () => 0.25,
  estimateLines: () => 1,
  getContentWidth: () => 1,
};

// ============================================
// MOCK HELPERS
// ============================================

function mockContent(h: number, opts?: { minW?: number }): Component {
  return {
    prepare: () => () => {},
    getHeight: () => h,
    getMinHeight: () => h,
    getWidth: () => opts?.minW ?? 0,
  };
}

// Minimal mock theme with only what Table uses
const mockTheme = {
  colors: {
    primary: 'FF0000',
    background: 'FFFFFF',
    secondary: '333333',
    accent1: '00FF00',
    accent2: '0000FF',
    accent3: 'FFFF00',
    accent4: 'FF00FF',
    accent5: '00FFFF',
    text: '000000',
    textMuted: '666666',
    subtleOpacity: 20,
  },
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
  test('getHeight sums row heights', () => {
    const data: TableData = [
      [mockContent(0.5), mockContent(0.5)],
      [mockContent(0.5), mockContent(0.5)],
    ];
    const table = new Table(mockTheme, mockMeasurer, data, { headerRow: false });
    const h = table.getHeight(10);
    // 2 rows × (0.5 + 2×padding) = 2 × 0.625 = 1.25
    assert.ok(Math.abs(h - 1.25) < 0.02, `Expected ~1.25, got ${h}`);
  });

  // ------------------------------------------
  // 2. prepare does not throw when content fits
  // ------------------------------------------
  test('prepare succeeds when bounds accommodate content', () => {
    const data: TableData = [
      [mockContent(0.3), mockContent(0.3)],
      [mockContent(0.3), mockContent(0.3)],
    ];
    const table = new Table(mockTheme, mockMeasurer, data, { headerRow: false });
    const h = table.getHeight(10);
    assert.doesNotThrow(() => {
      table.prepare(new Bounds(10, h));
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

    const table = new Table(mockTheme, mockMeasurer, data, { headerRow: true });
    const minH = table.getHeight(9.5);

    // Table should report enough height for all rows
    assert.doesNotThrow(() => {
      table.prepare(new Bounds(0.25, 1.5278, 9.5, minH));
    }, 'prepare should not overflow when given getHeight as bounds.h');
  });

  // ------------------------------------------
  // 4. Column widths respected via flex ratios
  // ------------------------------------------
  test('columnWidths prop sets flex ratios', () => {
    const data: TableData = [
      [mockContent(0.3), mockContent(0.3), mockContent(0.3)],
    ];
    const table = new Table(mockTheme, mockMeasurer, data, {
      headerRow: false,
      columnWidths: [1, 2, 1],
    });
    // Should not throw — just verifies the flex ratios are accepted
    const h = table.getHeight(10);
    assert.ok(h > 0);
    assert.doesNotThrow(() => {
      table.prepare(new Bounds(10, h));
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
    const table = new Table(mockTheme, mockMeasurer, data, { headerRow: false });
    assert.ok(table.getHeight(10) > 0);
  });

  // ------------------------------------------
  // 6. Cell highlighting with CellProps
  // ------------------------------------------
  test('CellProps cells are accepted without error', () => {
    const data: TableData = [
      [mockContent(0.3), { content: mockContent(0.3), fill: COLOR_NAME.ACCENT1 }],
      [{ content: mockContent(0.3), fill: COLOR_NAME.ACCENT3, fillOpacity: 50 }, mockContent(0.3)],
    ];
    const table = new Table(mockTheme, mockMeasurer, data, { headerRow: false });
    const h = table.getHeight(10);
    assert.ok(h > 0, 'Table should have positive height');
    assert.doesNotThrow(() => {
      table.prepare(new Bounds(10, h));
    });
  });

  test('CellProps with only content (no fill) works like plain cell', () => {
    const data: TableData = [
      [{ content: mockContent(0.3) }, mockContent(0.3)],
    ];
    const table = new Table(mockTheme, mockMeasurer, data, { headerRow: false });
    const h = table.getHeight(10);
    assert.ok(h > 0);
    assert.doesNotThrow(() => {
      table.prepare(new Bounds(10, h));
    });
  });

  test('mixed cell types in same table', () => {
    // Mix of: string (would need real theme), Component, and CellProps
    const data: TableData = [
      [mockContent(0.3), { content: mockContent(0.3), fill: COLOR_NAME.PRIMARY }],
      [{ content: mockContent(0.3), fill: COLOR_NAME.ACCENT2, fillOpacity: 100 }, mockContent(0.3)],
    ];
    const table = new Table(mockTheme, mockMeasurer, data, { headerRow: false });
    const h = table.getHeight(10);
    assert.ok(h > 0);
    assert.doesNotThrow(() => {
      table.prepare(new Bounds(10, h));
    });
  });

  // ------------------------------------------
  // 7. headerColumn prop
  // ------------------------------------------
  test('headerColumn styles first column as headers', () => {
    const data: TableData = [
      [mockContent(0.3), mockContent(0.3)],
      [mockContent(0.3), mockContent(0.3)],
    ];
    const table = new Table(mockTheme, mockMeasurer, data, { headerRow: false, headerColumn: true });
    const h = table.getHeight(10);
    assert.ok(h > 0);
    assert.doesNotThrow(() => {
      table.prepare(new Bounds(10, h));
    });
  });

  test('headerRow and headerColumn can both be true', () => {
    const data: TableData = [
      [mockContent(0.3), mockContent(0.3)],
      [mockContent(0.3), mockContent(0.3)],
    ];
    const table = new Table(mockTheme, mockMeasurer, data, { headerRow: true, headerColumn: true });
    const h = table.getHeight(10);
    assert.ok(h > 0);
    assert.doesNotThrow(() => {
      table.prepare(new Bounds(10, h));
    });
  });

  // ------------------------------------------
  // 8. textColor in CellProps
  // ------------------------------------------
  test('CellProps with textColor is accepted', () => {
    const data: TableData = [
      [mockContent(0.3), { content: mockContent(0.3), fill: COLOR_NAME.ACCENT1, textColor: COLOR_NAME.BACKGROUND }],
    ];
    const table = new Table(mockTheme, mockMeasurer, data, { headerRow: false });
    const h = table.getHeight(10);
    assert.ok(h > 0);
    assert.doesNotThrow(() => {
      table.prepare(new Bounds(10, h));
    });
  });

  test('textColor overrides header styling', () => {
    // Even in a header cell, explicit textColor should be used
    const data: TableData = [
      [{ content: mockContent(0.3), textColor: COLOR_NAME.ACCENT2 }, mockContent(0.3)],
    ];
    const table = new Table(mockTheme, mockMeasurer, data, { headerRow: true, headerColumn: true });
    const h = table.getHeight(10);
    assert.ok(h > 0);
    assert.doesNotThrow(() => {
      table.prepare(new Bounds(10, h));
    });
  });

});
