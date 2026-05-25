import assert from "node:assert";
import { describe, it } from "node:test";
import { LayoutBoundsError, LayoutOverflowError, LayoutValidator } from "../src/core/layout/validator.js";
import { Insets } from "../src/core/model/bounds.js";
import { type ElementNode, LAYER, NODE_TYPE, type PositionedNode, type TextNode } from "../src/core/model/nodes.js";
import { DIRECTION, HALIGN, SIZE, SPACING, VALIGN } from "../src/core/model/types.js";

/** Minimal text node for validator tests (validator only checks geometry, not content) */
function textNode(content: string): TextNode {
  return {
    type: NODE_TYPE.TEXT,
    width: SIZE.FILL,
    height: SIZE.HUG,
    content,
    hAlign: HALIGN.LEFT,
    vAlign: VALIGN.TOP,
    style: "body",
    resolvedStyle: {
      fontFamily: { name: "Arial", regular: { path: "/fake/arial.woff", weight: 400 }, normalRatio: 1.2 },
      fontSize: 14,
      lineHeight: 1.0,
      bulletIndentPt: 21,
    },
    color: "#000000",
    lineHeight: 1.2,
    bulletIndentPt: 18,
    linkColor: "#0000FF",
    linkUnderline: true,
  };
}

/** Minimal container node for validator tests */
function containerNode(): ElementNode {
  return {
    type: NODE_TYPE.CONTAINER,
    children: [],
    direction: DIRECTION.ROW,
    width: SIZE.FILL,
    height: SIZE.HUG,
    weight: 1,
    spacing: 0,
    spacingMode: SPACING.BETWEEN,
    padding: new Insets(0),
    hAlign: HALIGN.LEFT,
    vAlign: VALIGN.TOP,
    layer: LAYER.CONTENT,
  } as ElementNode;
}

