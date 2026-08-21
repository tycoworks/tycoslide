import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DOMParser } from "@xmldom/xmldom";
import { applyNotesToSlide, buildNotesSlideXml, nextFreeRId, sweepOrphanNotes } from "../dist/engine/notes.js";
import { compileDeck as compileDeckRaw } from "../dist/markdown/deckCompiler.js";
import { parseSlideDocument } from "../dist/markdown/slideParser.js";
import type { CompilerLayout } from "../dist/markdown/types.js";

// `compileDeck` now takes a single async `CompilerConfig`; this positional shim
// builds a throwaway config from the layouts so these notes tests stay terse.
const compileDeck = (doc: Parameters<typeof compileDeckRaw>[0], layouts: CompilerLayout[]) =>
  compileDeckRaw(doc, { layouts, assets: {}, template: "", rootDir: "" });

// ── XML helpers ──────────────────────────────────────────────────────────────

function parseXml(xml: string): any {
  return new DOMParser().parseFromString(xml, "text/xml");
}

function texts(el: any, tag: string): string[] {
  const nodes = el.getElementsByTagName(tag);
  const out: string[] = [];
  for (let i = 0; i < nodes.length; i++) out.push(nodes[i].textContent || "");
  return out;
}

function relsBy(doc: any): { id: string; type: string; target: string }[] {
  const rels = doc.getElementsByTagName("Relationship");
  const out: { id: string; type: string; target: string }[] = [];
  for (let i = 0; i < rels.length; i++) {
    out.push({
      id: rels[i].getAttribute("Id") || "",
      type: rels[i].getAttribute("Type") || "",
      target: rels[i].getAttribute("Target") || "",
    });
  }
  return out;
}

function overridePartNames(doc: any): string[] {
  const overrides = doc.getElementsByTagName("Override");
  const out: string[] = [];
  for (let i = 0; i < overrides.length; i++) out.push(overrides[i].getAttribute("PartName") || "");
  return out;
}

const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const REL_NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PRES_NS = "http://schemas.openxmlformats.org/presentationml/2006/main";
const CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types";
const NOTES_SLIDE_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide";
const SLIDE_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide";
const NOTES_MASTER_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster";
const LAYOUT_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout";

const SLIDE_CT = "application/vnd.openxmlformats-officedocument.presentationml.slide+xml";
const NOTES_CT = "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml";

// Real PPTX parts carry an XML declaration. Seeding source parts with one is what
// makes the double-`<?xml?>` regression observable after a rewrite.
const DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';

// The real output slide number automizer hands us (parent.targetNumber). Uses a
// non-1 value to prove the code keys purely on that number, not on step order.
const N = 75;

/**
 * A minimal `NotesArchive` (the structural surface `applyNotesToSlide` needs)
 * backed by a `Map<string,string>`. Mirrors pptx-automizer's OUTPUT archive:
 * string read/write, remove, fileExists.
 */
function fakeArchive(seed: Record<string, string> = {}): {
  read(file: string, type: "string"): Promise<string>;
  write(file: string, data: string): Promise<void>;
  remove(file: string): Promise<void>;
  fileExists(file: string): boolean;
  folder(dir: string): Promise<{ name: string; relativePath: string }[]>;
  files: Map<string, string>;
} {
  const files = new Map<string, string>(Object.entries(seed));
  return {
    files,
    async read(file: string): Promise<string> {
      const value = files.get(file);
      if (value === undefined) throw new Error(`fakeArchive.read: ${file} not found`);
      return value;
    },
    async write(file: string, data: string): Promise<void> {
      files.set(file, data);
    },
    async remove(file: string): Promise<void> {
      files.delete(file);
    },
    fileExists(file: string): boolean {
      return files.has(file);
    },
    // Mirrors IArchive.folder: top-level entries of `dir` only (nested dirs like
    // `_rels` excluded); `name` is the full archive path.
    async folder(dir: string): Promise<{ name: string; relativePath: string }[]> {
      const prefix = dir.endsWith("/") ? dir : `${dir}/`;
      const out: { name: string; relativePath: string }[] = [];
      for (const name of files.keys()) {
        if (!name.startsWith(prefix)) continue;
        const rest = name.slice(prefix.length);
        if (rest.includes("/")) continue;
        out.push({ name, relativePath: rest });
      }
      return out;
    },
  };
}

