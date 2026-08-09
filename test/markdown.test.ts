import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSlideDocument } from "../dist/markdown/slideParser.js";
import { compileDeck } from "../dist/markdown/deckCompiler.js";
import { compileMarkdownDeck } from "../dist/markdown/index.js";
import { templateKeys, templateToSegments } from "../dist/markdown/textTemplate.js";
import type { TextFill, ImageFill, StyledParagraph } from "../dist/engine/types.js";
import { FitMode, SlotType } from "../dist/engine/types.js";
import type { CompilerLayout, CompilerParameter, CompilerSlot } from "../dist/markdown/types.js";
import { CompilerSlotType, FenceType, ParameterType } from "../dist/markdown/types.js";

// ============================================
// slideParser
// ============================================

describe("parseSlideDocument", () => {
  it("single slide with frontmatter after global", () => {
    const doc = parseSlideDocument(`---
output: deck.pptx
---
---
layout: title
headline: Welcome
---
Some body text`);

    assert.equal(doc.global["output"], "deck.pptx");
    assert.equal(doc.slides.length, 1);
    assert.deepEqual(doc.slides[0].frontmatter, {
      layout: "title",
      headline: "Welcome",
    });
    assert.equal(doc.slides[0].body, "Some body text");
  });

  it("single slide when file starts with slide separator", () => {
    const doc = parseSlideDocument(`---
layout: title
headline: Welcome
---
Some body text`);

    assert.equal(doc.global["layout"], "title");
    assert.equal(doc.global["headline"], "Welcome");
    assert.equal(doc.slides.length, 1);
    assert.equal(doc.slides[0].body, "Some body text");
  });

  it("multiple slides split on ---", () => {
    const doc = parseSlideDocument(`---
output: deck.pptx
---
---
layout: title
---
First slide body
---
layout: content
---
Second slide body`);

    assert.equal(doc.slides.length, 2);
    assert.equal(doc.slides[0].frontmatter["layout"], "title");
    assert.equal(doc.slides[0].body, "First slide body");
    assert.equal(doc.slides[1].frontmatter["layout"], "content");
    assert.equal(doc.slides[1].body, "Second slide body");
  });

  it("global frontmatter extracted separately from slides", () => {
    const doc = parseSlideDocument(`---
output: quarterly-review.pptx
---
---
layout: title
---
Hello`);

    assert.equal(doc.global["output"], "quarterly-review.pptx");
    assert.equal(doc.slides.length, 1);
    assert.equal(doc.slides[0].frontmatter["layout"], "title");
    assert.equal(doc.slides[0].body, "Hello");
    assert.equal(doc.slides[0].frontmatter["output"], undefined);
  });

  it("::name:: slot markers split body into named slots", () => {
    const doc = parseSlideDocument(`---
output: deck.pptx
---
---
layout: two-column
---
Default body text
::left::
Left column content
::right::
Right column content`);

    assert.equal(doc.slides.length, 1);
    assert.equal(doc.slides[0].body, "Default body text");
    assert.equal(doc.slides[0].slots["left"], "Left column content");
    assert.equal(doc.slides[0].slots["right"], "Right column content");
  });

  it("--- inside code fences is NOT a slide separator", () => {
    const doc = parseSlideDocument(`---
output: deck.pptx
---
---
layout: code
---
Here is some code:
\`\`\`yaml
key: value
---
another: section
\`\`\`
After the fence`);

    assert.equal(doc.slides.length, 1);
    assert.equal(doc.slides[0].frontmatter["layout"], "code");
    assert.ok(doc.slides[0].body.includes("---"));
    assert.ok(doc.slides[0].body.includes("another: section"));
    assert.ok(doc.slides[0].body.includes("After the fence"));
  });

  it("::name:: inside code fences is NOT a slot marker", () => {
    const doc = parseSlideDocument(`---
output: deck.pptx
---
---
layout: demo
---
Before code
\`\`\`markdown
::left::
This is example markdown, not a slot
\`\`\`
After code`);

    assert.equal(doc.slides.length, 1);
    assert.equal(doc.slides[0].slots["left"], undefined);
    assert.ok(doc.slides[0].body.includes("::left::"));
    assert.ok(doc.slides[0].body.includes("After code"));
  });

  it("empty body with frontmatter only", () => {
    const doc = parseSlideDocument(`---
output: deck.pptx
---
---
layout: divider
headline: Section Break
---`);

    assert.equal(doc.slides.length, 1);
    assert.equal(doc.slides[0].frontmatter["layout"], "divider");
    assert.equal(doc.slides[0].frontmatter["headline"], "Section Break");
    assert.equal(doc.slides[0].body, "");
  });

  it("body-only slide without frontmatter", () => {
    const doc = parseSlideDocument(`Just some body text without any frontmatter`);

    assert.equal(doc.slides.length, 1);
    assert.deepEqual(doc.slides[0].frontmatter, {});
    assert.equal(doc.slides[0].body, "Just some body text without any frontmatter");
  });

  it("slide indices are sequential", () => {
    const doc = parseSlideDocument(`---
output: deck.pptx
---
---
layout: a
---
---
layout: b
---
---
layout: c
---`);

    assert.equal(doc.slides.length, 3);
    assert.equal(doc.slides[0].index, 0);
    assert.equal(doc.slides[1].index, 1);
    assert.equal(doc.slides[2].index, 2);
  });

  it("tilde code fences are also protected", () => {
    const doc = parseSlideDocument(`---
output: deck.pptx
---
---
layout: demo
---
~~~
---
~~~
After fence`);

    assert.equal(doc.slides.length, 1);
    assert.ok(doc.slides[0].body.includes("---"));
    assert.ok(doc.slides[0].body.includes("After fence"));
  });

  it("empty global frontmatter produces empty object", () => {
    const doc = parseSlideDocument(`No frontmatter here at all`);

    assert.deepEqual(doc.global, {});
  });

  it("multiple slots without default body", () => {
    const doc = parseSlideDocument(`---
output: deck.pptx
---
---
layout: columns
---
::left::
Left content
::right::
Right content`);

    assert.equal(doc.slides[0].body, "");
    assert.equal(doc.slides[0].slots["left"], "Left content");
    assert.equal(doc.slides[0].slots["right"], "Right content");
  });
});

