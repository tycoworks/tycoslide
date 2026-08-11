/**
 * Speaker-notes injection — an in-band pass run per slide during `write()`.
 *
 * The render library (pptx-automizer) has no public notes writer, but it does
 * expose a general seam: `slide.modify((document, parent) => …)` runs while the
 * deck is being written and hands us `parent.targetArchive` (the OUTPUT archive)
 * and `parent.targetNumber` (the real output slide number). automizer's clone
 * auto-copies the source slide's notes as `notesSlide${targetNumber}.xml` and
 * wires its rels + content-type BEFORE our callback runs, so notes map 1:1 to the
 * output slide number — no `sldIdLst`→rels→slideK mapping is needed.
 *
 * For each slide we either overwrite/synthesize its `notesSlide${N}.xml` (when the
 * step authored notes) or strip any auto-copied part (when it did not, or notes
 * are excluded) — so the designer's template notes never leak into the output.
 */

import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { Attr, buildParagraph, buildRun, nextFreeRId as nextFreeRIdForDoc, Tag } from "./dom.js";

// Package-level OOXML names not covered by dom.ts's `Tag`/`Attr` (which name
// slide-XML tokens): `[Content_Types].xml` Override entries and the tail
// segments of relationship-type URLs.
const CT_OVERRIDE = "Override";
const CT_PART_NAME = "PartName";
const CT_CONTENT_TYPE = "ContentType";
const REL_TYPE_SUFFIX = {
  NotesSlide: "/notesSlide",
  NotesMaster: "/notesMaster",
} as const;

const NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main";
const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_REL = "http://schemas.openxmlformats.org/package/2006/relationships";
const NS_CT = "http://schemas.openxmlformats.org/package/2006/content-types";

const REL_TYPE = {
  NotesSlide: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide",
  Slide: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
  NotesMaster: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster",
} as const;

const NOTES_SLIDE_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml";

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';

const CONTENT_TYPES_PART = "[Content_Types].xml";

const PRESENTATION_RELS_PART = "ppt/_rels/presentation.xml.rels";

const NOTES_SKELETON =
  `<p:notes xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}"><p:cSld><p:spTree>` +
  `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>` +
  `<p:sp><p:nvSpPr><p:cNvPr id="2" name="Notes Placeholder 1"/>` +
  `<p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>` +
  `<p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/></p:txBody></p:sp>` +
  `</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>`;

/**
 * The minimal archive surface `applyNotesToSlide` needs. pptx-automizer's
 * `IArchive` satisfies it structurally (so we never import its internal type), and
 * the test fake implements it over a `Map`. String-based `read`/`write` only —
 * XML is parsed/serialized with the engine's own `@xmldom/xmldom` instance, never
 * automizer's `readXml`/`writeXml` (mixing xmldom instances risks subtle bugs).
 */
export type NotesArchive = {
  read(file: string, type: "string"): Promise<string | Buffer>;
  write(file: string, data: string): Promise<unknown>;
  remove(file: string): Promise<void>;
  fileExists(file: string): boolean;
  /**
   * Top-level entries of `dir` (nested `_rels` excluded). `name` is the FULL
   * archive path (e.g. `ppt/notesSlides/notesSlide1.xml`). pptx-automizer's
   * `IArchive.folder` satisfies this structurally.
   */
  folder(dir: string): Promise<{ name: string; relativePath: string }[]>;
};

/**
 * Build a minimal `<p:notes>` part whose body placeholder carries one `<a:p>`
 * per line of `notes`. Text goes through DOM text nodes, so `& < > "` escaping
 * is handled by the serializer.
 */
export function buildNotesSlideXml(notes: string): string {
  const doc = new DOMParser().parseFromString(NOTES_SKELETON, "text/xml");
  const txBody = doc.getElementsByTagName("p:txBody")[0];
  for (const line of notes.replace(/\r?\n+$/, "").split(/\r?\n/)) {
    // Reuse the engine's run/paragraph builders — they set xml:space="preserve"
    // for leading/trailing whitespace. The skeleton declares xmlns:a, so the
    // builders' "a:"-prefixed element creation serializes correctly on this doc.
    txBody.appendChild(buildParagraph(doc, null, buildRun(doc, null, line)));
  }
  return serialize(doc);
}

