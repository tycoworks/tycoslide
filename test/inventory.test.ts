import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { Background, readInventory } from "../dist/agents/inventory.js";
import { Presentation } from "../dist/agents/pptx.js";
import { writeSyntheticTemplate } from "./helpers/syntheticTemplate.ts";

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "template", "composition.pptx");
const scratch = () => mkdtempSync(join(tmpdir(), "tycoslide-inventory-"));
const inventoryOf = async (path: string) => readInventory(await Presentation.open(path));

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
      slides: [1, 2, 3].map((n) => ({ slide: n, position: n, layout: "DEFAULT", background: Background.Light })),
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
      slides,
      expected.map(([slide, position, layout, background]) => ({
        slide,
        ...(position !== undefined && { position }),
        layout,
        background,
      })),
    );
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
