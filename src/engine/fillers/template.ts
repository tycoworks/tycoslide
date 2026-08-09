/**
 * Text-template fill — fills each visual line in place from its template
 * segments. A visual line starts at either a paragraph boundary (`<a:p>`) or a
 * soft line break (`<a:br/>`); template line i fills visual line i, 1:1. Styles
 * are never read or changed: coalesce same-style runs, then a uniform line takes
 * the substituted text directly, while a multi-style line is matched against the
 * sample to place each variable's value in the run carrying its style.
 */

import {
  childrenByTag,
  collectElements,
  detach,
  isPlainObject,
  runText,
  setRunTextPreservingStyle,
  Tag,
} from "../dom.js";
import type { TemplateFill, TemplateSegment } from "../types.js";

/** An ordered list of `<a:r>` runs forming one visual line (all within one `<a:p>`). */
interface VisualLine {
  runs: any[];
}

/**
 * Split a shape's text into visual lines. Walk each `<a:p>` in document order;
 * within a paragraph, iterate child elements in order and cut a new visual line
 * at every `<a:br/>` (`Tag.LINE_BREAK`), collecting the `<a:r>` runs into the
 * current line. A paragraph yields (break count + 1) visual lines, so an empty
 * line (a break with no runs) is still a line positionally.
 */
function visualLines(shape: any): VisualLine[] {
  const lines: VisualLine[] = [];
  for (const para of collectElements(shape, Tag.PARAGRAPH)) {
    let current: any[] = [];
    for (let i = 0; i < para.childNodes.length; i++) {
      const child = para.childNodes[i];
      if (child?.nodeType !== 1) continue;
      if (child.tagName === Tag.LINE_BREAK) {
        lines.push({ runs: current });
        current = [];
      } else if (child.tagName === Tag.RUN) {
        current.push(child);
      }
    }
    lines.push({ runs: current });
  }
  return lines;
}

/**
 * Fill a text shape from its template segments — styles are never read or
 * changed. Template line i fills the shape's visual line i, 1:1, via
 * `fillLineFromSegments`: coalesce same-style runs, then a uniform line takes the
 * substituted text directly, while a multi-style line is matched against the
 * sample to place each variable's value in the run carrying its style. A template
 * with more lines than the shape has visual lines is an authoring error (throw);
 * fewer lines fill the covered lines and leave the rest untouched.
 */
export function fillTemplate(shape: any, fill: TemplateFill, shapeName = ""): void {
  const lines = visualLines(shape);
  if (fill.lines.length > lines.length) {
    throw new Error(
      `Text shape "${shapeName}": template has ${fill.lines.length} lines but the shape has only ${lines.length} visual line(s); ` +
        "the template claims a line the shape doesn't have.",
    );
  }
  for (let i = 0; i < fill.lines.length; i++) {
    fillLineFromSegments(lines[i].runs, fill.lines[i], shapeName);
  }
}

/** Discriminator for TemplateFill values. */
export function isTemplateFill(v: unknown): v is TemplateFill {
  return isPlainObject(v) && Array.isArray((v as { lines?: unknown }).lines);
}

function segmentText(s: TemplateSegment): string {
  return s.kind === "literal" ? s.text : s.value;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Fill one visual line from its template segments. Coalesce same-style runs
 * within the line first; a resulting single run (uniform line) just takes the
 * substituted text. A multi-run line has real style boundaries, so match the
 * template's literals against the shape's sample text to place each variable's
 * value in the run carrying its style. A variable whose matched span crosses run
 * boundaries is not an error: it collapses to its first run's style (the spanned
 * runs are emptied and detached). Position ambiguity still fails fast — adjacent
 * variables with no separator, or a sample that doesn't fit the template.
 */
