import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { Background, FrameSource, readInventory, ShapeKind } from "../dist/agents/inventory.js";
import { Presentation } from "../dist/agents/pptx.js";
import { writeSyntheticTemplate } from "./helpers/syntheticTemplate.ts";

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "template", "composition.pptx");
const scratch = () => mkdtempSync(join(tmpdir(), "tycoslide-inventory-"));
const inventoryOf = async (path: string) => readInventory(await Presentation.open(path));
const frame = (x: number, y: number, cx: number, cy: number) => ({ x, y, cx, cy });

describe("readInventory", () => {
  it("reads the composition fixture's size, schemes and slides", async () => {
    assert.deepEqual(await inventoryOf(FIXTURE), {
      slideSize: { cx: 9144000, cy: 5143500 },
      colorScheme: {
        name: "Office",
        dk1: "#000000",
        lt1: "#FFFFFF",
        dk2: "#44546A",
        lt2: "#E7E6E6",
        accent1: "#4472C4",
        accent2: "#ED7D31",
        accent3: "#A5A5A5",
        accent4: "#FFC000",
        accent5: "#5B9BD5",
        accent6: "#70AD47",
        hlink: "#0563C1",
        folHlink: "#954F72",
      },
      fontScheme: { name: "Office", major: "Calibri Light", minor: "Calibri" },
      embeddedFonts: [],
      slides: [
        [
          { name: "Text 0", kind: ShapeKind.Text, frame: frame(457200, 274320, 8229600, 731520), text: "Base title" },
          {
            name: "Text 1",
            kind: ShapeKind.Text,
            frame: frame(457200, 1371600, 8229600, 2743200),
            text: "Base body text (superseded on transplant)",
          },
        ],
        [
          {
            name: "Table 0",
            kind: ShapeKind.Table,
            frame: frame(457200, 457200, 5486400, 1828800),
            rows: 2,
            cols: 2,
            text: "H1 ¶ H2 ¶ a ¶ b",
          },
        ],
        [{ name: "Image 0", kind: ShapeKind.Image, frame: frame(914400, 914400, 2743200, 2743200), text: "" }],
      ].map((shapes, i) => ({ slide: i + 1, position: i + 1, layout: "DEFAULT", background: Background.Light, shapes })),
      duplicates: [],
    });
  });

  it("reads system colours, their fallback, and leaves a missing scheme slot out", async () => {
    const { colorScheme, fontScheme, embeddedFonts, slideSize } = await inventoryOf(await writeSyntheticTemplate(scratch()));
    assert.equal(colorScheme.dk1, "#111111", "a system colour's lastClr");
    assert.equal(colorScheme.lt1, "#808080", "a system colour with no lastClr");
    assert.equal("folHlink" in colorScheme, false);
    assert.deepEqual(fontScheme, { name: "Pairing", major: "Georgia", minor: "Inter" });
    assert.deepEqual(embeddedFonts, ["Inter", "Georgia"]);
    assert.deepEqual(slideSize, { cx: 12192000, cy: 6858000 });
  });

  // Slide number → [presentation position, layout name, background], one case per way
  // a background is declared or inherited.
  const expected: [number, number | undefined, string, Background][] = [
    [1, 2, "Plain", Background.Dark], // an RGB fill
    [2, 3, "Plain", Background.Light], // a mapped scheme colour, luminance modified
    [3, 1, "Theme background", Background.Dark], // the layout's theme background, its colour via phClr
    [4, 4, "Fill style", Background.Light], // an ordinary fill-style index
    [5, 5, "Plain", Background.Dark], // a gradient, its stops averaged
    [6, 6, "Plain", Background.Image], // a picture fill
    [7, undefined, "Inverted", Background.Dark], // the layout's colour-map override; not in the show
    [8, 7, "Plain", Background.Unknown], // no background anywhere
    [9, 8, "Plain", Background.Dark], // a shaded preset colour
    [10, 9, "Plain", Background.Light], // a tinted scheme colour
  ];
  it("classifies every kind of background, and records presentation order", async () => {
    const { slides } = await inventoryOf(await writeSyntheticTemplate(scratch()));
    assert.deepEqual(
      slides.map(({ slide, position, layout, background }) => ({
        slide,
        ...(position !== undefined && { position }),
        layout,
        background,
      })),
      expected.map(([slide, position, layout, background]) => ({
        slide,
        ...(position !== undefined && { position }),
        layout,
        background,
      })),
    );
  });

  it("reads every kind of shape, with text marks, table size and group names", async () => {
    const { slides } = await inventoryOf(await writeSyntheticTemplate(scratch()));
    assert.deepEqual(slides[0].shapes, [
      { name: "Title", kind: ShapeKind.Text, frame: frame(0, 0, 9000000, 800000), text: "Quarterly review" },
      {
        name: "Body",
        kind: ShapeKind.Text,
        frame: frame(500, 1500000, 6000000, 3000000),
        frameFrom: FrameSource.Layout,
        text: "Inherits the layout's frame",
      },
      { name: "Notes", kind: ShapeKind.Text, frame: frame(0, 900000, 3000000, 500000), text: "Line one ↵ line two ¶ Second" },
      { name: "Rectangle", kind: ShapeKind.Other, frame: frame(0, 1500000, 1000000, 1000000), text: "" },
      { name: "Logo", kind: ShapeKind.Image, frame: frame(8000000, 0, 500000, 500000), text: "" },
      {
        name: "Pricing",
        kind: ShapeKind.Table,
        frame: frame(0, 3000000, 4000000, 1000000),
        rows: 2,
        cols: 3,
        text: "r1a ¶ r1b ¶ r1c ¶ r2a ¶ r2b ¶ r2c",
      },
      { name: "Chart", kind: ShapeKind.Other, frame: frame(0, 3000000, 4000000, 1000000), text: "" },
      { name: "Badge", kind: ShapeKind.Group, frame: frame(6000000, 4000000, 2000000, 800000), text: "" },
      { name: "Badge/Label", kind: ShapeKind.Text, frame: frame(6000000, 4000000, 1500000, 800000), text: "New" },
      { name: "Badge/Icon", kind: ShapeKind.Image, frame: frame(7500000, 4000000, 500000, 500000), text: "" },
      { name: "Divider", kind: ShapeKind.Other, frame: frame(0, 2600000, 9000000, 0), text: "" },
    ]);
  });

  it("takes a placeholder's frame from the master when the layout has none of that type", async () => {
    const { slides } = await inventoryOf(await writeSyntheticTemplate(scratch()));
    assert.deepEqual(slides[1].shapes[0], {
      name: "Headline",
      kind: ShapeKind.Text,
      frame: frame(100, 200, 8000000, 900000),
      frameFrom: FrameSource.Master,
      text: "Takes the master's title frame",
    });
  });

  it("leaves a placeholder frameless when neither layout nor master has a match", async () => {
    const { slides } = await inventoryOf(await writeSyntheticTemplate(scratch()));
    assert.deepEqual(slides[1].shapes[1], { name: "Photo", kind: ShapeKind.Text, text: "" });
  });

  it("cuts a shape's text to an 80-character preview", async () => {
    const { slides } = await inventoryOf(await writeSyntheticTemplate(scratch()));
    assert.equal(slides[1].shapes[2].text, "x".repeat(80));
  });

  it("groups slides whose shapes match to within a point, and no others", async () => {
    const { duplicates } = await inventoryOf(await writeSyntheticTemplate(scratch()));
    assert.deepEqual(duplicates, [[4, 5]]);
  });

  it("fails when the first master has no theme", async () => {
    const zip = new JSZip();
    const ns = 'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
    zip.file("ppt/presentation.xml", `<p:presentation ${ns}/>`);
    zip.file("ppt/slideMasters/slideMaster1.xml", `<p:sldMaster ${ns}/>`);
    const path = join(scratch(), "no-theme.pptx");
    writeFileSync(path, await zip.generateAsync({ type: "nodebuffer" }));
    await assert.rejects(inventoryOf(path), /Could not find a theme part for the first slide master/);
  });
});