/** Next unused `rIdN` in a `.rels` XML string (max existing id + 1). */
export function nextFreeRId(relsXml: string): string {
  return nextFreeRIdForDoc(new DOMParser().parseFromString(relsXml, "text/xml"));
}

function serialize(doc: any): string {
  // xmldom re-emits any `<?xml?>` declaration present in the parsed source, so a
  // doc parsed from an already-declared part would serialize with two of them.
  // Strip any leading declaration, then prepend exactly one canonical XML_DECL.
  const body = new XMLSerializer().serializeToString(doc).replace(/^<\?xml[^>]*\?>\s*/, "");
  return XML_DECL + body;
}

function parse(xml: string): any {
  return new DOMParser().parseFromString(xml, "text/xml");
}

async function readString(archive: NotesArchive, file: string): Promise<string> {
  const raw = await archive.read(file, "string");
  return typeof raw === "string" ? raw : raw.toString("utf-8");
}

function appendRel(relsDoc: any, id: string, type: string, target: string): void {
  const rel = relsDoc.createElementNS(NS_REL, Tag.RELATIONSHIP);
  rel.setAttribute(Attr.ID, id);
  rel.setAttribute(Attr.TYPE, type);
  rel.setAttribute(Attr.TARGET, target);
  relsDoc.documentElement.appendChild(rel);
}

/** Remove the (single) notesSlide relationship from a slide's rels doc, if present. */
function removeNotesRel(relsDoc: any): boolean {
  const rels = relsDoc.getElementsByTagName(Tag.RELATIONSHIP);
  for (let i = 0; i < rels.length; i++) {
    if (rels[i].getAttribute(Attr.TYPE) === REL_TYPE.NotesSlide) {
      rels[i].parentNode?.removeChild(rels[i]);
      return true;
    }
  }
  return false;
}

function notesRelsXml(slideNumber: number, masterTarget: string): string {
  return (
    XML_DECL +
    `<Relationships xmlns="${NS_REL}">` +
    `<Relationship Id="rId1" Type="${REL_TYPE.Slide}" Target="../slides/slide${slideNumber}.xml"/>` +
    `<Relationship Id="rId2" Type="${REL_TYPE.NotesMaster}" Target="${masterTarget}"/>` +
    `</Relationships>`
  );
}

/**
 * The notes master's target relative to `ppt/notesSlides/` (what a notesSlide's
 * rels needs), read from the package's `presentation.xml.rels`. That file's
 * targets are relative to `ppt/` (e.g. `notesMasters/notesMaster1.xml`), so a
 * notesSlide part one directory deeper prefixes `../`. Returns undefined when
 * the presentation declares no notes master relationship.
 */
async function findNotesMaster(archive: NotesArchive): Promise<string | undefined> {
  if (!archive.fileExists(PRESENTATION_RELS_PART)) return undefined;
  const relsDoc = parse(await readString(archive, PRESENTATION_RELS_PART));
  const rels = relsDoc.getElementsByTagName(Tag.RELATIONSHIP);
  for (let i = 0; i < rels.length; i++) {
    if (rels[i].getAttribute(Attr.TYPE)?.endsWith(REL_TYPE_SUFFIX.NotesMaster)) {
      return `../${rels[i].getAttribute(Attr.TARGET)}`;
    }
  }
  return undefined;
}

function findOverride(ctDoc: any, partName: string): any {
  const overrides = ctDoc.getElementsByTagName(CT_OVERRIDE);
  for (let i = 0; i < overrides.length; i++) {
    if (overrides[i].getAttribute(CT_PART_NAME) === partName) return overrides[i];
  }
  return undefined;
}

async function addContentTypeOverride(archive: NotesArchive, partName: string): Promise<void> {
  const ctDoc = parse(await readString(archive, CONTENT_TYPES_PART));
  if (findOverride(ctDoc, partName)) return;
  const override = ctDoc.createElementNS(NS_CT, CT_OVERRIDE);
  override.setAttribute(CT_PART_NAME, partName);
  override.setAttribute(CT_CONTENT_TYPE, NOTES_SLIDE_CONTENT_TYPE);
  ctDoc.documentElement.appendChild(override);
  await archive.write(CONTENT_TYPES_PART, serialize(ctDoc));
}