// ============================================
// compileDeck
// ============================================

// A degenerate one-key text shape whose shapeName equals its single key, so
// its expanded content lands under `content[key]` — keeping key-addressed
// assertions readable. Multi-key behavior is exercised separately below.
function keyedTemplateParam(key: string): CompilerParameter {
  return { shapeName: key, template: `{${key}}`, type: ParameterType.Template };
}

function imageParam(key: string, extras: Partial<CompilerParameter> = {}): CompilerParameter {
  return {
    key,
    shapeName: `s_${key}`,
    type: ParameterType.Image,
    fit: FitMode.Contain,
    ...extras,
  };
}

function textSlot(key: string): CompilerSlot {
  return { key, shapeName: `s_${key}`, type: CompilerSlotType.Text };
}

function tableSlot(key: string): CompilerSlot {
  return { key, shapeName: `s_${key}`, type: CompilerSlotType.Table };
}

function codeSlot(key: string): CompilerSlot {
  return { key, shapeName: `s_${key}`, type: CompilerSlotType.Code };
}

function makeLayout(name: string, slots: CompilerSlot[]): CompilerLayout {
  return { name, slideNumber: 1, description: "", whenToUse: "", whenNotToUse: "", parameters: [], slots };
}

/**
 * Build a layout from bare key lists. `contentKeys` become template parameters,
 * except "body" which becomes a body slot; `assetKeys` become image parameters.
 */
function testLayout(name: string, contentKeys: string[] = [], assetKeys: string[] = []): CompilerLayout {
  return {
    name,
    slideNumber: 1,
    description: "",
    whenToUse: "",
    whenNotToUse: "",
    parameters: [...contentKeys.filter((k) => k !== "body").map(keyedTemplateParam), ...assetKeys.map((k) => imageParam(k))],
    slots: contentKeys.filter((k) => k === "body").map(textSlot),
  };
}

/** Shorthand: single-line StyledParagraph. */
const line = (text: string): StyledParagraph => ({ runs: [{ text }] });
const cellPara = line;
/** Shorthand: the TextFill the compiler wraps prose/inline text in. */
const paras = (...ps: StyledParagraph[]): TextFill => ({ paragraphs: ps });

