import { writeFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";

/**
 * A small .pptx built in code, covering template cases the committed fixtures
 * don't: every way a background is declared, colour maps and modifiers, a slide
 * left out of the show.
 */

const NS =
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

const rels = (list: [id: string, type: string, target: string][]) =>
  `<Relationships xmlns="${REL_NS}">${list
    .map(([id, type, target]) => `<Relationship Id="${id}" Type="${REL}/${type}" Target="${target}"/>`)
    .join("")}</Relationships>`;

const THEME = `<a:theme ${NS} name="Synthetic"><a:themeElements>
<a:clrScheme name="Synthetic">
  <a:dk1><a:sysClr val="windowText" lastClr="111111"/></a:dk1>
  <a:lt1><a:sysClr val="window"/></a:lt1>
  <a:dk2><a:srgbClr val="1A1A2E"/></a:dk2>
  <a:lt2><a:srgbClr val="EDE9FE"/></a:lt2>
  <a:accent1><a:srgbClr val="F59E0B"/></a:accent1>
  <a:accent2><a:srgbClr val="34D399"/></a:accent2>
  <a:accent3><a:srgbClr val="60A5FA"/></a:accent3>
  <a:accent4><a:srgbClr val="7C3AED"/></a:accent4>
  <a:accent5><a:srgbClr val="059669"/></a:accent5>
  <a:accent6><a:srgbClr val="2563EB"/></a:accent6>
  <a:hlink><a:srgbClr val="60A5FA"/></a:hlink>
</a:clrScheme>
<a:fontScheme name="Pairing"><a:majorFont><a:latin typeface="Georgia"/></a:majorFont><a:minorFont><a:latin typeface="Inter"/></a:minorFont></a:fontScheme>
<a:fmtScheme name="Synthetic">
  <a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:fillStyleLst>
  <a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"><a:tint val="20000"/></a:schemeClr></a:solidFill><a:blipFill/></a:bgFillStyleLst>
</a:fmtScheme>
</a:themeElements></a:theme>`;

const COLOR_MAP =
  '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" ' +
  'accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>';

/** A slide, layout or master part with an optional `<p:bg>` and extra children. */
const part = (root: string, { name = "", background = "", after = "" } = {}) =>
  `<p:${root} ${NS}><p:cSld${name && ` name="${name}"`}>${background}<p:spTree/></p:cSld>${after}</p:${root}>`;
const fill = (inner: string) => `<p:bg><p:bgPr>${inner}</p:bgPr></p:bg>`;
const solid = (color: string) => fill(`<a:solidFill>${color}</a:solidFill>`);
const ref = (idx: number, color: string) => `<p:bg><p:bgRef idx="${idx}">${color}</p:bgRef></p:bg>`;

const LAYOUTS: Record<number, string> = {
  1: part("sldLayout", { name: "Plain" }),
  2: part("sldLayout", { name: "Theme background", background: ref(1001, '<a:schemeClr val="accent1"/>') }),
  3: part("sldLayout", { name: "Fill style", background: ref(2, '<a:schemeClr val="accent1"/>') }),
  4: part("sldLayout", {
    name: "Inverted",
    after: '<p:clrMapOvr><a:overrideClrMapping bg1="dk2" tx1="lt1" bg2="dk2" tx2="lt2"/></p:clrMapOvr>',
  }),
};

/** Slide number → [layout number, background]. */
const SLIDES: Record<number, [number, string]> = {
  1: [1, solid('<a:srgbClr val="1A1A2E"/>')],
  2: [1, solid('<a:schemeClr val="bg1"><a:lumMod val="50000"/><a:lumOff val="50000"/></a:schemeClr>')],
  3: [2, ""],
  4: [3, ""],
  5: [1, fill('<a:gradFill><a:gsLst><a:gs pos="0"><a:srgbClr val="000000"/></a:gs><a:gs pos="100000"><a:srgbClr val="FFFFFF"/></a:gs></a:gsLst></a:gradFill>')],
  6: [1, fill("<a:blipFill/>")],
  7: [4, solid('<a:schemeClr val="bg1"/>')],
  8: [1, ""],
  9: [1, solid('<a:prstClr val="white"><a:shade val="50000"/></a:prstClr>')],
  10: [1, solid('<a:schemeClr val="accent2"><a:tint val="40000"/></a:schemeClr>')],
};

/** Presentation order: slide 3 first, slide 7 left out of the show. */
const SHOWN = [3, 1, 2, 4, 5, 6, 8, 9, 10];

export async function writeSyntheticTemplate(dir: string): Promise<string> {
  const zip = new JSZip();
  const slideRels = Object.keys(SLIDES).map((n): [string, string, string] => [`rId${n}`, "slide", `slides/slide${n}.xml`]);
  zip.file(
    "ppt/presentation.xml",
    `<p:presentation ${NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rIdMaster"/></p:sldMasterIdLst>` +
      `<p:sldIdLst>${SHOWN.map((n, i) => `<p:sldId id="${256 + i}" r:id="rId${n}"/>`).join("")}</p:sldIdLst>` +
      '<p:sldSz cx="12192000" cy="6858000"/>' +
      '<p:embeddedFontLst><p:embeddedFont><p:font typeface="Inter"/></p:embeddedFont>' +
      '<p:embeddedFont><p:font typeface="Georgia"/></p:embeddedFont></p:embeddedFontLst></p:presentation>',
  );
  zip.file(
    "ppt/_rels/presentation.xml.rels",
    rels([["rIdMaster", "slideMaster", "slideMasters/slideMaster1.xml"], ...slideRels]),
  );
  zip.file("ppt/theme/theme1.xml", THEME);
  zip.file("ppt/slideMasters/slideMaster1.xml", part("sldMaster", { after: COLOR_MAP }));
  zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", rels([["rId1", "theme", "../theme/theme1.xml"]]));
  for (const [n, xml] of Object.entries(LAYOUTS)) {
    zip.file(`ppt/slideLayouts/slideLayout${n}.xml`, xml);
    zip.file(
      `ppt/slideLayouts/_rels/slideLayout${n}.xml.rels`,
      rels([["rId1", "slideMaster", "../slideMasters/slideMaster1.xml"]]),
    );
  }
  for (const [n, [layout, background]] of Object.entries(SLIDES)) {
    zip.file(`ppt/slides/slide${n}.xml`, part("sld", { background }));
    zip.file(
      `ppt/slides/_rels/slide${n}.xml.rels`,
      rels([["rId1", "slideLayout", `../slideLayouts/slideLayout${layout}.xml`]]),
    );
  }
  const path = join(dir, "synthetic.pptx");
  writeFileSync(path, await zip.generateAsync({ type: "nodebuffer" }));
  return path;
}