function ct(overrides: string[]): string {
  return (
    DECL +
    `<Types xmlns="${CT_NS}">` +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    overrides.join("") +
    "</Types>"
  );
}

function notesRels(slide: string): string {
  return (
    DECL +
    `<Relationships xmlns="${REL_NS}">` +
    `<Relationship Id="rId1" Type="${SLIDE_REL}" Target="../slides/${slide}.xml"/>` +
    `<Relationship Id="rId2" Type="${NOTES_MASTER_REL}" Target="../notesMasters/notesMaster1.xml"/>` +
    "</Relationships>"
  );
}

function slideRels(rels: string): string {
  return DECL + `<Relationships xmlns="${REL_NS}">${rels}</Relationships>`;
}

const LAYOUT_ONLY_RELS = `<Relationship Id="rId1" Type="${LAYOUT_REL}" Target="../slideLayouts/slideLayout1.xml"/>`;
const INHERITED_NOTES_REL = `<Relationship Id="rId2" Type="${NOTES_SLIDE_REL}" Target="../notesSlides/notesSlide${N}.xml"/>`;

/** Assert no value in the archive carries more than one `<?xml?>` declaration. */
function assertNoDoubleXmlDecl(archive: { files: Map<string, string> }): void {
  for (const [path, xml] of archive.files) {
    if (!/\.(xml|rels)$/.test(path) && path !== "[Content_Types].xml") continue;
    const count = (xml.match(/<\?xml/g) ?? []).length;
    assert.ok(count <= 1, `${path} has ${count} <?xml?> declarations`);
  }
}

// ── buildNotesSlideXml ───────────────────────────────────────────────────────

describe("buildNotesSlideXml", () => {
  it("single line produces exactly one <a:p>", async () => {
    const doc = parseXml(buildNotesSlideXml("Only one line"));
    assert.equal(doc.getElementsByTagName("a:p").length, 1);
    assert.deepEqual(texts(doc, "a:t"), ["Only one line"]);
  });

  it("three lines produce three <a:p>", async () => {
    const doc = parseXml(buildNotesSlideXml("Line 1\nLine 2\nLine 3"));
    assert.equal(doc.getElementsByTagName("a:p").length, 3);
    assert.deepEqual(texts(doc, "a:t"), ["Line 1", "Line 2", "Line 3"]);
  });

  it("carries a body placeholder (type=body idx=1)", async () => {
    const doc = parseXml(buildNotesSlideXml("x"));
    const ph = doc.getElementsByTagName("p:ph")[0];
    assert.equal(ph.getAttribute("type"), "body");
    assert.equal(ph.getAttribute("idx"), "1");
  });

  it("a trailing newline does not add an empty paragraph", async () => {
    const doc = parseXml(buildNotesSlideXml("Line 1\nLine 2\n"));
    assert.equal(doc.getElementsByTagName("a:p").length, 2);
    assert.deepEqual(texts(doc, "a:t"), ["Line 1", "Line 2"]);
  });

  it("preserves leading whitespace via xml:space on <a:t>", async () => {
    const raw = buildNotesSlideXml("  indented");
    const t = parseXml(raw).getElementsByTagName("a:t")[0];
    assert.equal(t.getAttribute("xml:space"), "preserve");
    assert.equal(t.textContent, "  indented");
    // Round-trips with the spaces intact.
    assert.deepEqual(texts(parseXml(raw), "a:t"), ["  indented"]);
  });

  it('escapes special characters & < > "', async () => {
    const raw = buildNotesSlideXml('A & B < C > D "quoted"');
    // Serialized form is escaped...
    assert.ok(raw.includes("&amp;"), "ampersand escaped");
    assert.ok(raw.includes("&lt;"), "less-than escaped");
    assert.ok(raw.includes("&gt;"), "greater-than escaped");
    // ...and round-trips back to the original text.
    assert.deepEqual(texts(parseXml(raw), "a:t"), ['A & B < C > D "quoted"']);
  });
});