/** Remove a part's `<Override>` from an already-parsed `[Content_Types].xml` doc. */
function removeOverrideFromDoc(ctDoc: any, partName: string): boolean {
  const override = findOverride(ctDoc, partName);
  if (!override) return false;
  override.parentNode?.removeChild(override);
  return true;
}

async function removeContentTypeOverride(archive: NotesArchive, partName: string): Promise<void> {
  const ctDoc = parse(await readString(archive, CONTENT_TYPES_PART));
  if (!removeOverrideFromDoc(ctDoc, partName)) return;
  await archive.write(CONTENT_TYPES_PART, serialize(ctDoc));
}

/** Resolve `target` (from a rels file) against `baseDir`, collapsing `.`/`..`. */
function resolveRelative(baseDir: string, target: string): string {
  const parts = baseDir.split("/").filter(Boolean);
  for (const seg of target.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}

const NOTES_SLIDE_PART = /^ppt\/notesSlides\/notesSlide\d+\.xml$/;

const PRESENTATION_PART = "ppt/presentation.xml";

/**
 * The slide parts a deck actually presents, in `<p:sldIdLst>` order, resolved via
 * `presentation.xml.rels`. Returns full archive paths (e.g. `ppt/slides/slide1.xml`).
 *
 * This deliberately does NOT enumerate `ppt/slides/_rels`: when automizer builds a
 * deck it removes the template's original slides from `<p:sldIdLst>` first, but
 * leaves their physical `slideN.xml`/`slideN.xml.rels` parts in the archive until
 * a later cleanup pass. Those orphaned slide rels still carry `/notesSlide`
 * relationships, so folder-enumeration would wrongly count template notes as
 * referenced. Only slides reachable from `presentation.xml` are live.
 */
async function liveSlideParts(archive: NotesArchive): Promise<string[]> {
  const pres = parse(await readString(archive, PRESENTATION_PART));
  const sldIds = pres.getElementsByTagName("p:sldId");
  const rIds: string[] = [];
  for (let i = 0; i < sldIds.length; i++) {
    const rid = sldIds[i].getAttributeNS(NS_R, "id") || sldIds[i].getAttribute(Attr.HLINK_ID);
    if (rid) rIds.push(rid);
  }

  const relsDoc = parse(await readString(archive, PRESENTATION_RELS_PART));
  const rels = relsDoc.getElementsByTagName(Tag.RELATIONSHIP);
  const targetById = new Map<string, string>();
  for (let i = 0; i < rels.length; i++) {
    const id = rels[i].getAttribute(Attr.ID);
    const target = rels[i].getAttribute(Attr.TARGET);
    if (id && target) targetById.set(id, target);
  }

  const parts: string[] = [];
  for (const rid of rIds) {
    const target = targetById.get(rid);
    if (target) parts.push(resolveRelative("ppt", target));
  }
  return parts;
}

/** The `_rels` path for an archive part (`ppt/slides/slide1.xml` → `ppt/slides/_rels/slide1.xml.rels`). */
function relsPathFor(part: string): string {
  return part.replace(/\/([^/]+)$/, "/_rels/$1.rels");
}

/**
 * Remove every notesSlide part that no live slide references. automizer drops the
 * template's orphaned *slides* from the deck when building it but leaves all their
 * `notesSlides` behind as unreferenced parts (plus their `[Content_Types].xml`
 * Overrides), so the designer's private notes would otherwise leak into every
 * output. Run once as a presentation-level pass, after the deck is assembled.
 *
 * A notesSlide is "referenced" iff a LIVE slide (reachable from `presentation.xml`,
 * see {@link liveSlideParts}) carries a `/notesSlide` relationship pointing at it.
 * Everything else is swept: the part, its rels, and its content-type Override (all
 * Override removals batched into a single `[Content_Types].xml` read+write).
 */
export async function sweepOrphanNotes(archive: NotesArchive): Promise<void> {
  const notesParts = (await archive.folder("ppt/notesSlides"))
    .map((entry) => entry.name)
    .filter((name) => NOTES_SLIDE_PART.test(name));
  if (notesParts.length === 0) return;

  const referenced = new Set<string>();
  for (const slidePart of await liveSlideParts(archive)) {
    const relsPath = relsPathFor(slidePart);
    if (!archive.fileExists(relsPath)) continue;
    const rels = parse(await readString(archive, relsPath)).getElementsByTagName(Tag.RELATIONSHIP);
    for (let i = 0; i < rels.length; i++) {
      const target = rels[i].getAttribute(Attr.TARGET);
      if (target && rels[i].getAttribute(Attr.TYPE)?.endsWith(REL_TYPE_SUFFIX.NotesSlide)) {
        referenced.add(resolveRelative("ppt/slides", target));
      }
    }
  }

  const orphans = notesParts.filter((part) => !referenced.has(part));
  if (orphans.length === 0) return;

  const ctDoc = parse(await readString(archive, CONTENT_TYPES_PART));
  let ctChanged = false;
  for (const part of orphans) {
    await archive.remove(part);
    const relsPart = `ppt/notesSlides/_rels/${part.slice(part.lastIndexOf("/") + 1)}.rels`;
    if (archive.fileExists(relsPart)) await archive.remove(relsPart);
    if (removeOverrideFromDoc(ctDoc, `/${part}`)) ctChanged = true;
  }
  if (ctChanged) await archive.write(CONTENT_TYPES_PART, serialize(ctDoc));
}

/**
 * Set (or strip) the speaker notes on one output slide, keyed on its real output
 * `slideNumber` (`parent.targetNumber`). Runs inside `slide.modify` during
 * `write()`, operating on the OUTPUT archive.
 *
 * - Authored notes (non-empty and `!excludeNotes`): if automizer auto-copied a
 *   notes part (`notesSlide${N}.xml` already exists), overwrite its text only —
 *   its rels and content-type are already correct. Otherwise synthesize the part,
 *   its rels (→slide + →master), a `notesSlide` rel on the slide (next free rId),
 *   and the `[Content_Types].xml` override.
 * - No notes (or excluded): if a part was auto-copied, remove it, its rels, the
 *   slide's `notesSlide` rel, and the content-type override — so the designer's
 *   template notes never leak.
 *
 * Throws (no silent default) if a slide needs a NEW notes part but the template
 * ships no notes master — synthesizing one is out of scope.
 */
export async function applyNotesToSlide(
  archive: NotesArchive,
  slideNumber: number,
  notes: string | undefined,
  excludeNotes: boolean,
): Promise<void> {
  const notesPath = `ppt/notesSlides/notesSlide${slideNumber}.xml`;
  const notesRelsPath = `ppt/notesSlides/_rels/notesSlide${slideNumber}.xml.rels`;
  const slideRelsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
  const notesExists = archive.fileExists(notesPath);
  const shouldWrite = notes !== undefined && notes !== "" && !excludeNotes;

  if (shouldWrite) {
    if (notesExists) {
      // Auto-copied part: overwrite its body; leave rels + content-type as wired.
      await archive.write(notesPath, buildNotesSlideXml(notes));
      return;
    }

    const masterTarget = await findNotesMaster(archive);
    if (masterTarget === undefined) {
      throw new Error(
        `Speaker notes: slide ${slideNumber} has notes, but the template ships no notes master ` +
          "(ppt/notesMasters/). Add a notes master to the template (PowerPoint: View → Notes Master), " +
          "or build with notes disabled. Synthesizing a notes master is not supported.",
      );
    }

    await archive.write(notesPath, buildNotesSlideXml(notes));
    await archive.write(notesRelsPath, notesRelsXml(slideNumber, masterTarget));

    const relsDoc = parse(await readString(archive, slideRelsPath));
    appendRel(relsDoc, nextFreeRIdForDoc(relsDoc), REL_TYPE.NotesSlide, `../notesSlides/notesSlide${slideNumber}.xml`);
    await archive.write(slideRelsPath, serialize(relsDoc));

    await addContentTypeOverride(archive, `/${notesPath}`);
    return;
  }

  if (!notesExists) return;

  await archive.remove(notesPath);
  if (archive.fileExists(notesRelsPath)) await archive.remove(notesRelsPath);

  const relsDoc = parse(await readString(archive, slideRelsPath));
  if (removeNotesRel(relsDoc)) await archive.write(slideRelsPath, serialize(relsDoc));

  await removeContentTypeOverride(archive, `/${notesPath}`);
}
