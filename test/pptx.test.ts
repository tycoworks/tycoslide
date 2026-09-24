import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { Part, Presentation, RelType } from "../dist/agents/pptx.js";
import { writeSyntheticTemplate } from "./helpers/syntheticTemplate.ts";

const scratch = () => mkdtempSync(join(tmpdir(), "tycoslide-pptx-"));

describe("Presentation.open", () => {
  const invalid: { name: string; write: (path: string) => Promise<void>; message: RegExp }[] = [
    { name: "a missing file", write: async () => {}, message: /does not exist or is not a file/ },
    {
      name: "a file that isn't a zip",
      write: async (path) => writeFileSync(path, "hello"),
      message: /not a \.pptx file \(it is not a zip archive\)/,
    },
    {
      name: "a zip with no presentation part",
      write: async (path) => {
        const zip = new JSZip();
        zip.file("word/document.xml", "<w:document/>");
        writeFileSync(path, await zip.generateAsync({ type: "nodebuffer" }));
      },
      message: /no ppt\/presentation\.xml inside; a \.docx or \.xlsx perhaps\?/,
    },
  ];
  for (const { name, write, message } of invalid) {
    it(`rejects ${name}`, async () => {
      const path = join(scratch(), "input.pptx");
      await write(path);
      await assert.rejects(Presentation.open(path), message);
    });
  }
});

describe("Presentation", () => {
  it("lists numbered parts in number order, not string order", async () => {
    const presentation = await Presentation.open(await writeSyntheticTemplate(scratch()));
    assert.deepEqual(
      presentation.numbered(Part.Slide).map((part) => part.replace("ppt/slides/", "")),
      ["slide1.xml", "slide2.xml", "slide3.xml", "slide4.xml", "slide5.xml", "slide6.xml", "slide7.xml", "slide8.xml", "slide9.xml", "slide10.xml"],
    );
  });

  it("follows a part's relationships to resolved part paths", async () => {
    const presentation = await Presentation.open(await writeSyntheticTemplate(scratch()));
    assert.deepEqual(await presentation.related("ppt/slides/slide7.xml", RelType.SlideLayout), [
      "ppt/slideLayouts/slideLayout4.xml",
    ]);
    assert.deepEqual(await presentation.related("ppt/slideMasters/slideMaster1.xml", RelType.Theme), [
      "ppt/theme/theme1.xml",
    ]);
  });

  it("has no relationships for a part without a rels file", async () => {
    const presentation = await Presentation.open(await writeSyntheticTemplate(scratch()));
    assert.deepEqual(await presentation.relationships("ppt/theme/theme1.xml"), []);
  });
});
