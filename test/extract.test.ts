import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { extractTemplate, summarizeExtraction } from "../dist/agents/extract.js";
import { ASSETS_DIR, TEMPLATE_FILE } from "../dist/agents/files.js";
import { ShapeKind } from "../dist/agents/inventory.js";
import { MediaOutcome } from "../dist/agents/media.js";
import { MASTER_IMAGE, writeSyntheticTemplate } from "./helpers/syntheticTemplate.ts";

const scratch = () => mkdtempSync(join(tmpdir(), "tycoslide-extract-"));

describe("extractTemplate", () => {
  it("writes the inventory and the copied images to template.json, and the images to assets/", async () => {
    const theme = scratch();
    const facts = await extractTemplate(await writeSyntheticTemplate(scratch()), theme);

    assert.deepEqual(JSON.parse(readFileSync(join(theme, TEMPLATE_FILE), "utf-8")), facts);
    assert.equal(facts.slides.length, 10);
    assert.deepEqual(facts.duplicates, [[4, 5]]);
    assert.deepEqual(facts.images, [
      { file: "logo.png", usedBy: ["slideMaster1"], outcome: MediaOutcome.Copied, path: `${ASSETS_DIR}/logo.png` },
    ]);
    assert.equal(readFileSync(join(theme, ASSETS_DIR, "logo.png"), "utf-8"), MASTER_IMAGE);
  });

  it("measures a table by its column widths and row heights, not its frame's size", async () => {
    const facts = await extractTemplate(await writeSyntheticTemplate(scratch()), scratch());
    const table = facts.slides[0].shapes.find((shape) => shape.kind === ShapeKind.Table);
    assert.deepEqual(table?.frame, { x: 0, y: 3000000, cx: 3 * 1200000, cy: 2 * 370840 });
  });

  it("leaves images already in assets/ alone on a rerun", async () => {
    const theme = scratch();
    const template = await writeSyntheticTemplate(scratch());
    await extractTemplate(template, theme);
    writeFileSync(join(theme, ASSETS_DIR, "logo.png"), "MINE");

    const again = await extractTemplate(template, theme);
    assert.equal(again.images[0].outcome, MediaOutcome.Present);
    assert.equal(readFileSync(join(theme, ASSETS_DIR, "logo.png"), "utf-8"), "MINE");
  });

  it("writes nothing when the template can't be read", async () => {
    const theme = scratch();
    await assert.rejects(extractTemplate(join(theme, "missing.pptx"), theme), /does not exist or is not a file/);
    assert.equal(existsSync(join(theme, TEMPLATE_FILE)), false);
    assert.equal(existsSync(join(theme, ASSETS_DIR)), false);
  });
});

describe("summarizeExtraction", () => {
  it("counts the template's slides, duplicate groups and typefaces, and the images copied", async () => {
    const facts = await extractTemplate(await writeSyntheticTemplate(scratch()), scratch());
    assert.deepEqual(summarizeExtraction(facts), {
      template: "10 slides, 1 duplicate group, 2 embedded typefaces",
      images: "1 image copied",
    });
  });

  it("reports images already present, duplicates and missing ones when there are any", () => {
    const base = { usedBy: ["slideLayout1"] };
    const facts = {
      slideSize: { cx: 1, cy: 1 },
      colorScheme: { name: "" },
      fontScheme: { name: "" },
      embeddedFonts: [],
      slides: [],
      duplicates: [],
      images: [
        { ...base, file: "a.png", outcome: MediaOutcome.Present },
        { ...base, file: "b.png", outcome: MediaOutcome.Present },
        { ...base, file: "c.png", outcome: MediaOutcome.Duplicate, duplicateOf: "a.png" },
        { ...base, file: "d.png", outcome: MediaOutcome.Missing },
      ],
    };
    assert.equal(
      summarizeExtraction(facts).images,
      "0 images copied, 2 images already present, 1 identical image skipped, 1 image missing from the template",
    );
  });
});
