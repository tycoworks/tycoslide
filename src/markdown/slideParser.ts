import { parse as parseYaml } from "yaml";

// ============================================
// TYPES
// ============================================

export interface RawSlide {
  index: number;
  frontmatter: Record<string, unknown>;
  slots: Record<string, string>;
}

export interface ParsedDocument {
  global: Record<string, unknown>;
  slides: RawSlide[];
}

// ============================================
// PUBLIC API
// ============================================

export function parseSlideDocument(source: string): ParsedDocument {
  const { global, rest } = extractGlobalFrontmatter(source);
  const rawSlides = splitIntoSlides(rest);

  const slides: RawSlide[] = [];
  for (const raw of rawSlides) {
    slides.push(buildSlide(slides.length, raw.frontmatter, raw.content));
  }

  return { global, slides };
}

// ============================================
// GLOBAL FRONTMATTER
// ============================================

const GLOBAL_FM_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

function extractGlobalFrontmatter(source: string): { global: Record<string, unknown>; rest: string } {
  const match = source.match(GLOBAL_FM_RE);
  if (!match) return { global: {}, rest: source };

  const parsed = parseYaml(match[1]);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return {
      global: parsed as Record<string, unknown>,
      rest: source.slice(match[0].length),
    };
  }
  if (parsed !== null && parsed !== undefined) {
    throw new Error(
      `Global frontmatter must be a YAML mapping (key: value pairs), got ${Array.isArray(parsed) ? "array" : typeof parsed}.`,
    );
  }

  return { global: {}, rest: source };
}

// ============================================
// LINE-BASED SLIDE SPLITTER
// ============================================

interface SplitSlide {
  frontmatter: string;
  content: string;
}

const SEPARATOR_RE = /^---[ \t]*$/;
const CODE_FENCE_OPEN_RE = /^(`{3,}|~{3,})/;

/**
 * States:
 * - BODY: accumulating body content lines for current slide
 * - FM: accumulating frontmatter lines (between --- pair)
 *
 * Transitions:
 * - BODY + `---` -> flush current slide, start new slide, enter FM state
 * - FM + `---` -> close frontmatter, enter BODY state
 * - FM + blank line (before any non-blank FM line) -> no frontmatter, enter BODY
 * - EOF while in FM -> unterminated frontmatter, treat accumulated lines as body
 */
function splitIntoSlides(text: string): SplitSlide[] {
  const lines = text.split(/\r?\n/);
  const slides: SplitSlide[] = [];

  let inFM = false;
  let fmStarted = false;
  let fmClosed = false;
  let fmLines: string[] = [];
  let bodyLines: string[] = [];
  let inCodeFence = false;
  let codeFenceChar = "";
  let codeFenceLen = 0;

  function flushSlide() {
    const fm = fmLines.join("\n").trim();
    const body = bodyLines.join("\n").trim();
    if (fm || body) {
      slides.push({ frontmatter: fm, content: body });
    }
    fmLines = [];
    bodyLines = [];
  }

  for (const line of lines) {
    if (!inCodeFence) {
      const fenceMatch = line.match(CODE_FENCE_OPEN_RE);
      if (fenceMatch) {
        inCodeFence = true;
        codeFenceChar = fenceMatch[1][0];
        codeFenceLen = fenceMatch[1].length;
      }
    } else {
      const trimmed = line.trim();
      if (trimmed.length >= codeFenceLen && trimmed === codeFenceChar.repeat(trimmed.length)) {
        inCodeFence = false;
      }
    }

    const isSeparator = !inCodeFence && SEPARATOR_RE.test(line);

    if (isSeparator) {
      if (inFM) {
        inFM = false;
        fmClosed = true;
      } else {
        if (fmLines.length > 0 && !fmClosed) {
          bodyLines = [...fmLines, ...bodyLines];
          fmLines = [];
        }
        flushSlide();
        inFM = true;
        fmStarted = false;
        fmClosed = false;
      }
    } else if (inFM) {
      if (!fmStarted && line.trim() === "") {
        inFM = false;
        bodyLines.push(line);
      } else {
        fmStarted = true;
        fmLines.push(line);
      }
    } else {
      bodyLines.push(line);
    }
  }

  // Unterminated FM at EOF -> treat as body content
  if (fmLines.length > 0 && !fmClosed) {
    bodyLines = [...fmLines, ...bodyLines];
    fmLines = [];
  }
  flushSlide();

  return slides;
}

// ============================================
// SLIDE BUILDER
// ============================================

function buildSlide(index: number, fmString: string, rawContent: string): RawSlide {
  const frontmatter = parseFrontmatter(fmString, index);
  const { leading, slots } = extractSlots(rawContent);
  if (leading.trim()) {
    throw new Error(`Slide ${index + 1}: text found outside a ::slot:: marker`);
  }
  return { index, frontmatter, slots };
}

export class FrontmatterParseError extends Error {
  constructor(slideIndex: number, yamlSource: string, cause: unknown) {
    const preview = yamlSource.length > 80 ? `${yamlSource.slice(0, 80)}...` : yamlSource;
    super(`Invalid YAML in slide ${slideIndex} frontmatter:\n${preview}`);
    this.name = "FrontmatterParseError";
    this.cause = cause;
  }
}

function parseFrontmatter(yaml: string, slideIndex: number): Record<string, unknown> {
  if (!yaml) return {};
  try {
    const result = parseYaml(yaml);
    if (result && typeof result === "object" && !Array.isArray(result)) {
      return result as Record<string, unknown>;
    }
  } catch (err) {
    throw new FrontmatterParseError(slideIndex, yaml, err);
  }
  throw new Error(
    `Slide ${slideIndex + 1}: frontmatter must be a YAML mapping (key: value pairs), got ${Array.isArray(parseYaml(yaml)) ? "array" : typeof parseYaml(yaml)}.`,
  );
}

// ============================================
// CONTENT SLOTS
// ============================================

const SLOT_LINE_RE = /^::(\w+)::[ \t]*$/;

function extractSlots(content: string): { leading: string; slots: Record<string, string> } {
  const lines = content.split(/\r?\n/);
  let currentSlot: string | null = null;
  const slotLines: Map<string | null, string[]> = new Map([[null, []]]);

  let inCodeFence = false;
  let codeFenceChar = "";
  let codeFenceLen = 0;

  for (const line of lines) {
    if (!inCodeFence) {
      const fenceMatch = line.match(CODE_FENCE_OPEN_RE);
      if (fenceMatch) {
        inCodeFence = true;
        codeFenceChar = fenceMatch[1][0];
        codeFenceLen = fenceMatch[1].length;
      }
    } else {
      const trimmed = line.trim();
      if (trimmed.length >= codeFenceLen && trimmed === codeFenceChar.repeat(trimmed.length)) {
        inCodeFence = false;
      }
    }

    const slotMatch = !inCodeFence && line.match(SLOT_LINE_RE);
    if (slotMatch) {
      currentSlot = slotMatch[1];
      if (!slotLines.has(currentSlot)) {
        slotLines.set(currentSlot, []);
      }
    } else {
      slotLines.get(currentSlot)!.push(line);
    }
  }

  const leading = slotLines.get(null)!.join("\n").trim();
  const slots: Record<string, string> = {};
  for (const [name, sLines] of slotLines) {
    if (name !== null) {
      slots[name] = sLines.join("\n").trim();
    }
  }

  return { leading, slots };
}
