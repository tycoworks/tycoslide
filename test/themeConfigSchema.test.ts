import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { parseThemeConfig } from "../dist/markdown/index.js";
import type { CompilerThemeConfig } from "../dist/markdown/types.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(here, "fixtures", "composition-theme.json");

// A minimal-but-full valid theme populating every optional field at every
// nesting level (top-level: fonts, mermaid, codeTheme, mermaidVariant,
// outputDir; layout: description/variant; parameter: limit/required;
// slot: required; block: startAt). This is the runtime
// backstop for the `_drift` guard's blind spot (see the comment above
// `ThemeConfigSchema` in themeConfigSchema.ts): every field here is a real key
// on a `strictObject`, so a schema that forgot to declare one of them rejects
// this fixture as an "unrecognized key" and the "full theme" test below fails.
function fullTheme(): CompilerThemeConfig {
  return {
    template: "deck.pptx",
    outputDir: "out",
    codeTheme: "github-dark",
    mermaidVariant: "brand",
    assets: {
      logos: {
        primary: { path: "logo.png", type: "image", description: "Primary logo" },
      },
    },
    fonts: [{ family: "Inter", path: "@fontsource/inter/x.woff2", weight: 400 }],
    mermaid: {
      brand: {
        primary: "#000",
        primaryContrast: "#fff",
        text: "#111",
        line: "#222",
        surface: "#333",
        surfaceBorder: "#444",
        fontFamily: "Inter",
        accents: ["#aaa", "#bbb"],
        accentOpacity: 20,
        accentTextColor: "#fff",
        groupCornerRadius: 8,
      },
    },
    layouts: [
      {
        name: "Titled",
        slideNumber: 1,
        description: "A titled layout",
        variant: "dark",
        parameters: [
          { type: "template", shapeName: "Title 1", template: "{title}", required: true, limit: { maxChars: 50 } },
          { type: "image", shapeName: "Logo 0", key: "logo", required: false },
        ],
        slots: [
          {
            key: "body",
            frame: { x: 1, y: 2, cx: 3, cy: 4 },
            limit: { maxChars: 100, maxLines: 5, maxItems: 3 },
            required: false,
            accepts: [{ type: "text", sourceSlide: 1, shapeName: "Text 1", startAt: 0 }],
          },
        ],
      },
    ],
  };
}

