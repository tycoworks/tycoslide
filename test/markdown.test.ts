import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSlideDocument } from "../dist/markdown/slideParser.js";
import { compileDeck as compileDeckRaw } from "../dist/markdown/deckCompiler.js";
import { compileMarkdownDeck as compileMarkdownDeckRaw } from "../dist/markdown/index.js";
import { templateKeys, templateToSegments } from "../dist/markdown/textTemplate.js";
import type { TextFill, ImageFill, StyledParagraph } from "../dist/engine/types.js";
import { ImageFit, SlotType } from "../dist/engine/types.js";
import { AssetType } from "../dist/markdown/types.js";
import type { AssetCatalog, CompilerConfig, CompilerLayout, CompilerParameter, CompilerSlot } from "../dist/markdown/types.js";
import { ParameterType } from "../dist/markdown/types.js";

// `compileDeck` / `compileMarkdownDeck` now take a single `CompilerConfig` and
// are async. These positional shims keep the many call sites terse: they build a
// throwaway config (its `template` is unread by the compile path) from the old
// (layouts, rootDir, assets) arguments, plus an `extra` slot for theme-level
// code/mermaid style. Callers `await` the result.
type CompileExtra = Partial<Pick<CompilerConfig, "codeTheme" | "mermaid" | "mermaidVariant" | "outputDir">>;
const cfg = (layouts: CompilerLayout[], rootDir = "", assets: AssetCatalog = {}, extra: CompileExtra = {}): CompilerConfig => ({
  layouts,
  assets,
  template: "",
  rootDir,
  ...extra,
});
const compileDeck = (
  doc: Parameters<typeof compileDeckRaw>[0],
  layouts: CompilerLayout[],
  rootDir = "",
  assets: AssetCatalog = {},
  extra: CompileExtra = {},
) => compileDeckRaw(doc, cfg(layouts, rootDir, assets, extra));
const compileMarkdownDeck = (
  source: string,
  layouts: CompilerLayout[],
  rootDir = "",
  assets: AssetCatalog = {},
  extra: CompileExtra = {},
) => compileMarkdownDeckRaw(source, cfg(layouts, rootDir, assets, extra));

// ============================================
// slideParser
// ============================================

