import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { coalesceSameStyleRuns, fillTemplate } from "../dist/engine/fillers/template.js";
import { fillText } from "../dist/engine/fillers/text.js";
import { fillTable } from "../dist/engine/fillers/table.js";
import { FILLERS } from "../dist/engine/fillers/filler.js";
import { computeGeometry } from "../dist/engine/fillers/image.js";
import { setRichRuns } from "../dist/engine/dom.js";
import { assertSlotsWellFormed, fillSlide } from "../dist/engine/generate.js";
import type {
  DeckStep,
  ImageFill,
  Layout,
  Slot,
  StyledParagraph,
  TableFill,
  TemplateSegment,
  TemplateFill,
  TextFill,
} from "../dist/engine/types.js";
import { ImageFit, SlotType } from "../dist/engine/types.js";

// ── Test Helpers ───────────────────────────────────────────────────────────────

const NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main";

function parseXml(xml: string) {
  return new DOMParser().parseFromString(xml, "text/xml");
}

function makeTextBody(paragraphsXml: string): any {
  const xml = `<p:txBody xmlns:a="${NS_A}" xmlns:p="${NS_P}"><a:bodyPr/><a:lstStyle/>${paragraphsXml}</p:txBody>`;
  return parseXml(xml).documentElement;
}

function makeParagraph(text: string, extra = ""): string {
  return `<a:p${extra}><a:r><a:rPr/><a:t>${text}</a:t></a:r></a:p>`;
}

function makeBulletParagraph(text: string, level = 0, char = "•"): string {
  const lvlAttr = level > 0 ? ` lvl="${level}"` : "";
  return `<a:p><a:pPr${lvlAttr}><a:buChar char="${char}"/></a:pPr><a:r><a:rPr/><a:t>${text}</a:t></a:r></a:p>`;
}

function allTexts(el: any): string[] {
  const ts = el.getElementsByTagName("a:t");
  const out: string[] = [];
  for (let i = 0; i < ts.length; i++) out.push(ts[i].textContent || "");
  return out;
}

function paraCount(el: any): number {
  return el.getElementsByTagName("a:p").length;
}

function paraAt(el: any, i: number): any {
  return el.getElementsByTagName("a:p")[i];
}

function runCount(el: any): number {
  return el.getElementsByTagName("a:r").length;
}

/** StyledParagraph shorthand for tests. */
const plain = (text: string): StyledParagraph => ({ runs: [{ text }] });
const bullet = (text: string, level = 0): StyledParagraph => ({ runs: [{ text }], bullet: { level } });

/** TableFill shorthand for tests. */
function cell(text: string): StyledParagraph {
  return { runs: [{ text }] };
}
function cells(...values: string[]): StyledParagraph[] {
  return values.map(cell);
}

/** isTableData guard replacement — checks the new TableFill shape. */
function isTableFill(v: unknown): v is TableFill {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    "headers" in v &&
    "rows" in v &&
    Array.isArray((v as any).headers) &&
    Array.isArray((v as any).rows)
  );
}


// ============================================
// setRichRuns (internal helper, still exported for tests)
// ============================================

describe("setRichRuns", () => {
  it("creates multiple runs from template", () => {
    const body = makeTextBody(makeParagraph("Template"));
    const para = paraAt(body, 0);
    setRichRuns(para, [{ text: "Hello " }, { text: "world" }]);
    assert.deepEqual(allTexts(para), ["Hello ", "world"]);
    assert.equal(runCount(para), 2);
  });

  it("applies bold attribute", () => {
    const body = makeTextBody(makeParagraph("Template"));
    const para = paraAt(body, 0);
    setRichRuns(para, [{ text: "Bold", bold: true }]);
    const rPr = para.getElementsByTagName("a:rPr")[0];
    assert.equal(rPr.getAttribute("b"), "1");
  });

  it("applies italic attribute", () => {
    const body = makeTextBody(makeParagraph("Template"));
    const para = paraAt(body, 0);
    setRichRuns(para, [{ text: "Italic", italic: true }]);
    const rPr = para.getElementsByTagName("a:rPr")[0];
    assert.equal(rPr.getAttribute("i"), "1");
  });

  it("applies both bold and italic", () => {
    const body = makeTextBody(makeParagraph("Template"));
    const para = paraAt(body, 0);
    setRichRuns(para, [{ text: "BoldItalic", bold: true, italic: true }]);
    const rPr = para.getElementsByTagName("a:rPr")[0];
    assert.equal(rPr.getAttribute("b"), "1");
    assert.equal(rPr.getAttribute("i"), "1");
  });

  it("applies strikethrough attribute", () => {
    const body = makeTextBody(makeParagraph("Template"));
    const para = paraAt(body, 0);
    setRichRuns(para, [{ text: "Struck", strikethrough: true }]);
    const rPr = para.getElementsByTagName("a:rPr")[0];
    assert.equal(rPr.getAttribute("strike"), "sngStrike");
  });

  it("applies underline attribute", () => {
    const body = makeTextBody(makeParagraph("Template"));
    const para = paraAt(body, 0);
    setRichRuns(para, [{ text: "Underlined", underline: true }]);
    const rPr = para.getElementsByTagName("a:rPr")[0];
    assert.equal(rPr.getAttribute("u"), "sng");
  });

  it("inserts before a:endParaRPr when present", () => {
    const body = makeTextBody(`<a:p><a:r><a:rPr/><a:t>Tpl</a:t></a:r><a:endParaRPr/></a:p>`);
    const para = paraAt(body, 0);
    setRichRuns(para, [{ text: "Before end" }]);

    const children = para.childNodes;
    let runIdx = -1;
    let endIdx = -1;
    for (let i = 0; i < children.length; i++) {
      if (children[i].nodeName === "a:r") runIdx = i;
      if (children[i].nodeName === "a:endParaRPr") endIdx = i;
    }
    assert.ok(runIdx < endIdx, "Run should be before endParaRPr");
  });

  it("does nothing when paragraph has no runs", () => {
    const body = makeTextBody(`<a:p><a:pPr/></a:p>`);
    const para = paraAt(body, 0);
    setRichRuns(para, [{ text: "Ignored" }]);
    assert.equal(runCount(para), 0);
  });

  it("creates a:rPr when template run lacks one", () => {
    const body = makeTextBody(`<a:p><a:r><a:t>NoProps</a:t></a:r></a:p>`);
    const para = paraAt(body, 0);
    setRichRuns(para, [{ text: "Styled", bold: true }]);
    const rPr = para.getElementsByTagName("a:rPr")[0];
    assert.ok(rPr, "a:rPr should be created");
    assert.equal(rPr.getAttribute("b"), "1");
  });

  it("unstyled runs do not add formatting attributes", () => {
    const body = makeTextBody(makeParagraph("Template"));
    const para = paraAt(body, 0);
    setRichRuns(para, [{ text: "Plain" }]);
    const rPr = para.getElementsByTagName("a:rPr")[0];
    assert.equal(rPr.getAttribute("b"), null);
    assert.equal(rPr.getAttribute("i"), null);
    assert.equal(rPr.getAttribute("strike"), null);
    assert.equal(rPr.getAttribute("u"), null);
  });

  it("applies hyperlink with relationship entry", () => {
    const body = makeTextBody(makeParagraph("Template"));
    const para = paraAt(body, 0);
    const relDoc = parseXml(`<Relationships><Relationship Id="rId1" Type="existing" Target="slide1.xml"/></Relationships>`);
    const relation = relDoc.documentElement;
    setRichRuns(para, [{ text: "Click here", link: "https://example.com" }], relation);
    const hlink = para.getElementsByTagName("a:hlinkClick")[0];
    assert.ok(hlink, "a:hlinkClick should be created");
    assert.equal(hlink.getAttribute("r:id"), "rId2");
    const rels = relation.getElementsByTagName("Relationship");
    assert.equal(rels.length, 2);
    assert.equal(rels[1].getAttribute("Target"), "https://example.com");
    assert.equal(rels[1].getAttribute("TargetMode"), "External");
  });

  it("skips hyperlink when no relation is provided", () => {
    const body = makeTextBody(makeParagraph("Template"));
    const para = paraAt(body, 0);
    setRichRuns(para, [{ text: "No link applied", link: "https://example.com" }]);
    const hlink = para.getElementsByTagName("a:hlinkClick")[0];
    assert.equal(hlink, undefined, "a:hlinkClick should not be created without relation");
  });
});

