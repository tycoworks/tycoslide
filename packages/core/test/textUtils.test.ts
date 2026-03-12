// Text Utilities Tests
// Tests for getFontForRun from src/utils/font.ts

import assert from "node:assert";
import { describe, it } from "node:test";
import { FONT_SLOT, type FontFamily } from "../src/core/model/types.js";
import { checkFontVariant, getFontForRun, isFontFamily, resolveFontFace } from "../src/utils/font.js";

// ============================================
// TEST DATA
// ============================================

const mockFontFamily: FontFamily = {
  name: "Test",
  regular: { path: "/fonts/test-regular.woff", weight: 400 },
  italic: { path: "/fonts/test-italic.woff", weight: 400 },
  bold: { path: "/fonts/test-bold.woff", weight: 700 },
  boldItalic: { path: "/fonts/test-bold-italic.woff", weight: 700 },
};

const minimalFontFamily: FontFamily = {
  name: "Minimal",
  regular: { path: "/fonts/minimal.woff", weight: 400 },
};

// ============================================
// getFontForRun() TESTS
// ============================================

describe("getFontForRun", () => {
  it("returns regular font when no flags", () => {
    const font = getFontForRun(mockFontFamily);
    assert.strictEqual(font.path, "/fonts/test-regular.woff");
  });

  it("returns bold font", () => {
    const font = getFontForRun(mockFontFamily, true);
    assert.strictEqual(font.path, "/fonts/test-bold.woff");
    assert.strictEqual(font.weight, 700);
  });

  it("returns italic font", () => {
    const font = getFontForRun(mockFontFamily, false, true);
    assert.strictEqual(font.path, "/fonts/test-italic.woff");
  });

  it("returns boldItalic font", () => {
    const font = getFontForRun(mockFontFamily, true, true);
    assert.strictEqual(font.path, "/fonts/test-bold-italic.woff");
    assert.strictEqual(font.weight, 700);
  });

  it("falls back to regular when bold missing", () => {
    const font = getFontForRun(minimalFontFamily, true);
    assert.strictEqual(font.path, "/fonts/minimal.woff");
  });

  it("falls back to regular when italic missing", () => {
    const font = getFontForRun(minimalFontFamily, false, true);
    assert.strictEqual(font.path, "/fonts/minimal.woff");
  });

  it("falls back to bold then regular when boldItalic missing", () => {
    const noBoldItalic: FontFamily = {
      name: "NoBoldItalic",
      regular: { path: "/fonts/regular.woff", weight: 400 },
      bold: { path: "/fonts/bold.woff", weight: 700 },
    };
    const font = getFontForRun(noBoldItalic, true, true);
    assert.strictEqual(font.path, "/fonts/bold.woff");
  });

  it("returns correct font properties", () => {
    const font = getFontForRun(mockFontFamily);
    assert.ok(font.path, "Font should have a path");
    assert.strictEqual(typeof font.path, "string");
    assert.strictEqual(typeof font.weight, "number");
  });
});

// ============================================
// resolveFontFace() TESTS
// ============================================

const interLight: FontFamily = {
  name: "Inter Light",
  regular: { path: "/fonts/inter-300.woff", weight: 300 },
  bold: { path: "/fonts/inter-700.woff", weight: 700, name: "Inter" },
  boldItalic: { path: "/fonts/inter-700-italic.woff", weight: 700, name: "Inter" },
};

describe("resolveFontFace", () => {
  it("returns family.name for regular runs", () => {
    assert.strictEqual(resolveFontFace(interLight), "Inter Light");
  });

  it("returns font.name for bold runs", () => {
    assert.strictEqual(resolveFontFace(interLight, true), "Inter");
  });

  it("returns font.name for boldItalic runs", () => {
    assert.strictEqual(resolveFontFace(interLight, true, true), "Inter");
  });

  it("returns family.name when font.name not set", () => {
    assert.strictEqual(resolveFontFace(mockFontFamily, true), "Test");
  });

  it("returns family.name for italic without font.name", () => {
    assert.strictEqual(resolveFontFace(interLight, false, true), "Inter Light");
  });

  it("falls back to family.name when bold slot missing", () => {
    assert.strictEqual(resolveFontFace(minimalFontFamily, true), "Minimal");
  });

  it("returns font.name for italic when font.name is set", () => {
    const family: FontFamily = {
      name: "Some Light",
      regular: { path: "/fonts/regular.woff", weight: 300 },
      italic: { path: "/fonts/italic.woff", weight: 300, name: "Some" },
    };
    assert.strictEqual(resolveFontFace(family, false, true), "Some");
  });
});

