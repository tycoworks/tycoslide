/**
 * Shared shape / DOM helpers used by every fill primitive.
 *
 * Two layers live here. First the low-level slide-XML substrate: `Tag` names the
 * DrawingML / PresentationML elements, plus node utilities (element collection,
 * run text access, run and paragraph builders) and hyperlink relationship
 * management. Second, the higher-level StyledParagraph-rebuild machinery shared
 * by fillText and fillTable: harvest specimen (pPr, rPr) buckets grouped by
 * (bullet kind, level), detach the specimens, then build fresh paragraphs
 * cloning the appropriate bucket. No fill strategy lives here — this is the
 * substrate the fill modules build on.
 */

import type { StyledParagraph, TextRun } from "./types.js";

// ── XML Tag Constants ──────────────────────────────────────────────────────────

/** DrawingML and PresentationML tag names used when manipulating slide XML. */
export const Tag = {
  RUN: "a:r",
  TEXT: "a:t",
  PARAGRAPH: "a:p",
  RUN_PROPS: "a:rPr",
  PARA_PROPS: "a:pPr",
  BULLET_CHAR: "a:buChar",
  BULLET_AUTO: "a:buAutoNum",
  BULLET_NONE: "a:buNone",
  LINE_BREAK: "a:br",
  END_PARA_RUN_PROPS: "a:endParaRPr",
  OFFSET: "a:off",
  EXTENT: "a:ext",
  BLIP: "a:blip",
  SRC_RECT: "a:srcRect",
  BLIP_FILL: "p:blipFill",
  SPACE_BEFORE: "a:spcBef",
  HLINK_CLICK: "a:hlinkClick",
  RELATIONSHIP: "Relationship",
  TABLE: "a:tbl",
  TABLE_ROW: "a:tr",
  TABLE_CELL: "a:tc",
  TX_BODY: "a:txBody",
  SOLID_FILL: "a:solidFill",
  SRGB_CLR: "a:srgbClr",
} as const;

/**
 * OOXML attribute names and fixed attribute values. Element names live in `Tag`;
 * this is the same discipline for the attributes and enumerated values written
 * onto them, so no bare string literal leaks into the fill code.
 */
export const Attr = {
  // rPr marks
  BOLD: "b",
  ITALIC: "i",
  STRIKE: "strike",
  UNDERLINE: "u",
  ON: "1",
  STRIKE_SINGLE: "sngStrike",
  UNDERLINE_SINGLE: "sng",
  // color
  VALUE: "val",
  // relationships
  ID: "Id",
  TYPE: "Type",
  TARGET: "Target",
  TARGET_MODE: "TargetMode",
  EXTERNAL: "External",
  HLINK_ID: "r:id",
  // paragraph
  LEVEL: "lvl",
  // geometry (offset / extent)
  X: "x",
  Y: "y",
  CX: "cx",
  CY: "cy",
  // srcRect edges
  LEFT: "l",
  TOP: "t",
  RIGHT: "r",
  BOTTOM: "b",
  // whitespace preservation
  XML_SPACE: "xml:space",
  PRESERVE: "preserve",
} as const;

/** True for a non-null, non-array object — the shared prefix of every `isXFill`. */
export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// ── DOM Helpers ────────────────────────────────────────────────────────────────

export function collectElements(parent: any, tagName: string): any[] {
  const out: any[] = [];
  const live = parent.getElementsByTagName(tagName);
  for (let i = 0; i < live.length; i++) out.push(live[i]);
  return out;
}

export function childrenByTag(parent: any, tagName: string): any[] {
  const out: any[] = [];
  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i];
    if (child && child.nodeType === 1 && child.tagName === tagName) out.push(child);
  }
  return out;
}

export function detach(node: any): void {
  if (node?.parentNode) node.parentNode.removeChild(node);
}

export function runText(run: any): string {
  const t = run.getElementsByTagName(Tag.TEXT)[0];
  return t ? (t.textContent ?? "") : "";
}

export function setRunTextPreservingStyle(run: any, text: string): void {
  let t = run.getElementsByTagName(Tag.TEXT)[0];
  if (!t) {
    t = run.ownerDocument.createElement(Tag.TEXT);
    run.appendChild(t);
  }
  if (text !== text.trim()) t.setAttribute(Attr.XML_SPACE, Attr.PRESERVE);
  else t.removeAttribute(Attr.XML_SPACE);
  t.textContent = text;
}

export function leadingDecorativePrefix(text: string): string {
  const m = /^[\s\p{P}\p{S}]+/u.exec(text);
  return m ? m[0] : "";
}

// ── Run/Paragraph Builders ────────────────────────────────────────────────────

export function buildRun(doc: any, cloneRPr: any | null, text: string): any {
  const r = doc.createElement(Tag.RUN);
  if (cloneRPr) r.appendChild(cloneRPr.cloneNode(true));
  const t = doc.createElement(Tag.TEXT);
  if (text !== text.trim()) t.setAttribute(Attr.XML_SPACE, Attr.PRESERVE);
  t.textContent = text;
  r.appendChild(t);
  return r;
}