// ============================================
// fillText — rebuild paragraphs from harvested specimen styles
// ============================================

describe("fillText", () => {
  it("plain text lines replace paragraphs", () => {
    const body = makeTextBody(makeParagraph("Placeholder 1") + makeParagraph("Placeholder 2"));
    fillText(body, { paragraphs: [plain("First line"), plain("Second line")] });
    assert.equal(paraCount(body), 2);
    assert.deepEqual(allTexts(body), ["First line", "Second line"]);
  });

  it("bullet lines clone the bullet template", () => {
    const body = makeTextBody(makeParagraph("Plain") + makeBulletParagraph("Bullet tpl"));
    fillText(body, { paragraphs: [bullet("Item A"), bullet("Item B")] });
    assert.equal(paraCount(body), 2);
    for (let i = 0; i < 2; i++) {
      const p = paraAt(body, i);
      assert.ok(p.getElementsByTagName("a:buChar").length > 0, `Paragraph ${i} should have bullet`);
    }
    assert.deepEqual(allTexts(body), ["Item A", "Item B"]);
  });

  it("nested bullets use level-appropriate templates", () => {
    const body = makeTextBody(makeParagraph("Plain") + makeBulletParagraph("L0", 0) + makeBulletParagraph("L1", 1));
    fillText(body, { paragraphs: [bullet("Top", 0), bullet("Nested", 1)] });
    assert.equal(paraCount(body), 2);
    const pPr0 = paraAt(body, 0).getElementsByTagName("a:pPr")[0];
    const lvl0 = pPr0?.getAttribute("lvl");
    assert.ok(!lvl0 || lvl0 === "0", "First bullet should be level 0");
    const pPr1 = paraAt(body, 1).getElementsByTagName("a:pPr")[0];
    assert.equal(pPr1?.getAttribute("lvl"), "1");
  });

  it("rich text creates multiple styled runs", () => {
    const body = makeTextBody(makeParagraph("Template"));
    const richLine: StyledParagraph = {
      runs: [{ text: "Normal " }, { text: "bold", bold: true }, { text: " text" }],
    };
    fillText(body, { paragraphs: [richLine] });
    assert.equal(paraCount(body), 1);
    assert.equal(runCount(paraAt(body, 0)), 3);
    assert.deepEqual(allTexts(body), ["Normal ", "bold", " text"]);
  });

  it("empty runs are skipped", () => {
    const body = makeTextBody(makeParagraph("Tpl"));
    fillText(body, { paragraphs: [plain("Line 1"), { runs: [] }, { runs: [{ text: "" }] }, plain("Line 2")] });
    assert.equal(paraCount(body), 2);
    assert.deepEqual(allTexts(body), ["Line 1", "Line 2"]);
  });

  it("mixed plain + bullet content", () => {
    const body = makeTextBody(makeParagraph("Plain tpl") + makeBulletParagraph("Bullet tpl"));
    fillText(body, { paragraphs: [plain("Intro text"), bullet("Bullet one"), bullet("Bullet two"), plain("Closing text")] });
    assert.equal(paraCount(body), 4);
    assert.deepEqual(allTexts(body), ["Intro text", "Bullet one", "Bullet two", "Closing text"]);
    assert.equal(paraAt(body, 0).getElementsByTagName("a:buChar").length, 0);
    assert.ok(paraAt(body, 1).getElementsByTagName("a:buChar").length > 0);
    assert.ok(paraAt(body, 2).getElementsByTagName("a:buChar").length > 0);
    assert.equal(paraAt(body, 3).getElementsByTagName("a:buChar").length, 0);
  });

  it("preserves styling from template (font attributes survive cloning)", () => {
    const body = makeTextBody(
      `<a:p><a:r><a:rPr lang="en-US" sz="1800" dirty="0"><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></a:rPr><a:t>Styled</a:t></a:r></a:p>`,
    );
    fillText(body, { paragraphs: [plain("New text")] });
    const rPr = paraAt(body, 0).getElementsByTagName("a:rPr")[0];
    assert.equal(rPr.getAttribute("sz"), "1800");
    assert.equal(rPr.getAttribute("lang"), "en-US");
    const fills = rPr.getElementsByTagName("a:solidFill");
    assert.ok(fills.length > 0);
  });

  it("preserves bullet char from template", () => {
    const body = makeTextBody(makeBulletParagraph("Tpl", 0, "→"));
    fillText(body, { paragraphs: [bullet("Arrow bullet")] });
    const buChar = paraAt(body, 0).getElementsByTagName("a:buChar")[0];
    assert.equal(buChar.getAttribute("char"), "→");
  });

  it("startAt skips leading paragraphs", () => {
    const body = makeTextBody(makeParagraph("Keep me") + makeParagraph("Replace 1") + makeParagraph("Replace 2"));
    fillText(body, { paragraphs: [plain("New 1"), plain("New 2")] }, { startAt: 1 });
    assert.equal(paraCount(body), 3);
    assert.equal(paraAt(body, 0).getElementsByTagName("a:t")[0].textContent, "Keep me");
    assert.equal(paraAt(body, 1).getElementsByTagName("a:t")[0].textContent, "New 1");
    assert.equal(paraAt(body, 2).getElementsByTagName("a:t")[0].textContent, "New 2");
  });

  it("throws when the element has no paragraphs to rebuild from", () => {
    const body = makeTextBody("");
    assert.throws(() => fillText(body, { paragraphs: [plain("Some text")] }), /no paragraphs to rebuild from/);
  });

  it("clamps bullet level to max available template level", () => {
    const body = makeTextBody(makeParagraph("Plain") + makeBulletParagraph("L0", 0) + makeBulletParagraph("L1", 1));
    fillText(body, { paragraphs: [bullet("Deep nested", 3)] });
    assert.equal(paraCount(body), 1);
    const pPr = paraAt(body, 0).getElementsByTagName("a:pPr")[0];
    assert.equal(pPr.getAttribute("lvl"), "1");
  });

  // A plain-only specimen (no bulleted paragraph) models plain text; bulleting it
  // is an authoring error. Fail fast rather than emit a style-less run — the real
  // trigger of the dark-slide black-text bug, where the run's colour lived only
  // in the specimen rPr and a null-bucket rebuild dropped it.
  it("throws when bulleted content is given to a plain-only specimen", () => {
    const body = makeTextBody(makeParagraph("Only plain"));
    assert.throws(
      () => fillText(body, { paragraphs: [bullet("Bullet without template")] }, { shapeName: "descLine" }),
      /descLine.*plain text only/s,
    );
  });

  it("rich bullet line uses bullet template", () => {
    const body = makeTextBody(makeParagraph("Plain") + makeBulletParagraph("Bullet tpl"));
    const richLine: StyledParagraph = {
      runs: [{ text: "Rich " }, { text: "bullet", bold: true }],
      bullet: { level: 0 },
    };
    fillText(body, { paragraphs: [richLine] });
    assert.equal(paraCount(body), 1);
    assert.ok(paraAt(body, 0).getElementsByTagName("a:buChar").length > 0);
    assert.deepEqual(allTexts(body), ["Rich ", "bullet"]);
  });

  it("applies bullet transition spacing to body after bullets", () => {
    const body = makeTextBody(
      `<a:p><a:pPr/><a:r><a:rPr/><a:t>Plain</a:t></a:r></a:p>` +
      `<a:p><a:pPr><a:buChar char="•"/><a:spcBef><a:spcPts val="1200"/></a:spcBef></a:pPr><a:r><a:rPr/><a:t>Bullet</a:t></a:r></a:p>`,
    );
    fillText(body, { paragraphs: [plain("Opening prose"), bullet("A bullet"), plain("Closing prose")] });
    assert.equal(paraCount(body), 3);
    const closing = paraAt(body, 2);
    const spcBef = closing.getElementsByTagName("a:spcBef")[0];
    assert.ok(spcBef, "Prose after bullet should have spcBef");
    const pts = spcBef.getElementsByTagName("a:spcPts")[0];
    assert.equal(pts.getAttribute("val"), "1200");
  });

  it("does not apply transition spacing to body after body", () => {
    const body = makeTextBody(
      `<a:p><a:pPr/><a:r><a:rPr/><a:t>Plain</a:t></a:r></a:p>` +
      `<a:p><a:pPr><a:buChar char="•"/><a:spcBef><a:spcPts val="1200"/></a:spcBef></a:pPr><a:r><a:rPr/><a:t>Bullet</a:t></a:r></a:p>`,
    );
    fillText(body, { paragraphs: [plain("First prose"), plain("Second prose")] });
    assert.equal(paraCount(body), 2);
    const second = paraAt(body, 1);
    const spcBef = second.getElementsByTagName("a:spcBef")[0];
    assert.equal(spcBef, undefined);
  });

  it("applies transition spacing to rich paragraph after bullets", () => {
    const body = makeTextBody(
      `<a:p><a:pPr/><a:r><a:rPr/><a:t>Plain</a:t></a:r></a:p>` +
      `<a:p><a:pPr><a:buChar char="•"/><a:spcBef><a:spcPts val="1200"/></a:spcBef></a:pPr><a:r><a:rPr/><a:t>Bullet</a:t></a:r></a:p>`,
    );
    const richLine: StyledParagraph = { runs: [{ text: "After bullets" }] };
    fillText(body, { paragraphs: [bullet("A bullet"), richLine] });
    assert.equal(paraCount(body), 2);
    const prose = paraAt(body, 1);
    const spcBef = prose.getElementsByTagName("a:spcBef")[0];
    assert.ok(spcBef);
    assert.equal(spcBef.getElementsByTagName("a:spcPts")[0].getAttribute("val"), "1200");
  });

  it("a single bullet among plain lines still fails fast on a plain-only specimen", () => {
    const body = makeTextBody(makeParagraph("Plain only"));
    assert.throws(
      () => fillText(body, { paragraphs: [plain("First"), bullet("Dash line"), plain("After")] }, { shapeName: "descLine" }),
      /descLine.*plain text only/s,
    );
  });
});

