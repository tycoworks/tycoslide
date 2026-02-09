import { describe, it } from 'node:test';
import assert from 'node:assert';
import { text, row, column } from '../src/core/dsl.js';
import { computeLayout, LayoutValidator, LayoutOverflowError, LayoutOverlapError, LayoutBoundsError } from '../src/layout/engine.js';
import { Bounds } from '../src/core/bounds.js';
import { mockTheme, mockMeasurer } from './mocks.js';
import { VALIGN } from '../src/core/types.js';
import { NODE_TYPE, type PositionedNode, type ElementNode, type ColumnNode } from '../src/core/nodes.js';

describe('Layout Validation', () => {
  const theme = mockTheme();
  const measurer = mockMeasurer({ lineHeight: 0.5, lines: 1 });
  const slideBounds = { width: 10, height: 7.5 };

  describe('LayoutValidator', () => {
    it('should not throw when content is within bounds', () => {
      const node = text('Hello');
      const bounds = new Bounds(0.5, 0.5, 9, 6.5);
      const positioned = computeLayout(node, bounds, theme, measurer);

      const validator = new LayoutValidator(slideBounds);
      assert.doesNotThrow(() => validator.validateOrThrow(positioned));
    });

    it('should detect overflow beyond slide right edge', () => {
      // Create a positioned node that extends beyond slide width
      const positioned: PositionedNode = {
        node: { type: NODE_TYPE.TEXT, content: 'test' },
        x: 8,
        y: 1,
        width: 5, // extends to x=13, beyond slide width=10
        height: 1,
      };

      const validator = new LayoutValidator(slideBounds);
      const result = validator.validate(positioned);

      assert.strictEqual(result.overflows.length, 1);
      assert.ok(result.overflows[0].overflowRight > 0);
    });

    it('should detect overflow beyond slide bottom edge', () => {
      const positioned: PositionedNode = {
        node: { type: NODE_TYPE.TEXT, content: 'test' },
        x: 1,
        y: 6,
        width: 2,
        height: 3, // extends to y=9, beyond slide height=7.5
      };

      const validator = new LayoutValidator(slideBounds);
      const result = validator.validate(positioned);

      assert.strictEqual(result.overflows.length, 1);
      assert.ok(result.overflows[0].overflowBottom > 0);
    });

    it('should throw LayoutOverflowError with slide index', () => {
      const positioned: PositionedNode = {
        node: { type: NODE_TYPE.TEXT, content: 'test' },
        x: 8,
        y: 1,
        width: 5,
        height: 1,
      };

      const validator = new LayoutValidator(slideBounds);
      try {
        validator.validateOrThrow(positioned, 2);
        assert.fail('Should have thrown');
      } catch (e) {
        assert.ok(e instanceof LayoutOverflowError);
        assert.strictEqual(e.slideIndex, 2);
        assert.ok(e.message.includes('Slide 3'));
      }
    });

    it('should return true for valid layout', () => {
      const positioned: PositionedNode = {
        node: { type: NODE_TYPE.TEXT, content: 'test' },
        x: 1,
        y: 1,
        width: 2,
        height: 2,
      };

      const validator = new LayoutValidator(slideBounds);
      assert.strictEqual(validator.isValid(positioned), true);
    });

    it('should return false for invalid layout', () => {
      const positioned: PositionedNode = {
        node: { type: NODE_TYPE.TEXT, content: 'test' },
        x: 8,
        y: 1,
        width: 5, // overflows
        height: 1,
      };

      const validator = new LayoutValidator(slideBounds);
      assert.strictEqual(validator.isValid(positioned), false);
    });
  });

  describe('Sibling Overlap Detection', () => {
    it('should detect overlapping siblings in a row', () => {
      // Manually create a positioned row with overlapping children
      const positioned: PositionedNode = {
        node: { type: NODE_TYPE.ROW, children: [] },
        x: 1,
        y: 1,
        width: 8,
        height: 2,
        children: [
          {
            node: { type: NODE_TYPE.TEXT, content: 'A' },
            x: 1,
            y: 1,
            width: 3,
            height: 1,
          },
          {
            node: { type: NODE_TYPE.TEXT, content: 'B' },
            x: 2, // overlaps with first child (x=1, width=3 → ends at x=4)
            y: 1,
            width: 3,
            height: 1,
          },
        ],
      };

      const validator = new LayoutValidator(slideBounds);
      const result = validator.validate(positioned);

      assert.strictEqual(result.overlaps.length, 1);
      assert.strictEqual(result.overlaps[0].node1Index, 0);
      assert.strictEqual(result.overlaps[0].node2Index, 1);
    });

    it('should not report overlap for Stack nodes (intentional)', () => {
      // Stack nodes intentionally overlap children
      const positioned: PositionedNode = {
        node: { type: NODE_TYPE.STACK, children: [] },
        x: 1,
        y: 1,
        width: 4,
        height: 2,
        children: [
          {
            node: { type: NODE_TYPE.TEXT, content: 'Background' },
            x: 1,
            y: 1,
            width: 4,
            height: 2,
          },
          {
            node: { type: NODE_TYPE.TEXT, content: 'Foreground' },
            x: 1, // same position - intentional overlap
            y: 1,
            width: 4,
            height: 2,
          },
        ],
      };

      const validator = new LayoutValidator(slideBounds);
      const result = validator.validate(positioned);

      assert.strictEqual(result.overlaps.length, 0, 'Stack overlap should not be reported');
    });
  });

  describe('Bounds Escape Detection (Child outside Parent)', () => {
    it('should detect child positioned above parent (escapeTop)', () => {
      // Child positioned above parent - this is a layout bug
      const positioned: PositionedNode = {
        node: { type: NODE_TYPE.COLUMN, children: [] },
        x: 1,
        y: 2,
        width: 4,
        height: 3,
        children: [
          {
            node: { type: NODE_TYPE.TEXT, content: 'test' },
            x: 1,
            y: 1, // above parent.y=2
            width: 4,
            height: 1,
          },
        ],
      };

      const validator = new LayoutValidator(slideBounds);
      const result = validator.validate(positioned);

      assert.strictEqual(result.boundsEscapes.length, 1);
      assert.ok(result.boundsEscapes[0].escapeTop > 0);
    });

    it('should detect child positioned left of parent (escapeLeft)', () => {
      const positioned: PositionedNode = {
        node: { type: NODE_TYPE.ROW, children: [] },
        x: 2,
        y: 1,
        width: 4,
        height: 2,
        children: [
          {
            node: { type: NODE_TYPE.TEXT, content: 'test' },
            x: 1, // left of parent.x=2
            y: 1,
            width: 2,
            height: 1,
          },
        ],
      };

      const validator = new LayoutValidator(slideBounds);
      const result = validator.validate(positioned);

      assert.strictEqual(result.boundsEscapes.length, 1);
      assert.ok(result.boundsEscapes[0].escapeLeft > 0);
    });

    it('should NOT report bottom/right escapes (these are overflow, not positioning bugs)', () => {
      // Child extends beyond parent bottom/right - this is acceptable overflow
      const positioned: PositionedNode = {
        node: { type: NODE_TYPE.COLUMN, children: [] },
        x: 1,
        y: 1,
        width: 4,
        height: 2,
        children: [
          {
            node: { type: NODE_TYPE.TEXT, content: 'test' },
            x: 1,
            y: 1,
            width: 6, // extends right of parent
            height: 4, // extends below parent
          },
        ],
      };

      const validator = new LayoutValidator(slideBounds);
      const result = validator.validate(positioned);

      // No bounds escapes - bottom/right are not reported
      assert.strictEqual(result.boundsEscapes.length, 0);
    });

    it('should throw LayoutBoundsError (higher priority than overflow)', () => {
      const positioned: PositionedNode = {
        node: { type: NODE_TYPE.COLUMN, children: [] },
        x: 1,
        y: 2,
        width: 4,
        height: 3,
        children: [
          {
            node: { type: NODE_TYPE.TEXT, content: 'test' },
            x: 1,
            y: 1, // escapes top
            width: 4,
            height: 1,
          },
        ],
      };

      const validator = new LayoutValidator(slideBounds);
      assert.throws(
        () => validator.validateOrThrow(positioned),
        LayoutBoundsError
      );
    });
  });

  describe('vAlign Regression (content > available space)', () => {
    it('should not position children above parent when content overflows with vAlign MIDDLE', () => {
      // This tests the bug fix: when contentHeight > availableHeight,
      // the centering formula (availableHeight - contentHeight) / 2 goes negative
      // The fix clamps offset to 0 so children never go above parent
      const node = column({ vAlign: VALIGN.MIDDLE },
        text('Line 1'),
        text('Line 2'),
        text('Line 3'),
        text('Line 4'),
      );

      // Very constrained height - content will overflow
      const bounds = new Bounds(1, 2, 8, 0.5); // Only 0.5" tall but content is ~2"
      const positioned = computeLayout(node, bounds, theme, measurer);

      // Verify no child is positioned above the parent's y
      for (const child of positioned.children ?? []) {
        assert.ok(
          child.y >= positioned.y,
          `Child y=${child.y} should not be above parent y=${positioned.y}`
        );
      }

      // Validation should not throw LayoutBoundsError
      // (may throw LayoutOverflowError since content is too tall, which is expected)
      const validator = new LayoutValidator(slideBounds);
      const result = validator.validate(positioned);

      assert.strictEqual(result.boundsEscapes.length, 0, 'No bounds escapes with vAlign fix');
    });

    it('should not position children above parent when content overflows with vAlign BOTTOM', () => {
      const node = column({ vAlign: VALIGN.BOTTOM },
        text('Line 1'),
        text('Line 2'),
        text('Line 3'),
        text('Line 4'),
      );

      const bounds = new Bounds(1, 2, 8, 0.5);
      const positioned = computeLayout(node, bounds, theme, measurer);

      for (const child of positioned.children ?? []) {
        assert.ok(
          child.y >= positioned.y,
          `Child y=${child.y} should not be above parent y=${positioned.y}`
        );
      }

      const validator = new LayoutValidator(slideBounds);
      const result = validator.validate(positioned);

      assert.strictEqual(result.boundsEscapes.length, 0, 'No bounds escapes with vAlign fix');
    });
  });
});
