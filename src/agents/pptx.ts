/**
 * Reading a .pptx from the agent layer: open it, parse its parts once, and follow
 * its relationships. Built on the core's generic package helpers; the names of the
 * parts and relationships the agent layer looks for live here.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import JSZip from "jszip";
import {
  childrenByTag,
  PRESENTATION_PART,
  parseXml,
  type Relationship,
  readRelationships,
  relsPathFor,
  resolveTarget,
} from "../index.js";

/** Archive paths of the parts the agent layer reads, numbered by their file name. */
export const Part = {
  Slide: /^ppt\/slides\/slide(\d+)\.xml$/,
  Master: /^ppt\/slideMasters\/slideMaster(\d+)\.xml$/,
  Layout: /^ppt\/slideLayouts\/slideLayout(\d+)\.xml$/,
  EmbeddedFont: /^ppt\/fonts\/.+\.fntdata$/,
} as const;

/** Where a package keeps its images. */
export const MEDIA_DIR = "ppt/media/";

/** Tail segments of the relationship types the agent layer follows. */
export const RelType = {
  Image: "/image",
  Theme: "/theme",
  SlideLayout: "/slideLayout",
} as const;

/** `ppt/slides/slide12.xml` → 12, for a part matching one of `Part`'s patterns. */
export function partNumber(part: string, pattern: RegExp): number {
  return Number(pattern.exec(part)?.[1]);
}

/** A .pptx opened for reading: its parts, each parsed once, and where their relationships lead. */
export class Presentation {
  private readonly parsed = new Map<string, any>();
  private readonly zip: JSZip;

  private constructor(zip: JSZip) {
    this.zip = zip;
  }

  /** Open `path`, failing with a plain explanation when it is missing or not a .pptx. */
  static async open(path: string): Promise<Presentation> {
    if (!existsSync(path) || !statSync(path).isFile()) {
      throw new Error(`${path} does not exist or is not a file.`);
    }
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(readFileSync(path));
    } catch {
      throw new Error(`${path} is not a .pptx file (it is not a zip archive).`);
    }
    if (!zip.file(PRESENTATION_PART)) {
      throw new Error(`${path} is not a .pptx file (no ${PRESENTATION_PART} inside; a .docx or .xlsx perhaps?).`);
    }
    return new Presentation(zip);
  }

  /** Every file in the package. */
  get parts(): string[] {
    return Object.keys(this.zip.files).filter((name) => !this.zip.files[name].dir);
  }

  /** The parts matching `pattern`, in number order. */
  numbered(pattern: RegExp): string[] {
    return this.parts
      .filter((part) => pattern.test(part))
      .sort((a, b) => partNumber(a, pattern) - partNumber(b, pattern));
  }

  has(part: string): boolean {
    return this.zip.file(part) !== null;
  }

  async bytes(part: string): Promise<Buffer> {
    return this.file(part).async("nodebuffer");
  }

  /** The part's root element. */
  async xml(part: string): Promise<any> {
    let doc = this.parsed.get(part);
    if (!doc) {
      doc = parseXml(await this.file(part).async("string"));
      this.parsed.set(part, doc);
    }
    return doc.documentElement;
  }

  private file(part: string): JSZip.JSZipObject {
    const file = this.zip.file(part);
    if (!file) throw new Error(`${part} is missing from the package.`);
    return file;
  }

  /** The part's relationships to other parts (external links left out), with targets resolved. */
  async relationships(part: string): Promise<Relationship[]> {
    const rels = this.zip.file(relsPathFor(part));
    if (!rels) return [];
    return readRelationships(await rels.async("string"))
      .filter((rel) => !rel.external)
      .map((rel) => ({ ...rel, target: resolveTarget(part, rel.target) }));
  }

  /** The parts `part` relates to with a relationship type ending in `suffix`. */
  async related(part: string, suffix: string): Promise<string[]> {
    return (await this.relationships(part)).filter((rel) => rel.type.endsWith(suffix)).map((rel) => rel.target);
  }
}

/** The element reached from `el` by a path of child tag names, or undefined. */
export function find(el: any, ...path: string[]): any {
  let node = el;
  for (const tag of path) {
    node = node && childrenByTag(node, tag)[0];
  }
  return node;
}

/** `el`'s element children, only those named `tag` when given; none when `el` is missing. */
export function elementChildren(el: any, tag?: string): any[] {
  if (!el) return [];
  if (tag) return childrenByTag(el, tag);
  const out: any[] = [];
  for (let i = 0; i < el.childNodes.length; i++) {
    if (el.childNodes[i].nodeType === ELEMENT_NODE) out.push(el.childNodes[i]);
  }
  return out;
}

/** `el`'s attributes by name; none when `el` is missing. */
export function attributes(el: any): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < (el?.attributes?.length ?? 0); i++) out[el.attributes[i].name] = el.attributes[i].value;
  return out;
}

const ELEMENT_NODE = 1;