// ============================================
// fillTemplate prefix preservation (regex behavior)
// ============================================

describe("fillTemplate prefix preservation", () => {
  it("prefix regex extracts non-alphanumeric prefix", () => {
    const orig = "→ Original text";
    const prefix = (orig.match(/^[^\p{L}\p{N}]*/u) || [""])[0];
    assert.equal(prefix, "→ ");
  });

  it("no prefix when text starts with letter", () => {
    const orig = "Hello world";
    const prefix = (orig.match(/^[^\p{L}\p{N}]*/u) || [""])[0];
    assert.equal(prefix, "");
  });

  it("dash-space prefix preserved", () => {
    const orig = "- Item";
    const prefix = (orig.match(/^[^\p{L}\p{N}]*/u) || [""])[0];
    assert.equal(prefix, "- ");
  });
});

// ============================================
// fillText startAt: leading specimen paragraphs untouched, tail rebuilt
// ============================================

describe("fillText startAt tail replacement", () => {
  it("leaves leading paragraphs untouched and fills the rest", () => {
    const body = makeTextBody(makeParagraph("Title") + makeParagraph("Body 1") + makeParagraph("Body 2"));
    fillText(body, { paragraphs: [plain("New body A"), plain("New body B")] }, { startAt: 1 });
    assert.equal(paraCount(body), 3);
    assert.equal(paraAt(body, 0).getElementsByTagName("a:t")[0].textContent, "Title");
    assert.equal(paraAt(body, 1).getElementsByTagName("a:t")[0].textContent, "New body A");
    assert.equal(paraAt(body, 2).getElementsByTagName("a:t")[0].textContent, "New body B");
  });

  it("rest can produce more paragraphs than the template had", () => {
    const body = makeTextBody(makeParagraph("Title") + makeParagraph("Single body"));
    fillText(body, { paragraphs: [plain("Line 1"), plain("Line 2"), plain("Line 3")] }, { startAt: 1 });
    assert.equal(paraCount(body), 4);
    assert.deepEqual(allTexts(body), ["Title", "Line 1", "Line 2", "Line 3"]);
  });

  it("rest can produce fewer paragraphs than the template had", () => {
    const body = makeTextBody(
      makeParagraph("Title") + makeParagraph("Body 1") + makeParagraph("Body 2") + makeParagraph("Body 3"),
    );
    fillText(body, { paragraphs: [plain("Only one")] }, { startAt: 1 });
    assert.equal(paraCount(body), 2);
    assert.deepEqual(allTexts(body), ["Title", "Only one"]);
  });
});

// ============================================
// fillTemplate — per-paragraph in-place fill coverage
// ============================================