describe("parseSlideDocument", () => {
  it("single slide with frontmatter after global", async () => {
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

  it("single slide when file starts with slide separator", async () => {
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

  it("multiple slides split on ---", async () => {
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

  it("global frontmatter extracted separately from slides", async () => {
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

  it("::name:: slot markers split body into named slots", async () => {
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

  it("--- inside code fences is NOT a slide separator", async () => {
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

  it("::name:: inside code fences is NOT a slot marker", async () => {
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

  it("empty body with frontmatter only", async () => {
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

  it("body-only slide without frontmatter", async () => {
    const doc = parseSlideDocument(`Just some body text without any frontmatter`);

    assert.equal(doc.slides.length, 1);
    assert.deepEqual(doc.slides[0].frontmatter, {});
    assert.equal(doc.slides[0].body, "Just some body text without any frontmatter");
  });

  it("slide indices are sequential", async () => {
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

  it("tilde code fences are also protected", async () => {
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

  it("empty global frontmatter produces empty object", async () => {
    const doc = parseSlideDocument(`No frontmatter here at all`);

    assert.deepEqual(doc.global, {});
  });

  it("multiple slots without default body", async () => {
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
    ...extras,
  };
}

// Every slot is a single base block on slide 1 (sourceSlide === slideNumber), so
// nothing transplants and no `frame` is needed. A code slot accepts `text` (code
// folds to text); a mermaid slot accepts `image` (mermaid folds to image).
function textSlot(key: string): CompilerSlot {
  return { key, accepts: [{ type: SlotType.Text, sourceSlide: 1, shapeName: `s_${key}` }] };
}

function tableSlot(key: string): CompilerSlot {
  return { key, accepts: [{ type: SlotType.Table, sourceSlide: 1, shapeName: `s_${key}` }] };
}

function codeSlot(key: string): CompilerSlot {
  return { key, accepts: [{ type: SlotType.Text, sourceSlide: 1, shapeName: `s_${key}` }] };
}

function makeLayout(name: string, slots: CompilerSlot[]): CompilerLayout {
  return { name, slideNumber: 1, parameters: [], slots };
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
  it("minimal deck with single slide", async () => {
    const deck = await compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        { index: 0, frontmatter: { layout: "title" }, body: "", slots: {} },
      ],
    }, [testLayout("title")]);

    assert.equal(deck.steps.length, 1);
    assert.equal(deck.steps[0].layout, "title");
  });

  it("global output maps to Deck.output", async () => {
    const deck = await compileDeck({
      global: { theme: "./theme.json", output: "my-deck.pptx" },
      slides: [
        { index: 0, frontmatter: { layout: "title" }, body: "", slots: {} },
      ],
    }, [testLayout("title")]);

    assert.equal(deck.output, "my-deck.pptx");
  });

  it("non-layout frontmatter keys become content entries", async () => {
    const deck = await compileDeck({
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

  it("body text becomes content.body as a TextFill", async () => {
    const deck = await compileDeck({
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

  it("named slots become content entries as TextFills", async () => {
    const deck = await compileDeck({
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

  it("frontmatter keys matching image parameters become ImageFills in content", async () => {
    const layouts: CompilerLayout[] = [
      {
        name: "hero",
        slideNumber: 1,
        description: "",
        whenToUse: "",
        whenNotToUse: "",
        parameters: [
          { key: "hero", shapeName: "s1", type: ParameterType.Image },
          { key: "logo", shapeName: "s2", type: ParameterType.Image },
        ],
        slots: [],
      },
    ];
    const deck = await compileDeck(
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
      "",
      {
        imgs: {
          hero: { path: "images/hero.png", type: AssetType.Background, description: "" },
          logo: { path: "images/logo.svg", type: AssetType.Icon, description: "" },
        },
      },
    );

    const heroBlock: ImageFill = {
      type: SlotType.Image,
      path: "images/hero.png",
      fit: ImageFit.Cover,
    };
    const logoBlock: ImageFill = {
      type: SlotType.Image,
      path: "images/logo.svg",
      fit: ImageFit.ScaleDown,
    };
    assert.deepEqual(deck.steps[0].content!["hero"], heroBlock);
    assert.deepEqual(deck.steps[0].content!["logo"], logoBlock);
  });

  it("image with no catalog entry (so no type) throws fail-fast", async () => {
    const layouts: CompilerLayout[] = [
      {
        name: "hero",
        slideNumber: 1,
        description: "",
        whenToUse: "",
        whenNotToUse: "",
        parameters: [{ key: "hero", shapeName: "s1", type: ParameterType.Image }],
        slots: [],
      },
    ];
    await assert.rejects(
        compileDeck(
          {
            global: { theme: "./theme.json" },
            slides: [
              { index: 0, frontmatter: { layout: "hero", hero: "images/uncatalogued.png" }, body: "", slots: {} },
            ],
          },
          layouts,
          "",
          {}, // empty catalog — the filled path has no declared type
        ),
      (err: Error) => {
        assert.ok(err.message.includes("hero"));
        assert.ok(err.message.includes("no asset-catalog entry"));
        assert.ok(err.message.includes("icon | image | background"));
        return true;
      },
    );
  });

  it("global theme maps to Deck.theme", async () => {
    const deck = await compileDeck({
      global: { theme: "./custom/theme.json" },
      slides: [
        { index: 0, frontmatter: { layout: "title" }, body: "", slots: {} },
      ],
    }, [testLayout("title")]);

    assert.equal(deck.theme, "./custom/theme.json");
  });

  it("missing theme throws", async () => {
    await assert.rejects(
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

  it("missing layout throws", async () => {
    await assert.rejects(
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

  it("unknown layout throws", async () => {
    await assert.rejects(
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

  it("unknown frontmatter key throws", async () => {
    await assert.rejects(
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

  it("unknown named slot throws", async () => {
    await assert.rejects(
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

  it("missing required image parameter throws", async () => {
    const base = testLayout("hero", ["title"]);
    const layouts: CompilerLayout[] = [{
      ...base,
      parameters: [...base.parameters, imageParam("bg", { required: true })],
    }];
    await assert.rejects(
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

  it("body content on layout without body slot throws", async () => {
    await assert.rejects(
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

  it("body written as a frontmatter key throws (body is a slot, not a parameter)", async () => {
    // Wrong-channel: `body` is a slot (a body region), never a frontmatter
    // parameter. The frontmatter loop validates against parameters only, so a
    // `body:` line is an unknown parameter — no dual-definition guard needed.
    await assert.rejects(
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

  it("unknown global frontmatter key throws", async () => {
    await assert.rejects(
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

  it("empty body produces no body key in content", async () => {
    const deck = await compileDeck({
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

  it("whitespace-only body produces no body key", async () => {
    const deck = await compileDeck({
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

  it("steps with no supplied content produce an empty content object", async () => {
    const deck = await compileDeck({
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
  it("collects keys in first-seen order, de-duped", async () => {
    assert.deepEqual(templateKeys("{a} {b}{a}{c}"), ["a", "b", "c"]);
  });

  it("ignores escaped braces", async () => {
    assert.deepEqual(templateKeys("{{a}} {b}"), ["b"]);
  });

  it("empty for a literal-only template", async () => {
    assert.deepEqual(templateKeys(" - "), []);
  });
});

const L = (text: string) => ({ kind: "literal", text });
const V = (key: string, value: string) => ({ kind: "variable", key, value });
/** TemplateFill for a degenerate one-variable text shape (template "{key}"). */
const tvar = (key: string, value: string) => ({ lines: [[V(key, value)]] });

describe("templateToSegments", () => {
  it("parses a line into ordered literal/variable segments", async () => {
    assert.deepEqual(templateToSegments("{a}-{b}", new Map([["a", "1"], ["b", "2"]]), "s"), [
      [V("a", "1"), L("-"), V("b", "2")],
    ]);
  });

  it("splits newlines into separate lines", async () => {
    assert.deepEqual(templateToSegments("{name}\n{jobTitle}", new Map([["name", "Maya"], ["jobTitle", "Founder"]]), "s"), [
      [V("name", "Maya")],
      [V("jobTitle", "Founder")],
    ]);
  });

  it("collapses {{ and }} escapes into a literal", async () => {
    assert.deepEqual(templateToSegments("{{ and }}", new Map(), "s"), [[L("{ and }")]]);
  });

  it("a literal-only line is one literal segment", async () => {
    assert.deepEqual(templateToSegments(" - ", new Map(), "s"), [[L(" - ")]]);
  });

  it("throws naming the shape and key on a missing value", async () => {
    assert.throws(() => templateToSegments("{a}", new Map(), "welcomeBar"), /welcomeBar.*"a"/);
  });
});

describe("compileDeck text templating", () => {
  it("compiles a line into a TemplateFill of segments keyed by shapeName", async () => {
    const layout = templateLayout("welcome", [templateParam("welcomeBar", "{lastname}, {firstname} - {company}")]);
    const deck = await compileOne(layout, { lastname: "Chen", firstname: "Maya", company: "Acme" });
    assert.deepEqual(deck.steps[0].content!["welcomeBar"], {
      lines: [[V("lastname", "Chen"), L(", "), V("firstname", "Maya"), L(" - "), V("company", "Acme")]],
    });
  });

  it("splits a newline template into one segment line per paragraph", async () => {
    const layout = templateLayout("nc", [templateParam("bar", "{name}\n - \n{company}")]);
    const deck = await compileOne(layout, { name: "Maya", company: "Acme" });
    assert.deepEqual(deck.steps[0].content!["bar"], {
      lines: [[V("name", "Maya")], [L(" - ")], [V("company", "Acme")]],
    });
  });

  it("emits one segment line per template line (multi-line credits)", async () => {
    const layout = templateLayout("credits", [templateParam("card", "{name}\n{jobTitle}")]);
    const deck = await compileOne(layout, { name: "Maya", jobTitle: "Founder" });
    assert.deepEqual(deck.steps[0].content!["card"], { lines: [[V("name", "Maya")], [V("jobTitle", "Founder")]] });
  });

  it("unescapes {{ }} into surrounding literal segments", async () => {
    const layout = templateLayout("esc", [templateParam("bar", "{{{name}}}")]);
    const deck = await compileOne(layout, { name: "Maya" });
    assert.deepEqual(deck.steps[0].content!["bar"], { lines: [[L("{"), V("name", "Maya"), L("}")]] });
  });

  it("leaves a parameter unfilled when none of its keys are supplied", async () => {
    const layout = templateLayout("welcome", [templateParam("welcomeBar", "{lastname}, {firstname}")]);
    const deck = await compileOne(layout, {});
    assert.equal(deck.steps[0].content!["welcomeBar"], undefined);
  });

  it("throws when a parameter is partially filled (a key has no value)", async () => {
    const layout = templateLayout("welcome", [templateParam("welcomeBar", "{lastname}, {firstname} - {company}")]);
    await assert.rejects(compileOne(layout, { lastname: "Chen", firstname: "Maya" }), /welcomeBar.*"company"/);
  });

  it("throws on a frontmatter key matching no template key or image parameter", async () => {
    const layout = templateLayout("welcome", [templateParam("welcomeBar", "{lastname}")]);
    await assert.rejects(compileOne(layout, { lastname: "Chen", nope: "x" }), /unknown key "nope".*lastname/);
  });

  it("throws when a required parameter is not filled", async () => {
    const layout = templateLayout("welcome", [templateParam("welcomeBar", "{title}", true)]);
    await assert.rejects(compileOne(layout, {}), /requires template parameter "welcomeBar"/);
  });
});

describe("validateLayout (key-space collisions)", () => {
  it("throws when one key is declared by two template parameters", async () => {
    const layout = templateLayout("dup", [templateParam("a", "{name}"), templateParam("b", "{name}")]);
    await assert.rejects(compileOne(layout, {}), /key "name".*declared twice/);
  });

  it("throws when a template key collides with an image parameter key", async () => {
    const layout = templateLayout("clash", [templateParam("bar", "{logo}"), imageParam("logo")]);
    await assert.rejects(compileOne(layout, {}), /key "logo".*declared twice/);
  });

  it("throws when a template parameter's shapeName collides with a slot key", async () => {
    const layout = templateLayout("clash", [templateParam("body", "{title}")], [textSlot("body")]);
    await assert.rejects(compileOne(layout, {}), /name "body".*collides/);
  });

  it("throws when a required template parameter has no keys to fill", async () => {
    const layout = templateLayout("lit", [templateParam("bar", "static text", true)]);
    await assert.rejects(compileOne(layout, {}), /required but its template has no keys/);
  });
});

describe("assertUniqueSlideNumbers (cross-layout slideNumber collisions)", () => {
  const emptyDoc = { global: { theme: "./theme.json" }, slides: [] };

  it("throws when two layouts share a slideNumber", async () => {
    const a: CompilerLayout = { ...testLayout("Full bleed image with title dark"), slideNumber: 30 };
    const b: CompilerLayout = { ...testLayout("Full bleed image with title dark (mermaid)"), slideNumber: 30 };
    await assert.rejects(compileDeck(emptyDoc, [a, b]), (err: Error) => {
      assert.ok(err.message.includes('"Full bleed image with title dark"'), err.message);
      assert.ok(err.message.includes('"Full bleed image with title dark (mermaid)"'), err.message);
      assert.ok(err.message.includes("slideNumber 30"), err.message);
      return true;
    });
  });

  it("does not throw when slideNumbers are unique but a sourceSlide is reused across layouts", async () => {
    // Both layouts' body slot samples the same specimen (sourceSlide: 1, via
    // textSlot) even though the layouts themselves sample distinct base slides
    // (slideNumber 1 and 2) — sourceSlide reuse across layouts is legitimate and
    // must not be constrained by this check.
    const a: CompilerLayout = { ...testLayout("A", ["body"]), slideNumber: 1 };
    const b: CompilerLayout = { ...testLayout("B", ["body"]), slideNumber: 2 };
    await assert.doesNotReject(compileDeck(emptyDoc, [a, b]));
  });
});

// ============================================
// Integration: compileMarkdownDeck
// ============================================

describe("compileMarkdownDeck", () => {
  // Three distinct layouts used together in one deck, so each samples a distinct
  // base slide (slideNumber 1/2/3) per assertUniqueSlideNumbers.
  const closingBase = { ...testLayout("closing", ["headline"]), slideNumber: 3 };
  const e2eLayouts: CompilerLayout[] = [
    { ...testLayout("title", ["headline", "subtitle"]), slideNumber: 1 },
    {
      name: "two-column",
      slideNumber: 2,
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

  it("full example end-to-end", async () => {
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

    const deck = await compileMarkdownDeck(source, e2eLayouts, "", {
      imgs: { closingBg: { path: "images/closing-bg.png", type: AssetType.Image, description: "" } },
    });

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
    const closingBg: ImageFill = {
      type: SlotType.Image,
      path: "images/closing-bg.png",
      fit: ImageFit.Contain,
    };
    assert.deepEqual(deck.steps[2].content!["bg"], closingBg);
    assert.equal(deck.steps[2].content!["body"], undefined);
  });

  it("single slide with global frontmatter", async () => {
    const source = `---
theme: ./theme.json
output: my-deck.pptx
---
---
layout: standalone
headline: Just One Slide
---
Single slide content`;

    const deck = await compileMarkdownDeck(source, [testLayout("standalone", ["headline", "body"])]);

    assert.equal(deck.output, "my-deck.pptx");
    assert.equal(deck.steps.length, 1);
    assert.equal(deck.steps[0].layout, "standalone");
    assert.deepEqual(deck.steps[0].content!["headline"], tvar("headline", "Just One Slide"));
    assert.deepEqual(deck.steps[0].content!["body"], paras(line("Single slide content")));
  });

  it("deck without output in global frontmatter", async () => {
    const source = `---
theme: corporate
---
---
layout: title
headline: No output key
---`;

    const deck = await compileMarkdownDeck(source, [testLayout("title", ["headline"])]);

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
  it("body containing a GFM table is parsed as TableFill", async () => {
    const deck = await compileDeck({
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

  it("named slot containing a GFM table is parsed as TableFill", async () => {
    const deck = await compileDeck({
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

  it("non-table body is still parsed as a TextFill", async () => {
    const deck = await compileDeck({
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
  // A code fence now compiles straight to a highlighted TextFill (no intermediate
  // fence). `asSource` reassembles the highlighted paragraphs back to source text
  // — one line per StyledParagraph, runs joined in order — proving the fence was
  // Shiki-tokenized into runs. Every code test supplies a theme-level codeTheme.
  const asSource = (fill: any): string =>
    fill.paragraphs.map((p: any) => p.runs.map((r: any) => r.text).join("")).join("\n");
  const DARK = { codeTheme: "github-dark" };

  it("body code fence is highlighted into a TextFill", async () => {
    const deck = await compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        { index: 0, frontmatter: { layout: "code-dark" }, body: "```sql\nSELECT * FROM users;\n```", slots: {} },
      ],
    }, [makeLayout("code-dark", [codeSlot("body")])], "", {}, DARK);

    const body = deck.steps[0].content!["body"] as any;
    assert.ok(Array.isArray(body.paragraphs), "highlighted to a TextFill");
    assert.equal(asSource(body), "SELECT * FROM users;");
    assert.ok(body.paragraphs.some((p: any) => p.runs.some((r: any) => r.color)), "carries per-token colors");
  });

  it("named-slot code fence is highlighted into a TextFill", async () => {
    const deck = await compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        { index: 0, frontmatter: { layout: "code-dark" }, body: "", slots: { code: "```python\nprint('hello')\n```" } },
      ],
    }, [makeLayout("code-dark", [codeSlot("code")])], "", {}, DARK);

    const code = deck.steps[0].content!["code"] as any;
    assert.ok(Array.isArray(code.paragraphs));
    assert.equal(asSource(code), "print('hello')");
  });

  it("multi-line code fence highlights all lines", async () => {
    const deck = await compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        {
          index: 0,
          frontmatter: { layout: "code-dark" },
          body: "```typescript\nconst x = 1;\nconst y = 2;\nreturn x + y;\n```",
          slots: {},
        },
      ],
    }, [makeLayout("code-dark", [codeSlot("body")])], "", {}, DARK);

    const body = deck.steps[0].content!["body"] as any;
    assert.ok(Array.isArray(body.paragraphs));
    assert.equal(asSource(body), "const x = 1;\nconst y = 2;\nreturn x + y;");
  });

  it("a code fence with no theme-level codeTheme throws", async () => {
    await assert.rejects(
      compileDeck({
        global: { theme: "./theme.json" },
        slides: [
          { index: 0, frontmatter: { layout: "code-dark" }, body: "```sql\nSELECT 1\n```", slots: {} },
        ],
      }, [makeLayout("code-dark", [codeSlot("body")])]),
      /declares no "codeTheme"/,
    );
  });

  it("non-fence body is still parsed as a TextFill", async () => {
    const deck = await compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        { index: 0, frontmatter: { layout: "body" }, body: "Just some prose", slots: {} },
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
      // A mermaid slot accepts `image` — the fence folds to an ImageFill.
      layout.slots = [
        ...layout.slots,
        { key: mermaidKey, accepts: [{ type: SlotType.Image, sourceSlide: 1, shapeName: `s_${mermaidKey}` }] },
      ];
    }
    return layout;
  }

  it("a mermaid fence routes to the image slot, then fails fast without a mermaid config (no render)", async () => {
    // The fence folds to `image` (accepted by the mermaid slot), so it reaches
    // the mermaid compile — which, absent a theme-level "mermaid" block, throws
    // before any render (no puppeteer). Proves routing without spinning up a
    // renderer in a unit test.
    await assert.rejects(
      compileDeck({
        global: { theme: "./theme.json" },
        slides: [
          {
            index: 0,
            frontmatter: { layout: "arch" },
            body: "",
            slots: { diagram: "```mermaid\nflowchart LR\n  A --> B\n```" },
          },
        ],
      }, [mermaidLayout("arch", [], "diagram")]),
      /theme has no "mermaid" block/,
    );
  });

  it("mermaid fence in a non-mermaid slot throws", async () => {
    await assert.rejects(
      compileDeck({
        global: { theme: "./theme.json" },
        slides: [
          {
            index: 0,
            frontmatter: { layout: "body" },
            body: "",
            slots: { body: "```mermaid\nflowchart LR\n  A --> B\n```" },
          },
        ],
      }, [testLayout("body", ["body"])]),
      /slot "body" does not accept image content \(from ::body::\); it accepts: text/,
    );
  });

  it("non-mermaid content in mermaid slot throws", async () => {
    await assert.rejects(
      compileDeck({
        global: { theme: "./theme.json" },
        slides: [
          {
            index: 0,
            frontmatter: { layout: "arch" },
            body: "",
            slots: { diagram: "Just some text" },
          },
        ],
      }, [mermaidLayout("arch", [], "diagram")]),
      /slot "diagram" does not accept text content \(from ::diagram::\); it accepts: image/,
    );
  });

  it("mermaid fence in body throws", async () => {
    await assert.rejects(
      compileDeck({
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
      /slot "body" does not accept image content \(from body content\); it accepts: text/,
    );
  });

  it("layout with a content slot beside a mermaid asset slot (no diagram supplied)", async () => {
    // Exercises a layout that pairs a filled content slot with an (optional)
    // mermaid asset slot; with no diagram supplied nothing renders.
    const deck = await compileDeck({
      global: { theme: "./theme.json" },
      slides: [
        { index: 0, frontmatter: { layout: "arch", title: "System" }, body: "", slots: {} },
      ],
    }, [mermaidLayout("arch", ["title"], "diagram")]);

    assert.deepEqual(deck.steps[0].content!["title"], tvar("title", "System"));
    assert.equal(deck.steps[0].content!["diagram"], undefined);
  });
});