describe("compileDeck", () => {
  it("minimal deck with single slide", () => {
    const deck = compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        { index: 0, frontmatter: { layout: "title" }, body: "", slots: {} },
      ],
    }, [testLayout("title")]);

    assert.equal(deck.steps.length, 1);
    assert.equal(deck.steps[0].layout, "title");
  });

  it("global output maps to Deck.output", () => {
    const deck = compileDeck({
      global: { theme: "./theme.json", output: "my-deck.pptx" },
      slides: [
        { index: 0, frontmatter: { layout: "title" }, body: "", slots: {} },
      ],
    }, [testLayout("title")]);

    assert.equal(deck.output, "my-deck.pptx");
  });

  it("non-layout frontmatter keys become content entries", () => {
    const deck = compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        {
          index: 0,
          frontmatter: { layout: "hero", headline: "Big Title", subtitle: "Sub" },
          body: "",
          slots: {},
        },
      ],
    }, [testLayout("hero", ["headline", "subtitle"])]);

    assert.deepEqual(deck.steps[0].content!["headline"], tvar("headline", "Big Title"));
    assert.deepEqual(deck.steps[0].content!["subtitle"], tvar("subtitle", "Sub"));
    assert.equal(deck.steps[0].content!["layout"], undefined);
  });

  it("body text becomes content.body as a TextFill", () => {
    const deck = compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        {
          index: 0,
          frontmatter: { layout: "content" },
          body: "Line one\nLine two\nLine three",
          slots: {},
        },
      ],
    }, [testLayout("content", ["body"])]);

    assert.deepEqual(deck.steps[0].content!["body"], paras(line("Line one"), line("Line two"), line("Line three")));
  });

  it("named slots become content entries as TextFills", () => {
    const deck = compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        {
          index: 0,
          frontmatter: { layout: "two-col" },
          body: "",
          slots: { left: "Left line 1\nLeft line 2", right: "Right content" },
        },
      ],
    }, [makeLayout("two-col", [textSlot("left"), textSlot("right")])]);

    assert.deepEqual(deck.steps[0].content!["left"], paras(line("Left line 1"), line("Left line 2")));
    assert.deepEqual(deck.steps[0].content!["right"], paras(line("Right content")));
  });

  it("frontmatter keys matching image parameters become ImageFills in content", () => {
    const layouts: CompilerLayout[] = [
      {
        name: "hero",
        slideNumber: 1,
        description: "",
        whenToUse: "",
        whenNotToUse: "",
        parameters: [
          { key: "hero", shapeName: "s1", type: ParameterType.Image, fit: FitMode.Cover },
          { key: "logo", shapeName: "s2", type: ParameterType.Image, fit: FitMode.Contain },
        ],
        slots: [],
      },
    ];
    const deck = compileDeck(
      {
        global: { theme: "./theme.json" },
        slides: [
          {
            index: 0,
            frontmatter: {
              layout: "hero",
              hero: "images/hero.png",
              logo: "images/logo.svg",
            },
            body: "",
            slots: {},
          },
        ],
      },
      layouts,
    );

    const heroBlock: ImageFill = { type: SlotType.Image, path: "images/hero.png", fit: FitMode.Cover };
    const logoBlock: ImageFill = { type: SlotType.Image, path: "images/logo.svg", fit: FitMode.Contain };
    assert.deepEqual(deck.steps[0].content!["hero"], heroBlock);
    assert.deepEqual(deck.steps[0].content!["logo"], logoBlock);
  });

  it("global theme maps to Deck.theme", () => {
    const deck = compileDeck({
      global: { theme: "./custom/theme.json" },
      slides: [
        { index: 0, frontmatter: { layout: "title" }, body: "", slots: {} },
      ],
    }, [testLayout("title")]);

    assert.equal(deck.theme, "./custom/theme.json");
  });

  it("missing theme throws", () => {
    assert.throws(
      () =>
        compileDeck({
          global: {},
          slides: [
            { index: 0, frontmatter: { layout: "title" }, body: "", slots: {} },
          ],
        }, []),
      (err: Error) => {
        assert.ok(err.message.includes("theme"));
        return true;
      },
    );
  });

  it("missing layout throws", () => {
    assert.throws(
      () =>
        compileDeck({
          global: { theme: "./theme.json" },
          slides: [
            { index: 0, frontmatter: {}, body: "No layout here", slots: {} },
          ],
        }, []),
      (err: Error) => {
        assert.ok(err.message.includes("layout"));
        return true;
      },
    );
  });

  it("unknown layout throws", () => {
    assert.throws(
      () =>
        compileDeck({
          global: { theme: "./theme.json" },
          slides: [
            { index: 0, frontmatter: { layout: "nonexistent" }, body: "", slots: {} },
          ],
        }, [testLayout("title")]),
      (err: Error) => {
        assert.ok(err.message.includes("unknown layout"));
        assert.ok(err.message.includes("nonexistent"));
        return true;
      },
    );
  });

  it("unknown frontmatter key throws", () => {
    assert.throws(
      () =>
        compileDeck({
          global: { theme: "./theme.json" },
          slides: [
            {
              index: 0,
              frontmatter: { layout: "title", titel: "Typo" },
              body: "",
              slots: {},
            },
          ],
        }, [testLayout("title", ["title"])]),
      (err: Error) => {
        assert.ok(err.message.includes("unknown key"));
        assert.ok(err.message.includes("titel"));
        return true;
      },
    );
  });

  it("unknown named slot throws", () => {
    assert.throws(
      () =>
        compileDeck({
          global: { theme: "./theme.json" },
          slides: [
            {
              index: 0,
              frontmatter: { layout: "two-col" },
              body: "",
              slots: { bogus: "Content" },
            },
          ],
        }, [makeLayout("two-col", [textSlot("left"), textSlot("right")])]),
      (err: Error) => {
        assert.ok(err.message.includes("unknown slot"));
        assert.ok(err.message.includes("bogus"));
        return true;
      },
    );
  });

  it("missing required image parameter throws", () => {
    const base = testLayout("hero", ["title"]);
    const layouts: CompilerLayout[] = [{
      ...base,
      parameters: [...base.parameters, imageParam("bg", { required: true })],
    }];
    assert.throws(
      () =>
        compileDeck({
          global: { theme: "./theme.json" },
          slides: [
            { index: 0, frontmatter: { layout: "hero", title: "Hello" }, body: "", slots: {} },
          ],
        }, layouts),
      (err: Error) => {
        assert.ok(err.message.includes("requires parameter"));
        assert.ok(err.message.includes("bg"));
        return true;
      },
    );
  });

  it("body content on layout without body slot throws", () => {
    assert.throws(
      () =>
        compileDeck({
          global: { theme: "./theme.json" },
          slides: [
            {
              index: 0,
              frontmatter: { layout: "title", headline: "Hi" },
              body: "This layout has no body slot",
              slots: {},
            },
          ],
        }, [testLayout("title", ["headline"])]),
      (err: Error) => {
        assert.ok(err.message.includes("does not accept body content"));
        return true;
      },
    );
  });

  it("body written as a frontmatter key throws (body is a slot, not a parameter)", () => {
    // Wrong-channel: `body` is a slot (a body region), never a frontmatter
    // parameter. The frontmatter loop validates against parameters only, so a
    // `body:` line is an unknown parameter — no dual-definition guard needed.
    assert.throws(
      () =>
        compileDeck({
          global: { theme: "./theme.json" },
          slides: [
            {
              index: 0,
              frontmatter: { layout: "content", body: "From frontmatter" },
              body: "",
              slots: {},
            },
          ],
        }, [testLayout("content", ["body"])]),
      (err: Error) => {
        assert.ok(err.message.includes("unknown key"));
        assert.ok(err.message.includes("body"));
        return true;
      },
    );
  });

  it("unknown global frontmatter key throws", () => {
    assert.throws(
      () =>
        compileDeck({
          global: { theme: "./theme.json", bogus: "value" },
          slides: [
            { index: 0, frontmatter: { layout: "title" }, body: "", slots: {} },
          ],
        }, [testLayout("title")]),
      (err: Error) => {
        assert.ok(err.message.includes("Unknown key"));
        assert.ok(err.message.includes("bogus"));
        return true;
      },
    );
  });

  it("empty body produces no body key in content", () => {
    const deck = compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        {
          index: 0,
          frontmatter: { layout: "divider", headline: "Break" },
          body: "",
          slots: {},
        },
      ],
    }, [testLayout("divider", ["headline"])]);

    assert.equal(deck.steps[0].content!["body"], undefined);
    assert.deepEqual(deck.steps[0].content!["headline"], tvar("headline", "Break"));
  });

  it("whitespace-only body produces no body key", () => {
    const deck = compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        {
          index: 0,
          frontmatter: { layout: "spacer" },
          body: "   \n  \n   ",
          slots: {},
        },
      ],
    }, [testLayout("spacer")]);

    assert.equal(deck.steps[0].content!["body"], undefined);
  });

  it("steps with no supplied content produce an empty content object", () => {
    const deck = compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        { index: 0, frontmatter: { layout: "title" }, body: "", slots: {} },
      ],
    }, [testLayout("title")]);

    assert.deepEqual(deck.steps[0].content, {});
  });
});