describe("fillTemplate coverage", () => {
  // fillTemplate: per-paragraph in-place fill. Template line i fills shape paragraph
  // i; same-style runs are coalesced first (internal/text-template-fill.md).
  const lit = (text: string): TemplateSegment => ({ kind: "literal", text });
  const vr = (key: string, value: string): TemplateSegment => ({ kind: "variable", key, value });
  const fill = (...lines: TemplateSegment[][]): TemplateFill => ({ lines });
  const litFill = (...lines: string[]): TemplateFill => ({ lines: lines.map((t) => [lit(t)]) });

  it("fillTemplate fills one template line per paragraph", () => {
    const body = makeTextBody(makeParagraph("a") + makeParagraph("b"));
    fillTemplate(body, litFill("X", "Y"));
    assert.deepEqual(allTexts(body), ["X", "Y"]);
  });

  it("fillTemplate replaces the whole line, no prefix preserved", () => {
    const body = makeTextBody(`<a:p><a:r><a:rPr/><a:t>→ Old</a:t></a:r></a:p>`);
    fillTemplate(body, litFill("→ New"));
    assert.equal(allTexts(body)[0], "→ New");
  });

  it("fillTemplate throws when template has more lines than the shape's visual lines", () => {
    const body = makeTextBody(makeParagraph("a"));
    assert.throws(() => fillTemplate(body, litFill("X", "Y"), "oneLine"), /oneLine/);
  });

  it("fillTemplate leaves untouched paragraphs when fewer template lines", () => {
    const body = makeTextBody(makeParagraph("a") + makeParagraph("b"));
    fillTemplate(body, litFill("X"));
    assert.deepEqual(allTexts(body), ["X", "b"]);
  });

  it("fillTemplate fills multiple variables + literals on a uniform line", () => {
    const body = makeTextBody(makeParagraph("Placeholder"));
    fillTemplate(body, fill([vr("last", "Chen"), lit(", "), vr("first", "Maya")]));
    assert.deepEqual(allTexts(body), ["Chen, Maya"]);
  });

  // Regression: the real corp-template scatters one title line across several
  // same-style runs. fillTemplate must coalesce them and not leak the leftovers.
  it("fillTemplate coalesces same-style split runs into the value (title regression)", () => {
    const body = makeTextBody(
      "<a:p>" +
        '<a:r><a:rPr lang="en"/><a:t>Sufficiently</a:t></a:r>' +
        '<a:r><a:rPr lang="en"/><a:t> i</a:t></a:r>' +
        '<a:r><a:rPr lang="en"/><a:t>nteresting title </a:t></a:r>' +
        "</a:p>",
    );
    fillTemplate(body, litFill("The Problem"));
    assert.deepEqual(allTexts(body), ["The Problem"]);
    assert.equal(runCount(body), 1);
  });

  it("fillTemplate aligns variables to their styled runs (bold name, normal title)", () => {
    // sample: bold "Alice" + normal " — Bob"; template "{name} — {title}".
    const body = makeTextBody(
      '<a:p><a:r><a:rPr b="1"/><a:t>Alice</a:t></a:r><a:r><a:rPr/><a:t> — Bob</a:t></a:r></a:p>',
    );
    fillTemplate(body, fill([vr("name", "X"), lit(" — "), vr("title", "Y")]), "credits");
    // Value split across the two runs, each keeping its own style.
    assert.deepEqual(allTexts(body), ["X", " — Y"]);
    assert.equal(runCount(body), 2);
  });

  it("fillTemplate splits a literal that straddles a run boundary", () => {
    // sample: bold "X -" + normal " Y"; the literal " - " spans both runs.
    const body = makeTextBody(
      '<a:p><a:r><a:rPr b="1"/><a:t>X -</a:t></a:r><a:r><a:rPr/><a:t> Y</a:t></a:r></a:p>',
    );
    fillTemplate(body, fill([vr("a", "A"), lit(" - "), vr("b", "B")]), "s");
    assert.deepEqual(allTexts(body), ["A -", " B"]);
  });

  // A single variable whose matched span crosses run boundaries no longer throws:
  // its value collapses into the span's FIRST run (that run's style wins), and the
  // now-empty spanned runs are detached so the span becomes one run.
  it("fillTemplate collapses a single variable over a two-style sample to the first style", () => {
    // sample: "Big"(sz=3200) + "small"(blank); template single variable {title}.
    const body = makeTextBody(
      '<a:p><a:r><a:rPr sz="3200"/><a:t>Big</a:t></a:r><a:r><a:rPr/><a:t>small</a:t></a:r></a:p>',
    );
    fillTemplate(body, fill([vr("title", "Hello")]), "s");
    assert.deepEqual(allTexts(body), ["Hello"]);
    assert.equal(runCount(body), 1);
    const runs = body.getElementsByTagName("a:r");
    // The single surviving run carries the FIRST run's style (sz=3200); the
    // default-styled run is gone.
    assert.equal(runs[0].getElementsByTagName("a:rPr")[0].getAttribute("sz"), "3200");
  });

  // Google Shape;546-shaped: the real corp template scatters a title across cruft
  // runs of alternating style, including trailing subtitle text. A single {title}
  // variable spans all of them and must collapse to the first run's style.
  it("fillTemplate collapses a cruft+subtitle sample (546-shaped) to the first style", () => {
    const body = makeTextBody(
      "<a:p>" +
        '<a:r><a:rPr sz="3200"/><a:t>Section </a:t></a:r>' +
        '<a:r><a:rPr/><a:t>t</a:t></a:r>' +
        '<a:r><a:rPr sz="3200"/><a:t>itle</a:t></a:r>' +
        '<a:r><a:rPr/><a:t> with subtitle</a:t></a:r>' +
        "</a:p>",
    );
    fillTemplate(body, fill([vr("title", "My Title")]), "s");
    assert.deepEqual(allTexts(body), ["My Title"]);
    assert.equal(runCount(body), 1);
    const runs = body.getElementsByTagName("a:r");
    assert.equal(runs[0].getElementsByTagName("a:rPr")[0].getAttribute("sz"), "3200");
  });

  it("fillTemplate throws when the styled sample doesn't fit the template literals", () => {
    // two styles, template needs a ", " the sample doesn't contain.
    const body = makeTextBody(
      '<a:p><a:r><a:rPr b="1"/><a:t>Foo</a:t></a:r><a:r><a:rPr/><a:t>Bar</a:t></a:r></a:p>',
    );
    assert.throws(() => fillTemplate(body, fill([vr("a", "X"), lit(", "), vr("b", "Y")]), "s"), /does not fit the template/);
  });

  it("fillTemplate throws on adjacent variables with no separator on a multi-run line", () => {
    const body = makeTextBody(
      '<a:p><a:r><a:rPr b="1"/><a:t>Foo</a:t></a:r><a:r><a:rPr/><a:t>Bar</a:t></a:r></a:p>',
    );
    assert.throws(() => fillTemplate(body, fill([vr("a", "X"), vr("b", "Y")]), "s"), /adjacent with no separator/);
  });

  // ── Visual lines: <a:br/> is a line boundary (text-fill-redesign.md) ──────────

  // BUG-1 regression: a name-over-title-in-one-paragraph shape splits its two
  // lines with <a:br/>, not two <a:p>. Template line i must map to visual line i,
  // each keeping its own run style.
  it("fillTemplate treats <a:br/> as a visual line boundary, preserving each run's style", () => {
    const body = makeTextBody(
      "<a:p>" +
        "<a:r><a:rPr/><a:t>— Firstname Lastname</a:t></a:r>" +
        "<a:br/>" +
        '<a:r><a:rPr sz="800"/><a:t>Job Title</a:t></a:r>' +
        "</a:p>",
    );
    fillTemplate(
      body,
      fill([vr("attributionName", "Ada Lovelace")], [vr("attributionTitle", "Engineer")]),
      "attribution",
    );
    assert.deepEqual(allTexts(body), ["Ada Lovelace", "Engineer"]);
    const runs = body.getElementsByTagName("a:r");
    // Run 0 keeps its blank style; run 1 keeps sz="800".
    assert.equal(runs[0].getElementsByTagName("a:rPr")[0].getAttribute("sz"), null);
    assert.equal(runs[1].getElementsByTagName("a:rPr")[0].getAttribute("sz"), "800");
  });

  it("fillTemplate fills separate paragraphs 1:1, preserving each paragraph's style", () => {
    const body = makeTextBody(
      '<a:p><a:r><a:rPr b="1"/><a:t>Name here</a:t></a:r></a:p>' +
        '<a:p><a:r><a:rPr sz="800"/><a:t>Title here</a:t></a:r></a:p>',
    );
    fillTemplate(body, fill([vr("n", "Ada")], [vr("t", "Engineer")]), "s");
    assert.deepEqual(allTexts(body), ["Ada", "Engineer"]);
    const runs = body.getElementsByTagName("a:r");
    assert.equal(runs[0].getElementsByTagName("a:rPr")[0].getAttribute("b"), "1");
    assert.equal(runs[1].getElementsByTagName("a:rPr")[0].getAttribute("sz"), "800");
  });

  it("fillTemplate throws when template has 3 lines but the shape has 2 visual lines", () => {
    // One <a:p> with a single <a:br/> → two visual lines.
    const body = makeTextBody(
      "<a:p><a:r><a:rPr/><a:t>Line one</a:t></a:r><a:br/><a:r><a:rPr/><a:t>Line two</a:t></a:r></a:p>",
    );
    assert.throws(() => fillTemplate(body, litFill("A", "B", "C"), "twoLineShape"), /twoLineShape/);
  });

  // The <a:br/> guards the two runs against coalescing: same-style runs on
  // opposite sides of a break are DIFFERENT visual lines, so coalescing (scoped
  // per visual line) must not merge them into one. A paragraph-scoped coalesce
  // would collapse them and misalign the fill — this test would fail.
  it("fillTemplate does not coalesce same-style runs across a line break", () => {
    const body = makeTextBody(
      "<a:p><a:r><a:rPr/><a:t>Line one</a:t></a:r><a:br/><a:r><a:rPr/><a:t>Line two</a:t></a:r></a:p>",
    );
    fillTemplate(body, litFill("First", "Second"), "s");
    // Each visual line filled independently.
    assert.deepEqual(allTexts(body), ["First", "Second"]);
    // Both same-style runs survive — the break kept them apart.
    assert.equal(runCount(body), 2);
    assert.equal(body.getElementsByTagName("a:br").length, 1);
  });
});

// ============================================
// coalesceSameStyleRuns
// ============================================

describe("coalesceSameStyleRuns", () => {
  const para = (inner: string) => paraAt(makeTextBody(`<a:p>${inner}</a:p>`), 0);

  it("merges adjacent identical-style runs, concatenating text", () => {
    const p = para('<a:r><a:rPr lang="en"/><a:t>Su</a:t></a:r><a:r><a:rPr lang="en"/><a:t>ff</a:t></a:r>');
    coalesceSameStyleRuns(p);
    assert.deepEqual(allTexts(p), ["Suff"]);
  });

  it("treats a missing rPr and an empty rPr as the same default style", () => {
    const p = para("<a:r><a:t>a</a:t></a:r><a:r><a:rPr/><a:t>b</a:t></a:r>");
    coalesceSameStyleRuns(p);
    assert.deepEqual(allTexts(p), ["ab"]);
  });

  it("is insensitive to attribute order", () => {
    const p = para('<a:r><a:rPr b="1" i="1"/><a:t>a</a:t></a:r><a:r><a:rPr i="1" b="1"/><a:t>b</a:t></a:r>');
    coalesceSameStyleRuns(p);
    assert.deepEqual(allTexts(p), ["ab"]);
  });

  it("does NOT merge runs of different style", () => {
    const p = para('<a:r><a:rPr b="1"/><a:t>a</a:t></a:r><a:r><a:rPr/><a:t>b</a:t></a:r>');
    coalesceSameStyleRuns(p);
    assert.deepEqual(allTexts(p), ["a", "b"]);
  });

  it("compares nested style children (e.g. differing color) — not merged", () => {
    const red = "<a:rPr><a:solidFill><a:srgbClr val=\"FF0000\"/></a:solidFill></a:rPr>";
    const blue = "<a:rPr><a:solidFill><a:srgbClr val=\"0000FF\"/></a:solidFill></a:rPr>";
    const p = para(`<a:r>${red}<a:t>a</a:t></a:r><a:r>${blue}<a:t>b</a:t></a:r>`);
    coalesceSameStyleRuns(p);
    assert.deepEqual(allTexts(p), ["a", "b"]);
  });
});

