import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { generate } from "../dist/engine/generate.js";
import type { Config, Deck, Layout, StyledParagraph } from "../dist/engine/types.js";
import { SlotType } from "../dist/engine/types.js";

// Real end-to-end coverage of the transplant path (addElement + refill), against
// a tiny committed synthetic fixture (generated with pptxgenjs; NOT a real theme).
// Fixture shapes: slide 1 "Text 0" (title) + "Text 1" (body); slide 2 "Table 0";
// slide 3 "Image 0". Base slide is 1.

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, "fixtures");
const SWAP_PNG = join(FIXTURES, "swap.png");

const p = (text: string): StyledParagraph => ({ runs: [{ text }] });
const cell = (text: string): StyledParagraph => ({ runs: [{ text }] });

// Body region frame (EMU) of the fixture's "Text 1" — hand-read from the fixture.
const BODY_FRAME = { x: 457200, y: 1371600, cx: 8229600, cy: 2743200 };

const config = (layouts: Layout[]): Config => ({
  rootDir: FIXTURES,
  template: "composition.pptx",
  outputDir: mkdtempSync(join(tmpdir(), "tycoslide-e2e-")),
  layouts,
});

async function outputZip(cfg: Config, output: string): Promise<JSZip> {
  const buf = readFileSync(join(cfg.outputDir as string, output));
  return JSZip.loadAsync(buf);
}

// The output deck's slides may be renumbered by automizer, so match by pattern
// and concatenate rather than hardcoding slide1.xml.
async function concatMatching(zip: JSZip, re: RegExp): Promise<string> {
  const parts = await Promise.all(
    Object.keys(zip.files)
      .filter((f) => re.test(f))
      .map((f) => zip.file(f)?.async("string") ?? Promise.resolve("")),
  );
  return parts.join("\n");
}
const slideXml = (zip: JSZip) => concatMatching(zip, /ppt\/slides\/slide\d+\.xml$/);
const slideRels = (zip: JSZip) => concatMatching(zip, /ppt\/slides\/_rels\/slide\d+\.xml\.rels$/);

describe("end-to-end transplant (real addElement + refill)", () => {
  it("transplants a table into a text slot, refills it, and removes the base text", async () => {
    const cfg = config([
      {
        name: "Composed",
        baseSlide: 1,
        slots: [
          { key: "title", frame: BODY_FRAME, accepts: [{ type: SlotType.Text, sourceSlide: 1, shapeName: "Text 0" }] },
          {
            key: "body",
            frame: BODY_FRAME,
            accepts: [
              { type: SlotType.Text, sourceSlide: 1, shapeName: "Text 1" },
              { type: SlotType.Table, sourceSlide: 2, shapeName: "Table 0" },
            ],
          },
        ],
      },
    ]);
    const deck: Deck = {
      theme: "t",
      output: "table.pptx",
      steps: [
        {
          layout: "Composed",
          content: {
            title: { paragraphs: [p("Transplanted table title")] },
            body: { headers: [cell("Plan"), cell("Price")], rows: [[cell("Pro"), cell("$9")]] },
          },
        },
      ],
    };

    await generate(deck, cfg);
    const zip = await outputZip(cfg, "table.pptx");
    const slide = await slideXml(zip);

    assert.ok(slide.includes("<a:tbl"), "transplanted table should be present");
    assert.ok(slide.includes("Pro") && slide.includes("$9"), "table refilled with deck data");
    assert.ok(slide.includes("Transplanted table title"), "title filled in place");
    assert.ok(!slide.includes("superseded on transplant"), "base body text shape removed");
    // The transplant is positioned to the slot's frame (setPosition(slot.frame)).
    assert.ok(
      slide.includes(`<a:off x="${BODY_FRAME.x}" y="${BODY_FRAME.y}"/>`),
      "transplanted table positioned to the slot frame (a:off)",
    );
    assert.ok(
      slide.includes(`<a:ext cx="${BODY_FRAME.cx}" cy="${BODY_FRAME.cy}"/>`),
      "transplanted table sized to the slot frame (a:ext)",
    );
  });

  it("transplants a picture and swaps its media relationship", async () => {
    const cfg = config([
      {
        name: "Pic",
        baseSlide: 1,
        slots: [
          {
            key: "hero",
            frame: BODY_FRAME,
            accepts: [
              { type: SlotType.Text, sourceSlide: 1, shapeName: "Text 1" },
              { type: SlotType.Image, sourceSlide: 3, shapeName: "Image 0" },
            ],
          },
        ],
      },
    ]);
    const deck: Deck = {
      theme: "t",
      output: "pic.pptx",
      steps: [
        {
          layout: "Pic",
          content: { hero: { type: SlotType.Image, path: SWAP_PNG, fit: "contain" } },
        },
      ],
    };

    await generate(deck, cfg);
    const zip = await outputZip(cfg, "pic.pptx");
    const slide = await slideXml(zip);
    const rels = await slideRels(zip);

    assert.ok(slide.includes("<p:pic"), "transplanted picture should be present");
    assert.ok(rels.includes("swap.png"), "picture blip relationship should target the swapped media");
    assert.ok(!slide.includes("superseded on transplant"), "base text shape removed");
  });

  it("fails the build when a fill callback on a TRANSPLANTED shape throws", async () => {
    // "Image 0" (slide 3) is a picture with no <a:tbl>. Declaring it as a Table
    // block transplants it, then fillTable runs on the picture and throws INSIDE
    // the addElement callback — which pptx-automizer swallows unless wrapped.
    const cfg = config([
      {
        name: "Boom",
        baseSlide: 1,
        slots: [{ key: "x", frame: BODY_FRAME, accepts: [{ type: SlotType.Table, sourceSlide: 3, shapeName: "Image 0" }] }],
      },
    ]);
    const deck: Deck = {
      theme: "t",
      output: "boom.pptx",
      steps: [{ layout: "Boom", content: { x: { headers: [cell("A")], rows: [] } } }],
    };

    await assert.rejects(
      () => generate(deck, cfg),
      (err: Error) => {
        assert.ok(/tbl|table/i.test(err.message), `expected a table-fill error, got: ${err.message}`);
        return true;
      },
    );
    // The broken artifact must not be left behind.
    assert.throws(() => readFileSync(join(cfg.outputDir as string, "boom.pptx")));
  });
});
