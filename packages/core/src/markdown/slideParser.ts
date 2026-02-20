// Slide Parser
// Parses a multi-slide markdown file into a structured document.
// Uses structural --- pair detection (like Slidev) — NEVER guesses
// whether content is YAML. Frontmatter is identified by position
// between --- delimiters, not by parsing content.
//
// Architecture: line-based state machine for file-level splitting,
// then YAML parser for structurally-identified frontmatter blocks.
// This module has NO knowledge of layouts.

import { parse as parseYaml } from 'yaml';

// ============================================
// TYPES
// ============================================

/** Parsed representation of a single slide (layout-agnostic). */
export interface RawSlide {
  /** Zero-based slide index. */
  index: number;
  /** YAML frontmatter key-value pairs (layout, eyebrow, etc.). */
  frontmatter: Record<string, unknown>;
  /** Default slot markdown content. */
  body: string;
  /** Named slot contents keyed by slot name (e.g. `{ left: "...", right: "..." }`). */
  slots: Record<string, string>;
}

/** Parsed representation of a full slide document. */
export interface ParsedDocument {
  /** Global frontmatter (theme, title, etc.) from the file header. */
  global: Record<string, unknown>;
  /** Ordered array of parsed slides. */
  slides: RawSlide[];
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Parse a multi-slide markdown file into a structured document.
 *
 * File format (Slidev convention):
 * ```markdown
 * ---
 * theme: acme
 * ---
 *
 * ---
 * layout: section
 * title: First Slide
 * ---
 *
 * ---
 * layout: body
 * eyebrow: INTRO
 * title: Second Slide
 * ---
 *
 * Body content here.
 *
 * ```
 *
 * Rules:
 * - `---` on its own line is a slide separator
 * - After a separator, if the next non-blank line is followed by a closing
 *   `---`, the content between is YAML frontmatter for that slide
 * - A blank line immediately after `---` means no frontmatter (body starts)
 * - `::name::` markers split body into named content slots
 */
export function parseSlideDocument(source: string): ParsedDocument {
  // Step 1: Extract global frontmatter from file header
  const { global, rest } = extractGlobalFrontmatter(source);

  // Step 2: Split remaining content into slides using line-based state machine
  const rawSlides = splitIntoSlides(rest);

  // Step 3: Build RawSlide objects with slot extraction
  const slides: RawSlide[] = [];
  for (const raw of rawSlides) {
    slides.push(buildSlide(slides.length, raw.frontmatter, raw.content));
  }

  return { global, slides };
}

// ============================================
// GLOBAL FRONTMATTER
// ============================================

/** Match ---\nYAML\n--- at the very start of the file. */
const GLOBAL_FM_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

function extractGlobalFrontmatter(source: string): { global: Record<string, unknown>; rest: string } {
  const match = source.match(GLOBAL_FM_RE);
  if (!match) return { global: {}, rest: source };

  try {
    const parsed = parseYaml(match[1]);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return {
        global: parsed as Record<string, unknown>,
        rest: source.slice(match[0].length),
      };
    }
  } catch {
    // Not valid YAML — treat entire file as content
  }

  return { global: {}, rest: source };
}

// ============================================
// LINE-BASED SLIDE SPLITTER
// ============================================

/** Intermediate representation from the line-based splitter. */
interface SplitSlide {
  frontmatter: string;
  content: string;
}

/** Regex to detect --- on its own line (with optional trailing whitespace). */
const SEPARATOR_RE = /^---[ \t]*$/;