// Guard (per design note): fillText rebuilds fresh paragraphs, so a specimen
// whose text is split across same-style runs must still fill correctly — it
// never needs coalescing because it samples the first run's (representative) rPr.
describe("fillText with split-run specimen", () => {
  it("rebuilds correctly from a same-style split specimen", () => {
    const body = makeTextBody(
      "<a:p>" +
        '<a:r><a:rPr lang="en"/><a:t>Spec</a:t></a:r>' +
        '<a:r><a:rPr lang="en"/><a:t>imen</a:t></a:r>' +
        "</a:p>",
    );
    fillText(body, { paragraphs: [plain("First line"), plain("Second line")] });
    assert.deepEqual(allTexts(body), ["First line", "Second line"]);
  });
});

// ============================================
// isTableFill discriminator
// ============================================

describe("isTableFill", () => {
  it("returns true for TableFill objects", () => {
    const td: TableFill = { headers: [cell("A")], rows: [[cell("1")]] };
    assert.equal(isTableFill(td), true);
  });

  it("returns false for strings", () => {
    assert.equal(isTableFill("hello"), false);
  });

  it("returns false for arrays", () => {
    assert.equal(isTableFill(["a", "b"]), false);
  });

  it("returns false for StyledParagraph arrays", () => {
    const lines: StyledParagraph[] = [{ runs: [{ text: "hi" }] }];
    assert.equal(isTableFill(lines), false);
  });
});

// ============================================
// fillTable — TableFill input shape
// ============================================

function makeTableXml(rows: string[][], colWidths?: number[]): string {
  const nCols = rows[0].length;
  const widths = colWidths ?? Array.from({ length: nCols }, () => 1000000);
  const grid = `<a:tblGrid>${widths.map((w) => `<a:gridCol w="${w}"/>`).join("")}</a:tblGrid>`;
  const trs = rows
    .map(
      (cells) =>
        `<a:tr h="100000">${cells.map((c) => `<a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:rPr/><a:t>${c}</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc>`).join("")}</a:tr>`,
    )
    .join("");
  return `<p:graphicFrame xmlns:a="${NS_A}" xmlns:p="${NS_P}"><a:tbl>${grid}${trs}</a:tbl></p:graphicFrame>`;
}

/** Column widths from a filled table's <a:tblGrid>, in document order. */
function gridWidths(el: any): number[] {
  const cols = el.getElementsByTagName("a:gridCol");
  const out: number[] = [];
  for (let i = 0; i < cols.length; i++) out.push(Number(cols[i].getAttribute("w")));
  return out;
}

/** Cell count of a given row (0 = header). */
function rowCellCount(el: any, rowIndex: number): number {
  return el.getElementsByTagName("a:tr")[rowIndex].getElementsByTagName("a:tc").length;
}

describe("fillTable", () => {
  it("fills header and data rows from TableFill", () => {
    const el = parseXml(
      makeTableXml([
        ["H1", "H2", "H3"],
        ["D1", "D2", "D3"],
      ]),
    ).documentElement;

    const td: TableFill = {
      headers: cells("Name", "Price", "Qty"),
      rows: [cells("Widget", "$10", "100"), cells("Gadget", "$20", "50")],
    };
    fillTable(el, td, "t", [1, 1]);

    const trs = el.getElementsByTagName("a:tr");
    assert.equal(trs.length, 3);
    assert.deepEqual(allTexts(trs[0]), ["Name", "Price", "Qty"]);
    assert.deepEqual(allTexts(trs[1]), ["Widget", "$10", "100"]);
    assert.deepEqual(allTexts(trs[2]), ["Gadget", "$20", "50"]);
  });

  it("throws when element has no a:tbl", () => {
    const el = parseXml(`<p:sp xmlns:a="${NS_A}" xmlns:p="${NS_P}"><a:p><a:r><a:t>hi</a:t></a:r></a:p></p:sp>`).documentElement;
    const td: TableFill = { headers: [cell("A")], rows: [[cell("1")]] };
    assert.throws(() => fillTable(el, td, "t", [1, 1]), /has no <a:tbl> element/);
  });

  it("trims columns to match data when data has fewer than the template", () => {
    const el = parseXml(
      makeTableXml([
        ["H1", "H2", "H3"],
        ["D1", "D2", "D3"],
      ]),
    ).documentElement;

    const td: TableFill = { headers: [cell("Only1")], rows: [[cell("Val1")]] };
    fillTable(el, td, "t", [1, 1]);

    const trs = el.getElementsByTagName("a:tr");
    assert.equal(trs.length, 2);
    assert.deepEqual(allTexts(trs[0]), ["Only1"]);
    assert.deepEqual(allTexts(trs[1]), ["Val1"]);
    // Rows and grid are trimmed to the data's column count — no stale specimen cells survive.
    assert.equal(rowCellCount(el, 0), 1);
    assert.equal(rowCellCount(el, 1), 1);
    assert.equal(gridWidths(el).length, 1);
  });

  it("expands columns to match data when data has more than the template", () => {
    const el = parseXml(
      makeTableXml([
        ["H1", "H2"],
        ["D1", "D2"],
      ]),
    ).documentElement;

    const td: TableFill = { headers: cells("A", "B", "C", "D"), rows: [cells("1", "2", "3", "4")] };
    fillTable(el, td, "t", [1, 1]);

    const trs = el.getElementsByTagName("a:tr");
    assert.equal(trs.length, 2);
    assert.deepEqual(allTexts(trs[0]), ["A", "B", "C", "D"]);
    assert.deepEqual(allTexts(trs[1]), ["1", "2", "3", "4"]);
    // Rows and grid grow to the data's column count.
    assert.equal(rowCellCount(el, 0), 4);
    assert.equal(rowCellCount(el, 1), 4);
    assert.equal(gridWidths(el).length, 4);
  });

  it("conserves total table width when expanding columns", () => {
    const el = parseXml(
      makeTableXml(
        [
          ["H1", "H2"],
          ["D1", "D2"],
        ],
        [900000, 300000],
      ),
    ).documentElement;
    const total = gridWidths(el).reduce((a, b) => a + b, 0);

    const td: TableFill = { headers: cells("A", "B", "C"), rows: [cells("1", "2", "3")] };
    fillTable(el, td, "t", [1, 1]);

    const after = gridWidths(el);
    assert.equal(after.length, 3);
    assert.equal(
      after.reduce((a, b) => a + b, 0),
      total,
    );
  });

  it("conserves total table width when trimming columns", () => {
    const el = parseXml(
      makeTableXml(
        [
          ["H1", "H2", "H3"],
          ["D1", "D2", "D3"],
        ],
        [400000, 400000, 400000],
      ),
    ).documentElement;
    const total = gridWidths(el).reduce((a, b) => a + b, 0);

    const td: TableFill = { headers: cells("A", "B"), rows: [cells("1", "2")] };
    fillTable(el, td, "t", [1, 1]);

    const after = gridWidths(el);
    assert.equal(after.length, 2);
    assert.equal(
      after.reduce((a, b) => a + b, 0),
      total,
    );
  });

  it("clones the last cell's styling for added columns", () => {
    const grid = `<a:tblGrid><a:gridCol w="1000000"/><a:gridCol w="1000000"/></a:tblGrid>`;
    const tc = (t: string, anchor?: string) =>
      `<a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:rPr/><a:t>${t}</a:t></a:r></a:p></a:txBody><a:tcPr${anchor ? ` anchor="${anchor}"` : ""}/></a:tc>`;
    const row = (a: string, b: string) => `<a:tr h="100000">${tc(a)}${tc(b, "ctr")}</a:tr>`;
    const xml = `<p:graphicFrame xmlns:a="${NS_A}" xmlns:p="${NS_P}"><a:tbl>${grid}${row("H1", "H2")}${row("D1", "D2")}</a:tbl></p:graphicFrame>`;
    const el = parseXml(xml).documentElement;

    const td: TableFill = { headers: cells("A", "B", "C", "D"), rows: [cells("1", "2", "3", "4")] };
    fillTable(el, td, "t", [1, 1]);

    const headerCells = el.getElementsByTagName("a:tr")[0].getElementsByTagName("a:tc");
    assert.equal(headerCells.length, 4);
    // Added columns clone the last specimen cell, which carried anchor="ctr".
    assert.equal(headerCells[2].getElementsByTagName("a:tcPr")[0].getAttribute("anchor"), "ctr");
    assert.equal(headerCells[3].getElementsByTagName("a:tcPr")[0].getAttribute("anchor"), "ctr");
    // The original first cell is untouched (no anchor).
    assert.equal(headerCells[0].getElementsByTagName("a:tcPr")[0].getAttribute("anchor"), null);
  });

  it("gives the rounding remainder to the last column when width is not divisible", () => {
    const el = parseXml(
      makeTableXml(
        [
          ["H1", "H2"],
          ["D1", "D2"],
        ],
        [500000, 500000],
      ),
    ).documentElement;
    const total = gridWidths(el).reduce((a, b) => a + b, 0); // 1_000_000, not divisible by 3

    const td: TableFill = { headers: cells("A", "B", "C"), rows: [cells("1", "2", "3")] };
    fillTable(el, td, "t", [1, 1]);

    const after = gridWidths(el);
    const each = Math.round(total / 3); // 333_333
    // First n-1 columns get the even share; the last absorbs the remainder so the total is exact.
    assert.deepEqual(after, [each, each, total - each * 2]); // [333333, 333333, 333334]
    assert.equal(
      after.reduce((a, b) => a + b, 0),
      total,
    );
  });

  it("pads short data rows and truncates long ones to the header column count", () => {
    const el = parseXml(
      makeTableXml([
        ["H1", "H2", "H3"],
        ["D1", "D2", "D3"],
      ]),
    ).documentElement;

    const td: TableFill = {
      headers: cells("A", "B", "C"),
      rows: [
        cells("1"), // short: 1 value for 3 columns
        cells("x", "y", "z", "w"), // long: 4 values for 3 columns
      ],
    };
    fillTable(el, td, "t", [1, 1]);

    const trs = el.getElementsByTagName("a:tr");
    assert.equal(trs.length, 3);
    // Short row: padded to 3 cells; first carries the value, no stale specimen text (D2/D3) survives.
    assert.equal(rowCellCount(el, 1), 3);
    assert.equal(trs[1].getElementsByTagName("a:tc")[0].getElementsByTagName("a:t")[0].textContent, "1");
    assert.ok(!allTexts(trs[1]).includes("D2"));
    assert.ok(!allTexts(trs[1]).includes("D3"));
    // Long row: truncated to 3 cells; the 4th value is dropped.
    assert.equal(rowCellCount(el, 2), 3);
    assert.deepEqual(allTexts(trs[2]), ["x", "y", "z"]);
  });

  it("handles empty rows array (headers only)", () => {
    const el = parseXml(
      makeTableXml([
        ["H1", "H2"],
        ["D1", "D2"],
      ]),
    ).documentElement;

    const td: TableFill = { headers: cells("Name", "Value"), rows: [] };
    fillTable(el, td, "t", [1, 1]);

    const trs = el.getElementsByTagName("a:tr");
    assert.equal(trs.length, 1);
    assert.deepEqual(allTexts(trs[0]), ["Name", "Value"]);
  });
});

