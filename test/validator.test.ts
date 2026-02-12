import { describe, it } from 'node:test';
import assert from 'node:assert';
import { LayoutValidator, LayoutOverflowError, LayoutBoundsError } from '../src/layout/validator.js';
import { NODE_TYPE, type PositionedNode, type ElementNode } from '../src/core/nodes.js';
import { HALIGN, VALIGN, DIRECTION } from '../src/core/types.js';

/** Minimal text node for validator tests (validator only checks geometry, not content) */
function textNode(content: string): ElementNode {
  return { type: NODE_TYPE.TEXT, content, hAlign: HALIGN.LEFT, vAlign: VALIGN.TOP } as ElementNode;
}

/** Minimal container node for validator tests */
function containerNode(): ElementNode {
  return { type: NODE_TYPE.CONTAINER, children: [], direction: DIRECTION.ROW, hAlign: HALIGN.LEFT, vAlign: VALIGN.TOP } as ElementNode;
}

describe('Layout Validation', () => {
  const slideBounds = { width: 10, height: 7.5 };

  describe('LayoutValidator', () => {
    it('should not throw when content is within bounds', () => {
      const positioned: PositionedNode = {
        node: textNode('Hello'),
        x: 0.5,
        y: 0.5,
        width: 4,
        height: 0.5,
      };

      const validator = new LayoutValidator(slideBounds);
      assert.doesNotThrow(() => validator.validateOrThrow(positioned));
    });

    it('should detect overflow beyond slide right edge', () => {
      const positioned: PositionedNode = {
        node: textNode('test'),
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
        node: textNode('test'),
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
        node: textNode('test'),
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
        node: textNode('test'),
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
        node: textNode('test'),
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
      const positioned: PositionedNode = {
        node: containerNode(),
        x: 1,
        y: 1,
        width: 8,
        height: 2,
        children: [
          {
            node: textNode('A'),
            x: 1,
            y: 1,
            width: 3,
            height: 1,
          },
          {
            node: textNode('B'),
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
      const positioned: PositionedNode = {
        node: { type: NODE_TYPE.STACK, children: [] },
        x: 1,
        y: 1,
        width: 4,
        height: 2,
        children: [
          {
            node: textNode('Background'),
            x: 1,
            y: 1,
            width: 4,
            height: 2,
          },
          {
            node: textNode('Foreground'),
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
      const positioned: PositionedNode = {
        node: containerNode(),
        x: 1,
        y: 2,
        width: 4,
        height: 3,
        children: [
          {
            node: textNode('test'),
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
        node: containerNode(),
        x: 2,
        y: 1,
        width: 4,
        height: 2,
        children: [
          {
            node: textNode('test'),
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
      const positioned: PositionedNode = {
        node: containerNode(),
        x: 1,
        y: 1,
        width: 4,
        height: 2,
        children: [
          {
            node: textNode('test'),
            x: 1,
            y: 1,
            width: 6, // extends right of parent
            height: 4, // extends below parent
          },
        ],
      };

      const validator = new LayoutValidator(slideBounds);
      const result = validator.validate(positioned);

      assert.strictEqual(result.boundsEscapes.length, 0);
    });

    it('should throw LayoutBoundsError (higher priority than overflow)', () => {
      const positioned: PositionedNode = {
        node: containerNode(),
        x: 1,
        y: 2,
        width: 4,
        height: 3,
        children: [
          {
            node: textNode('test'),
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
});
