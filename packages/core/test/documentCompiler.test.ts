// Document Compiler Tests
// Tests for compileDocument: markdown file → Presentation
//
// IMPORTANT: The slide parser treats the first ---...--- block as GLOBAL
// frontmatter. Slide frontmatter starts AFTER the global block.
// Every test document must begin with a global FM header.

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { buildSlideName, compileDocument } from "../src/core/markdown/documentCompiler.js";
import { NODE_TYPE } from "../src/core/model/nodes.js";
import { param, schema } from "../src/core/model/param.js";

import type { Slide } from "../src/core/model/types.js";
import { componentRegistry, layoutRegistry } from "../src/core/rendering/registry.js";
import { mockTheme } from "./mocks.js";
import { testComponents } from "./test-components.js";

// ============================================
// TEST SETUP
// ============================================

let receivedProps: any[] = [];
let renderedSlides: Slide[] = [];

/** Global FM header — required before any slide frontmatter */
const HEADER = `---\ntheme: test\n---\n\n`;

function makeOptions() {
  return { theme: mockTheme() };
}

// Mock layouts
function mockSlide(props: any): Slide {
  receivedProps.push(props);
  const slide: Slide = {
    masterName: "default",
    masterVariant: "default",
    content: { type: NODE_TYPE.COMPONENT, componentName: "test", params: props, content: undefined },
  };
  renderedSlides.push(slide);
  return slide;
}

const simpleLayout = {
  name: "simple",
  description: "Test layout with just title",
  params: { title: schema.string() },
  tokens: {},
  render: (params: any, slots: any): Slide => mockSlide({ ...params, ...slots }),
};

const bodyLayout = {
  name: "body",
  description: "Body layout with title and body",
  params: { title: param.optional(schema.string()) },
  slots: ["body"],
  tokens: {},
  render: (params: any, slots: any): Slide => mockSlide({ ...params, ...slots }),
};

const slotLayout = {
  name: "slots",
  description: "Slot layout with named slots",
  params: { title: schema.string(), eyebrow: schema.string() },
  slots: ["left", "right"],
  tokens: {},
  render: (params: any, slots: any): Slide => mockSlide({ ...params, ...slots }),
};

const strictLayout = {
  name: "strict",
  description: "Strict layout with required field",
  params: { title: schema.string(), required_field: schema.string() },
  tokens: {},
  render: (params: any, slots: any): Slide => mockSlide({ ...params, ...slots }),
};

const defaultLayout = {
  name: "default",
  description: "Default layout with optional body",
  params: { title: param.optional(schema.string()), body: param.optional(schema.string()) },
  tokens: {},
  render: (params: any, slots: any): Slide => mockSlide({ ...params, ...slots }),
};

// ============================================
// REGISTRATION (module-level, once)
// ============================================

componentRegistry.register(testComponents);
layoutRegistry.register([simpleLayout, bodyLayout, slotLayout, strictLayout, defaultLayout]);

// ============================================
// TESTS
// ============================================