// ============================================
// fillTable — body-range row composition
// ============================================

// Each specimen row carries a unique <a:tcPr> marker color ("m0", "m1", …).
// fillTable preserves tcPr and rebuilds only the cell text, so reading each output
// row's marker back proves which specimen row backed it.
function markedTableXml(nRows: number, nCols = 2): string {
  const grid = `<a:tblGrid>${Array.from({ length: nCols }, () => `<a:gridCol w="1000000"/>`).join("")}</a:tblGrid>`;
  const trs = Array.from({ length: nRows }, (_, r) => {
    const tcs = Array.from(
      { length: nCols },
      (_, c) =>
        `<a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:rPr/><a:t>r${r}c${c}</a:t></a:r></a:p></a:txBody>` +
        `<a:tcPr><a:solidFill><a:srgbClr val="m${r}"/></a:solidFill></a:tcPr></a:tc>`,
    ).join("");
    return `<a:tr h="100000">${tcs}</a:tr>`;
  }).join("");
  return `<p:graphicFrame xmlns:a="${NS_A}" xmlns:p="${NS_P}"><a:tbl>${grid}${trs}</a:tbl></p:graphicFrame>`;
}

/** The per-row specimen marker ("m0"…) of every output row, header first. */
function rowMarkers(el: any): string[] {
  const trs = el.getElementsByTagName("a:tr");
  const out: string[] = [];
  for (let i = 0; i < trs.length; i++) {
    const tcPr = trs[i].getElementsByTagName("a:tcPr")[0];
    out.push(tcPr.getElementsByTagName("a:srgbClr")[0].getAttribute("val"));
  }
  return out;
}

/** TableFill with `k` two-column data rows and a two-column header. */
function tableData(k: number): TableFill {
  return { headers: cells("H1", "H2"), rows: Array.from({ length: k }, (_, i) => cells(`d${i}0`, `d${i}1`)) };
}

// The pricing specimen: 7 rows. Row 0 = header, row 1 = a top-fixed under-header
// row, rows 2..5 = the repeatable body, row 6 = a bottom-fixed total row.
const PRICING: [number, number] = [2, 5];

describe("fillTable body range", () => {
  it("composes 1:1 when K == R-1 (fixed rows + one body cycle)", () => {
    const el = parseXml(markedTableXml(7)).documentElement;
    fillTable(el, tableData(6), "pricing", PRICING);
    // header, top-fixed(1), body 2..5, bottom-fixed(6) — the designer's exact table.
    assert.deepEqual(rowMarkers(el), ["m0", "m1", "m2", "m3", "m4", "m5", "m6"]);
  });

  it("loops only the body range for large K; fixed rows once", () => {
    const el = parseXml(markedTableXml(7)).documentElement;
    fillTable(el, tableData(10), "pricing", PRICING);
    // top-fixed(1), body cycles 2,3,4,5,2,3,4,5, bottom-fixed(6) always last.
    assert.deepEqual(rowMarkers(el), ["m0", "m1", "m2", "m3", "m4", "m5", "m2", "m3", "m4", "m5", "m6"]);
  });

  it("truncates the body for small K, keeping both fixed rows", () => {
    const el = parseXml(markedTableXml(7)).documentElement;
    fillTable(el, tableData(3), "pricing", PRICING);
    // top-fixed(1), one body(2), bottom-fixed(6).
    assert.deepEqual(rowMarkers(el), ["m0", "m1", "m2", "m6"]);
  });

  it("emits zero body rows when K == top + bottom fixed count", () => {
    const el = parseXml(markedTableXml(7)).documentElement;
    fillTable(el, tableData(2), "pricing", PRICING);
    // K == P + S == 2: top-fixed(1) and bottom-fixed(6), no body.
    assert.deepEqual(rowMarkers(el), ["m0", "m1", "m6"]);
  });

  // Divider-gap regression: the top-fixed specimen (m1) hides its top border, so
  // it must never land in an interior position for large K — only once, at the top.
  it("never places the top-fixed specimen in an interior position (divider-gap regression)", () => {
    const el = parseXml(markedTableXml(7)).documentElement;
    fillTable(el, tableData(10), "pricing", PRICING);
    const markers = rowMarkers(el);
    // m1 appears exactly once, and only as the first data row (index 1).
    assert.equal(markers.filter((m) => m === "m1").length, 1);
    assert.equal(markers.indexOf("m1"), 1);
    // The looped middle draws only from the body specimens (m2..m5).
    assert.ok(markers.slice(2).every((m) => m !== "m1"));
  });

  // The bottom-fixed (Total) row is rendered once and consumes the LAST data row:
  // with tableData(6), data row 5 (d50/d51) lands in the m6 total row.
  it("backs the bottom-fixed row with the specimen's last row and the deck's last data row", () => {
    const el = parseXml(markedTableXml(7)).documentElement;
    fillTable(el, tableData(6), "pricing", PRICING);
    const trs = el.getElementsByTagName("a:tr");
    const total = trs[trs.length - 1];
    assert.equal(total.getElementsByTagName("a:tcPr")[0].getElementsByTagName("a:srgbClr")[0].getAttribute("val"), "m6");
    assert.deepEqual(allTexts(total), ["d50", "d51"]);
  });

  it("alternates a 2-row body range (zebra)", () => {
    // 3-row specimen, body = rows 1..2, no fixed rows → pure zebra.
    const el = parseXml(markedTableXml(3)).documentElement;
    fillTable(el, tableData(4), "zebra", [1, 2]);
    assert.deepEqual(rowMarkers(el), ["m0", "m1", "m2", "m1", "m2"]);
  });

  it("throws when the deck supplies fewer rows than the fixed rows need", () => {
    const el = parseXml(markedTableXml(7)).documentElement;
    // K == 1 < P + S == 2.
    assert.throws(() => fillTable(el, tableData(1), "S", PRICING), /S.*1 data row\(s\).*at least 2/s);
  });

  it("throws when start < 1 (row 0 is the header)", () => {
    const el = parseXml(markedTableXml(7)).documentElement;
    assert.throws(() => fillTable(el, tableData(3), "S", [0, 5]), /S.*out of range/s);
  });

  it("throws when end exceeds the specimen's last row", () => {
    const el = parseXml(markedTableXml(7)).documentElement;
    assert.throws(() => fillTable(el, tableData(3), "S", [2, 7]), /S.*out of range/s);
  });

  it("throws when start > end", () => {
    const el = parseXml(markedTableXml(7)).documentElement;
    assert.throws(() => fillTable(el, tableData(3), "S", [5, 2]), /S.*out of range/s);
  });
});