describe("Layout Validation", () => {
  const slideBounds = { width: 960, height: 540 };

  describe("LayoutValidator", () => {
    it("should not throw when content is within bounds", () => {
      const positioned: PositionedNode = {
        node: textNode("Hello"),
        x: 48,
        y: 48,
        width: 384,
        height: 48,
      };

      const validator = new LayoutValidator(slideBounds);
      assert.doesNotThrow(() => validator.validateOrThrow(positioned));
    });

    it("should detect overflow beyond slide right edge", () => {
      const positioned: PositionedNode = {
        node: textNode("test"),
        x: 768,
        y: 96,
        width: 480, // extends to x=1248, beyond slide width=960
        height: 96,
      };

      const validator = new LayoutValidator(slideBounds);
      const result = validator.validate(positioned);

      assert.strictEqual(result.overflows.length, 1);
      assert.ok(result.overflows[0].overflowRight > 0);
    });

    it("should detect overflow beyond slide bottom edge", () => {
      const positioned: PositionedNode = {
        node: textNode("test"),
        x: 96,
        y: 400,
        width: 192,
        height: 288, // extends to y=688, beyond slide height=540
      };

      const validator = new LayoutValidator(slideBounds);
      const result = validator.validate(positioned);

      assert.strictEqual(result.overflows.length, 1);
      assert.ok(result.overflows[0].overflowBottom > 0);
    });

    it("should throw LayoutOverflowError with slide index", () => {
      const positioned: PositionedNode = {
        node: textNode("test"),
        x: 768,
        y: 96,
        width: 480,
        height: 96,
      };

      const validator = new LayoutValidator(slideBounds);
      try {
        validator.validateOrThrow(positioned, 2);
        assert.fail("Should have thrown");
      } catch (e) {
        assert.ok(e instanceof LayoutOverflowError);
        assert.strictEqual(e.slideIndex, 2);
        assert.ok(e.message.includes("Slide 3"));
      }
    });

    it("should return true for valid layout", () => {
      const positioned: PositionedNode = {
        node: textNode("test"),
        x: 96,
        y: 96,
        width: 192,
        height: 192,
      };

      const validator = new LayoutValidator(slideBounds);
      assert.strictEqual(validator.isValid(positioned), true);
    });

    it("should return false for invalid layout", () => {
      const positioned: PositionedNode = {
        node: textNode("test"),
        x: 768,
        y: 96,
        width: 480, // overflows
        height: 96,
      };

      const validator = new LayoutValidator(slideBounds);
      assert.strictEqual(validator.isValid(positioned), false);
    });

    it("should include slideName in LayoutOverflowError message", () => {
      const positioned: PositionedNode = {
        node: textNode("test"),
        x: 768,
        y: 96,
        width: 480,
        height: 96,
      };
      const validator = new LayoutValidator(slideBounds);
      try {
        validator.validateOrThrow(positioned, 5, "template: customerStory, eyebrow: STORY");
        assert.fail("Should have thrown");
      } catch (e) {
        assert.ok(e instanceof LayoutOverflowError);
        assert.ok(e.message.includes("Slide 6"));
        assert.ok(e.message.includes("template: customerStory, eyebrow: STORY"));
      }
    });

    it("should omit parentheses when slideName is not provided", () => {
      const positioned: PositionedNode = {
        node: textNode("test"),
        x: 768,
        y: 96,
        width: 480,
        height: 96,
      };
      const validator = new LayoutValidator(slideBounds);
      try {
        validator.validateOrThrow(positioned, 5);
        assert.fail("Should have thrown");
      } catch (e) {
        assert.ok(e instanceof LayoutOverflowError);
        assert.ok(e.message.startsWith("Slide 6: Content"));
      }
    });

    it("should include slideName in LayoutBoundsError message", () => {
      const positioned: PositionedNode = {
        node: containerNode(),
        x: 96,
        y: 192,
        width: 384,
        height: 288,
        children: [
          {
            node: textNode("test"),
            x: 96,
            y: 96,
            width: 384,
            height: 96,
          },
        ],
      };
      const validator = new LayoutValidator(slideBounds);
      try {
        validator.validateOrThrow(positioned, 3, "template: body, title: Test");
        assert.fail("Should have thrown");
      } catch (e) {
        assert.ok(e instanceof LayoutBoundsError);
        assert.ok(e.message.includes("Slide 4"));
        assert.ok(e.message.includes("template: body, title: Test"));
      }
    });

    it("should produce correct message for slideIndex 0", () => {
      const positioned: PositionedNode = {
        node: textNode("test"),
        x: 8,
        y: 1,
        width: 5,
        height: 1,
      };
      const validator = new LayoutValidator(slideBounds);
      try {
        validator.validateOrThrow(positioned, 0, "template: title");
        assert.fail("Should have thrown");
      } catch (e) {
        assert.ok(e instanceof LayoutOverflowError);
        assert.ok(e.message.includes("Slide 1"));
        assert.ok(e.message.includes("template: title"));
      }
    });
  });

  describe("Sibling Overlap Detection", () => {
    it("should detect overlapping siblings in a row", () => {
      const positioned: PositionedNode = {
        node: containerNode(),
        x: 1,
        y: 1,
        width: 8,
        height: 2,
        children: [
          {
            node: textNode("A"),
            x: 1,
            y: 1,
            width: 3,
            height: 1,
          },
          {
            node: textNode("B"),
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

    it("should not report overlap for Stack nodes (intentional)", () => {
      const positioned: PositionedNode = {
        node: { type: NODE_TYPE.STACK, children: [], width: SIZE.FILL, height: SIZE.HUG, layer: LAYER.CONTENT },
        x: 1,
        y: 1,
        width: 4,
        height: 2,
        children: [
          {
            node: textNode("Background"),
            x: 1,
            y: 1,
            width: 4,
            height: 2,
          },
          {
            node: textNode("Foreground"),
            x: 1, // same position - intentional overlap
            y: 1,
            width: 4,
            height: 2,
          },
        ],
      };

      const validator = new LayoutValidator(slideBounds);
      const result = validator.validate(positioned);

      assert.strictEqual(result.overlaps.length, 0, "Stack overlap should not be reported");
    });
  });

  describe("Bounds Escape Detection (Child outside Parent)", () => {
    it("should detect child positioned above parent (escapeTop)", () => {
      const positioned: PositionedNode = {
        node: containerNode(),
        x: 1,
        y: 2,
        width: 4,
        height: 3,
        children: [
          {
            node: textNode("test"),
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

    it("should detect child positioned left of parent (escapeLeft)", () => {
      const positioned: PositionedNode = {
        node: containerNode(),
        x: 2,
        y: 1,
        width: 4,
        height: 2,
        children: [
          {
            node: textNode("test"),
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

    it("should NOT report bottom/right escapes (these are overflow, not positioning bugs)", () => {
      const positioned: PositionedNode = {
        node: containerNode(),
        x: 1,
        y: 1,
        width: 4,
        height: 2,
        children: [
          {
            node: textNode("test"),
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

    it("should throw LayoutBoundsError (higher priority than overflow)", () => {
      const positioned: PositionedNode = {
        node: containerNode(),
        x: 1,
        y: 2,
        width: 4,
        height: 3,
        children: [
          {
            node: textNode("test"),
            x: 1,
            y: 1, // escapes top
            width: 4,
            height: 1,
          },
        ],
      };

      const validator = new LayoutValidator(slideBounds);
      assert.throws(() => validator.validateOrThrow(positioned), LayoutBoundsError);
    });
  });
});
