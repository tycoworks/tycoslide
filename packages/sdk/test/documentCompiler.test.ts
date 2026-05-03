// Document Compiler Tests
// Tests for compileDocument: markdown file → Presentation
//
// IMPORTANT: The slide parser treats the first ---...--- block as GLOBAL
// frontmatter. Slide frontmatter starts AFTER the global block.
// Every test document must begin with a global FM header.

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  Bounds,
  component,
  type MasterDefinition,
  NODE_TYPE,
  param,
  type SlideNode,
  schema,
  type TemplateConfig,
} from "@tycoslide/core";
import { buildSlideName, compileDocument } from "../src/markdown/documentCompiler.js";
import { mockTheme } from "./mocks.js";
import { testComponents } from "./test-components.js";

// ============================================
// TEST SETUP
// ============================================

let receivedProps: any[] = [];

/** Global FM header — required before any slide frontmatter */
const HEADER = `---\ntheme: test\n---\n\n`;

/** Default TemplateConfig for test layouts */
const defaultConfig: TemplateConfig = { masterName: "default", masterTokens: {}, layoutTokens: {} };

/** Mock master that returns full-slide content bounds */
const mockMaster: MasterDefinition = {
  name: "default",
  render: (_tokens, slideSize) => ({
    content: component("test", {}),
    contentBounds: new Bounds(0, 0, slideSize.width, slideSize.height),
    background: { color: "#FFFFFF" },
  }),
};

function makeOptions() {
  return {
    theme: mockTheme({
      layouts: {
        simple: defaultConfig,
        body: defaultConfig,
        slots: defaultConfig,
        strict: defaultConfig,
        default: defaultConfig,
      },
    }),
    layouts: [simpleLayout, bodyLayout, slotLayout, strictLayout, defaultLayout],
    components: testComponents,
    masters: [mockMaster],
  };
}

// Mock layouts — return SlideNode (content only)
function mockContent(props: any): SlideNode {
  receivedProps.push(props);
  return { type: NODE_TYPE.COMPONENT, componentName: "test", params: props, content: undefined };
}

const simpleLayout = {
  name: "simple",
  description: "Test layout with just title",
  params: { title: schema.string() },
  render: (params: any, slots: any): SlideNode => mockContent({ ...params, ...slots }),
};

const bodyLayout = {
  name: "body",
  description: "Body layout with title and body",
  params: { title: param.optional(schema.string()) },
  slots: ["body"],
  render: (params: any, slots: any): SlideNode => mockContent({ ...params, ...slots }),
};

const slotLayout = {
  name: "slots",
  description: "Slot layout with named slots",
  params: { title: schema.string(), eyebrow: schema.string() },
  slots: ["left", "right"],
  render: (params: any, slots: any): SlideNode => mockContent({ ...params, ...slots }),
};

const strictLayout = {
  name: "strict",
  description: "Strict layout with required field",
  params: { title: schema.string(), required_field: schema.string() },
  render: (params: any, slots: any): SlideNode => mockContent({ ...params, ...slots }),
};

const defaultLayout = {
  name: "default",
  description: "Default layout with optional body",
  params: { title: param.optional(schema.string()), body: param.optional(schema.string()) },
  render: (params: any, slots: any): SlideNode => mockContent({ ...params, ...slots }),
};

// ============================================
// TESTS
// ============================================