// ============================================
// Table filler — always adapts to the data (no fixed-column guard)
// ============================================

describe("Table filler", () => {
  it("returns one fill callback for any column count — no column-count guard", () => {
    for (const headers of [cells("A"), cells("A", "B", "C"), cells("A", "B", "C", "D", "E", "F")]) {
      const value: TableFill = { headers, rows: [] };
      const cbs = FILLERS[SlotType.Table].callbacks(value, {
        shapeName: "S",
        label: "S",
        bodyRows: [1, 1],
      });
      assert.equal(cbs.length, 1);
      assert.equal(typeof cbs[0], "function");
    }
  });
});

// ============================================
// computeGeometry — image scaling/crop constraints
// ============================================

const PX = 9525; // NATIVE_EMU_PER_PX (1:1 at 96 dpi)
const ICON = ImageFit.ScaleDown;
const IMAGE = ImageFit.Contain;
const BACKGROUND = ImageFit.Cover;
const frame = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });

describe("computeGeometry", () => {
  it("icon never upscales — renders at native size, centred (letterbox)", () => {
    // 100px icon in a frame ~105px wide: contain would enlarge, but maxUpscale 1 caps it.
    const { geometry } = computeGeometry(frame(0, 0, 1_000_000, 1_000_000), 100, 100, ICON);
    assert.equal(geometry.placement, "fit");
    if (geometry.placement !== "fit") return;
    assert.equal(geometry.cx, 100 * PX); // 952500 — native, not stretched to the frame
    assert.equal(geometry.cy, 100 * PX);
    assert.equal(geometry.x, Math.round((1_000_000 - 100 * PX) / 2));
  });

  it("image scales up to fit (contain) but warns when it drops below the PPI floor", () => {
    const { geometry, warnings } = computeGeometry(frame(0, 0, 1_000_000, 1_000_000), 100, 100, IMAGE);
    assert.equal(geometry.placement, "fit");
    if (geometry.placement !== "fit") return;
    assert.equal(geometry.cx, 1_000_000); // fills — image may upscale
    assert.ok(warnings.some((w) => /enlarged/.test(w)));
  });

  it("image downscales to fit a smaller frame with no warning", () => {
    const { geometry, warnings } = computeGeometry(frame(0, 0, 500_000, 500_000), 200, 200, IMAGE);
    assert.equal(geometry.placement, "fit");
    if (geometry.placement !== "fit") return;
    assert.equal(geometry.cx, 500_000);
    assert.equal(warnings.length, 0);
  });

  it("background fills the frame and crops the overflow", () => {
    // landscape 200x100 into a square frame → cover crops the sides.
    const { geometry } = computeGeometry(frame(0, 0, 1_000_000, 1_000_000), 200, 100, BACKGROUND);
    assert.equal(geometry.placement, "crop");
    if (geometry.placement !== "crop") return;
    assert.equal(geometry.left, 25000); // (1 - 1e6/2e6)/2 = 0.25 → 25000 (1/100,000%)
    assert.equal(geometry.top, 0);
  });

  it("warns on a severe aspect mismatch (landscape image, portrait frame, contain)", () => {
    const { geometry, warnings } = computeGeometry(frame(0, 0, 500_000, 1_000_000), 200, 100, IMAGE);
    assert.equal(geometry.placement, "fit");
    if (geometry.placement !== "fit") return;
    assert.equal(geometry.cy, 250_000); // letterboxed to width, 75% empty
    assert.ok(warnings.some((w) => /empty/.test(w)));
  });

  it("background warns when cover crops more than half the image", () => {
    // 800x200 landscape into a square frame. cover scale = 1e6/200 = 5000
    // (scaleRatio 0.525 — no enlarge/shrink noise); shownW = 4e6 overflows,
    // cropping 1 - 1e6/4e6 = 75% of the picture.
    const { geometry, warnings } = computeGeometry(frame(0, 0, 1_000_000, 1_000_000), 800, 200, BACKGROUND);
    assert.equal(geometry.placement, "crop");
    if (geometry.placement !== "crop") return;
    assert.equal(geometry.left, 37500); // (1 - 1e6/4e6)/2 = 0.375 → 37500
    assert.equal(geometry.top, 0);
    assert.ok(warnings.some((w) => /cropping 75%/.test(w)));
    assert.ok(!warnings.some((w) => /enlarged|shrunk/.test(w)));
  });
});

// ============================================
// setRichRuns — color support
// ============================================

describe("setRichRuns color", () => {
  it("applies solidFill with srgbClr for colored runs", () => {
    const body = makeTextBody(makeParagraph("Template"));
    const para = paraAt(body, 0);
    setRichRuns(para, [{ text: "red token", color: "FF0000" }]);
    const solidFill = para.getElementsByTagName("a:solidFill")[0];
    assert.ok(solidFill);
    const srgbClr = solidFill.getElementsByTagName("a:srgbClr")[0];
    assert.ok(srgbClr);
    assert.equal(srgbClr.getAttribute("val"), "FF0000");
  });

  it("replaces existing solidFill from template", () => {
    const body = makeTextBody(
      `<a:p><a:r><a:rPr><a:solidFill><a:srgbClr val="00FF00"/></a:solidFill></a:rPr><a:t>Green</a:t></a:r></a:p>`,
    );
    const para = paraAt(body, 0);
    setRichRuns(para, [{ text: "now red", color: "FF0000" }]);
    const fills = para.getElementsByTagName("a:solidFill");
    assert.equal(fills.length, 1);
    assert.equal(fills[0].getElementsByTagName("a:srgbClr")[0].getAttribute("val"), "FF0000");
  });

  it("does not add solidFill when color is absent", () => {
    const body = makeTextBody(makeParagraph("Template"));
    const para = paraAt(body, 0);
    setRichRuns(para, [{ text: "no color" }]);
    const fills = para.getElementsByTagName("a:solidFill");
    assert.equal(fills.length, 0);
  });

  it("multiple runs with different colors", () => {
    const body = makeTextBody(makeParagraph("Template"));
    const para = paraAt(body, 0);
    setRichRuns(para, [
      { text: "SELECT ", color: "FF7B72" },
      { text: "name", color: "79C0FF" },
      { text: " FROM ", color: "FF7B72" },
      { text: "users", color: "79C0FF" },
    ]);
    assert.equal(runCount(para), 4);
    const runs = para.getElementsByTagName("a:r");
    assert.equal(runs[0].getElementsByTagName("a:srgbClr")[0].getAttribute("val"), "FF7B72");
    assert.equal(runs[1].getElementsByTagName("a:srgbClr")[0].getAttribute("val"), "79C0FF");
  });

  it("creates rPr when template run lacks one and color is set", () => {
    const body = makeTextBody(`<a:p><a:r><a:t>NoProps</a:t></a:r></a:p>`);
    const para = paraAt(body, 0);
    setRichRuns(para, [{ text: "colored", color: "AABBCC" }]);
    const rPr = para.getElementsByTagName("a:rPr")[0];
    assert.ok(rPr);
    const srgbClr = rPr.getElementsByTagName("a:srgbClr")[0];
    assert.equal(srgbClr.getAttribute("val"), "AABBCC");
  });

  it("color works alongside bold and italic", () => {
    const body = makeTextBody(makeParagraph("Template"));
    const para = paraAt(body, 0);
    setRichRuns(para, [{ text: "styled", bold: true, italic: true, color: "112233" }]);
    const rPr = para.getElementsByTagName("a:rPr")[0];
    assert.equal(rPr.getAttribute("b"), "1");
    assert.equal(rPr.getAttribute("i"), "1");
    assert.equal(rPr.getElementsByTagName("a:srgbClr")[0].getAttribute("val"), "112233");
  });
});

