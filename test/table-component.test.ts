import { describe, it } from 'node:test';
import assert from 'node:assert';
import { tableComponent } from '../src/components/table.js';
import { componentRegistry } from '../src/core/component-registry.js';
import { mockTheme, mockMeasurer } from './mocks.js';

describe('Table Component', () => {
  const theme = mockTheme();
  const measurer = mockMeasurer({ lineHeight: 0.5, lines: 1 });

  describe('registration', () => {
    it('should auto-register on import', () => {
      assert.ok(componentRegistry.has('table'));
    });
  });

  describe('tableComponent DSL function', () => {
    it('should create a component node with correct type', () => {
      const node = tableComponent({ data: [['A', 'B'], ['C', 'D']] });
      assert.strictEqual(node.type, 'component');
      assert.strictEqual(node.componentName, 'table');
    });

    it('should pass data in props', () => {
      const data = [['A', 'B'], ['C', 'D']];
      const node = tableComponent({ data });
      assert.deepStrictEqual(node.props.data, data);
    });

    it('should pass through optional props', () => {
      const node = tableComponent({
        data: [['A']],
        headerRow: true,
        headerBackground: '#E0E0E0',
        cellBackground: '#FFFFFF',
      });
      assert.strictEqual(node.props.headerRow, true);
      assert.strictEqual(node.props.headerBackground, '#E0E0E0');
      assert.strictEqual(node.props.cellBackground, '#FFFFFF');
    });
  });

  describe('expansion', () => {
    it('should expand to stack with grid lines and content', () => {
      const node = tableComponent({ data: [['A', 'B'], ['C', 'D']] });
      const expanded = componentRegistry.expand(node, { theme, measurer });

      assert.strictEqual(expanded.type, 'stack');
      assert.strictEqual(expanded.children.length, 2); // gridLines layer + content layer
    });

    it('should return empty column for empty data', () => {
      const node = tableComponent({ data: [] });
      const expanded = componentRegistry.expand(node, { theme, measurer });

      assert.strictEqual(expanded.type, 'column');
      assert.strictEqual(expanded.children.length, 0);
    });

    it('should create content rows with cells', () => {
      const node = tableComponent({ data: [['A', 'B'], ['C', 'D']] });
      const expanded = componentRegistry.expand(node, { theme, measurer });

      // Content is the second child (stack children: gridLines, content)
      const contentLayer = expanded.children[1];
      assert.strictEqual(contentLayer.type, 'column');
      assert.strictEqual(contentLayer.children.length, 2); // 2 rows

      // Each row should have 2 cells
      const firstRow = contentLayer.children[0];
      assert.strictEqual(firstRow.type, 'row');
      assert.strictEqual(firstRow.children.length, 2); // 2 columns (cells)
    });

    it('should wrap cells in column with padding', () => {
      const node = tableComponent({ data: [['A']] });
      const expanded = componentRegistry.expand(node, { theme, measurer });

      const contentLayer = expanded.children[1];
      const firstRow = contentLayer.children[0];
      const cellColumn = firstRow.children[0];

      assert.strictEqual(cellColumn.type, 'column');
      // No background = column with padding containing the text
      assert.strictEqual(cellColumn.children[0].type, 'column');
    });

    it('should create grid lines layer with stack', () => {
      const node = tableComponent({ data: [['A', 'B'], ['C', 'D']] });
      const expanded = componentRegistry.expand(node, { theme, measurer });

      // Grid lines is the first child
      const gridLinesLayer = expanded.children[0];
      assert.strictEqual(gridLinesLayer.type, 'stack');
      assert.strictEqual(gridLinesLayer.children.length, 2); // vertical lines row + horizontal lines column
    });
  });

  describe('styling options', () => {
    it('should apply header background when headerRow is true', () => {
      const node = tableComponent({
        data: [['Header'], ['Data']],
        headerRow: true,
        headerBackground: '#CCCCCC',
      });
      const expanded = componentRegistry.expand(node, { theme, measurer });

      const contentLayer = expanded.children[1];
      const headerRow = contentLayer.children[0];
      const cellColumn = headerRow.children[0];
      // With background: stack(rectangle, column with padding)
      const cellStack = cellColumn.children[0];
      const rect = cellStack.children[0];

      assert.strictEqual(rect.fill?.color, '#CCCCCC');
    });

    it('should apply cell background', () => {
      const node = tableComponent({
        data: [['Data']],
        cellBackground: '#FFFFFF',
      });
      const expanded = componentRegistry.expand(node, { theme, measurer });

      const contentLayer = expanded.children[1];
      const dataRow = contentLayer.children[0];
      const cellColumn = dataRow.children[0];
      // With background: stack(rectangle, column with padding)
      const cellStack = cellColumn.children[0];
      const rect = cellStack.children[0];

      assert.strictEqual(rect.fill?.color, '#FFFFFF');
    });

    it('should apply header column background', () => {
      const node = tableComponent({
        data: [['Row1', 'Data1'], ['Row2', 'Data2']],
        headerColumn: true,
        headerBackground: '#DDDDDD',
      });
      const expanded = componentRegistry.expand(node, { theme, measurer });

      const contentLayer = expanded.children[1];
      const firstRow = contentLayer.children[0];
      const headerCell = firstRow.children[0];
      // With background: stack(rectangle, column with padding)
      const headerStack = headerCell.children[0];
      const headerRect = headerStack.children[0];

      assert.strictEqual(headerRect.fill?.color, '#DDDDDD');

      // Second cell should not have header background (no fill = just column with padding)
      const dataCell = firstRow.children[1];
      const dataColumn = dataCell.children[0];
      // No background = column with padding, not a stack
      assert.strictEqual(dataColumn.type, 'column');
    });
  });
});