// ============================================
// Text templating
// ============================================

/** A template parameter (no top-level key) with an explicit template string. */
function templateParam(shapeName: string, template: string, required = false): CompilerParameter {
  const param: CompilerParameter = { shapeName, template, type: ParameterType.Template };
  if (required) param.required = true;
  return param;
}

function templateLayout(name: string, params: CompilerParameter[], slots: CompilerSlot[] = []): CompilerLayout {
  return { name, slideNumber: 1, description: "", whenToUse: "", whenNotToUse: "", parameters: params, slots };
}

function compileOne(layout: CompilerLayout, frontmatter: Record<string, unknown>) {
  return compileDeck(
    { global: { theme: "t" }, slides: [{ index: 0, frontmatter: { layout: layout.name, ...frontmatter }, body: "", slots: {} }] },
    [layout],
  );
}

describe("templateKeys", () => {
  it("collects keys in first-seen order, de-duped", () => {
    assert.deepEqual(templateKeys("{a} {b}{a}{c}"), ["a", "b", "c"]);
  });

  it("ignores escaped braces", () => {
    assert.deepEqual(templateKeys("{{a}} {b}"), ["b"]);
  });

  it("empty for a literal-only template", () => {
    assert.deepEqual(templateKeys(" - "), []);
  });
});