/** Regex to detect opening of a fenced code block. */
const CODE_FENCE_OPEN_RE = /^(`{3,}|~{3,})/;

/**
 * Split the document into slides using a line-based state machine.
 *
 * States:
 * - BODY: accumulating body content lines for current slide
 * - FM: accumulating frontmatter lines (between --- pair)
 *
 * Transitions:
 * - BODY + `---` → flush current slide, start new slide, enter FM state
 * - FM + `---` → close frontmatter, enter BODY state
 * - FM + blank line (before any non-blank FM line) → no frontmatter, enter BODY
 * - EOF while in FM → unterminated frontmatter, treat accumulated lines as body
 */
function splitIntoSlides(text: string): SplitSlide[] {
  const lines = text.split(/\r?\n/);
  const slides: SplitSlide[] = [];

  let inFM = false;
  let fmStarted = false;  // Have we seen any non-blank line while in FM state?
  let fmClosed = false;   // Was FM properly closed by a --- ?
  let fmLines: string[] = [];
  let bodyLines: string[] = [];
  let inCodeFence = false;
  let codeFenceChar = '';
  let codeFenceLen = 0;

  function flushSlide() {
    const fm = fmLines.join('\n').trim();
    const body = bodyLines.join('\n').trim();
    if (fm || body) {
      slides.push({ frontmatter: fm, content: body });
    }
    fmLines = [];
    bodyLines = [];
  }

  for (const line of lines) {
    // Track fenced code blocks to avoid splitting on --- inside them
    if (!inCodeFence) {
      const fenceMatch = line.match(CODE_FENCE_OPEN_RE);
      if (fenceMatch) {
        inCodeFence = true;
        codeFenceChar = fenceMatch[1][0]; // ` or ~
        codeFenceLen = fenceMatch[1].length;
      }
    } else {
      // Closing fence: same character, at least as many as opening, nothing else on line
      const trimmed = line.trim();
      if (trimmed.length >= codeFenceLen
        && trimmed === codeFenceChar.repeat(trimmed.length)) {
        inCodeFence = false;
      }
    }

    const isSeparator = !inCodeFence && SEPARATOR_RE.test(line);

    if (isSeparator) {
      if (inFM) {
        // This --- closes the frontmatter block
        inFM = false;
        fmClosed = true;
      } else {
        // This --- is a slide separator
        // If we had FM lines that were NEVER closed, they were body content
        if (fmLines.length > 0 && !fmClosed) {
          bodyLines = [...fmLines, ...bodyLines];
          fmLines = [];
        }
        flushSlide();
        // After separator, tentatively enter FM state
        inFM = true;
        fmStarted = false;
        fmClosed = false;
      }
    } else if (inFM) {
      if (!fmStarted && line.trim() === '') {
        // Blank line immediately after --- → no frontmatter, switch to body
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

  // Handle unterminated FM at EOF → treat as body content
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

/** Build a RawSlide from frontmatter string and raw content. */
function buildSlide(index: number, fmString: string, rawContent: string): RawSlide {
  // Parse frontmatter YAML (only called on structurally-identified FM)
  const frontmatter = parseFrontmatter(fmString, index);

  // Extract slots from body
  const { defaultSlot, slots } = extractSlots(rawContent);

  return { index, frontmatter, body: defaultSlot, slots };
}

/** Error thrown when YAML in a structurally-identified frontmatter block fails to parse. */
export class FrontmatterParseError extends Error {
  constructor(slideIndex: number, yamlSource: string, cause: unknown) {
    const preview = yamlSource.length > 80 ? yamlSource.slice(0, 80) + '...' : yamlSource;
    super(`Invalid YAML in slide ${slideIndex} frontmatter:\n${preview}`);
    this.name = 'FrontmatterParseError';
    this.cause = cause;
  }
}

/** Parse a YAML string into a Record. Only called on structurally-identified frontmatter. */
function parseFrontmatter(yaml: string, slideIndex: number): Record<string, unknown> {
  if (!yaml) return {};
  try {
    const result = parseYaml(yaml);
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      return result as Record<string, unknown>;
    }
  } catch (err) {
    throw new FrontmatterParseError(slideIndex, yaml, err);
  }
  return {};
}

// ============================================
// CONTENT SLOTS
// ============================================

/** Slot marker pattern: `::name::` on its own line. */
const SLOT_LINE_RE = /^::(\w+)::[ \t]*$/;

/**
 * Split content into a default slot and named slots.
 * Everything before the first `::name::` marker is the default slot.
 * Named slots capture content between markers.
 * Code-fence-aware: `::name::` inside fenced code blocks is ignored.
 */
function extractSlots(content: string): { defaultSlot: string; slots: Record<string, string> } {
  const lines = content.split(/\r?\n/);
  let currentSlot: string | null = null; // null = default slot
  const slotLines: Map<string | null, string[]> = new Map([[null, []]]);

  let inCodeFence = false;
  let codeFenceChar = '';
  let codeFenceLen = 0;

  for (const line of lines) {
    // Track code fences
    if (!inCodeFence) {
      const fenceMatch = line.match(CODE_FENCE_OPEN_RE);
      if (fenceMatch) {
        inCodeFence = true;
        codeFenceChar = fenceMatch[1][0];
        codeFenceLen = fenceMatch[1].length;
      }
    } else {
      const trimmed = line.trim();
      if (trimmed.length >= codeFenceLen
        && trimmed === codeFenceChar.repeat(trimmed.length)) {
        inCodeFence = false;
      }
    }

    // Only recognize slot markers outside code fences
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

  const defaultSlot = (slotLines.get(null) ?? []).join('\n').trim();
  const slots: Record<string, string> = {};
  for (const [name, sLines] of slotLines) {
    if (name !== null) {
      slots[name] = sLines.join('\n').trim();
    }
  }

  return { defaultSlot, slots };
}