describe("Document Compiler", () => {
  beforeEach(() => {
    receivedProps = [];
  });

  describe("parameter mapping", () => {
    it("should compile a minimal frontmatter-only slide", () => {
      const md =
        HEADER +
        `---
template: simple
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
template: simple
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
template: body
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
template: slots
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
template: simple
title: Slide with Notes
notes: These are speaker notes.
---`;
      const pres = compileDocument(md, makeOptions());
      const slides = (pres as any).deferredSlides as { slide: any }[];
      assert.strictEqual(slides.length, 1);
      assert.strictEqual(slides[0].slide.notes, "These are speaker notes.");
    });

    it("populates masterName and masterTokens from TemplateConfig", () => {
      const theme = mockTheme({
        layouts: {
          simple: { masterName: "custom-master", masterTokens: { bg: "#000" }, layoutTokens: {} },
          body: defaultConfig,
          slots: defaultConfig,
          strict: defaultConfig,
          default: defaultConfig,
        },
      });
      const md = `${HEADER}---\ntemplate: simple\ntitle: Test\n---`;
      const pres = compileDocument(md, {
        theme,
        layouts: [simpleLayout, bodyLayout, slotLayout, strictLayout, defaultLayout],
        components: testComponents,
        masters: [mockMaster],
      });
      const slides = (pres as any).deferredSlides as { slide: any }[];
      assert.strictEqual(slides[0].slide.masterName, "custom-master");
      assert.deepStrictEqual(slides[0].slide.masterTokens, { bg: "#000" });
    });

    it("throws when theme has no config for the layout", () => {
      const theme = mockTheme({ layouts: {} });
      const md = `${HEADER}---\ntemplate: simple\ntitle: Test\n---`;
      assert.throws(
        () =>
          compileDocument(md, { theme, layouts: [simpleLayout], components: testComponents, masters: [mockMaster] }),
        /theme has no config for template 'simple'/,
      );
    });

    it("should compile multiple slides", () => {
      const md =
        HEADER +
        `---
template: simple
title: Slide One
---

---
template: simple
title: Slide Two
---

---
template: simple
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
template: default
body: Frontmatter body content
---

Markdown body content`;
      assert.throws(() => compileDocument(md, makeOptions()), /does not accept body content/);
    });

    it("should throw on ::slot:: markers for undeclared slots", () => {
      const md =
        HEADER +
        `---
template: slots
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
          assert.ok(err.message.includes("missing 'template'"));
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
          assert.ok(err.message.includes("missing 'template'"));
          return true;
        },
      );
    });

    it("should throw on unknown template name", () => {
      const md =
        HEADER +
        `---
template: nonexistent
---`;
      assert.throws(
        () => compileDocument(md, makeOptions()),
        (err: any) => {
          assert.ok(err.message.includes("nonexistent"));
          assert.ok(err.message.includes("unknown template"));
          assert.ok(err.message.includes("Available:"));
          return true;
        },
      );
    });

    it("should throw on validation failure with missing required field", () => {
      const md =
        HEADER +
        `---
template: strict
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
template: body
title: $images.photo
---

Some body text`;
      const testAssets = { images: { photo: "/resolved/photo.png" } };
      compileDocument(md, { ...makeOptions(), assets: testAssets });
      assert.strictEqual(receivedProps.length, 1);
      // Asset refs in non-image fields pass through as raw strings
      assert.strictEqual(receivedProps[0].title, "$images.photo");
    });
  });

  describe("slide naming", () => {
    it("should build name from string frontmatter values", () => {
      const raw = {
        index: 0,
        frontmatter: { template: "body", eyebrow: "RECAP" },
        body: "",
        slots: {},
      };
      const name = buildSlideName(raw as any);
      assert.ok(name.includes("template: body"));
      assert.ok(name.includes("eyebrow: RECAP"));
    });

    it("should use explicit name from frontmatter", () => {
      const raw = {
        index: 0,
        frontmatter: { template: "body", name: "Day AI Story", eyebrow: "STORY" },
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
        frontmatter: { template: "body", description: longValue },
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
        frontmatter: { template: "cards", items: ["a", "b", "c"] },
        body: "",
        slots: {},
      };
      const name = buildSlideName(raw as any);
      assert.ok(name.includes("items: [3 items]"));
    });

    it("should include title from frontmatter in name", () => {
      const raw = {
        index: 0,
        frontmatter: { template: "body", title: "FM Title" },
        body: "",
        slots: {},
      };
      const name = buildSlideName(raw as any);
      assert.ok(name.includes("title: FM Title"));
    });
  });
});
