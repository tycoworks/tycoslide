/**
 * Package-level OOXML: where a .pptx keeps its parts and how they point at each
 * other. Used by speaker notes, and exported from the core's public entry for the
 * agent layer's template reading. Slide-XML tokens live in `dom.ts`'s `Tag` / `Attr`.
 */

import { posix } from "node:path";
import { DOMParser } from "@xmldom/xmldom";
import { Attr, collectElements, Tag } from "./dom.js";

/** The presentation part; its presence is what makes a zip a .pptx. */
export const PRESENTATION_PART = "ppt/presentation.xml";

/** The presentation part's relationships: slides, masters, the notes master. */
export const PRESENTATION_RELS_PART = "ppt/_rels/presentation.xml.rels";

/**
 * Tail segments of relationship-type URLs. Matching the tail tolerates both the
 * transitional (`schemas.openxmlformats.org`) and strict (`purl.oclc.org`) forms.
 */
export const RelTypeSuffix = {
  NotesSlide: "/notesSlide",
  NotesMaster: "/notesMaster",
  Image: "/image",
} as const;

export function parseXml(xml: string): any {
  return new DOMParser().parseFromString(xml, "text/xml");
}

/** One relationship from a part's rels file. An `external` target is a URL, not a part. */
export type Relationship = { id: string; type: string; target: string; external: boolean };

/** The relationships in a rels file. One missing its `Id`, `Type` or `Target` is malformed, and skipped. */
export function readRelationships(relsXml: string): Relationship[] {
  return collectElements(parseXml(relsXml), Tag.RELATIONSHIP).flatMap((rel) => {
    const id = rel.getAttribute(Attr.ID);
    const type = rel.getAttribute(Attr.TYPE);
    const target = rel.getAttribute(Attr.TARGET);
    if (!id || !type || !target) return [];
    return [{ id, type, target, external: rel.getAttribute(Attr.TARGET_MODE) === Attr.EXTERNAL }];
  });
}

/** The `_rels` path for an archive part (`ppt/slides/slide1.xml` → `ppt/slides/_rels/slide1.xml.rels`). */
export function relsPathFor(part: string): string {
  return part.replace(/\/([^/]+)$/, "/_rels/$1.rels");
}

/**
 * Resolve a relationship `target` from `part`'s rels to an archive path. A target
 * starting with `/` is package-absolute; anything else is relative to `part`'s
 * directory. `.` and `..` segments collapse.
 */
export function resolveTarget(part: string, target: string): string {
  const parts = target.startsWith("/") ? [] : posix.dirname(part).split("/").filter(Boolean);
  for (const seg of target.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}
