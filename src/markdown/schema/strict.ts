import * as z from "zod";

/**
 * A strict object whose unrecognized-key error also lists the valid key set,
 * matching the deck frontmatter validators' "Valid keys: …" style
 * (`deckCompiler.ts`). The `error` callback only rewrites `unrecognized_keys`
 * issues; returning `undefined` falls back to Zod's default message for every
 * other issue code.
 */
export function strict<T extends z.ZodRawShape>(shape: T) {
  return z.strictObject(shape, {
    error: (issue) => {
      if (issue.code === "unrecognized_keys") {
        return `Unknown key(s): ${issue.keys.join(", ")}. Valid keys: ${Object.keys(shape).join(", ")}`;
      }
      return undefined;
    },
  });
}