function fillLineFromSegments(lineRuns: any[], segments: TemplateSegment[], shapeName: string): void {
  const runs = coalesceRunList(lineRuns);
  if (runs.length === 0) return;

  if (runs.length === 1) {
    setRunTextPreservingStyle(runs[0], segments.map(segmentText).join(""));
    return;
  }

  // Multi-run: real style boundaries.
  for (let j = 1; j < segments.length; j++) {
    const prev = segments[j - 1];
    const cur = segments[j];
    if (prev.kind === "variable" && cur.kind === "variable") {
      throw new Error(
        `Text shape "${shapeName}": variables "{${prev.key}}" and "{${cur.key}}" are adjacent with no separator; ` +
          "a multi-style shape needs a literal or style boundary between variables.",
      );
    }
  }

  const runTexts = runs.map(runText);
  const bounds: Array<[number, number]> = [];
  let acc = 0;
  for (const t of runTexts) {
    bounds.push([acc, acc + t.length]);
    acc += t.length;
  }
  const sample = runTexts.join("");

  const source = `^${segments.map((s) => (s.kind === "literal" ? escapeRegExp(s.text) : "([\\s\\S]*?)")).join("")}$`;
  const match = new RegExp(source, "d").exec(sample);
  if (!match?.indices) {
    throw new Error(
      `Text shape "${shapeName}": its styled sample text ${JSON.stringify(sample)} does not fit the template; ` +
        "make the shape a single style, or give it sample text matching the template's structure.",
    );
  }
  const indices = match.indices;

  const runOf = (pos: number): number => {
    for (let k = 0; k < bounds.length; k++) if (pos >= bounds[k][0] && pos < bounds[k][1]) return k;
    return bounds.length - 1;
  };

  const out = runs.map(() => "");
  let cursor = 0;
  let varIdx = 0;
  for (const s of segments) {
    if (s.kind === "literal") {
      // A literal may straddle run boundaries — split it, each piece stays in its run.
      let p = 0;
      while (p < s.text.length) {
        const k = runOf(cursor + p);
        const take = Math.min(s.text.length, p + (bounds[k][1] - (cursor + p)));
        out[k] += s.text.slice(p, take);
        p = take;
      }
      cursor += s.text.length;
    } else {
      varIdx++;
      const span = indices[varIdx];
      if (!span)
        throw new Error(`Text shape "${shapeName}": failed to locate variable "{${s.key}}" in the sample text.`);
      const [vs, ve] = span;
      // A variable whose span crosses run boundaries collapses to its FIRST run:
      // the value goes into `out[kStart]`, the spanned runs get no text (they end
      // up ""), and we detach those empties below so the span becomes one run
      // carrying the first run's style.
      const kStart = runOf(vs);
      out[kStart] += s.value;
      cursor = ve;
    }
  }

  for (let k = 0; k < runs.length; k++) setRunTextPreservingStyle(runs[k], out[k]);

  // Detach runs left empty (e.g. runs a collapsed variable's span passed over) so
  // the visual line loses its now-textless runs. Never detach every run: if all
  // ended up empty, keep the first as the surviving run.
  const anyNonEmpty = out.some((t) => t !== "");
  for (let k = 0; k < runs.length; k++) {
    if (out[k] === "" && !(!anyNonEmpty && k === 0)) detach(runs[k]);
  }
}

// ── Run coalescing (text-template fill) ───────────────────────────────────────
//
// PowerPoint scatters one logical line across several runs for no semantic
// reason. Before a text-template fill we merge adjacent runs that carry an
// identical style, so a uniform line collapses to one run. We only ever merge
// runs we can PROVE are stylistically identical; anything uncertain is left
// untouched — we never guess a run away.

/**
 * A run's `<a:rPr>` is "blank" (the default style) when it is missing entirely
 * or carries no attributes and no child elements. A missing and an empty `<a:rPr>`
 * are therefore the same style.
 */
function isBlankRPr(rPr: any): boolean {
  if (!rPr) return true;
  if (rPr.attributes.length > 0) return false;
  for (let i = 0; i < rPr.childNodes.length; i++) if (rPr.childNodes[i]?.nodeType === 1) return false;
  return true;
}

/**
 * Two runs share a style iff their `<a:rPr>` are equal. We compare the whole
 * node via DOM `isEqualNode` (attribute-order-insensitive, recursive), so every
 * property — bold, size, color, font, hyperlink, … — is covered without
 * enumerating them; blank rPrs (missing or empty) compare equal to each other.
 */
function sameStyle(a: any, b: any): boolean {
  const ra = childrenByTag(a, Tag.RUN_PROPS)[0] ?? null;
  const rb = childrenByTag(b, Tag.RUN_PROPS)[0] ?? null;
  if (isBlankRPr(ra) && isBlankRPr(rb)) return true;
  if (!ra || !rb) return false;
  return ra.isEqualNode(rb);
}

/**
 * Merge adjacent runs in a run list that carry an identical style: keep the
 * first, append the others' text into it, and detach the redundant runs.
 * Provably-same-style only; distinct styles are preserved as separate runs.
 * Returns the surviving runs (in order). Scoped to the given list — a visual
 * line's runs, not necessarily a whole paragraph.
 */
function coalesceRunList(runs: any[]): any[] {
  const survivors: any[] = [];
  let keep: any = null;
  for (const run of runs) {
    if (keep && sameStyle(keep, run)) {
      setRunTextPreservingStyle(keep, runText(keep) + runText(run));
      detach(run);
    } else {
      keep = run;
      survivors.push(run);
    }
  }
  return survivors;
}

/**
 * Merge adjacent same-style runs across a whole paragraph. Thin wrapper over
 * `coalesceRunList` operating on the paragraph's direct `<a:r>` children.
 * Exported for tests.
 */
export function coalesceSameStyleRuns(para: any): void {
  coalesceRunList(childrenByTag(para, Tag.RUN));
}