describe("parseThemeConfig", () => {
  it("accepts the existing composition-theme.json fixture (regression)", () => {
    const raw = JSON.parse(readFileSync(fixturePath, "utf-8"));
    const cfg = parseThemeConfig(raw, fixturePath);
    assert.equal(cfg.template, "composition.pptx");
    assert.equal(cfg.layouts.length, 2);
  });

  it("accepts a full theme with fonts, mermaid, codeTheme, mermaidVariant", () => {
    const cfg = parseThemeConfig(fullTheme(), "full.json");
    assert.equal(cfg.fonts?.[0].family, "Inter");
    assert.equal(cfg.mermaid?.brand.accents.length, 2);
    assert.equal(cfg.codeTheme, "github-dark");
    assert.equal(cfg.layouts[0].variant, "dark");
  });

  it("accepts a { light, dark } codeTheme pair and a layout variant", () => {
    const raw = fullTheme();
    raw.codeTheme = { light: "github-light", dark: "github-dark" };
    raw.layouts[0].variant = "light";
    const cfg = parseThemeConfig(raw, "pair.json");
    assert.deepEqual(cfg.codeTheme, { light: "github-light", dark: "github-dark" });
    assert.equal(cfg.layouts[0].variant, "light");
  });

  it("rejects an unknown key inside a codeTheme pair", () => {
    const bad = fullTheme();
    // A pair with an extra arm must be caught by the strict object, not dropped.
    // Inside a z.union the error is reported generically at `codeTheme` (Zod does
    // not surface the offending arm's key name), but it IS rejected — the strict
    // pair refuses the extra key rather than silently dropping it.
    (bad as { codeTheme: unknown }).codeTheme = { light: "github-light", dark: "github-dark", dim: "github-dimmed" };
    assert.throws(
      () => parseThemeConfig(bad, "/path/to/theme.json"),
      (err: Error) => {
        assert.match(err.message, /invalid theme config/);
        assert.match(err.message, /codeTheme/);
        return true;
      },
    );
  });

  it("rejects an invalid layout variant value", () => {
    const bad = fullTheme();
    (bad.layouts[0] as { variant: unknown }).variant = "sepia";
    assert.throws(
      () => parseThemeConfig(bad, "/path/to/theme.json"),
      (err: Error) => {
        assert.match(err.message, /invalid theme config/);
        return true;
      },
    );
  });

  it("rejects an unknown TOP-LEVEL key and names it", () => {
    const bad = { ...fullTheme(), brand: { color: "#f00" } };
    assert.throws(
      () => parseThemeConfig(bad, "/path/to/theme.json"),
      (err: Error) => {
        assert.match(err.message, /theme\.json: invalid theme config/);
        assert.match(err.message, /brand/);
        // Surfaces the valid-key set, mirroring the frontmatter validators.
        assert.match(err.message, /Valid keys:/);
        assert.match(err.message, /template/);
        return true;
      },
    );
  });

  it("rejects an unknown NESTED key (typo in a slot)", () => {
    const bad = fullTheme();
    // biome-ignore lint/suspicious/noExplicitAny: intentionally injecting an invalid key
    (bad.layouts[0].slots[0] as any).framee = { x: 0, y: 0, cx: 0, cy: 0 };
    assert.throws(
      () => parseThemeConfig(bad, "theme.json"),
      (err: Error) => {
        assert.match(err.message, /framee/);
        return true;
      },
    );
  });

  it("rejects an unknown NESTED key (typo in an accept block)", () => {
    const bad = fullTheme();
    // biome-ignore lint/suspicious/noExplicitAny: intentionally injecting an invalid key
    (bad.layouts[0].slots[0].accepts[0] as any).shapename = "oops";
    assert.throws(() => parseThemeConfig(bad, "theme.json"), /shapename/);
  });

  it("rejects a parameter with a bad discriminator type", () => {
    const bad = fullTheme();
    // biome-ignore lint/suspicious/noExplicitAny: intentionally invalid discriminator
    (bad.layouts[0].parameters as any[])[0] = { type: "textt", shapeName: "X", template: "{a}" };
    assert.throws(() => parseThemeConfig(bad, "theme.json"));
  });

  it("rejects a template parameter missing its required `template` field", () => {
    const bad = fullTheme();
    // biome-ignore lint/suspicious/noExplicitAny: dropping a required union-member field
    (bad.layouts[0].parameters as any[])[0] = { type: "template", shapeName: "X" };
    assert.throws(
      () => parseThemeConfig(bad, "theme.json"),
      (err: Error) => {
        assert.match(err.message, /template/);
        return true;
      },
    );
  });

  // Union-member strictness is a separate Zod code path from a plain
  // strictObject's: `discriminatedUnion` picks a branch by `type`, then that
  // branch's own `strictObject` enforces the unknown-key check. This is the
  // exact regression a loose (non-strict) member schema caused — an image
  // parameter silently accepted `fit`, a key nothing reads.
  it("rejects an IMAGE parameter carrying an unknown key and names it", () => {
    const bad = fullTheme();
    // biome-ignore lint/suspicious/noExplicitAny: intentionally injecting an unknown key
    (bad.layouts[0].parameters as any[])[1] = { type: "image", shapeName: "Logo 0", key: "logo", fit: "contain" };
    assert.throws(
      () => parseThemeConfig(bad, "theme.json"),
      (err: Error) => {
        assert.match(err.message, /fit/);
        return true;
      },
    );
  });

  it("rejects a TEMPLATE parameter carrying an unknown key", () => {
    const bad = fullTheme();
    // biome-ignore lint/suspicious/noExplicitAny: intentionally injecting an unknown key
    (bad.layouts[0].parameters as any[])[0] = {
      type: "template",
      shapeName: "Title 1",
      template: "{title}",
      bogus: true,
    };
    assert.throws(
      () => parseThemeConfig(bad, "theme.json"),
      (err: Error) => {
        assert.match(err.message, /bogus/);
        return true;
      },
    );
  });
});