const L = (text: string) => ({ kind: "literal", text });
const V = (key: string, value: string) => ({ kind: "variable", key, value });
/** TemplateFill for a degenerate one-variable text shape (template "{key}"). */
const tvar = (key: string, value: string) => ({ lines: [[V(key, value)]] });

describe("templateToSegments", () => {
  it("parses a line into ordered literal/variable segments", () => {
    assert.deepEqual(templateToSegments("{a}-{b}", new Map([["a", "1"], ["b", "2"]]), "s"), [
      [V("a", "1"), L("-"), V("b", "2")],
    ]);
  });

  it("splits newlines into separate lines", () => {
    assert.deepEqual(templateToSegments("{name}\n{jobTitle}", new Map([["name", "Maya"], ["jobTitle", "Founder"]]), "s"), [
      [V("name", "Maya")],
      [V("jobTitle", "Founder")],
    ]);
  });

  it("collapses {{ and }} escapes into a literal", () => {
    assert.deepEqual(templateToSegments("{{ and }}", new Map(), "s"), [[L("{ and }")]]);
  });

  it("a literal-only line is one literal segment", () => {
    assert.deepEqual(templateToSegments(" - ", new Map(), "s"), [[L(" - ")]]);
  });

  it("throws naming the shape and key on a missing value", () => {
    assert.throws(() => templateToSegments("{a}", new Map(), "welcomeBar"), /welcomeBar.*"a"/);
  });
});

describe("compileDeck text templating", () => {
  it("compiles a line into a TemplateFill of segments keyed by shapeName", () => {
    const layout = templateLayout("welcome", [templateParam("welcomeBar", "{lastname}, {firstname} - {company}")]);
    const deck = compileOne(layout, { lastname: "Chen", firstname: "Maya", company: "Acme" });
    assert.deepEqual(deck.steps[0].content!["welcomeBar"], {
      lines: [[V("lastname", "Chen"), L(", "), V("firstname", "Maya"), L(" - "), V("company", "Acme")]],
    });
  });

  it("splits a newline template into one segment line per paragraph", () => {
    const layout = templateLayout("nc", [templateParam("bar", "{name}\n - \n{company}")]);
    const deck = compileOne(layout, { name: "Maya", company: "Acme" });
    assert.deepEqual(deck.steps[0].content!["bar"], {
      lines: [[V("name", "Maya")], [L(" - ")], [V("company", "Acme")]],
    });
  });

  it("emits one segment line per template line (multi-line credits)", () => {
    const layout = templateLayout("credits", [templateParam("card", "{name}\n{jobTitle}")]);
    const deck = compileOne(layout, { name: "Maya", jobTitle: "Founder" });
    assert.deepEqual(deck.steps[0].content!["card"], { lines: [[V("name", "Maya")], [V("jobTitle", "Founder")]] });
  });

  it("unescapes {{ }} into surrounding literal segments", () => {
    const layout = templateLayout("esc", [templateParam("bar", "{{{name}}}")]);
    const deck = compileOne(layout, { name: "Maya" });
    assert.deepEqual(deck.steps[0].content!["bar"], { lines: [[L("{"), V("name", "Maya"), L("}")]] });
  });

  it("leaves a parameter unfilled when none of its keys are supplied", () => {
    const layout = templateLayout("welcome", [templateParam("welcomeBar", "{lastname}, {firstname}")]);
    const deck = compileOne(layout, {});
    assert.equal(deck.steps[0].content!["welcomeBar"], undefined);
  });

  it("throws when a parameter is partially filled (a key has no value)", () => {
    const layout = templateLayout("welcome", [templateParam("welcomeBar", "{lastname}, {firstname} - {company}")]);
    assert.throws(() => compileOne(layout, { lastname: "Chen", firstname: "Maya" }), /welcomeBar.*"company"/);
  });

  it("throws on a frontmatter key matching no template key or image parameter", () => {
    const layout = templateLayout("welcome", [templateParam("welcomeBar", "{lastname}")]);
    assert.throws(() => compileOne(layout, { lastname: "Chen", nope: "x" }), /unknown key "nope".*lastname/);
  });

  it("throws when a required parameter is not filled", () => {
    const layout = templateLayout("welcome", [templateParam("welcomeBar", "{title}", true)]);
    assert.throws(() => compileOne(layout, {}), /requires template parameter "welcomeBar"/);
  });
});

