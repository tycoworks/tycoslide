import { describe, it } from 'node:test';
import assert from 'node:assert';
import { text, row } from '../src/core/dsl.js';
import { computeLayout, LayoutOverflowError, checkOverflow } from '../src/core/layout.js';
import { Bounds } from '../src/core/bounds.js';
import { mockTheme, mockMeasurer } from './mocks.js';

describe('Overflow Error Checking', () => {
  const theme = mockTheme();
  const measurer = mockMeasurer({ lineHeight: 0.5, lines: 1 });

  describe('LayoutOverflowError', () => {
    it('should contain overflow details', () => {
      const error = new LayoutOverflowError({
        nodeType: 'text',
        availableHeight: 1.0,
        contentHeight: 2.0,
        x: 0.5,
        y: 1.0,
      });

      assert.strictEqual(error.name, 'LayoutOverflowError');
      assert.strictEqual(error.nodeType, 'text');
      assert.strictEqual(error.availableHeight, 1.0);
      assert.strictEqual(error.contentHeight, 2.0);
      assert.strictEqual(error.overflow, 1.0);
      assert.strictEqual(error.x, 0.5);
      assert.strictEqual(error.y, 1.0);
      assert.ok(error.message.includes('text'));
      assert.ok(error.message.includes('2.00'));
      assert.ok(error.message.includes('1.00'));
    });

    it('should support custom message', () => {
      const error = new LayoutOverflowError({
        nodeType: 'text',
        availableHeight: 1.0,
        contentHeight: 2.0,
        x: 0,
        y: 0,
        message: 'Custom overflow message',
      });

      assert.strictEqual(error.message, 'Custom overflow message');
    });
  });

  describe('checkOverflow function', () => {
    it('should not throw when strict is false', () => {
      assert.doesNotThrow(() => {
        checkOverflow('text', 2.0, 1.0, 0, 0, { strict: false });
      });
    });

    it('should throw by default (strict defaults to true)', () => {
      assert.throws(
        () => checkOverflow('text', 2.0, 1.0, 0, 0, undefined),
        LayoutOverflowError
      );
    });

    it('should not throw when no overflow', () => {
      assert.doesNotThrow(() => {
        checkOverflow('text', 1.0, 2.0, 0, 0);
      });
    });

    it('should not throw when availableHeight is 0 (unconstrained)', () => {
      assert.doesNotThrow(() => {
        checkOverflow('text', 2.0, 0, 0, 0);
      });
    });

    it('should throw LayoutOverflowError when overflow (default behavior)', () => {
      assert.throws(
        () => checkOverflow('text', 2.0, 1.0, 0, 0),
        LayoutOverflowError
      );
    });
  });

  describe('computeLayout with strict mode (default: true)', () => {
    it('should not throw on overflow when strict is false', () => {
      const node = text('Hello World');
      const bounds = new Bounds(0, 0, 5, 0.1); // Very small height

      assert.doesNotThrow(() => {
        computeLayout(node, bounds, theme, measurer, undefined, { strict: false });
      });
    });

    it('should throw on text overflow by default', () => {
      const node = text('Hello World');
      const bounds = new Bounds(0, 0, 5, 0.1); // Very small height - text won't fit

      assert.throws(
        () => computeLayout(node, bounds, theme, measurer),
        LayoutOverflowError
      );
    });

    it('should not throw when content fits', () => {
      const node = text('Hi');
      const bounds = new Bounds(0, 0, 5, 2); // Plenty of space

      assert.doesNotThrow(() => {
        computeLayout(node, bounds, theme, measurer);
      });
    });

    it('should propagate strict mode to nested children', () => {
      // Create a row with a nested text that will overflow its constrained height
      // Row passes its height constraint to children, so the text will overflow
      const node = row(
        text('This text will overflow when constrained')
      );
      const bounds = new Bounds(0, 0, 5, 0.1); // Row height constraint passed to text child

      assert.throws(
        () => computeLayout(node, bounds, theme, measurer),
        LayoutOverflowError
      );
    });

    it('should not throw when unconstrained (bounds.h = 0)', () => {
      const node = text('Hello World with lots of content that would overflow');
      const bounds = new Bounds(0, 0, 5, 0); // Unconstrained height

      assert.doesNotThrow(() => {
        computeLayout(node, bounds, theme, measurer);
      });
    });
  });

  describe('overflow error details', () => {
    it('should include correct position in error', () => {
      const node = text('Hello');
      const bounds = new Bounds(1.5, 2.5, 5, 0.1);

      try {
        computeLayout(node, bounds, theme, measurer);
        assert.fail('Should have thrown');
      } catch (e) {
        assert.ok(e instanceof LayoutOverflowError);
        assert.strictEqual(e.x, 1.5);
        assert.strictEqual(e.y, 2.5);
        assert.strictEqual(e.availableHeight, 0.1);
      }
    });
  });
});
