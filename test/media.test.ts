import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { copyImages, MediaOutcome } from "../dist/agents/media.js";
import { Presentation } from "../dist/agents/pptx.js";

/** Open the template at `path`, then copy its images into `out`. */
const copyImagesFrom = async (path: string, out: string) => copyImages(await Presentation.open(path), out);

const SWAP_PNG = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", "swap.png")); // 2x2
const UNREADABLE = Buffer.from("not an image");
const PHOTO = Buffer.from("a photo");
const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

type Rel = { type: string; target: string; external?: boolean };
const image = (target: string, external = false): Rel => ({ type: `${REL_TYPE}/image`, target, external });
const rels = (list: Rel[]) =>
  `<Relationships xmlns="${REL_NS}">${list
    .map(
      (r, i) =>
        `<Relationship Id="rId${i + 1}" Type="${r.type}" Target="${r.target}"${r.external ? ' TargetMode="External"' : ""}/>`,
    )
    .join("")}</Relationships>`;

/**
 * A minimal .pptx: master 1 and layouts 2 and 10 (so number order differs from
 * string order), each image-relationship case once, slides 1 and 3 sharing a photo,
 * slide 1 reusing the master's logo, and one image nothing uses.
 */
async function writeTemplate(dir: string): Promise<string> {
  const zip = new JSZip();
  zip.file("ppt/presentation.xml", "<p:presentation/>");
  zip.file("ppt/slideMasters/slideMaster1.xml", "<p:sldMaster/>");
  zip.file(
    "ppt/slideMasters/_rels/slideMaster1.xml.rels",
    rels([
      image("../media/logo.png"),
      image("https://example.com/remote.png", true),
      { type: `${REL_TYPE}/slideLayout`, target: "../slideLayouts/slideLayout2.xml" },
    ]),
  );
  zip.file("ppt/slideLayouts/slideLayout10.xml", "<p:sldLayout/>");
  zip.file(
    "ppt/slideLayouts/_rels/slideLayout10.xml.rels",
    rels([image("../media/bg-copy.png"), image("../media/gone.png")]),
  );
  zip.file("ppt/slideLayouts/slideLayout2.xml", "<p:sldLayout/>");
  zip.file("ppt/slideLayouts/_rels/slideLayout2.xml.rels", rels([image("../media/logo.png"), image("/ppt/media/bg.png")]));
  zip.file("ppt/media/logo.png", SWAP_PNG);
  zip.file("ppt/media/bg.png", UNREADABLE);
  zip.file("ppt/media/bg-copy.png", UNREADABLE);
  zip.file("ppt/slides/slide3.xml", "<p:sld/>");
  zip.file("ppt/slides/_rels/slide3.xml.rels", rels([image("../media/photo.png")]));
  zip.file("ppt/slides/slide1.xml", "<p:sld/>");
  zip.file("ppt/slides/_rels/slide1.xml.rels", rels([image("../media/logo.png"), image("../media/photo.png")]));
  zip.file("ppt/media/photo.png", PHOTO);
  zip.file("ppt/media/unused.png", SWAP_PNG);
  const path = join(dir, "template.pptx");
  writeFileSync(path, await zip.generateAsync({ type: "nodebuffer" }));
  return path;
}

const scratch = () => mkdtempSync(join(tmpdir(), "tycoslide-media-"));

describe("copyImages", () => {
  it("copies master, layout and slide images, in first-use order, skipping external, non-image and unused", async () => {
    const dir = scratch();
    const out = join(dir, "brand", "nested");
    const images = await copyImagesFrom(await writeTemplate(dir), out);

    assert.deepEqual(images, [
      {
        file: "logo.png",
        usedBy: ["slideMaster1", "slideLayout2", "slide1"],
        outcome: MediaOutcome.Copied,
        size: { width: 2, height: 2 },
      },
      { file: "bg.png", usedBy: ["slideLayout2"], outcome: MediaOutcome.Copied },
      {
        file: "bg-copy.png",
        usedBy: ["slideLayout10"],
        outcome: MediaOutcome.Duplicate,
        duplicateOf: "bg.png",
      },
      { file: "gone.png", usedBy: ["slideLayout10"], outcome: MediaOutcome.Missing },
      { file: "photo.png", usedBy: ["slide1", "slide3"], outcome: MediaOutcome.Copied },
    ]);
    assert.deepEqual(readFileSync(join(out, "logo.png")), SWAP_PNG);
    assert.deepEqual(readFileSync(join(out, "bg.png")), UNREADABLE);
    assert.deepEqual(readFileSync(join(out, "photo.png")), PHOTO);
    assert.equal(existsSync(join(out, "bg-copy.png")), false, "a duplicate is not copied");
    assert.equal(existsSync(join(out, "unused.png")), false, "an image nothing uses is not copied");
  });

  it("never overwrites a file already in the output folder", async () => {
    const dir = scratch();
    const out = join(dir, "brand");
    const template = await writeTemplate(dir);
    await copyImagesFrom(template, out);
    writeFileSync(join(out, "logo.png"), "MINE");

    const again = await copyImagesFrom(template, out);
    assert.deepEqual(
      again.map((image) => image.outcome),
      [MediaOutcome.Present, MediaOutcome.Present, MediaOutcome.Duplicate, MediaOutcome.Missing, MediaOutcome.Present],
    );
    assert.equal(readFileSync(join(out, "logo.png"), "utf-8"), "MINE");
  });

});