describe("validateLayout (key-space collisions)", () => {
  it("throws when one key is declared by two template parameters", () => {
    const layout = templateLayout("dup", [templateParam("a", "{name}"), templateParam("b", "{name}")]);
    assert.throws(() => compileOne(layout, {}), /key "name".*declared twice/);
  });

  it("throws when a template key collides with an image parameter key", () => {
    const layout = templateLayout("clash", [templateParam("bar", "{logo}"), imageParam("logo")]);
    assert.throws(() => compileOne(layout, {}), /key "logo".*declared twice/);
  });

  it("throws when a template parameter's shapeName collides with a slot key", () => {
    const layout = templateLayout("clash", [templateParam("body", "{title}")], [textSlot("body")]);
    assert.throws(() => compileOne(layout, {}), /name "body".*collides/);
  });

  it("throws when a required template parameter has no keys to fill", () => {
    const layout = templateLayout("lit", [templateParam("bar", "static text", true)]);
    assert.throws(() => compileOne(layout, {}), /required but its template has no keys/);
  });
});

// ============================================
// Integration: compileMarkdownDeck
// ============================================

describe("compileMarkdownDeck", () => {
  const closingBase = testLayout("closing", ["headline"]);
  const e2eLayouts: CompilerLayout[] = [
    testLayout("title", ["headline", "subtitle"]),
    {
      name: "two-column",
      slideNumber: 1,
      description: "",
      whenToUse: "",
      whenNotToUse: "",
      parameters: [keyedTemplateParam("headline")],
      slots: [textSlot("body"), textSlot("left"), textSlot("right")],
    },
    {
      ...closingBase,
      parameters: [...closingBase.parameters, imageParam("bg")],
    },
  ];

  it("full example end-to-end", () => {
    const source = `---
theme: ./theme.json
output: quarterly-review.pptx
---
---
layout: title
headline: Q4 2026 Review
subtitle: Engineering Team
---
---
layout: two-column
headline: Key Metrics
---
Revenue grew 25% YoY
::left::
Metric A improved
Metric B stable
::right::
Metric C grew
Metric D declined
---
layout: closing
headline: Questions?
bg: images/closing-bg.png
---`;

    const deck = compileMarkdownDeck(source, e2eLayouts);

    assert.equal(deck.output, "quarterly-review.pptx");
    assert.equal(deck.steps.length, 3);

    assert.equal(deck.steps[0].layout, "title");
    assert.deepEqual(deck.steps[0].content!["headline"], tvar("headline", "Q4 2026 Review"));
    assert.deepEqual(deck.steps[0].content!["subtitle"], tvar("subtitle", "Engineering Team"));
    assert.equal(deck.steps[0].content!["body"], undefined);

    assert.equal(deck.steps[1].layout, "two-column");
    assert.deepEqual(deck.steps[1].content!["headline"], tvar("headline", "Key Metrics"));
    assert.deepEqual(deck.steps[1].content!["body"], paras(line("Revenue grew 25% YoY")));
    assert.deepEqual(deck.steps[1].content!["left"], paras(line("Metric A improved"), line("Metric B stable")));
    assert.deepEqual(deck.steps[1].content!["right"], paras(line("Metric C grew"), line("Metric D declined")));

    assert.equal(deck.steps[2].layout, "closing");
    assert.deepEqual(deck.steps[2].content!["headline"], tvar("headline", "Questions?"));
    const closingBg: ImageFill = { type: SlotType.Image, path: "images/closing-bg.png", fit: FitMode.Contain };
    assert.deepEqual(deck.steps[2].content!["bg"], closingBg);
    assert.equal(deck.steps[2].content!["body"], undefined);
  });

  it("single slide with global frontmatter", () => {
    const source = `---
theme: ./theme.json
output: my-deck.pptx
---
---
layout: standalone
headline: Just One Slide
---
Single slide content`;

    const deck = compileMarkdownDeck(source, [testLayout("standalone", ["headline", "body"])]);

    assert.equal(deck.output, "my-deck.pptx");
    assert.equal(deck.steps.length, 1);
    assert.equal(deck.steps[0].layout, "standalone");
    assert.deepEqual(deck.steps[0].content!["headline"], tvar("headline", "Just One Slide"));
    assert.deepEqual(deck.steps[0].content!["body"], paras(line("Single slide content")));
  });

  it("deck without output in global frontmatter", () => {
    const source = `---
theme: corporate
---
---
layout: title
headline: No output key
---`;

    const deck = compileMarkdownDeck(source, [testLayout("title", ["headline"])]);

    assert.equal(deck.output, undefined);
    assert.equal(deck.steps.length, 1);
    assert.equal(deck.steps[0].layout, "title");
    assert.deepEqual(deck.steps[0].content!["headline"], tvar("headline", "No output key"));
  });
});