// ============================================
// fillSlide — composition-aware slot dispatch (accepts: Block[])
// ============================================

describe("fillSlide dispatch", () => {
  const BASE = 1;

  type Call = { op: "modify" | "add" | "remove"; name: string; extra?: unknown };
  const recordingSlide = () => {
    const calls: Call[] = [];
    return {
      calls,
      slide: {
        modifyElement(name: string, cbs: unknown) {
          calls.push({ op: "modify", name, extra: cbs });
        },
        addElement(_alias: string, n: number, name: string, cbs: unknown[]) {
          calls.push({ op: "add", name, extra: { sourceSlide: n, cbs } });
        },
        removeElement(name: string) {
          calls.push({ op: "remove", name });
        },
      },
    };
  };

  const FRAME = { x: 10, y: 20, cx: 300, cy: 400 };
  const layout = (slots: Slot[]): Layout => ({ name: "L", baseSlide: BASE, slots });
  const slot = (key: string, accepts: Slot["accepts"]): Slot => ({ key, frame: FRAME, accepts });

  const textVal: TextFill = { paragraphs: [plain("hello")] };
  const tableVal: TableFill = { headers: cells("A", "B"), rows: [] };
  const imageVal: ImageFill = { type: SlotType.Image, path: "/abs/pic.png", fit: ImageFit.Contain };

  const step = (content: DeckStep["content"]): DeckStep => ({ layout: "L", content });

  // Edge case 1 — no block accepts the requested type → throw naming everything.
  it("throws when no block accepts the requested content type", () => {
    const l = layout([slot("left", [{ type: SlotType.Text, sourceSlide: BASE, shapeName: "s2" }])]);
    const { slide, calls } = recordingSlide();
    assert.throws(
      () => fillSlide(slide, l, step({ left: tableVal }), "source", BASE),
      (err: Error) => {
        assert.ok(err.message.includes('Layout "L"'));
        assert.ok(err.message.includes('slot "left"'));
        assert.ok(err.message.includes("table")); // requested type
        assert.ok(err.message.includes("text")); // available type
        return true;
      },
    );
    assert.equal(calls.length, 0);
  });

  // Edge case 2 — the base slide already has that type there → fill in place.
  it("fills in place when the base block matches (no transplant)", () => {
    const l = layout([slot("body", [{ type: SlotType.Text, sourceSlide: BASE, shapeName: "s2" }])]);
    const { slide, calls } = recordingSlide();
    fillSlide(slide, l, step({ body: textVal }), "source", BASE);
    assert.deepEqual(
      calls.map((c) => ({ op: c.op, name: c.name })),
      [{ op: "modify", name: "s2" }],
    );
  });

  // Edge case 3 — type only available via transplant → addElement + position + remove base.
  it("transplants, positions to the slot frame, and removes the superseded base shape", () => {
    const l = layout([
      slot("left", [
        { type: SlotType.Text, sourceSlide: BASE, shapeName: "textbox" },
        { type: SlotType.Table, sourceSlide: 5, shapeName: "specimenTable", bodyRows: [1, 1] },
      ]),
    ]);
    const { slide, calls } = recordingSlide();
    fillSlide(slide, l, step({ left: tableVal }), "source", BASE);

    assert.equal(calls.length, 2);
    const add = calls[0];
    assert.equal(add.op, "add");
    assert.equal(add.name, "specimenTable");
    assert.equal((add.extra as { sourceSlide: number }).sourceSlide, 5);
    // setPosition(slot.frame) is prepended before the fill callback(s).
    const cbs = (add.extra as { cbs: unknown[] }).cbs;
    assert.equal(cbs.length, 2);
    assert.equal(typeof cbs[0], "function");
    // The base text shape it supersedes is removed.
    assert.deepEqual(calls[1], { op: "remove", name: "textbox" });
  });

  it("transplants without removing anything when the slot has no base block", () => {
    const l = layout([
      slot("left", [{ type: SlotType.Table, sourceSlide: 5, shapeName: "t", bodyRows: [1, 1] }]),
    ]);
    const { slide, calls } = recordingSlide();
    fillSlide(slide, l, step({ left: tableVal }), "source", BASE);
    assert.deepEqual(
      calls.map((c) => ({ op: c.op, name: c.name })),
      [{ op: "add", name: "t" }],
    );
  });

  // Edge case 4 — content for a slot the layout doesn't declare → throw.
  it("throws when the deck supplies content for an unknown slot key", () => {
    const l = layout([slot("body", [{ type: SlotType.Text, sourceSlide: BASE, shapeName: "s2" }])]);
    const { slide } = recordingSlide();
    assert.throws(
      () => fillSlide(slide, l, step({ nope: textVal }), "source", BASE),
      (err: Error) => {
        assert.ok(err.message.includes('has no slot "nope"'));
        assert.ok(err.message.includes("body")); // lists declared slots
        return true;
      },
    );
  });

  // Edge case 5 — a slot left empty leaves the base slide's shape untouched.
  it("does nothing for a slot the deck leaves empty", () => {
    const l = layout([
      slot("a", [{ type: SlotType.Text, sourceSlide: BASE, shapeName: "sa" }]),
      slot("b", [{ type: SlotType.Text, sourceSlide: BASE, shapeName: "sb" }]),
    ]);
    const { slide, calls } = recordingSlide();
    fillSlide(slide, l, step({ a: textVal }), "source", BASE);
    assert.deepEqual(
      calls.map((c) => c.name),
      ["sa"],
    );
  });

  it("throws on an unrecognized content value (e.g. a bare string)", () => {
    const l = layout([slot("body", [{ type: SlotType.Text, sourceSlide: BASE, shapeName: "s2" }])]);
    const { slide } = recordingSlide();
    assert.throws(
      () => fillSlide(slide, l, step({ body: "just a string" } as unknown as DeckStep["content"]), "source", BASE),
      (err: Error) => {
        assert.ok(err.message.includes("unrecognized content value"));
        return true;
      },
    );
  });

  it("selects the image block when an ImageFill is supplied to a multi-type slot", () => {
    const l = layout([
      slot("hero", [
        { type: SlotType.Image, sourceSlide: BASE, shapeName: "pic" },
        { type: SlotType.Table, sourceSlide: 5, shapeName: "tbl" },
      ]),
    ]);
    const { slide, calls } = recordingSlide();
    fillSlide(slide, l, step({ hero: imageVal }), "source", BASE);
    assert.deepEqual(
      calls.map((c) => ({ op: c.op, name: c.name })),
      [{ op: "modify", name: "pic" }],
    );
  });

  it("carries a text block's startAt onto the fill target", () => {
    // Two blocks, distinct types; the text block declares startAt. We only assert
    // it dispatches to the text shape in place (startAt is consumed downstream).
    const l = layout([slot("body", [{ type: SlotType.Text, sourceSlide: BASE, shapeName: "s2", startAt: 2 }])]);
    const { slide, calls } = recordingSlide();
    fillSlide(slide, l, step({ body: textVal }), "source", BASE);
    assert.deepEqual(
      calls.map((c) => c.name),
      ["s2"],
    );
  });
});

describe("assertSlotsWellFormed", () => {
  it("throws when a slot accepts two blocks of the same type", () => {
    const l: Layout = {
      name: "L",
      baseSlide: 1,
      slots: [
        {
          key: "left",
          frame: { x: 0, y: 0, cx: 1, cy: 1 },
          accepts: [
            { type: SlotType.Table, sourceSlide: 1, shapeName: "t1" },
            { type: SlotType.Table, sourceSlide: 5, shapeName: "t2" },
          ],
        },
      ],
    };
    assert.throws(
      () => assertSlotsWellFormed(l),
      (err: Error) => {
        assert.ok(err.message.includes('slot "left"'));
        assert.ok(err.message.includes("table"));
        return true;
      },
    );
  });

  it("accepts distinct block types", () => {
    const l: Layout = {
      name: "L",
      baseSlide: 1,
      slots: [
        {
          key: "left",
          frame: { x: 0, y: 0, cx: 1, cy: 1 },
          accepts: [
            { type: SlotType.Text, sourceSlide: 1, shapeName: "s" },
            { type: SlotType.Table, sourceSlide: 5, shapeName: "t" },
          ],
        },
      ],
    };
    assert.doesNotThrow(() => assertSlotsWellFormed(l));
  });
});
