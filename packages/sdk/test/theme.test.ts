import * as assert from "node:assert";
import { createRequire } from "node:module";
import { describe, it } from "node:test";
import type { FontFamily, TextStyle } from "@tycoslide/core";
import type { ThemeDefinition, ThemeFormat } from "../src/theme.js";
import { defineTheme, resolveThemeFormat } from "../src/theme.js";

const require = createRequire(import.meta.url);

// ── Fixtures ─────────────────────────────────────────────────────────────────

const validFont: FontFamily = {
  name: "Inter",
  regular: { path: require.resolve("@fontsource/inter/files/inter-latin-400-normal.woff"), weight: 400 },
  bold: { path: require.resolve("@fontsource/inter/files/inter-latin-700-normal.woff"), weight: 700 },
};

const validTextStyle: TextStyle = {
  fontSize: 14,
  fontFamily: validFont,
  lineHeightMultiplier: 1.2,
  bulletIndentPt: 18,
};

const validTextStyles: Record<string, TextStyle> = {
  h1: validTextStyle,
  body: validTextStyle,
};

function makeFormat(overrides?: Partial<ThemeFormat>): ThemeFormat {
  return {
    slide: { width: 13.333, height: 7.5 },
    textStyles: validTextStyles,
    layouts: {},
    ...overrides,
  };
}

function makeDefinition(overrides?: Partial<ThemeDefinition>): ThemeDefinition {
  return {
    fonts: [validFont],
    formats: {
      presentation: makeFormat(),
    },
    ...overrides,
  };
}

// ── defineTheme() ─────────────────────────────────────────────────────────────

describe("defineTheme()", () => {
  it("returns the definition unchanged on valid input", () => {
    const def = makeDefinition();
    const result = defineTheme(def);
    assert.strictEqual(result, def);
  });

  it("throws when formats is empty (zero formats)", () => {
    const def = makeDefinition({ formats: {} });
    assert.throws(
      () => defineTheme(def),
      /ThemeDefinition must have at least one format/,
    );
  });

  it("validates fonts across all formats — throws when second format has invalid fonts", () => {
    // Second format references a font not in theme.fonts
    const foreignFont: FontFamily = {
      name: "Roboto",
      regular: { path: "/fake/roboto-regular.woff", weight: 400 },
    };
    const badTextStyle: TextStyle = {
      fontSize: 14,
      fontFamily: foreignFont,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 18,
    };

    const def: ThemeDefinition = {
      // Only validFont is registered — foreignFont is NOT
      fonts: [validFont],
      formats: {
        // First format is fine
        presentation: makeFormat(),
        // Second format uses a font not listed in theme.fonts
        battlecard: makeFormat({
          textStyles: { body: badTextStyle },
        }),
      },
    };

    assert.throws(
      () => defineTheme(def),
      /Roboto.*not listed in theme\.fonts/,
    );
  });
});

// ── resolveThemeFormat() ──────────────────────────────────────────────────────

describe("resolveThemeFormat()", () => {
  it("valid format name returns correct flat Theme", () => {
    const def = makeDefinition();
    const theme = resolveThemeFormat(def, "presentation");

    assert.deepStrictEqual(theme.fonts, def.fonts);
    assert.deepStrictEqual(theme.slide, def.formats["presentation"].slide);
    assert.deepStrictEqual(theme.textStyles, def.formats["presentation"].textStyles);
    assert.deepStrictEqual(theme.layouts, def.formats["presentation"].layouts);
  });

  it("undefined format throws with 'No format specified' and lists available names", () => {
    const def = makeDefinition();
    assert.throws(
      () => resolveThemeFormat(def, undefined),
      (err: Error) => {
        assert.ok(err.message.includes("No format specified"), `message was: ${err.message}`);
        assert.ok(err.message.includes("presentation"), `message was: ${err.message}`);
        return true;
      },
    );
  });

  it("unknown format name throws with 'Unknown format' and lists available names", () => {
    const def = makeDefinition();
    assert.throws(
      () => resolveThemeFormat(def, "nonexistent"),
      (err: Error) => {
        assert.ok(err.message.includes("Unknown format"), `message was: ${err.message}`);
        assert.ok(err.message.includes("presentation"), `message was: ${err.message}`);
        return true;
      },
    );
  });

  it("resolves the correct format when multiple formats exist", () => {
    const wideSlide = { width: 16, height: 9 };
    const narrowSlide = { width: 8.5, height: 11 };

    const def: ThemeDefinition = {
      fonts: [validFont],
      formats: {
        presentation: makeFormat({ slide: wideSlide }),
        factsheet: makeFormat({ slide: narrowSlide }),
      },
    };

    const presentation = resolveThemeFormat(def, "presentation");
    const factsheet = resolveThemeFormat(def, "factsheet");

    assert.deepStrictEqual(presentation.slide, wideSlide);
    assert.deepStrictEqual(factsheet.slide, narrowSlide);
  });
});