// ============================================
// GFM table detection in compileDeck
// ============================================

describe("compileDeck GFM table support", () => {
  it("body containing a GFM table is parsed as TableFill", () => {
    const deck = compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        {
          index: 0,
          frontmatter: { layout: "pricing" },
          body: "| Feature | Price |\n|---------|-------|\n| Widget  | $10   |",
          slots: {},
        },
      ],
    }, [makeLayout("pricing", [tableSlot("body")])]);

    const body = deck.steps[0].content!["body"];
    assert.ok(!Array.isArray(body));
    assert.ok(typeof body === "object" && "headers" in body);
    assert.deepEqual(body, {
      headers: [cellPara("Feature"), cellPara("Price")],
      rows: [[cellPara("Widget"), cellPara("$10")]],
    });
  });

  it("named slot containing a GFM table is parsed as TableFill", () => {
    const deck = compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        {
          index: 0,
          frontmatter: { layout: "pricing" },
          body: "",
          slots: {
            pricing: "| Plan | Cost |\n|------|------|\n| Free | $0   |\n| Pro  | $99  |",
          },
        },
      ],
    }, [makeLayout("pricing", [tableSlot("pricing")])]);

    const pricing = deck.steps[0].content!["pricing"];
    assert.ok(!Array.isArray(pricing));
    assert.ok(typeof pricing === "object" && "headers" in pricing);
    assert.deepEqual(pricing, {
      headers: [cellPara("Plan"), cellPara("Cost")],
      rows: [
        [cellPara("Free"), cellPara("$0")],
        [cellPara("Pro"), cellPara("$99")],
      ],
    });
  });

  it("non-table body is still parsed as a TextFill", () => {
    const deck = compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        {
          index: 0,
          frontmatter: { layout: "body" },
          body: "Just some prose\n- A bullet",
          slots: {},
        },
      ],
    }, [testLayout("body", ["body"])]);

    const body = deck.steps[0].content!["body"];
    assert.ok(!Array.isArray(body));
    assert.ok(Array.isArray((body as TextFill).paragraphs));
  });
});

// ============================================
// Code fence detection in compileDeck
// ============================================

