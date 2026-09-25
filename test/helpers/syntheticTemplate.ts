import { writeFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";

/**
 * A small .pptx built in code, covering template cases the committed fixtures
 * don't: every way a background is declared, colour maps and modifiers, a slide
 * left out of the show, every kind of shape, placeholders that take their frame
 * from the layout or master, and slides that share geometry.
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

/** A slide, layout or master part with an optional `<p:bg>`, shapes and extra children. */
const part = (root: string, { name = "", background = "", shapes = "", after = "" } = {}) =>
  `<p:${root} ${NS}><p:cSld${name && ` name="${name}"`}>${background}<p:spTree>${shapes}</p:spTree></p:cSld>${after}</p:${root}>`;

// ── Shapes ──
const xfrm = (x: number, y: number, cx: number, cy: number, tag = "a:xfrm") =>
  `<${tag}><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></${tag}>`;
const run = (text: string) => `<a:r><a:t>${text}</a:t></a:r>`;
const paragraph = (...content: string[]) => `<a:p>${content.join("")}</a:p>`;
const BREAK = "<a:br/>";
const sp = (name: string, { ph = "", textBox = false, frame = "", text = "" } = {}) =>
  `<p:sp><p:nvSpPr><p:cNvPr id="1" name="${name}"/><p:cNvSpPr${textBox ? ' txBox="1"' : ""}/><p:nvPr>${ph}</p:nvPr></p:nvSpPr>` +
  `<p:spPr>${frame}</p:spPr>${text && `<p:txBody><a:bodyPr/>${text}</p:txBody>`}</p:sp>`;
const pic = (name: string, frame: string) =>
  `<p:pic><p:nvPicPr><p:cNvPr id="1" name="${name}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill/><p:spPr>${frame}</p:spPr></p:pic>`;
const graphicFrame = (name: string, graphic: string) =>
  `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="1" name="${name}"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr>` +
  `${xfrm(0, 3000000, 4000000, 1000000, "p:xfrm")}<a:graphic><a:graphicData>${graphic}</a:graphicData></a:graphic></p:graphicFrame>`;
const cell = (text: string) => `<a:tc><a:txBody><a:bodyPr/>${paragraph(run(text))}</a:txBody></a:tc>`;
/** Drawn at its grid's size, 3 × 1200000 by 2 × 370840, not its frame's 4000000 × 1000000. */
const TABLE = `<a:tbl><a:tblGrid><a:gridCol w="1200000"/><a:gridCol w="1200000"/><a:gridCol w="1200000"/></a:tblGrid>${[1, 2]
  .map((row) => `<a:tr h="370840">${cell(`r${row}a`)}${cell(`r${row}b`)}${cell(`r${row}c`)}</a:tr>`)
  .join("")}</a:tbl>`;
const group = (name: string, frame: string, members: string) =>
  `<p:grpSp><p:nvGrpSpPr><p:cNvPr id="1" name="${name}"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr>${frame}</p:grpSpPr>${members}</p:grpSp>`;
const connector = (name: string, frame: string) =>
  `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="1" name="${name}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr>${frame}</p:spPr></p:cxnSp>`;

/** The master's title and body placeholders; layout 1 repositions the body. */
const MASTER_SHAPES =
  sp("Master title", { ph: '<p:ph type="title"/>', frame: xfrm(100, 200, 8000000, 900000) }) +
  sp("Master body", { ph: '<p:ph type="body" idx="1"/>', frame: xfrm(100, 1200000, 8000000, 4000000) });
const LAYOUT_BODY = sp("Layout body", { ph: '<p:ph type="body" idx="1"/>', frame: xfrm(500, 1500000, 6000000, 3000000) });

/** Slide number → its shapes, for the slides that have any. */
const SHAPES: Record<number, string> = {
  1:
    sp("Title", { ph: '<p:ph type="title"/>', frame: xfrm(0, 0, 9000000, 800000), text: paragraph(run("Quarterly   review")) }) +
    sp("Body", { ph: '<p:ph type="body" idx="1"/>', text: paragraph(run("Inherits the layout's frame")) }) +
    sp("Notes", {
      textBox: true,
      frame: xfrm(0, 900000, 3000000, 500000),
      text: paragraph(run("Line one"), BREAK, run("line two")) + paragraph(run("Second")),
    }) +
    sp("Rectangle", { frame: xfrm(0, 1500000, 1000000, 1000000) }) +
    pic("Logo", xfrm(8000000, 0, 500000, 500000)) +
    graphicFrame("Pricing", TABLE) +
    graphicFrame("Chart", "<c:chart xmlns:c=\"urn:chart\"/>") +
    group(
      "Badge",
      xfrm(6000000, 4000000, 2000000, 800000),
      sp("Label", { frame: xfrm(6000000, 4000000, 1500000, 800000), text: paragraph(run("New")) }) +
        pic("Icon", xfrm(7500000, 4000000, 500000, 500000)),
    ) +
    connector("Divider", xfrm(0, 2600000, 9000000, 0)),
  2:
    sp("Headline", { ph: '<p:ph type="ctrTitle"/>', text: paragraph(run("Takes the master's title frame")) }) +
    sp("Photo", { ph: '<p:ph type="pic" idx="7"/>' }) +
    sp("Long", { textBox: true, frame: xfrm(0, 0, 1, 1), text: paragraph(run("x".repeat(100))) }),
  4: sp("Box", { frame: xfrm(100000, 100000, 500000, 500000) }),
  5: sp("Box", { frame: xfrm(100100, 100000, 500000, 500000) }),
  9: sp("Box", { frame: xfrm(100000, 100000, 600000, 500000) }),
};
const fill = (inner: string) => `<p:bg><p:bgPr>${inner}</p:bgPr></p:bg>`;
const solid = (color: string) => fill(`<a:solidFill>${color}</a:solidFill>`);
const ref = (idx: number, color: string) => `<p:bg><p:bgRef idx="${idx}">${color}</p:bgRef></p:bg>`;

const LAYOUTS: Record<number, string> = {
  1: part("sldLayout", { name: "Plain", shapes: LAYOUT_BODY }),
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

/** The one image the master uses: its bytes, not a readable picture. */
export const MASTER_IMAGE = "logo";

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
  zip.file("ppt/slideMasters/slideMaster1.xml", part("sldMaster", { shapes: MASTER_SHAPES, after: COLOR_MAP }));
  zip.file(
    "ppt/slideMasters/_rels/slideMaster1.xml.rels",
    rels([
      ["rId1", "theme", "../theme/theme1.xml"],
      ["rId2", "image", "../media/logo.png"],
    ]),
  );
  zip.file("ppt/media/logo.png", MASTER_IMAGE);
  for (const [n, xml] of Object.entries(LAYOUTS)) {
    zip.file(`ppt/slideLayouts/slideLayout${n}.xml`, xml);
    zip.file(
      `ppt/slideLayouts/_rels/slideLayout${n}.xml.rels`,
      rels([["rId1", "slideMaster", "../slideMasters/slideMaster1.xml"]]),
    );
  }
  for (const [n, [layout, background]] of Object.entries(SLIDES)) {
    zip.file(`ppt/slides/slide${n}.xml`, part("sld", { background, shapes: SHAPES[Number(n)] }));
    zip.file(
      `ppt/slides/_rels/slide${n}.xml.rels`,
      rels([["rId1", "slideLayout", `../slideLayouts/slideLayout${layout}.xml`]]),
    );
  }
  const path = join(dir, "synthetic.pptx");
  writeFileSync(path, await zip.generateAsync({ type: "nodebuffer" }));
  return path;
}
