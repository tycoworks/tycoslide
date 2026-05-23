// Document Compiler Tests
// Tests for compileDocument: markdown file → Presentation
//
// IMPORTANT: The slide parser treats the first ---...--- block as GLOBAL
// frontmatter. Slide frontmatter starts AFTER the global block.
// Every test document must begin with a global FM header.

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import { type Background, NODE_TYPE, type SlideNode, type TemplateConfig } from "@tycoslide/core";
import { param, schema } from "@tycoslide/sdk";
import { buildSlideName, compileDocument } from "../src/markdown/documentCompiler.js";
import { AssetCatalog } from "../src/theme/template.js";
import { mockTheme } from "./mocks.js";
import { testComponents } from "./test-components.js";

/** Mock asset catalog with a single $icons.shield entry for testing. */
const mockAssets = new AssetCatalog(pathToFileURL("/mock/assets/src/index.js").href, {
  icons: {
    shield: { path: "icons/shield.png", documentation: { description: "Shield icon" } },
  },
});

// ============================================
// TEST SETUP
// ============================================

let receivedProps: any[] = [];

/** Global FM header — required before any slide frontmatter */
const HEADER = `---\ntheme: test\n---\n\n`;

/** Mock background — plain data object */
const mockBackground: Background = { color: "#FFFFFF" };

/** Default TemplateConfig for test layouts */
const defaultConfig: TemplateConfig = { background: mockBackground, tokens: {} };

function makeOptions() {
  return {
    theme: mockTheme({
      layouts: {
        simple: defaultConfig,
        body: defaultConfig,
        slots: defaultConfig,
        strict: defaultConfig,
        default: defaultConfig,
        array: defaultConfig,
      },
    }),
    assets: mockAssets,
    layouts: [simpleLayout, bodyLayout, slotLayout, strictLayout, defaultLayout, arrayLayout],
    components: testComponents,
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

const arrayLayout = {
  name: "array",
  description: "Layout with array and nested-object params",
  params: {
    icons: param.optional(schema.array(schema.string())),
    cards: param.optional(schema.array(schema.object({ icon: schema.string(), label: schema.string() }))),
  },
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

    it("populates layoutName from TemplateConfig", () => {
      const theme = mockTheme({
        layouts: {
          simple: { background: { color: "#FFFFFF" }, tokens: {} },
          body: defaultConfig,
          slots: defaultConfig,
          strict: defaultConfig,
          default: defaultConfig,
        },
      });
      const md = `${HEADER}---\ntemplate: simple\ntitle: Test\n---`;
      const pres = compileDocument(md, {
        theme,
        assets: mockAssets,
        layouts: [simpleLayout, bodyLayout, slotLayout, strictLayout, defaultLayout],
        components: testComponents,
      });
      const slides = (pres as any).deferredSlides as { slide: any }[];
      assert.strictEqual(slides[0].slide.layoutName, "simple");
    });

    it("throws when theme has no config for the layout", () => {
      const theme = mockTheme({ layouts: {} });
      const md = `${HEADER}---\ntemplate: simple\ntitle: Test\n---`;
      assert.throws(
        () => compileDocument(md, { theme, assets: mockAssets, layouts: [simpleLayout], components: testComponents }),
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
    it("should resolve $category.name asset references via resolver", () => {
      const md =
        HEADER +
        `---
template: body
title: $icons.shield
---

Some body text`;
      compileDocument(md, {
        ...makeOptions(),
      });
      assert.strictEqual(receivedProps.length, 1);
      assert.strictEqual(receivedProps[0].title, "/mock/assets/icons/shield.png");
    });

    it("should throw on unknown asset reference", () => {
      const md =
        HEADER +
        `---
template: body
title: $icons.nonexistent
---

Some body text`;
      assert.throws(() => compileDocument(md, makeOptions()), /Unknown asset reference.*nonexistent/);
    });

    it("should not treat $100 or $variable as asset references", () => {
      const md =
        HEADER +
        `---
template: body
title: $100
---

Some body text`;
      compileDocument(md, {
        ...makeOptions(),
      });
      assert.strictEqual(receivedProps.length, 1);
      assert.strictEqual(receivedProps[0].title, "$100");
    });

    it("should resolve $category.name asset references in slot content (directives)", () => {
      const md =
        HEADER +
        `---
template: body
---

:::image
$icons.shield
:::`;
      compileDocument(md, {
        ...makeOptions(),
      });
      assert.strictEqual(receivedProps.length, 1);
      // The body slot compiles the :::image directive into a ComponentNode.
      // resolveSlotAssetRefs should resolve the $icons.shield content to a disk path.
      const bodySlot = receivedProps[0].body;
      assert.ok(Array.isArray(bodySlot), "body slot should be an array of nodes");
      const imageNode = bodySlot.find((n: any) => n.componentName === "image");
      assert.ok(imageNode, "should have an image component node");
      assert.strictEqual(imageNode.content, "/mock/assets/icons/shield.png");
    });

    it("should resolve asset references in string array params", () => {
      const md =
        HEADER +
        `---
template: array
icons:
  - $icons.shield
  - plain-text.png
---`;
      compileDocument(md, makeOptions());
      assert.strictEqual(receivedProps.length, 1);
      assert.deepStrictEqual(receivedProps[0].icons, ["/mock/assets/icons/shield.png", "plain-text.png"]);
    });

    it("should resolve asset references in nested object array params", () => {
      const md =
        HEADER +
        `---
template: array
cards:
  - icon: $icons.shield
    label: Security
  - icon: logo.png
    label: Brand
---`;
      compileDocument(md, makeOptions());
      assert.strictEqual(receivedProps.length, 1);
      assert.strictEqual(receivedProps[0].cards[0].icon, "/mock/assets/icons/shield.png");
      assert.strictEqual(receivedProps[0].cards[1].icon, "logo.png");
    });

    it("should leave non-asset strings unchanged", () => {
      const md =
        HEADER +
        `---
template: body
title: Just a normal title
---

Some body text`;
      compileDocument(md, {
        ...makeOptions(),
      });
      assert.strictEqual(receivedProps.length, 1);
      assert.strictEqual(receivedProps[0].title, "Just a normal title");
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