export function buildParagraph(doc: any, clonePPr: any | null, run: any): any {
  const p = doc.createElement(Tag.PARAGRAPH);
  if (clonePPr) p.appendChild(clonePPr.cloneNode(true));
  p.appendChild(run);
  return p;
}

// ── Relationship Management ──────────────────────────────────────────────────

export const HYPERLINK_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink";

export function addRelationship(relation: any, url: string): string {
  const existing = collectElements(relation, Tag.RELATIONSHIP);
  let maxId = 0;
  for (const rel of existing) {
    const id = rel.getAttribute(Attr.ID);
    const num = id ? parseInt(id.replace("rId", ""), 10) : 0;
    if (num > maxId) maxId = num;
  }
  const rId = `rId${maxId + 1}`;
  const rel = relation.ownerDocument.createElement(Tag.RELATIONSHIP);
  rel.setAttribute(Attr.ID, rId);
  rel.setAttribute(Attr.TYPE, HYPERLINK_REL_TYPE);
  rel.setAttribute(Attr.TARGET, url);
  rel.setAttribute(Attr.TARGET_MODE, Attr.EXTERNAL);
  relation.appendChild(rel);
  return rId;
}

/**
 * Replace all runs in a paragraph with a sequence of styled runs, cloning the
 * first existing run's rPr as the template and layering per-run marks on top.
 *
 * Exported for tests; not part of the public engine surface (index.ts).
 */
export function setRichRuns(para: any, runs: TextRun[], relation?: any): void {
  const existing = collectElements(para, Tag.RUN);
  if (existing.length === 0) return;

  const tpl = existing[0];
  const newNodes: any[] = [];

  for (const run of runs) {
    const clone = tpl.cloneNode(true);

    const t = clone.getElementsByTagName(Tag.TEXT)[0];
    if (t) {
      t.textContent = run.text;
      // The cloned template run may already carry xml:space — set or clear it to
      // match the new text, mirroring setRunTextPreservingStyle.
      if (run.text !== run.text.trim()) t.setAttribute(Attr.XML_SPACE, Attr.PRESERVE);
      else t.removeAttribute(Attr.XML_SPACE);
    }

    if (run.bold || run.italic || run.strikethrough || run.underline) {
      let rPr = clone.getElementsByTagName(Tag.RUN_PROPS)[0];
      if (!rPr) {
        rPr = para.ownerDocument.createElement(Tag.RUN_PROPS);
        clone.insertBefore(rPr, clone.firstChild);
      }
      if (run.bold) rPr.setAttribute(Attr.BOLD, Attr.ON);
      if (run.italic) rPr.setAttribute(Attr.ITALIC, Attr.ON);
      if (run.strikethrough) rPr.setAttribute(Attr.STRIKE, Attr.STRIKE_SINGLE);
      if (run.underline) rPr.setAttribute(Attr.UNDERLINE, Attr.UNDERLINE_SINGLE);
    }

    if (run.color) {
      let rPr = clone.getElementsByTagName(Tag.RUN_PROPS)[0];
      if (!rPr) {
        rPr = para.ownerDocument.createElement(Tag.RUN_PROPS);
        clone.insertBefore(rPr, clone.firstChild);
      }
      const existingSolidFill = rPr.getElementsByTagName(Tag.SOLID_FILL)[0];
      if (existingSolidFill) rPr.removeChild(existingSolidFill);
      const solidFill = para.ownerDocument.createElement(Tag.SOLID_FILL);
      const srgbClr = para.ownerDocument.createElement(Tag.SRGB_CLR);
      srgbClr.setAttribute(Attr.VALUE, run.color);
      solidFill.appendChild(srgbClr);
      rPr.appendChild(solidFill);
    }

    if (run.link && relation) {
      let rPr = clone.getElementsByTagName(Tag.RUN_PROPS)[0];
      if (!rPr) {
        rPr = para.ownerDocument.createElement(Tag.RUN_PROPS);
        clone.insertBefore(rPr, clone.firstChild);
      }
      const rId = addRelationship(relation, run.link);
      const hlink = para.ownerDocument.createElement(Tag.HLINK_CLICK);
      hlink.setAttribute(Attr.HLINK_ID, rId);
      rPr.appendChild(hlink);
    }

    newNodes.push(clone);
  }

  for (const old of existing) detach(old);

  const endParaRPr = para.getElementsByTagName(Tag.END_PARA_RUN_PROPS)[0];
  for (const nr of newNodes) {
    if (endParaRPr) para.insertBefore(nr, endParaRPr);
    else para.appendChild(nr);
  }
}

// ── Style Harvesting (for the StyledParagraph rebuild) ───────────────────────

interface StyleBucket {
  pPr: any | null;
  rPr: any | null;
}

function paragraphBulletKind(paragraph: any): "none" | "bullet" | "inherit" {
  const pPr = paragraph.getElementsByTagName(Tag.PARA_PROPS)[0];
  if (!pPr) return "inherit";
  if (childrenByTag(pPr, Tag.BULLET_NONE).length > 0) return "none";
  if (childrenByTag(pPr, Tag.BULLET_CHAR).length > 0 || childrenByTag(pPr, Tag.BULLET_AUTO).length > 0) {
    return "bullet";
  }
  return "inherit";
}