describe("compileDeck code fence support", () => {
  it("body containing a code fence is parsed as CodeFence", () => {
    const deck = compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        {
          index: 0,
          frontmatter: { layout: "code-dark" },
          body: "```sql\nSELECT * FROM users;\n```",
          slots: {},
        },
      ],
    }, [makeLayout("code-dark", [codeSlot("body")])]);

    const body = deck.steps[0].content!["body"] as any;
    assert.equal(body.type, FenceType.Code);
    assert.equal(body.language, "sql");
    assert.equal(body.source, "SELECT * FROM users;");
  });

  it("named slot containing a code fence is parsed as CodeFence", () => {
    const deck = compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        {
          index: 0,
          frontmatter: { layout: "code-dark" },
          body: "",
          slots: {
            code: "```python\nprint('hello')\n```",
          },
        },
      ],
    }, [makeLayout("code-dark", [codeSlot("code")])]);

    const code = deck.steps[0].content!["code"] as any;
    assert.equal(code.type, FenceType.Code);
    assert.equal(code.language, "python");
    assert.equal(code.source, "print('hello')");
  });

  it("multi-line code fence preserves all lines", () => {
    const deck = compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        {
          index: 0,
          frontmatter: { layout: "code-dark" },
          body: "```typescript\nconst x = 1;\nconst y = 2;\nreturn x + y;\n```",
          slots: {},
        },
      ],
    }, [makeLayout("code-dark", [codeSlot("body")])]);

    const body = deck.steps[0].content!["body"] as any;
    assert.equal(body.type, FenceType.Code);
    assert.equal(body.language, "typescript");
    assert.equal(body.source, "const x = 1;\nconst y = 2;\nreturn x + y;");
  });

  it("non-fence body is still parsed as a TextFill", () => {
    const deck = compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        {
          index: 0,
          frontmatter: { layout: "body" },
          body: "Just some prose",
          slots: {},
        },
      ],
    }, [testLayout("body", ["body"])]);

    const body = deck.steps[0].content!["body"];
    assert.ok(!Array.isArray(body));
    assert.ok(Array.isArray((body as TextFill).paragraphs));
  });
});

// ============================================
// Mermaid fence detection in compileDeck
// ============================================

describe("compileDeck mermaid support", () => {
  function mermaidLayout(name: string, contentKeys: string[] = [], mermaidKey?: string): CompilerLayout {
    const layout = testLayout(name, contentKeys);
    if (mermaidKey) {
      layout.slots = [
        ...layout.slots,
        {
          key: mermaidKey,
          shapeName: `s_${mermaidKey}`,
          type: CompilerSlotType.Mermaid,
          mermaidVariant: "dark",
        },
      ];
    }
    return layout;
  }

  it("mermaid fence in named slot targeting mermaid slot", () => {
    const deck = compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        {
          index: 0,
          frontmatter: { layout: "arch" },
          body: "",
          slots: {
            diagram: "```mermaid\nflowchart LR\n  A --> B\n```",
          },
        },
      ],
    }, [mermaidLayout("arch", [], "diagram")]);

    const diagram = deck.steps[0].content!["diagram"] as any;
    assert.equal(diagram.type, FenceType.Mermaid);
    assert.equal(diagram.definition, "flowchart LR\n  A --> B");
  });

  it("mermaid fence in a non-mermaid slot throws", () => {
    assert.throws(
      () => compileDeck({
        global: { theme: "./theme.json" },
        slides: [
          {
            index: 0,
            frontmatter: { layout: "body" },
            body: "",
            slots: {
              body: "```mermaid\nflowchart LR\n  A --> B\n```",
            },
          },
        ],
      }, [testLayout("body", ["body"])]),
      /slot "body" \(type "text"\) got wrong content shape from ::body::/,
    );
  });

  it("non-mermaid content in mermaid slot throws", () => {
    assert.throws(
      () => compileDeck({
        global: { theme: "./theme.json" },
        slides: [
          {
            index: 0,
            frontmatter: { layout: "arch" },
            body: "",
            slots: {
              diagram: "Just some text",
            },
          },
        ],
      }, [mermaidLayout("arch", [], "diagram")]),
      /slot "diagram" \(type "mermaid"\) got wrong content shape from ::diagram::/,
    );
  });

  it("mermaid fence in body throws", () => {
    assert.throws(
      () => compileDeck({
        global: { theme: "./theme.json" },
        slides: [
          {
            index: 0,
            frontmatter: { layout: "body" },
            body: "```mermaid\nflowchart LR\n  A --> B\n```",
            slots: {},
          },
        ],
      }, [testLayout("body", ["body"])]),
      /slot "body" \(type "text"\) got wrong content shape from body content/,
    );
  });

  it("layout with both content slots and mermaid asset slot", () => {
    const deck = compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        {
          index: 0,
          frontmatter: { layout: "arch", title: "System" },
          body: "",
          slots: {
            diagram: "```mermaid\nflowchart LR\n  A --> B\n```",
          },
        },
      ],
    }, [mermaidLayout("arch", ["title"], "diagram")]);

    assert.deepEqual(deck.steps[0].content!["title"], tvar("title", "System"));
    const diagram = deck.steps[0].content!["diagram"] as any;
    assert.equal(diagram.type, FenceType.Mermaid);
  });
});
