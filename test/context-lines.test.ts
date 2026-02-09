import { describe, it } from 'node:test';
import assert from 'node:assert';
import { row, column, line, text } from '../src/core/dsl.js';
import { computeLayout, getNodeHeight } from '../src/layout/engine.js';
import { Bounds } from '../src/core/bounds.js';
import { mockTheme, mockMeasurer } from './mocks.js';
import { ptToIn } from '../src/utils/text.js';

const theme = mockTheme();
const measurer = mockMeasurer();

describe('Context-Aware Lines', () => {
  describe('line in Column (horizontal)', () => {
    it('should render horizontal line spanning column width', () => {
      const col = column(
        text('Above'),
        line(),
        text('Below')
      );

      const bounds = new Bounds(0, 0, 5, 3);
      const positioned = computeLayout(col, bounds, theme, measurer);

      // Find the line child
      const lineChild = positioned.children?.find(c => c.node.type === 'line');
      assert.ok(lineChild, 'line child should exist');

      // Horizontal line: width = column width, height = stroke
      assert.strictEqual(lineChild.width, 5, 'horizontal line should span column width');
      const strokeHeight = ptToIn(theme.borders.width);
      assert.ok(lineChild.height <= strokeHeight * 1.1, 'horizontal line height should be stroke width');
    });

    it('should have minimal height in getNodeHeight', () => {
      const lineNode = line();
      const height = getNodeHeight(lineNode, 5, theme, measurer);
      const strokeHeight = ptToIn(theme.borders.width);
      assert.strictEqual(height, strokeHeight, 'line intrinsic height should be stroke width');
    });
  });

  describe('line in Row (vertical)', () => {
    it('should render vertical line spanning row height', () => {
      const r = row(
        text('Left'),
        line(),
        text('Right')
      );

      const bounds = new Bounds(0, 0, 6, 2);
      const positioned = computeLayout(r, bounds, theme, measurer);

      // Find the line child
      const lineChild = positioned.children?.find(c => c.node.type === 'line');
      assert.ok(lineChild, 'line child should exist');

      // Vertical line: width = stroke, height = row height
      const strokeWidth = ptToIn(theme.borders.width);
      assert.ok(lineChild.width <= strokeWidth * 1.1, 'vertical line width should be stroke width');
      assert.strictEqual(lineChild.height, positioned.height, 'vertical line should span row height');
    });

    it('should not contribute significantly to row height', () => {
      // Row height is max of children heights
      // Line has minimal height, so row height should be determined by text
      const r1 = row(text('Text'));
      const r2 = row(text('Text'), line());

      const bounds = new Bounds(0, 0, 6, 0);
      const h1 = getNodeHeight(r1, 6, theme, measurer);
      const h2 = getNodeHeight(r2, 6, theme, measurer);

      // Heights should be the same (line doesn't add height)
      assert.strictEqual(h1, h2, 'line should not increase row height');
    });
  });

  describe('nested containers', () => {
    it('should reset direction context in nested column', () => {
      // Line in column inside row should be horizontal
      const r = row(
        column(
          text('Top'),
          line(),
          text('Bottom')
        ),
        text('Right side')
      );

      const bounds = new Bounds(0, 0, 6, 3);
      const positioned = computeLayout(r, bounds, theme, measurer);

      // Find the column child, then find the line inside it
      const colChild = positioned.children?.find(c => c.node.type === 'column');
      assert.ok(colChild, 'column child should exist');

      const lineChild = colChild.children?.find(c => c.node.type === 'line');
      assert.ok(lineChild, 'line inside column should exist');

      // Line should be horizontal (width > height)
      assert.ok(lineChild.width > lineChild.height, 'line in nested column should be horizontal');
    });

    it('should reset direction context in nested row', () => {
      // Line in row inside column should be vertical
      const col = column(
        text('Top'),
        row(
          text('Left'),
          line(),
          text('Right')
        ),
        text('Bottom')
      );

      const bounds = new Bounds(0, 0, 6, 4);
      const positioned = computeLayout(col, bounds, theme, measurer);

      // Find the row child, then find the line inside it
      const rowChild = positioned.children?.find(c => c.node.type === 'row');
      assert.ok(rowChild, 'row child should exist');

      const lineChild = rowChild.children?.find(c => c.node.type === 'line');
      assert.ok(lineChild, 'line inside row should exist');

      // Line should be vertical (height > width)
      assert.ok(lineChild.height > lineChild.width, 'line in nested row should be vertical');
    });
  });

  describe('line properties', () => {
    it('should preserve line color prop', () => {
      const lineNode = line({ color: '#FF0000' });
      assert.strictEqual(lineNode.color, '#FF0000');
    });

    it('should preserve line width prop', () => {
      const lineNode = line({ width: 2 });
      assert.strictEqual(lineNode.width, 2);
    });
  });
});