// ============================================
// getFontForRun() FALLBACK CHAIN TESTS
// ============================================

describe("getFontForRun fallback chain", () => {
  it("bold+italic falls back to regular when only italic exists (bold takes priority)", () => {
    const italicOnly: FontFamily = {
      name: "ItalicOnly",
      regular: { path: "/fonts/regular.woff", weight: 400 },
      italic: { path: "/fonts/italic.woff", weight: 400 },
    };
    // boldItalic missing, bold missing → falls to regular (not italic)
    const font = getFontForRun(italicOnly, true, true);
    assert.strictEqual(font.path, "/fonts/regular.woff");
  });
});

// ============================================
// isFontFamily() TESTS
// ============================================

describe("isFontFamily", () => {
  it("returns true for a valid FontFamily", () => {
    assert.strictEqual(isFontFamily(mockFontFamily), true);
  });

  it("returns true for a minimal FontFamily (regular-only)", () => {
    assert.strictEqual(isFontFamily(minimalFontFamily), true);
  });

  it("returns false for null", () => {
    assert.strictEqual(isFontFamily(null), false);
  });

  it("returns false for undefined", () => {
    assert.strictEqual(isFontFamily(undefined), false);
  });

  it("returns false for a string", () => {
    assert.strictEqual(isFontFamily("Inter"), false);
  });

  it("returns false for a number", () => {
    assert.strictEqual(isFontFamily(42), false);
  });

  it("returns false for object with name but no regular", () => {
    assert.strictEqual(isFontFamily({ name: "Inter" }), false);
  });

  it("returns false for object with regular but no path", () => {
    assert.strictEqual(isFontFamily({ name: "Inter", regular: { weight: 400 } }), false);
  });

  it("returns false for object with regular.path not a string", () => {
    assert.strictEqual(isFontFamily({ name: "Inter", regular: { path: 123, weight: 400 } }), false);
  });
});

// ============================================
// checkFontVariant() TESTS
// ============================================

describe("checkFontVariant", () => {
  it("returns null when all slots exist", () => {
    assert.strictEqual(checkFontVariant(mockFontFamily, true, true), null);
    assert.strictEqual(checkFontVariant(mockFontFamily, true), null);
    assert.strictEqual(checkFontVariant(mockFontFamily, false, true), null);
  });

  it("returns null for non-bold non-italic runs", () => {
    assert.strictEqual(checkFontVariant(minimalFontFamily), null);
    assert.strictEqual(checkFontVariant(minimalFontFamily, false, false), null);
  });

  it("returns violation for missing bold", () => {
    const v = checkFontVariant(minimalFontFamily, true);
    assert.deepStrictEqual(v, { fontName: "Minimal", slot: FONT_SLOT.BOLD });
  });

  it("returns violation for missing italic", () => {
    const v = checkFontVariant(minimalFontFamily, false, true);
    assert.deepStrictEqual(v, { fontName: "Minimal", slot: FONT_SLOT.ITALIC });
  });

  it("returns violation for missing boldItalic", () => {
    const noBoldItalic: FontFamily = {
      name: "NoBoldItalic",
      regular: { path: "/fonts/regular.woff", weight: 400 },
      bold: { path: "/fonts/bold.woff", weight: 700 },
    };
    const v = checkFontVariant(noBoldItalic, true, true);
    assert.deepStrictEqual(v, { fontName: "NoBoldItalic", slot: FONT_SLOT.BOLD_ITALIC });
  });

  it("returns bold violation when both bold and boldItalic missing", () => {
    // bold+italic on a regular-only font: bold check fires first
    const v = checkFontVariant(minimalFontFamily, true, true);
    assert.deepStrictEqual(v, { fontName: "Minimal", slot: FONT_SLOT.BOLD_ITALIC });
  });
});