function paragraphLevel(paragraph: any): number {
  const ppr = paragraph.getElementsByTagName(Tag.PARA_PROPS)[0];
  const lvl = ppr?.getAttribute(Attr.LEVEL);
  return lvl ? Number(lvl) || 0 : 0;
}

function harvestStyles(specimen: any[]): {
  bullets: Map<number, StyleBucket>;
  paras: StyleBucket | null;
} {
  const bullets = new Map<number, StyleBucket>();
  let paras: StyleBucket | null = null;

  for (const p of specimen) {
    const kind = paragraphBulletKind(p);
    const lvl = paragraphLevel(p);
    const firstRun = collectElements(p, Tag.RUN)[0];
    const bucket: StyleBucket = {
      pPr: p.getElementsByTagName(Tag.PARA_PROPS)[0] ?? null,
      rPr: firstRun ? (firstRun.getElementsByTagName(Tag.RUN_PROPS)[0] ?? null) : null,
    };
    if (kind === "bullet") {
      if (!bullets.has(lvl)) bullets.set(lvl, bucket);
    } else {
      if (paras == null) paras = bucket;
    }
  }

  return { bullets, paras };
}

function specimenBulletPara(specimen: any[], level: number): any | null {
  for (const p of specimen) {
    if (paragraphBulletKind(p) === "bullet" && paragraphLevel(p) === level) return p;
  }
  return null;
}

function maybeOverrideLevel(paragraph: any, level: number | null): void {
  if (level == null) return;
  const ppr = paragraph.getElementsByTagName(Tag.PARA_PROPS)[0];
  if (!ppr) return;
  if (level === 0) ppr.removeAttribute(Attr.LEVEL);
  else ppr.setAttribute(Attr.LEVEL, String(level));
}

// ── Rebuild strategy (shared by fillText and fillTable) ──────────────────────

export function rebuildParagraphs(
  shape: any,
  paragraphs: StyledParagraph[],
  startIndex: number,
  relation?: any,
  shapeName = "",
): void {
  const allParas = collectElements(shape, Tag.PARAGRAPH);
  if (allParas.length === 0) {
    throw new Error(`Shape "${shapeName}": has no paragraphs to rebuild from (need at least one specimen <a:p>).`);
  }

  const txBody = allParas[0].parentNode;
  const specimen = allParas.slice(startIndex);
  if (specimen.length === 0) {
    throw new Error(
      `Shape "${shapeName}": startAt ${startIndex} is past the last paragraph (shape has ${allParas.length}).`,
    );
  }

  const { bullets, paras } = harvestStyles(specimen);

  const maxBulletLevel = bullets.size > 0 ? Math.max(...bullets.keys()) : -1;
  const pickBullet = (lvl: number): { bucket: StyleBucket | null; effectiveLvl: number } => {
    if (bullets.has(lvl)) return { bucket: bullets.get(lvl)!, effectiveLvl: lvl };
    if (maxBulletLevel >= 0) return { bucket: bullets.get(maxBulletLevel)!, effectiveLvl: maxBulletLevel };
    return { bucket: null, effectiveLvl: lvl };
  };

  const plainBucket: StyleBucket | null = paras ?? bullets.get(0) ?? null;

  const firstBulletKey = bullets.has(0) ? 0 : maxBulletLevel;
  const firstBullet = firstBulletKey >= 0 ? specimenBulletPara(specimen, firstBulletKey) : null;
  const transitionSpcBef =
    firstBullet?.getElementsByTagName(Tag.PARA_PROPS)[0]?.getElementsByTagName(Tag.SPACE_BEFORE)[0] ?? null;

  const applyTransitionSpacing = (paragraph: any) => {
    if (!transitionSpcBef) return;
    const ppr = paragraph.getElementsByTagName(Tag.PARA_PROPS)[0];
    if (!ppr) return;
    const old = ppr.getElementsByTagName(Tag.SPACE_BEFORE)[0];
    if (old) ppr.removeChild(old);
    ppr.appendChild(transitionSpcBef.cloneNode(true));
  };

  for (const p of specimen) detach(p);

  const doc = shape.ownerDocument;
  let prevWasBullet = false;

  for (const para of paragraphs) {
    if (!para.runs || para.runs.length === 0) continue;
    const isBullet = para.bullet !== undefined;
    const inLevel = para.bullet?.level ?? 0;

    const { bucket, effectiveLvl } = isBullet ? pickBullet(inLevel) : { bucket: plainBucket, effectiveLvl: 0 };

    // Skip fully-empty text (matches previous fillText behavior).
    if (para.runs.length === 1 && !para.runs[0].text) continue;

    const seedRun = buildRun(doc, bucket?.rPr ?? null, "");
    const newPara = buildParagraph(doc, bucket?.pPr ?? null, seedRun);
    maybeOverrideLevel(newPara, isBullet ? effectiveLvl : null);
    if (!isBullet && prevWasBullet) applyTransitionSpacing(newPara);
    setRichRuns(newPara, para.runs, relation);
    txBody.appendChild(newPara);
    prevWasBullet = isBullet;
  }
}
