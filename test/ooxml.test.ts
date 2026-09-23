import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { relsPathFor, resolveTarget } from "../dist/engine/ooxml.js";

describe("resolveTarget", () => {
  const cases: { part: string; target: string; expected: string }[] = [
    { part: "ppt/slides/slide1.xml", target: "../media/image1.png", expected: "ppt/media/image1.png" },
    { part: "ppt/presentation.xml", target: "slides/slide1.xml", expected: "ppt/slides/slide1.xml" },
    { part: "ppt/slideLayouts/slideLayout1.xml", target: "./../media/./a.png", expected: "ppt/media/a.png" },
    { part: "ppt/slideMasters/slideMaster1.xml", target: "/ppt/media/logo.png", expected: "ppt/media/logo.png" },
  ];
  for (const { part, target, expected } of cases) {
    it(`resolves ${target} from ${part}`, () => {
      assert.equal(resolveTarget(part, target), expected);
    });
  }
});

describe("relsPathFor", () => {
  it("puts a part's relationships in the sibling _rels folder", () => {
    assert.equal(relsPathFor("ppt/slides/slide12.xml"), "ppt/slides/_rels/slide12.xml.rels");
  });
});
