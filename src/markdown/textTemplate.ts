import type { TemplateSegment } from "../engine/index.js";

/**
 * Text-template parsing. A text parameter's `template` is a single string with
 * `{key}` placeholders; newlines in it are line breaks. Filling substitutes the
 * author's values; the substituted result is written into the shape's existing
 * runs by the engine. Lives in the compiler — the engine never parses `{}`.
 *
 * Syntax:
 * - `{name}` — a placeholder for the key `name`; `name` matches `[A-Za-z0-9_]+`.
 * - `{{` / `}}` — an escaped literal `{` / `}`.
 * - A `{` not followed by a valid name + `}` is a literal brace, left as-is.
 */

// Order matters: escapes (`{{`, `}}`) are tried before a placeholder so
// `{{name}}` reads as a literal-brace-wrapped `name`, not a `{name}` placeholder.
const TOKEN_RE = /\{\{|\}\}|\{([A-Za-z0-9_]+)\}/g;

/**
 * The unique keys named by a template's placeholders, in first-seen order. A key
 * repeated in the template appears once — it is filled once, everywhere it occurs.
 */
export function templateKeys(template: string): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const match of template.matchAll(TOKEN_RE)) {
    const name = match[1];
    if (name !== undefined && !seen.has(name)) {
      seen.add(name);
      keys.push(name);
    }
  }
  return keys;
}

/**
 * Parse a template into per-line segment lists: split on newlines, then tokenize
 * each line into an ordered list of literal and variable segments. Variables
 * carry their substituted value (escapes collapse: `{{` → `{`, `}}` → `}`).
 * Fails fast — a placeholder with no supplied value throws, naming the shape and
 * the key, since a partially-filled text parameter is an authoring error.
 * `shapeName` is the target PPTX shape's name, used only for the error message.
 */
export function templateToSegments(
  template: string,
  values: Map<string, string>,
  shapeName: string,
): TemplateSegment[][] {
  return template.split("\n").map((line) => lineToSegments(line, values, shapeName));
}

function lineToSegments(line: string, values: Map<string, string>, shapeName: string): TemplateSegment[] {
  const segments: TemplateSegment[] = [];
  const pushLiteral = (text: string): void => {
    if (text === "") return;
    const last = segments[segments.length - 1];
    if (last?.kind === "literal") last.text += text;
    else segments.push({ kind: "literal", text });
  };

  let lastIndex = 0;
  for (const match of line.matchAll(TOKEN_RE)) {
    pushLiteral(line.slice(lastIndex, match.index));
    const token = match[0];
    const name = match[1];
    if (token === "{{") {
      pushLiteral("{");
    } else if (token === "}}") {
      pushLiteral("}");
    } else {
      const value = values.get(name as string);
      if (value === undefined) {
        throw new Error(`Text parameter "${shapeName}": no value supplied for key "${name}" (placeholder "{${name}}")`);
      }
      segments.push({ kind: "variable", key: name as string, value });
    }
    lastIndex = match.index + token.length;
  }
  pushLiteral(line.slice(lastIndex));
  return segments;
}