describe("Document Compiler", () => {
  beforeEach(() => {
    receivedProps = [];
    renderedSlides = [];
  });

  describe("parameter mapping", () => {
    it("should compile a minimal frontmatter-only slide", () => {
      const md =
        HEADER +
        `---
layout: simple
variant: default
title: Hello World
---`;
      compileDocument(md, makeOptions());
      assert.strictEqual(receivedProps.length, 1);
      assert.strictEqual(receivedProps[0].title, "Hello World");
    });

    it("should pass title from frontmatter", () => {
      const md =
        HEADER +
        `---
layout: simple
variant: default
title: Frontmatter Title
---`;
      compileDocument(md, makeOptions());
      assert.strictEqual(receivedProps.length, 1);
      assert.strictEqual(receivedProps[0].title, "Frontmatter Title");
    });

    it("should compile markdown body to ComponentNode[]", () => {
      const md =
        HEADER +
        `---
layout: body
variant: default
---

This is the body content.

Multiple paragraphs are preserved.`;
      compileDocument(md, makeOptions());
      assert.strictEqual(receivedProps.length, 1);
      assert.ok(Array.isArray(receivedProps[0].body));
      assert.ok(receivedProps[0].body.length > 0);
    });

    it("should compile named slots to ComponentNode[]", () => {
      const md =
        HEADER +
        `---
layout: slots
variant: default
title: Two Column Slide
eyebrow: ARCHITECTURE
---

::left::
Left column content here.

::right::
Right column content here.`;
      compileDocument(md, makeOptions());
      assert.strictEqual(receivedProps.length, 1);
      assert.strictEqual(receivedProps[0].title, "Two Column Slide");
      assert.strictEqual(receivedProps[0].eyebrow, "ARCHITECTURE");
      assert.ok(Array.isArray(receivedProps[0].left));
      assert.ok(receivedProps[0].left.length > 0);
      assert.ok(Array.isArray(receivedProps[0].right));
      assert.ok(receivedProps[0].right.length > 0);
    });

    it("should attach speaker notes from frontmatter", () => {
      const md =
        HEADER +
        `---
layout: simple
variant: default
title: Slide with Notes
notes: These are speaker notes.
---`;
      compileDocument(md, makeOptions());
      assert.strictEqual(renderedSlides.length, 1);
      assert.strictEqual(renderedSlides[0].notes, "These are speaker notes.");
    });

    it("should compile multiple slides", () => {
      const md =
        HEADER +
        `---
layout: simple
variant: default
title: Slide One
---

---
layout: simple
variant: default
title: Slide Two
---

---
layout: simple
variant: default
title: Slide Three
---`;
      compileDocument(md, makeOptions());
      assert.strictEqual(receivedProps.length, 3);
      assert.strictEqual(receivedProps[0].title, "Slide One");
      assert.strictEqual(receivedProps[1].title, "Slide Two");
      assert.strictEqual(receivedProps[2].title, "Slide Three");
    });

    it("should throw when body content is present but layout has no slots", () => {
      const md =
        HEADER +
        `---
layout: default
variant: default
body: Frontmatter body content
---

Markdown body content`;
      assert.throws(() => compileDocument(md, makeOptions()), /does not accept body content/);
    });

    it("should throw on ::slot:: markers for undeclared slots", () => {
      const md =
        HEADER +
        `---
layout: slots
variant: default
title: Title
eyebrow: FROM_FM
---

::left::
Left content

::right::
Right content

::eyebrow::
FROM_SLOT`;
      assert.throws(() => compileDocument(md, makeOptions()), /unknown slots.*eyebrow/);
    });
  });

  describe("errors", () => {
    it("should throw when layout is omitted", () => {
      const md =
        HEADER +
        `---
title: Missing Layout
---`;
      assert.throws(
        () => compileDocument(md, makeOptions()),
        (err: any) => {
          assert.ok(err.message.includes("missing 'layout'"));
          assert.ok(err.message.includes("Slide 1"));
          return true;
        },
      );
    });

    it("should throw on slide without frontmatter", () => {
      // Slide without frontmatter (just a heading after global FM)
      const md = `${HEADER}# Just a heading`;
      assert.throws(
        () => compileDocument(md, makeOptions()),
        (err: any) => {
          assert.ok(err.message.includes("missing 'layout'"));
          return true;
        },
      );
    });

    it("should throw on unknown layout name", () => {
      const md =
        HEADER +
        `---
layout: nonexistent
---`;
      assert.throws(
        () => compileDocument(md, makeOptions()),
        (err: any) => {
          assert.ok(err.message.includes("nonexistent"));
          assert.ok(err.message.includes("unknown layout"));
          assert.ok(err.message.includes("Available:"));
          return true;
        },
      );
    });

    it("should throw when variant is omitted", () => {
      const md =
        HEADER +
        `---
layout: simple
title: No Variant
---`;
      assert.throws(
        () => compileDocument(md, makeOptions()),
        (err: any) => {
          assert.ok(err.message.includes("missing 'variant'"));
          assert.ok(err.message.includes("Slide 1"));
          return true;
        },
      );
    });

    it("should throw on validation failure with missing required field", () => {
      const md =
        HEADER +
        `---
layout: strict
variant: default
title: Has Title
---`;
      assert.throws(
        () => compileDocument(md, makeOptions()),
        (err: any) => {
          assert.ok(err.message.includes("required_field") || err.message.includes("validation"));
          return true;
        },
      );
    });
  });

  describe("asset references", () => {
    it("should pass asset references through as strings (resolved at expansion time)", () => {
      const md =
        HEADER +
        `---
layout: body
variant: default
title: $images.photo
---

Some body text`;
      const testAssets = { images: { photo: "/resolved/photo.png" } };
      compileDocument(md, { theme: mockTheme(), assets: testAssets });
      assert.strictEqual(receivedProps.length, 1);
      // Asset refs in non-image fields pass through as raw strings
      assert.strictEqual(receivedProps[0].title, "$images.photo");
    });
  });

  describe("slide naming", () => {
    it("should build name from string frontmatter values", () => {
      const raw = {
        index: 0,
        frontmatter: { layout: "body", eyebrow: "RECAP" },
        body: "",
        slots: {},
      };
      const name = buildSlideName(raw as any);
      assert.ok(name.includes("layout: body"));
      assert.ok(name.includes("eyebrow: RECAP"));
    });

    it("should use explicit name from frontmatter", () => {
      const raw = {
        index: 0,
        frontmatter: { layout: "body", name: "Day AI Story", eyebrow: "STORY" },
        body: "",
        slots: {},
      };
      const name = buildSlideName(raw as any);
      assert.strictEqual(name, "Day AI Story");
    });

    it("should truncate long values at 50 chars", () => {
      const longValue = "A".repeat(60);
      const raw = {
        index: 0,
        frontmatter: { layout: "body", description: longValue },
        body: "",
        slots: {},
      };
      const name = buildSlideName(raw as any);
      assert.ok(name.includes(`${"A".repeat(50)}...`));
      assert.ok(!name.includes("A".repeat(51)));
    });

    it("should show array fields as [N items]", () => {
      const raw = {
        index: 0,
        frontmatter: { layout: "cards", items: ["a", "b", "c"] },
        body: "",
        slots: {},
      };
      const name = buildSlideName(raw as any);
      assert.ok(name.includes("items: [3 items]"));
    });

    it("should include title from frontmatter in name", () => {
      const raw = {
        index: 0,
        frontmatter: { layout: "body", title: "FM Title" },
        body: "",
        slots: {},
      };
      const name = buildSlideName(raw as any);
      assert.ok(name.includes("title: FM Title"));
    });
  });
});
