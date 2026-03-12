// Slide Parser Tests
// Tests for parseSlideDocument: markdown file → ParsedDocument
//
// The parser uses structural --- pair detection (like Slidev).
// Frontmatter is identified by position between --- delimiters,
// NEVER by guessing whether content is YAML.

import assert from "node:assert";
import { describe, it } from "node:test";
import { FrontmatterParseError, parseSlideDocument } from "../src/core/markdown/slideParser.js";

describe("Slide Parser", () => {
  describe("global frontmatter", () => {
    it("should extract global frontmatter from file header", () => {
      const doc = parseSlideDocument("---\ntheme: acme\ntitle: My Deck\n---\n");
      assert.strictEqual(doc.global.theme, "acme");
      assert.strictEqual(doc.global.title, "My Deck");
      assert.strictEqual(doc.slides.length, 0);
    });

    it("should handle file with no global frontmatter", () => {
      const doc = parseSlideDocument("# Just a slide\n\nContent here.");
      assert.deepStrictEqual(doc.global, {});
      assert.strictEqual(doc.slides.length, 1);
    });

    it("should handle empty global frontmatter", () => {
      const doc = parseSlideDocument("---\n---\n\n# Slide\n");
      assert.ok(doc.slides.length >= 1);
      assert.ok(doc.slides[0].body.includes("# Slide"));
    });
  });

  describe("slide splitting", () => {
    it("should split slides on --- boundaries", () => {
      const doc = parseSlideDocument("---\ntheme: test\n---\n\nSlide 1\n\n---\n\nSlide 2\n\n---\n\nSlide 3");
      assert.strictEqual(doc.slides.length, 3);
      assert.strictEqual(doc.slides[0].body, "Slide 1");
      assert.strictEqual(doc.slides[1].body, "Slide 2");
      assert.strictEqual(doc.slides[2].body, "Slide 3");
    });

    it("should assign sequential indices", () => {
      const doc = parseSlideDocument("Slide 1\n\n---\n\nSlide 2");
      assert.strictEqual(doc.slides[0].index, 0);
      assert.strictEqual(doc.slides[1].index, 1);
    });

    it("should skip empty slides", () => {
      const doc = parseSlideDocument("Content\n\n---\n\n---\n\nMore content");
      assert.strictEqual(doc.slides.length, 2);
    });

    it("should handle trailing ---", () => {
      const doc = parseSlideDocument("Content\n\n---\n");
      assert.strictEqual(doc.slides.length, 1);
      assert.strictEqual(doc.slides[0].body, "Content");
    });
  });

  describe("per-slide frontmatter (--- pairs)", () => {
    it("should extract YAML frontmatter between --- pairs", () => {
      const doc = parseSlideDocument(
        "---\ntheme: test\n---\n\n---\nlayout: statement\neyebrow: INTRO\n---\n\nBody text",
      );
      assert.strictEqual(doc.slides.length, 1);
      assert.strictEqual(doc.slides[0].frontmatter.layout, "statement");
      assert.strictEqual(doc.slides[0].frontmatter.eyebrow, "INTRO");
      assert.strictEqual(doc.slides[0].body, "Body text");
    });

    it("should handle slide with only frontmatter (no body)", () => {
      const doc = parseSlideDocument("---\ntheme: test\n---\n\n---\nlayout: section\ntitle: Overview\n---\n");
      assert.strictEqual(doc.slides.length, 1);
      assert.strictEqual(doc.slides[0].frontmatter.layout, "section");
      assert.strictEqual(doc.slides[0].body, "");
    });

    it("should handle slide with no frontmatter (blank line after ---)", () => {
      const doc = parseSlideDocument("---\ntheme: test\n---\n\nJust content, no frontmatter.");
      assert.strictEqual(doc.slides.length, 1);
      assert.deepStrictEqual(doc.slides[0].frontmatter, {});
      assert.strictEqual(doc.slides[0].body, "Just content, no frontmatter.");
    });

    it("should handle frontmatter with multi-line YAML values", () => {
      const doc = parseSlideDocument(
        "---\ntheme: test\n---\n\n---\nlayout: statement\nbody: |\n  Line one.\n  Line two.\n---\n",
      );
      assert.strictEqual(doc.slides[0].frontmatter.layout, "statement");
      assert.ok((doc.slides[0].frontmatter.body as string).includes("Line one."));
      assert.ok((doc.slides[0].frontmatter.body as string).includes("Line two."));
    });

    it("should treat unterminated frontmatter as body content", () => {
      // No closing --- before EOF → "layout: statement" is body, not FM
      const doc = parseSlideDocument("---\ntheme: test\n---\n\n---\nlayout: statement");
      assert.strictEqual(doc.slides.length, 1);
      assert.deepStrictEqual(doc.slides[0].frontmatter, {});
      assert.strictEqual(doc.slides[0].body, "layout: statement");
    });

    it("should throw FrontmatterParseError on invalid YAML in --- pair", () => {
      // Structurally-identified FM (between --- pairs) with broken YAML must throw
      assert.throws(
        () => parseSlideDocument("---\ntheme: test\n---\n\n---\n  bad:\n    - [unclosed\n---\n\nBody."),
        (err: unknown) => {
          assert.ok(err instanceof FrontmatterParseError);
          assert.ok(err.message.includes("slide 0"));
          return true;
        },
      );
    });

    it("should include slide index in FrontmatterParseError", () => {
      // Second slide has bad YAML → error should say "slide 1"
      assert.throws(
        () =>
          parseSlideDocument(
            "---\ntheme: test\n---\n\n---\nlayout: ok\n---\n\nSlide 0.\n\n---\n  bad:\n    - [unclosed\n---\n\nSlide 1.",
          ),
        (err: unknown) => {
          assert.ok(err instanceof FrontmatterParseError);
          assert.ok(err.message.includes("slide 1"));
          return true;
        },
      );
    });

    it("should NOT throw on valid but non-object YAML (scalar)", () => {
      // "just a string" is valid YAML but not an object → returns {}
      const doc = parseSlideDocument("---\ntheme: test\n---\n\n---\njust a string\n---\n\nBody.");
      assert.deepStrictEqual(doc.slides[0].frontmatter, {});
    });
  });

  describe("colon-in-body (regression: YAML false positives)", () => {
    it('should NOT treat "Takeaway: text" as frontmatter', () => {
      const doc = parseSlideDocument(
        "---\ntheme: test\n---\n\n---\nlayout: statement\n---\n\nTakeaway: Acme makes data fresh.",
      );
      assert.strictEqual(doc.slides[0].frontmatter.layout, "statement");
      assert.strictEqual(doc.slides[0].body, "Takeaway: Acme makes data fresh.");
    });

    it('should NOT treat "Problem: text" as frontmatter', () => {
      const doc = parseSlideDocument(
        "---\ntheme: test\n---\n\n---\nlayout: card\n---\n\nProblem: Legacy systems are slow.\n\nSolution: Use Acme.",
      );
      assert.strictEqual(doc.slides[0].body, "Problem: Legacy systems are slow.\n\nSolution: Use Acme.");
      assert.strictEqual(doc.slides[0].frontmatter.layout, "card");
    });

    it("should handle body-only slide starting with colon text", () => {
      // No frontmatter --- pair, body starts with "Result: ..."
      const doc = parseSlideDocument("---\ntheme: test\n---\n\n---\n\nResult: 10x faster queries.");
      assert.strictEqual(doc.slides[0].body, "Result: 10x faster queries.");
      assert.deepStrictEqual(doc.slides[0].frontmatter, {});
    });
  });

  describe("code fence awareness", () => {
    it("should not split on --- inside a fenced code block", () => {
      const doc = parseSlideDocument("---\ntheme: test\n---\n\n```\ncode here\n---\nmore code\n```\n\nAfter code.");
      assert.strictEqual(doc.slides.length, 1);
      assert.ok(doc.slides[0].body.includes("```"));
      assert.ok(doc.slides[0].body.includes("more code"));
    });

    it("should resume splitting after code fence closes", () => {
      const doc = parseSlideDocument("Before code.\n\n```\n---\n```\n\n---\n\nNext slide.");
      assert.strictEqual(doc.slides.length, 2);
      assert.ok(doc.slides[0].body.includes("```"));
      assert.strictEqual(doc.slides[1].body, "Next slide.");
    });

    it("should handle tilde fences (~~~)", () => {
      const doc = parseSlideDocument("Before.\n\n~~~\n---\n~~~\n\n---\n\nNext slide.");
      assert.strictEqual(doc.slides.length, 2);
      assert.ok(doc.slides[0].body.includes("~~~"));
      assert.strictEqual(doc.slides[1].body, "Next slide.");
    });

    it("should not close a 5-backtick fence with 3 backticks", () => {
      const doc = parseSlideDocument("`````\n```\n---\n```\n`````\n\n---\n\nNext slide.");
      assert.strictEqual(doc.slides.length, 2);
      assert.ok(doc.slides[0].body.includes("---"));
      assert.strictEqual(doc.slides[1].body, "Next slide.");
    });

    it("should handle code fence with info string (```typescript)", () => {
      const doc = parseSlideDocument("```typescript\nconst x = 1;\n---\nconsole.log(x);\n```\n\n---\n\nNext.");
      assert.strictEqual(doc.slides.length, 2);
      assert.ok(doc.slides[0].body.includes("const x = 1;"));
      assert.strictEqual(doc.slides[1].body, "Next.");
    });

    it("should not treat ::slot:: inside code fence as slot marker", () => {
      const doc = parseSlideDocument("Default content.\n\n```\n::right::\ncode example\n```\n\nMore default.");
      assert.strictEqual(doc.slides[0].body, "Default content.\n\n```\n::right::\ncode example\n```\n\nMore default.");
      assert.deepStrictEqual(doc.slides[0].slots, {});
    });
  });

  describe("content slots", () => {
    it("should extract named slots", () => {
      const doc = parseSlideDocument("Default content.\n\n::right::\n\nRight side content.");
      assert.strictEqual(doc.slides[0].body, "Default content.");
      assert.strictEqual(doc.slides[0].slots.right, "Right side content.");
    });

    it("should handle multiple slots", () => {
      const doc = parseSlideDocument("Default.\n\n::left::\n\nLeft content.\n\n::right::\n\nRight content.");
      assert.strictEqual(doc.slides[0].body, "Default.");
      assert.strictEqual(doc.slides[0].slots.left, "Left content.");
      assert.strictEqual(doc.slides[0].slots.right, "Right content.");
    });

    it("should handle empty default slot with named slots", () => {
      const doc = parseSlideDocument("::left::\n\nLeft only.\n\n::right::\n\nRight only.");
      assert.strictEqual(doc.slides[0].body, "");
      assert.strictEqual(doc.slides[0].slots.left, "Left only.");
      assert.strictEqual(doc.slides[0].slots.right, "Right only.");
    });

    it("should return empty slots when no markers present", () => {
      const doc = parseSlideDocument("Just content.");
      assert.deepStrictEqual(doc.slides[0].slots, {});
    });

    it("should accumulate content for duplicate slot names", () => {
      const doc = parseSlideDocument("::right::\n\nFirst right.\n\n::right::\n\nSecond right.");
      assert.ok(doc.slides[0].slots.right.includes("First right."));
      assert.ok(doc.slides[0].slots.right.includes("Second right."));
    });
  });

  describe("full document", () => {
    it("should parse a complete multi-slide document", () => {
      const source = `---
theme: acme
---

---
layout: section
title: My Presentation
---

---
layout: statement
eyebrow: INTRO
title: Value Proposition
notes: Emphasize real-time capabilities.
---

Acme is a live data layer.

---
layout: twoColumn
eyebrow: COMPARISON
---

Legacy systems can't keep up.

::right::

Acme provides real-time views.`;

      const doc = parseSlideDocument(source);

      // Global
      assert.strictEqual(doc.global.theme, "acme");

      // Slide 0: section with title in frontmatter
      assert.strictEqual(doc.slides[0].frontmatter.layout, "section");
      assert.strictEqual(doc.slides[0].frontmatter.title, "My Presentation");
      assert.strictEqual(doc.slides[0].body, "");

      // Slide 1: statement with title and notes in frontmatter
      assert.strictEqual(doc.slides[1].frontmatter.layout, "statement");
      assert.strictEqual(doc.slides[1].frontmatter.eyebrow, "INTRO");
      assert.strictEqual(doc.slides[1].frontmatter.title, "Value Proposition");
      assert.strictEqual(doc.slides[1].frontmatter.notes, "Emphasize real-time capabilities.");
      assert.strictEqual(doc.slides[1].body, "Acme is a live data layer.");

      // Slide 2: twoColumn with slots
      assert.strictEqual(doc.slides[2].frontmatter.layout, "twoColumn");
      assert.strictEqual(doc.slides[2].body, "Legacy systems can't keep up.");
      assert.strictEqual(doc.slides[2].slots.right, "Acme provides real-time views.");
    });

    it("should handle minimal document (single slide with body)", () => {
      const doc = parseSlideDocument("Just some content.");
      assert.deepStrictEqual(doc.global, {});
      assert.strictEqual(doc.slides.length, 1);
      assert.strictEqual(doc.slides[0].body, "Just some content.");
    });
  });

  describe("edge cases", () => {
    it("should handle empty document", () => {
      const doc = parseSlideDocument("");
      assert.deepStrictEqual(doc.global, {});
      assert.strictEqual(doc.slides.length, 0);
    });

    it("should handle CRLF line endings", () => {
      const doc = parseSlideDocument(
        "---\r\ntheme: test\r\n---\r\n\r\n---\r\nlayout: body\r\ntitle: Hello\r\n---\r\n\r\nBody content.",
      );
      assert.strictEqual(doc.global.theme, "test");
      assert.strictEqual(doc.slides[0].frontmatter.layout, "body");
      assert.strictEqual(doc.slides[0].frontmatter.title, "Hello");
      assert.strictEqual(doc.slides[0].body, "Body content.");
    });
  });
});