// ── nextFreeRId ──────────────────────────────────────────────────────────────

describe("nextFreeRId", () => {
  it("returns rId4 for a .rels with rId1..rId3", async () => {
    const xml =
      `<Relationships xmlns="${REL_NS}">` +
      '<Relationship Id="rId1" Type="t" Target="a"/>' +
      '<Relationship Id="rId2" Type="t" Target="b"/>' +
      '<Relationship Id="rId3" Type="t" Target="c"/>' +
      "</Relationships>";
    assert.equal(nextFreeRId(xml), "rId4");
  });

  it("returns rId1 for an empty .rels", async () => {
    assert.equal(nextFreeRId(`<Relationships xmlns="${REL_NS}"></Relationships>`), "rId1");
  });
});

// ── applyNotesToSlide: overwrite an auto-copied notes part ───────────────────

describe("applyNotesToSlide (overwrite)", () => {
  it("overwrites an auto-copied notes part's text and leaves its rels + content-type untouched", async () => {
    const notesRelsPath = `ppt/notesSlides/_rels/notesSlide${N}.xml.rels`;
    const notesPath = `ppt/notesSlides/notesSlide${N}.xml`;
    const slideRelsPath = `ppt/slides/_rels/slide${N}.xml.rels`;
    const ctPath = "[Content_Types].xml";

    const archive = fakeArchive({
      [ctPath]: ct([
        `<Override PartName="/ppt/slides/slide${N}.xml" ContentType="${SLIDE_CT}"/>`,
        `<Override PartName="/${notesPath}" ContentType="${NOTES_CT}"/>`,
      ]),
      [notesPath]: buildNotesSlideXml("Template private note"),
      [notesRelsPath]: notesRels(`slide${N}`),
      [slideRelsPath]: slideRels(LAYOUT_ONLY_RELS + INHERITED_NOTES_REL),
    });

    const ctBefore = archive.files.get(ctPath);
    const notesRelsBefore = archive.files.get(notesRelsPath);
    const slideRelsBefore = archive.files.get(slideRelsPath);

    await applyNotesToSlide(archive, N, "Line A\nLine B", false);

    // Body text replaced in place.
    assert.deepEqual(texts(parseXml(archive.files.get(notesPath) as string), "a:t"), ["Line A", "Line B"]);
    // rels + content-type byte-for-byte unchanged.
    assert.equal(archive.files.get(notesRelsPath), notesRelsBefore);
    assert.equal(archive.files.get(slideRelsPath), slideRelsBefore);
    assert.equal(archive.files.get(ctPath), ctBefore);

    assertNoDoubleXmlDecl(archive);
  });
});

// ── applyNotesToSlide: synthesize a notes part from scratch ──────────────────

