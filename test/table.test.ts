import { describe, it } from 'node:test';
import assert from 'node:assert';
import { table } from '../src/core/dsl.js';
import { NODE_TYPE, type TableNode } from '../src/core/nodes.js';
import { TEXT_STYLE } from '../src/core/types.js';
import { computeLayout } from '../src/layout/engine.js';
import { Bounds } from '../src/core/bounds.js';
import { mockTheme, mockMeasurer } from './mocks.js';

describe('Native Table', () => {
  const theme = mockTheme();
  const measurer = mockMeasurer({ lineHeight: 0.5, lines: 1 });

  describe('DSL function', () => {
    it('should create TableNode with correct type', () => {
      const node = table([
        ['A', 'B'],
        ['C', 'D'],
      ]);

      assert.strictEqual(node.type, NODE_TYPE.TABLE);
    });

    it('should normalize string cells to TableCellData', () => {
      const node = table([
        ['Name', 'Value'],
      ]);

      assert.strictEqual(node.rows.length, 1);
      assert.strictEqual(node.rows[0].length, 2);
      assert.deepStrictEqual(node.rows[0][0], { content: 'Name' });
      assert.deepStrictEqual(node.rows[0][1], { content: 'Value' });
    });

    it('should pass through TableCellData objects', () => {
      const node = table([
        [{ content: 'Header', fill: 'EEEEEE' }, { content: 'Value' }],
      ]);

      assert.strictEqual(node.rows[0][0].content, 'Header');
      assert.strictEqual(node.rows[0][0].fill, 'EEEEEE');
    });

    it('should apply props', () => {
      const node = table([
        ['A', 'B'],
      ], {
        headerRows: 1,
        columnWidths: [1, 2],
        style: { headerBackground: 'E0E0E0' },
      });

      assert.strictEqual(node.headerRows, 1);
      assert.deepStrictEqual(node.columnWidths, [1, 2]);
      assert.strictEqual(node.style?.headerBackground, 'E0E0E0');
    });
  });

  describe('Layout', () => {
    it('should compute layout with estimated height', () => {
      const node = table([
        ['Row 1'],
        ['Row 2'],
        ['Row 3'],
      ]);

      const bounds = new Bounds(1, 1, 8, 5);
      const positioned = computeLayout(node, bounds, theme, measurer);

      assert.strictEqual(positioned.x, 1);
      assert.strictEqual(positioned.y, 1);
      assert.strictEqual(positioned.width, 8);
      assert.ok(positioned.height > 0, 'Height should be positive');
    });

    it('should return 0 height for empty table', () => {
      const node = table([]);

      const bounds = new Bounds(1, 1, 8, 5);
      const positioned = computeLayout(node, bounds, theme, measurer);

      assert.strictEqual(positioned.height, 0);
    });

    it('should constrain height to bounds when overflow', () => {
      const node = table([
        ['Row 1'],
        ['Row 2'],
        ['Row 3'],
        ['Row 4'],
        ['Row 5'],
      ]);

      const bounds = new Bounds(1, 1, 8, 0.5); // Very small height
      const positioned = computeLayout(node, bounds, theme, measurer);

      assert.strictEqual(positioned.height, 0.5);
    });
  });

  describe('Style options', () => {
    it('should support borderStyle', () => {
      const node = table([['A']], {
        style: { borderStyle: 'horizontal' },
      });

      assert.strictEqual(node.style?.borderStyle, 'horizontal');
    });

    it('should support header styling', () => {
      const node = table([['Header'], ['Data']], {
        headerRows: 1,
        style: {
          headerBackground: 'E0E0E0',
          headerTextStyle: TEXT_STYLE.H2,
        },
      });

      assert.strictEqual(node.headerRows, 1);
      assert.strictEqual(node.style?.headerBackground, 'E0E0E0');
      assert.strictEqual(node.style?.headerTextStyle, TEXT_STYLE.H2);
    });

    it('should support cell styling', () => {
      const node = table([['A']], {
        style: {
          cellBackground: 'FFFFFF',
          cellPadding: 0.1,
        },
      });

      assert.strictEqual(node.style?.cellBackground, 'FFFFFF');
      assert.strictEqual(node.style?.cellPadding, 0.1);
    });
  });

  describe('Cell merging', () => {
    it('should support colspan', () => {
      const node = table([
        [{ content: 'Merged', colspan: 2 }],
        ['A', 'B'],
      ]);

      assert.strictEqual(node.rows[0][0].colspan, 2);
    });

    it('should support rowspan', () => {
      const node = table([
        [{ content: 'Merged', rowspan: 2 }, 'B'],
        ['C'],
      ]);

      assert.strictEqual(node.rows[0][0].rowspan, 2);
    });
  });
});
