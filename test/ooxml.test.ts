import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readRelationships, relsPathFor, resolveTarget } from "../dist/engine/ooxml.js";

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

describe("readRelationships", () => {
  const NS = "http://schemas.openxmlformats.org/package/2006/relationships";
  const TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

  it("reads each relationship, marking external targets", () => {
    const xml =
      `<Relationships xmlns="${NS}">` +
      `<Relationship Id="rId1" Type="${TYPE}/image" Target="../media/a.png"/>` +
      `<Relationship Id="rId2" Type="${TYPE}/hyperlink" Target="https://example.com" TargetMode="External"/>` +
      `</Relationships>`;
    assert.deepEqual(readRelationships(xml), [
      { id: "rId1", type: `${TYPE}/image`, target: "../media/a.png", external: false },
      { id: "rId2", type: `${TYPE}/hyperlink`, target: "https://example.com", external: true },
    ]);
  });

  it("skips a relationship missing its Id, Type or Target", () => {
    const xml =
      `<Relationships xmlns="${NS}">` +
      `<Relationship Type="${TYPE}/image" Target="a.png"/>` +
      `<Relationship Id="rId2" Target="b.png"/>` +
      `<Relationship Id="rId3" Type="${TYPE}/image"/>` +
      `</Relationships>`;
    assert.deepEqual(readRelationships(xml), []);
  });
});