describe("applyNotesToSlide (synthesize)", () => {
  it("creates the notes part, its rels, a slide rel with a fresh rId, and a content-type override", async () => {
    const notesPath = `ppt/notesSlides/notesSlide${N}.xml`;
    const notesRelsPath = `ppt/notesSlides/_rels/notesSlide${N}.xml.rels`;
    const slideRelsPath = `ppt/slides/_rels/slide${N}.xml.rels`;
    const ctPath = "[Content_Types].xml";

    const archive = fakeArchive({
      [ctPath]: ct([
        `<Override PartName="/ppt/slides/slide${N}.xml" ContentType="${SLIDE_CT}"/>`,
        '<Override PartName="/ppt/notesMasters/notesMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml"/>',
      ]),
      "ppt/notesMasters/notesMaster1.xml": '<p:notesMaster xmlns:p="http://x"/>',
      // The notes master is discovered via the real presentation relationships,
      // not by filename probing — seed a notesMaster rel (Target relative to ppt/).
      "ppt/_rels/presentation.xml.rels": slideRels(
        `<Relationship Id="rId1" Type="${NOTES_MASTER_REL}" Target="notesMasters/notesMaster1.xml"/>`,
      ),
      // Cloned slide already carries a layout rel (rId1); the notes rel must claim rId2.
      [slideRelsPath]: slideRels(LAYOUT_ONLY_RELS),
    });

    await applyNotesToSlide(archive, N, "Authored one\nAuthored two", false);

    // Notes part created with the authored text.
    assert.deepEqual(texts(parseXml(archive.files.get(notesPath) as string), "a:t"), ["Authored one", "Authored two"]);

    // Notes rels point at the slide and the master.
    const nr = relsBy(parseXml(archive.files.get(notesRelsPath) as string));
    assert.equal(nr.find((r) => r.type === SLIDE_REL)?.target, `../slides/slide${N}.xml`);
    assert.equal(nr.find((r) => r.type === NOTES_MASTER_REL)?.target, "../notesMasters/notesMaster1.xml");

    // Slide rels gained a notesSlide relationship with the next free rId (rId2).
    const sr = relsBy(parseXml(archive.files.get(slideRelsPath) as string));
    const notesRel = sr.find((r) => r.type === NOTES_SLIDE_REL);
    assert.ok(notesRel, "slide rels should gain a notesSlide relationship");
    assert.equal(notesRel?.id, "rId2");
    assert.equal(notesRel?.target, `../notesSlides/notesSlide${N}.xml`);

    // Content types gained the override.
    assert.ok(overridePartNames(parseXml(archive.files.get(ctPath) as string)).includes(`/${notesPath}`));

    assertNoDoubleXmlDecl(archive);
  });

  it("throws a specific error when the template ships no notes master", async () => {
    const slideRelsPath = `ppt/slides/_rels/slide${N}.xml.rels`;
    const archive = fakeArchive({
      "[Content_Types].xml": ct([]),
      [slideRelsPath]: slideRels(LAYOUT_ONLY_RELS),
    });
    await assert.rejects(() => applyNotesToSlide(archive, N, "Some notes", false), /no notes master/i);
  });
});

// ── applyNotesToSlide: strip an auto-copied notes part ───────────────────────

describe("applyNotesToSlide (strip)", () => {
  function seededWithInheritedNotes() {
    const notesPath = `ppt/notesSlides/notesSlide${N}.xml`;
    const notesRelsPath = `ppt/notesSlides/_rels/notesSlide${N}.xml.rels`;
    const slideRelsPath = `ppt/slides/_rels/slide${N}.xml.rels`;
    const ctPath = "[Content_Types].xml";
    const archive = fakeArchive({
      [ctPath]: ct([
        `<Override PartName="/ppt/slides/slide${N}.xml" ContentType="${SLIDE_CT}"/>`,
        `<Override PartName="/${notesPath}" ContentType="${NOTES_CT}"/>`,
      ]),
      [notesPath]: buildNotesSlideXml("Template private note"),
      [notesRelsPath]: notesRels(`slide${N}`),
      [slideRelsPath]: slideRels(LAYOUT_ONLY_RELS + INHERITED_NOTES_REL),
    });
    return { archive, notesPath, notesRelsPath, slideRelsPath, ctPath };
  }

  async function assertStripped(strip: (archive: any, n: number) => Promise<void>) {
    const { archive, notesPath, notesRelsPath, slideRelsPath, ctPath } = seededWithInheritedNotes();
    await strip(archive, N);

    // (a) part gone, (b) notes rels gone.
    assert.equal(archive.files.has(notesPath), false);
    assert.equal(archive.files.has(notesRelsPath), false);
    // (c) slide -> notesSlide rel gone (no dangling rel).
    const sr = relsBy(parseXml(archive.files.get(slideRelsPath) as string));
    assert.equal(sr.find((r) => r.type === NOTES_SLIDE_REL), undefined);
    // (d) content-type override gone.
    assert.ok(!overridePartNames(parseXml(archive.files.get(ctPath) as string)).includes(`/${notesPath}`));

    assertNoDoubleXmlDecl(archive);
  }

  it("removes the part, its rels, the slide rel, and the content-type override when excludeNotes is set", async () => {
    await assertStripped((archive, n) => applyNotesToSlide(archive, n, "Author wrote notes", true));
  });

  it("strips the same way when the step authored no notes (undefined)", async () => {
    await assertStripped((archive, n) => applyNotesToSlide(archive, n, undefined, false));
  });

  it("is a no-op when the slide has no auto-copied notes part", async () => {
    const slideRelsPath = `ppt/slides/_rels/slide${N}.xml.rels`;
    const archive = fakeArchive({
      "[Content_Types].xml": ct([]),
      [slideRelsPath]: slideRels(LAYOUT_ONLY_RELS),
    });
    const before = new Map(archive.files);
    await applyNotesToSlide(archive, N, undefined, false);
    assert.deepEqual([...archive.files], [...before]);
  });
});

