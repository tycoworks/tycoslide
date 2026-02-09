import { describe, it } from 'node:test';
import assert from 'node:assert';
import { stack, row, column, text, line, rectangle } from '../src/core/dsl.js';
import { computeLayout, getNodeHeight, getMinNodeHeight } from '../src/layout/engine.js';
import { Bounds } from '../src/core/bounds.js';
import { mockTheme, mockMeasurer } from './mocks.js';
import { NODE_TYPE } from '../src/core/nodes.js';

const theme = mockTheme();
const measurer = mockMeasurer();

describe('Stack Node', () => {
  describe('DSL', () => {
    it('should create a stack with children', () => {
      const s = stack(text('A'), text('B'), text('C'));
      assert.strictEqual(s.type, NODE_TYPE.STACK);
      assert.strictEqual(s.children.length, 3);
    });

    it('should create an empty stack', () => {
      const s = stack();
      assert.strictEqual(s.type, NODE_TYPE.STACK);
      assert.strictEqual(s.children.length, 0);
    });
  });

  describe('getNodeHeight', () => {
    it('should return max height of children (they overlap)', () => {
      // Create a stack with children of different heights
      const child1 = text('Single line');  // 1 line = 0.25
      const child2 = column(text('Line 1'), text('Line 2'));  // 2 lines + gap

      const height1 = getNodeHeight(child1, 5, theme, measurer);
      const height2 = getNodeHeight(child2, 5, theme, measurer);

      const s = stack(child1, child2);
      const stackHeight = getNodeHeight(s, 5, theme, measurer);

      // Stack height should be max of children, not sum
      assert.strictEqual(stackHeight, Math.max(height1, height2));
      assert.ok(stackHeight < height1 + height2, 'stack should not sum heights');
    });

    it('should return 0 for empty stack', () => {
      const s = stack();
      const height = getNodeHeight(s, 5, theme, measurer);
      assert.strictEqual(height, 0);
    });
  });

  describe('getMinNodeHeight', () => {
    it('should return max min height of children', () => {
      const child1 = text('Short');
      const child2 = column(text('Line 1'), text('Line 2'));

      const min1 = getMinNodeHeight(child1, 5, theme, measurer);
      const min2 = getMinNodeHeight(child2, 5, theme, measurer);

      const s = stack(child1, child2);
      const stackMin = getMinNodeHeight(s, 5, theme, measurer);

      // Stack min height should be max of children min heights
      assert.strictEqual(stackMin, Math.max(min1, min2));
    });
  });

  describe('computeLayout', () => {
    it('should position all children at the same bounds', () => {
      const s = stack(
        text('Background'),
        text('Foreground')
      );

      const bounds = new Bounds(1, 2, 4, 3);
      const positioned = computeLayout(s, bounds, theme, measurer);

      assert.strictEqual(positioned.x, 1);
      assert.strictEqual(positioned.y, 2);
      assert.strictEqual(positioned.width, 4);
      assert.strictEqual(positioned.children?.length, 2);

      // Both children should have the same position
      const child1 = positioned.children![0];
      const child2 = positioned.children![1];

      assert.strictEqual(child1.x, child2.x);
      assert.strictEqual(child1.y, child2.y);
      assert.strictEqual(child1.width, child2.width);
    });

    it('should use bounds height when constrained', () => {
      const s = stack(text('A'), text('B'));

      const bounds = new Bounds(0, 0, 5, 2);
      const positioned = computeLayout(s, bounds, theme, measurer);

      // Height should be constrained to bounds.h
      assert.ok(positioned.height <= 2);
    });

    it('should work with nested containers', () => {
      // Classic z-order use case: grid lines behind content
      const s = stack(
        // Layer 0: vertical dividers (rendered first = behind)
        row(column(), line(), column()),
        // Layer 1: content (rendered last = in front)
        column(text('Cell content'))
      );

      const bounds = new Bounds(0, 0, 6, 4);
      const positioned = computeLayout(s, bounds, theme, measurer);

      assert.strictEqual(positioned.children?.length, 2);
      // First child is the row (background)
      assert.strictEqual(positioned.children![0].node.type, NODE_TYPE.ROW);
      // Second child is the column (foreground)
      assert.strictEqual(positioned.children![1].node.type, NODE_TYPE.COLUMN);
    });
  });

  describe('z-order semantics', () => {
    it('children are ordered: [0] = back, [n-1] = front', () => {
      // Use rectangle() for pure visual shapes
      const s = stack(
        rectangle({ fill: { color: 'red' } }),    // back
        rectangle({ fill: { color: 'green' } }),  // middle
        rectangle({ fill: { color: 'blue' } })    // front
      );

      // Verify order is preserved
      assert.strictEqual(s.children.length, 3);
      assert.strictEqual((s.children[0] as any).fill?.color, 'red');
      assert.strictEqual((s.children[1] as any).fill?.color, 'green');
      assert.strictEqual((s.children[2] as any).fill?.color, 'blue');
    });
  });

  describe('composability', () => {
    it('can combine rectangle background with padded content', () => {
      // Pattern: stack(rectangle for background, column with padding for content)
      const styledContent = stack(
        rectangle({ fill: { color: 'gray' } }),
        column({ padding: 0.1 }, text('Layer 1'), text('Layer 2'))
      );

      assert.strictEqual(styledContent.type, NODE_TYPE.STACK);
      // First child is rectangle (background)
      assert.strictEqual(styledContent.children[0].type, NODE_TYPE.RECTANGLE);
      // Second child is column with padding (content)
      assert.strictEqual(styledContent.children[1].type, NODE_TYPE.COLUMN);
    });

    it('can contain any element type', () => {
      const s = stack(
        text('Text'),
        row(text('A'), text('B')),
        column(text('C'), text('D')),
        line()
      );

      assert.strictEqual(s.children.length, 4);
      assert.strictEqual(s.children[0].type, NODE_TYPE.TEXT);
      assert.strictEqual(s.children[1].type, NODE_TYPE.ROW);
      assert.strictEqual(s.children[2].type, NODE_TYPE.COLUMN);
      assert.strictEqual(s.children[3].type, NODE_TYPE.LINE);
    });
  });
});