// ── sweepOrphanNotes: remove notesSlides no live slide references ────────────

describe("sweepOrphanNotes", () => {
  function notesPart(n: number): string {
    return `ppt/notesSlides/notesSlide${n}.xml`;
  }
  function notesRelsPart(n: number): string {
    return `ppt/notesSlides/_rels/notesSlide${n}.xml.rels`;
  }
  // A slide's rels referencing notesSlide `notes`, plus a layout rel for realism.
  function slideRelsRefNotes(notes: number): string {
    return slideRels(
      LAYOUT_ONLY_RELS +
        `<Relationship Id="rId2" Type="${NOTES_SLIDE_REL}" Target="../notesSlides/notesSlide${notes}.xml"/>`,
    );
  }
  // presentation.xml listing exactly the given slide numbers as live, in order.
  function presentationXml(live: number[]): string {
    return (
      DECL +
      `<p:presentation xmlns:r="${REL_NS_R}" xmlns:p="${PRES_NS}"><p:sldIdLst>` +
      live.map((_n, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join("") +
      "</p:sldIdLst></p:presentation>"
    );
  }
  // presentation.xml.rels mapping each live sldId's r:id to its slide part (Target relative to ppt/).
  function presentationRels(live: number[]): string {
    return slideRels(
      live
        .map((n, i) => `<Relationship Id="rId${i + 1}" Type="${SLIDE_REL}" Target="slides/slide${n}.xml"/>`)
        .join(""),
    );
  }

  it("removes unreferenced notesSlide parts, their rels, and their overrides; keeps referenced ones", async () => {
    // Four template notesSlides survive automizer; only slides 1 and 2 are LIVE
    // (per presentation.xml), referencing notesSlide2 and notesSlide4. 1 and 3 are
    // orphans — even though physically-present (but not live) template slide rels
    // slide9/slide10 still reference them, they must NOT count as referenced.
    const archive = fakeArchive({
      "ppt/presentation.xml": presentationXml([1, 2]),
      "ppt/_rels/presentation.xml.rels": presentationRels([1, 2]),
      "[Content_Types].xml": ct([
        `<Override PartName="/${notesPart(1)}" ContentType="${NOTES_CT}"/>`,
        `<Override PartName="/${notesPart(2)}" ContentType="${NOTES_CT}"/>`,
        `<Override PartName="/${notesPart(3)}" ContentType="${NOTES_CT}"/>`,
        `<Override PartName="/${notesPart(4)}" ContentType="${NOTES_CT}"/>`,
      ]),
      [notesPart(1)]: buildNotesSlideXml("Orphan one"),
      [notesPart(2)]: buildNotesSlideXml("Live A"),
      [notesPart(3)]: buildNotesSlideXml("Orphan three"),
      [notesPart(4)]: buildNotesSlideXml("Live B"),
      [notesRelsPart(1)]: notesRels("slide9"),
      [notesRelsPart(2)]: notesRels("slide1"),
      [notesRelsPart(3)]: notesRels("slide10"),
      [notesRelsPart(4)]: notesRels("slide2"),
      "ppt/slides/_rels/slide1.xml.rels": slideRelsRefNotes(2),
      "ppt/slides/_rels/slide2.xml.rels": slideRelsRefNotes(4),
      // Orphaned template slide rels still physically present, referencing the
      // orphan notesSlides. The sweep must ignore these (they are not live).
      "ppt/slides/_rels/slide9.xml.rels": slideRelsRefNotes(1),
      "ppt/slides/_rels/slide10.xml.rels": slideRelsRefNotes(3),
    });

    await sweepOrphanNotes(archive);

    // Orphan parts + their rels gone.
    for (const n of [1, 3]) {
      assert.equal(archive.files.has(notesPart(n)), false, `notesSlide${n}.xml should be swept`);
      assert.equal(archive.files.has(notesRelsPart(n)), false, `notesSlide${n} rels should be swept`);
    }
    // Referenced parts + their rels remain.
    for (const n of [2, 4]) {
      assert.equal(archive.files.has(notesPart(n)), true, `notesSlide${n}.xml should remain`);
      assert.equal(archive.files.has(notesRelsPart(n)), true, `notesSlide${n} rels should remain`);
    }

    // Content types: orphan overrides gone, referenced overrides kept.
    const overrides = overridePartNames(parseXml(archive.files.get("[Content_Types].xml") as string));
    assert.ok(!overrides.includes(`/${notesPart(1)}`), "orphan 1 override should be gone");
    assert.ok(!overrides.includes(`/${notesPart(3)}`), "orphan 3 override should be gone");
    assert.ok(overrides.includes(`/${notesPart(2)}`), "referenced 2 override should remain");
    assert.ok(overrides.includes(`/${notesPart(4)}`), "referenced 4 override should remain");

    assertNoDoubleXmlDecl(archive);
  });

  it("is a no-op when there are no notesSlide parts", async () => {
    const archive = fakeArchive({ "[Content_Types].xml": ct([]) });
    const before = new Map(archive.files);
    await sweepOrphanNotes(archive);
    assert.deepEqual([...archive.files], [...before]);
  });
});

// ── Compiler: notes stripped from frontmatter onto the step ──────────────────

const titleLayout: CompilerLayout = {
  name: "title",
  slideNumber: 1,
  description: "",
  parameters: [],
  slots: [],
};

describe("compileStep notes", () => {
  it("notes frontmatter becomes step.notes and never lands in content", async () => {
    const deck = await compileDeck(
      {
        global: { theme: "./theme.json" },
        slides: [{ index: 0, frontmatter: { layout: "title", notes: "Speak slowly" }, body: "", slots: {} }],
      },
      [titleLayout],
    );
    assert.equal(deck.steps[0].notes, "Speak slowly");
    assert.equal(deck.steps[0].content?.["notes"], undefined);
  });

  it("absent notes leaves step.notes undefined", async () => {
    const deck = await compileDeck(
      {
        global: { theme: "./theme.json" },
        slides: [{ index: 0, frontmatter: { layout: "title" }, body: "", slots: {} }],
      },
      [titleLayout],
    );
    assert.equal(deck.steps[0].notes, undefined);
  });

  it("an empty notes: key (YAML null) yields step.notes undefined, not \"null\"", async () => {
    const doc = parseSlideDocument(`---
theme: ./theme.json
---
---
layout: title
notes:
---
`);
    const deck = await compileDeck(doc, [titleLayout]);
    assert.equal(deck.steps[0].notes, undefined);
  });

  it("a YAML block scalar becomes a multi-line step.notes", async () => {
    const doc = parseSlideDocument(`---
theme: ./theme.json
---
---
layout: title
notes: |
  First line of notes.
  Second line of notes.
---
`);
    const deck = await compileDeck(doc, [titleLayout]);
    const lines = (deck.steps[0].notes ?? "").split(/\n/).filter((l) => l.trim() !== "");
    assert.deepEqual(lines, ["First line of notes.", "Second line of notes."]);
  });
});
