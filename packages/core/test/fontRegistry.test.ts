// Font Registry Tests
// Tests for validateThemeFonts (structural validation) and generateFontFaceCSS (CSS generation)

import assert from "node:assert";
import { describe, it } from "node:test";
import { generateFontFaceCSS } from "../src/core/layout/layoutHtml.js";
import type { ContainerNode, ElementNode, TextNode } from "../src/core/model/nodes.js";
import { NODE_TYPE } from "../src/core/model/nodes.js";
import type { FontFamily } from "../src/core/model/types.js";
import { validateThemeFonts } from "../src/core/rendering/themeValidator.js";
import { validateFontVariants } from "../src/utils/font.js";
import { mockTextStyle, mockTheme } from "./mocks.js";

describe("validateThemeFonts", () => {
  describe("font format requirement", () => {
    it("accepts .woff paths", () => {
      const theme = mockTheme();
      assert.doesNotThrow(() => validateThemeFonts(theme));
    });

    it("accepts .woff2 paths", () => {
      const theme = mockTheme();
      const family = {
        name: "Inter",
        regular: { path: "/fake/inter-400.woff2", weight: 400 },
        bold: { path: "/fake/inter-700.woff2", weight: 700 },
      };
      theme.fonts = [family];
      for (const styleName of Object.keys(theme.textStyles)) {
        theme.textStyles[styleName] = { ...theme.textStyles[styleName], fontFamily: family };
      }
      assert.doesNotThrow(() => validateThemeFonts(theme));
    });

    it("accepts .ttf paths", () => {
      const theme = mockTheme();
      const family = {
        name: "Inter",
        regular: { path: "/fake/inter-400.ttf", weight: 400 },
      };
      theme.fonts = [family];
      for (const styleName of Object.keys(theme.textStyles)) {
        theme.textStyles[styleName] = { ...theme.textStyles[styleName], fontFamily: family };
      }
      assert.doesNotThrow(() => validateThemeFonts(theme));
    });

    it("accepts .otf paths", () => {
      const theme = mockTheme();
      const family = {
        name: "Inter",
        regular: { path: "/fake/inter-400.otf", weight: 400 },
      };
      theme.fonts = [family];
      for (const styleName of Object.keys(theme.textStyles)) {
        theme.textStyles[styleName] = { ...theme.textStyles[styleName], fontFamily: family };
      }
      assert.doesNotThrow(() => validateThemeFonts(theme));
    });

    it("throws for unsupported format (.svg)", () => {
      const theme = mockTheme();
      theme.fonts = [{ name: "Bad Font", regular: { path: "/fake/font.svg", weight: 400 } }];
      assert.throws(() => validateThemeFonts(theme), /unsupported format.*Supported:/);
    });

    it("throws for unsupported format (.eot)", () => {
      const theme = mockTheme();
      theme.fonts = [{ name: "Bad Font", regular: { path: "/fake/font.eot", weight: 400 } }];
      assert.throws(() => validateThemeFonts(theme), /unsupported format.*Supported:/);
    });

    it("throws for unsupported italic format", () => {
      const theme = mockTheme();
      theme.fonts = [
        {
          name: "Bad Italic",
          regular: { path: "/fake/regular.woff", weight: 400 },
          italic: { path: "/fake/italic.svg", weight: 400 },
        },
      ];
      assert.throws(() => validateThemeFonts(theme), /unsupported format.*Supported:/);
    });
  });

  describe("textStyle validation", () => {
    it("throws when textStyle font is not in theme.fonts", () => {
      const theme = mockTheme();
      const unregisteredFamily = {
        name: "Unregistered Font",
        regular: { path: "/fake/unregistered.woff", weight: 400 },
      };
      theme.textStyles.h1 = { ...theme.textStyles.h1, fontFamily: unregisteredFamily };

      assert.throws(() => validateThemeFonts(theme), /Unregistered Font.*textStyle "h1".*not listed in theme\.fonts/);
    });

    it("does not throw when all textStyle fonts are in theme.fonts", () => {
      const theme = mockTheme();
      assert.doesNotThrow(() => validateThemeFonts(theme));
    });

    it("accepts FontFamily with italic and boldItalic slots", () => {
      const theme = mockTheme();
      const fullFamily = {
        name: "Full",
        regular: { path: "/fake/full-400.woff", weight: 400 },
        italic: { path: "/fake/full-400-italic.woff", weight: 400 },
        bold: { path: "/fake/full-700.woff", weight: 700 },
        boldItalic: { path: "/fake/full-700-italic.woff", weight: 700 },
      };
      theme.fonts = [fullFamily];
      for (const styleName of Object.keys(theme.textStyles)) {
        theme.textStyles[styleName] = { ...theme.textStyles[styleName], fontFamily: fullFamily };
      }
      assert.doesNotThrow(() => validateThemeFonts(theme));
    });
  });

  describe("layout and master token validation", () => {
    it("throws when layout FontFamily token is not in theme.fonts", () => {
      const unregisteredFamily = {
        name: "Unknown Mono",
        regular: { path: "/fake/unknown-mono.woff", weight: 400 },
      };
      const theme = mockTheme({
        layouts: {
          body: {
            variants: {
              default: {
                heading: { fontFamily: unregisteredFamily },
              },
            },
          },
        },
      });

      assert.throws(() => validateThemeFonts(theme), /Unknown Mono.*layout "body".*not listed in theme\.fonts/);
    });

    it("does not throw when layout tokens have no FontFamily values", () => {
      const theme = mockTheme({
        layouts: {
          body: {
            variants: {
              default: {
                color: "#FF0000",
                style: "body",
              },
            },
          },
        },
      });
      assert.doesNotThrow(() => validateThemeFonts(theme));
    });

    it("does not throw when theme has no layouts", () => {
      const theme = mockTheme();
      assert.doesNotThrow(() => validateThemeFonts(theme));
    });
  });
});

describe("generateFontFaceCSS", () => {
  it("produces @font-face rules from theme.fonts", () => {
    const theme = mockTheme();
    const result = generateFontFaceCSS(theme);
    assert.ok(result.css.includes("@font-face"), "should produce @font-face rules");
    assert.ok(result.css.includes("Inter"), "should include Inter font");
  });

  it("returns FontDescriptor array matching theme.fonts", () => {
    const theme = mockTheme();
    const result = generateFontFaceCSS(theme);
    assert.ok(result.fonts.length > 0, "should have font descriptors");
    const names = result.fonts.map((f) => f.name);
    assert.ok(names.includes("Inter"), "should include Inter");
  });

  it("emits correct font-weight values from Font.weight", () => {
    const theme = mockTheme();
    const result = generateFontFaceCSS(theme);
    // mockTheme has regular (weight: 400) and bold (weight: 700)
    assert.ok(result.css.includes("font-weight: 400"), "should emit font-weight: 400 for regular");
    assert.ok(result.css.includes("font-weight: 700"), "should emit font-weight: 700 for bold");
  });

  it("emits font-style: italic for italic slots", () => {
    const theme = mockTheme();
    theme.fonts = [
      {
        name: "Inter",
        regular: { path: "/fake/inter-400.woff", weight: 400 },
        italic: { path: "/fake/inter-400-italic.woff", weight: 400 },
        bold: { path: "/fake/inter-700.woff", weight: 700 },
        boldItalic: { path: "/fake/inter-700-italic.woff", weight: 700 },
      },
    ];
    for (const styleName of Object.keys(theme.textStyles)) {
      theme.textStyles[styleName] = {
        ...theme.textStyles[styleName],
        fontFamily: theme.fonts[0],
      };
    }
    const result = generateFontFaceCSS(theme);
    assert.ok(result.css.includes("font-style: italic"), "should emit font-style: italic for italic slots");
    assert.ok(result.css.includes("font-style: normal"), "should emit font-style: normal for regular slots");
    // boldItalic block should have both font-weight: 700 AND font-style: italic
    const blocks = result.css.split("@font-face");
    const boldItalicBlock = blocks.find((b) => b.includes("inter-700-italic.woff"));
    assert.ok(boldItalicBlock, "should have a boldItalic @font-face block");
    assert.ok(boldItalicBlock!.includes("font-weight: 700"), "boldItalic block should have font-weight: 700");
    assert.ok(boldItalicBlock!.includes("font-style: italic"), "boldItalic block should have font-style: italic");
  });

  it("emits font-weight from Font.weight for light FontFamily", () => {
    const theme = mockTheme();
    const interLight = {
      name: "Inter Light",
      regular: { path: "/fake/inter-300.woff", weight: 300 },
      bold: { path: "/fake/inter-700.woff", weight: 700 },
    };
    theme.fonts = [interLight];
    for (const styleName of Object.keys(theme.textStyles)) {
      theme.textStyles[styleName] = {
        ...theme.textStyles[styleName],
        fontFamily: interLight,
      };
    }
    const result = generateFontFaceCSS(theme);
    assert.ok(result.css.includes("font-weight: 300"), "should emit font-weight: 300 for light regular");
    assert.ok(result.css.includes("font-weight: 700"), "should emit font-weight: 700 for bold");
  });

  it("deduplicates fonts with same path within a family", () => {
    const theme = mockTheme();
    const result = generateFontFaceCSS(theme);
    // mockTheme uses the same mockFontFamily (regular + bold) for all textStyles,
    // so there should be exactly 2 @font-face rules (one per unique weight path),
    // both sharing font-family: 'Inter' with different font-weight values
    const interCount = (result.css.match(/font-family: 'Inter'/g) || []).length;
    assert.strictEqual(interCount, 2, "Inter should have 2 @font-face rules (regular + bold)");
  });

  it("emits separate @font-face rules when families share a font file", () => {
    const theme = mockTheme();
    const sharedBoldPath = "/fake/shared-700.woff";
    const inter = {
      name: "Inter",
      regular: { path: "/fake/inter-400.woff", weight: 400 },
      bold: { path: sharedBoldPath, weight: 700 },
    };
    const interLight = {
      name: "Inter Light",
      regular: { path: "/fake/inter-300.woff", weight: 300 },
      bold: { path: sharedBoldPath, weight: 700 },
    };
    theme.fonts = [inter, interLight];
    for (const styleName of Object.keys(theme.textStyles)) {
      theme.textStyles[styleName] = { ...theme.textStyles[styleName], fontFamily: inter };
    }
    const result = generateFontFaceCSS(theme);
    const interCount = (result.css.match(/font-family: 'Inter'/g) || []).length;
    const lightCount = (result.css.match(/font-family: 'Inter Light'/g) || []).length;
    assert.strictEqual(interCount, 2, "Inter should have 2 rules (regular + bold)");
    assert.strictEqual(lightCount, 2, "Inter Light should have 2 rules (regular + bold) despite shared bold file");
  });

  it("skips fonts with empty path", () => {
    const theme = mockTheme();
    theme.fonts = [...theme.fonts, { name: "System Mono", regular: { path: "", weight: 400 } }];
    const result = generateFontFaceCSS(theme);
    assert.ok(!result.css.includes("System Mono"), "should skip system fonts with empty path");
  });

  it("generates exactly one @font-face rule for regular-only FontFamily", () => {
    const theme = mockTheme();
    // Replace fonts with a single regular-only family
    const mono = { name: "Mono", regular: { path: "/fake/mono-400.woff", weight: 400 } };
    theme.fonts = [mono];
    // Update textStyles to use this family
    for (const styleName of Object.keys(theme.textStyles)) {
      theme.textStyles[styleName] = {
        ...theme.textStyles[styleName],
        fontFamily: mono,
      };
    }
    const result = generateFontFaceCSS(theme);
    const monoCount = (result.css.match(/font-family: 'Mono'/g) || []).length;
    assert.strictEqual(monoCount, 1, "regular-only family should have exactly 1 @font-face rule");
  });

  it("uses family.name for CSS font-family even when font.name is set", () => {
    const theme = mockTheme();
    const interLight = {
      name: "Inter Light",
      regular: { path: "/fake/inter-300.woff", weight: 300 },
      bold: { path: "/fake/inter-700.woff", weight: 700, name: "Inter" },
    };
    theme.fonts = [interLight];
    for (const styleName of Object.keys(theme.textStyles)) {
      theme.textStyles[styleName] = { ...theme.textStyles[styleName], fontFamily: interLight };
    }
    const result = generateFontFaceCSS(theme);
    // CSS @font-face should use family.name ('Inter Light'), not font.name ('Inter')
    assert.ok(!result.css.includes("font-family: 'Inter';"), "should not emit font.name as CSS font-family");
    const lightCount = (result.css.match(/font-family: 'Inter Light'/g) || []).length;
    assert.strictEqual(lightCount, 2, "both rules should use family.name Inter Light");
  });
});

// ============================================
// validateFontVariants() TESTS
// ============================================

const regularOnly: FontFamily = {
  name: "RegularOnly",
  regular: { path: "/fake/regular.woff", weight: 400 },
};

const fullFamily: FontFamily = {
  name: "Full",
  regular: { path: "/fake/regular.woff", weight: 400 },
  italic: { path: "/fake/italic.woff", weight: 400 },
  bold: { path: "/fake/bold.woff", weight: 700 },
  boldItalic: { path: "/fake/bold-italic.woff", weight: 700 },
};

function makeTextNode(content: TextNode["content"], fontFamily: FontFamily): TextNode {
  return {
    type: NODE_TYPE.TEXT,
    content,
    style: "body",
    resolvedStyle: { ...mockTextStyle, fontFamily },
    color: "#000000",
    hAlign: "left",
    vAlign: "top",
    lineHeightMultiplier: 1.0,
    bulletIndentPt: 18,
    linkColor: "#0000FF",
    linkUnderline: true,
  };
}

function wrapInContainer(...children: ElementNode[]): ContainerNode {
  return {
    type: NODE_TYPE.CONTAINER,
    direction: "column",
    children,
    width: 10,
    height: 5,
    gap: 0.25,
    vAlign: "top",
    hAlign: "left",
  };
}

describe("validateFontVariants", () => {
  it("returns empty for tree with no bold/italic runs", () => {
    const tree = makeTextNode("plain text", regularOnly);
    assert.deepStrictEqual(validateFontVariants(tree), []);
  });

  it("returns empty when font has all required slots", () => {
    const tree = makeTextNode(
      [
        { text: "bold", bold: true },
        { text: "italic", italic: true },
      ],
      fullFamily,
    );
    assert.deepStrictEqual(validateFontVariants(tree), []);
  });

  it("detects missing bold variant in TextNode", () => {
    const tree = makeTextNode([{ text: "bold text", bold: true }], regularOnly);
    const violations = validateFontVariants(tree);
    assert.strictEqual(violations.length, 1);
    assert.strictEqual(violations[0].fontName, "RegularOnly");
    assert.strictEqual(violations[0].slot, "bold");
  });

  it("detects missing italic variant in TextNode", () => {
    const tree = makeTextNode([{ text: "italic text", italic: true }], regularOnly);
    const violations = validateFontVariants(tree);
    assert.strictEqual(violations.length, 1);
    assert.strictEqual(violations[0].slot, "italic");
  });

  it("detects missing boldItalic variant", () => {
    const noBoldItalic: FontFamily = {
      name: "NoBoldItalic",
      regular: { path: "/fake/regular.woff", weight: 400 },
      bold: { path: "/fake/bold.woff", weight: 700 },
    };
    const tree = makeTextNode([{ text: "bold italic", bold: true, italic: true }], noBoldItalic);
    const violations = validateFontVariants(tree);
    assert.strictEqual(violations.length, 1);
    assert.strictEqual(violations[0].slot, "boldItalic");
  });

  it("recurses into ContainerNode children", () => {
    const tree = wrapInContainer(
      makeTextNode("plain", fullFamily),
      makeTextNode([{ text: "bold", bold: true }], regularOnly),
    );
    const violations = validateFontVariants(tree);
    assert.strictEqual(violations.length, 1);
    assert.strictEqual(violations[0].slot, "bold");
  });

  it("deduplicates same font+slot across multiple nodes", () => {
    const tree = wrapInContainer(
      makeTextNode([{ text: "bold1", bold: true }], regularOnly),
      makeTextNode([{ text: "bold2", bold: true }], regularOnly),
    );
    const violations = validateFontVariants(tree);
    assert.strictEqual(violations.length, 1, "should deduplicate identical violations");
  });

  it("reports different slots separately", () => {
    const tree = wrapInContainer(
      makeTextNode([{ text: "bold", bold: true }], regularOnly),
      makeTextNode([{ text: "italic", italic: true }], regularOnly),
    );
    const violations = validateFontVariants(tree);
    assert.strictEqual(violations.length, 2);
    const slots = violations.map((v) => v.slot).sort();
    assert.deepStrictEqual(slots, ["bold", "italic"]);
  });

  it("detects violations in TableNode cells", () => {
    const tableNode: ElementNode = {
      type: NODE_TYPE.TABLE,
      rows: [
        [
          {
            content: [{ text: "bold cell", bold: true }],
            color: "#000",
            textStyle: "body",
            resolvedStyle: { ...mockTextStyle, fontFamily: regularOnly },
            hAlign: "left" as const,
            vAlign: "top" as const,
            lineHeightMultiplier: 1.0,
            linkColor: "#0000FF",
            linkUnderline: true,
          },
        ],
      ],
      borderStyle: "full",
      borderColor: "#000",
      borderWidth: 1,
      headerBackground: "#EEE",
      headerBackgroundOpacity: 1,
      cellBackground: "#FFF",
      cellBackgroundOpacity: 1,
      cellPadding: 0.1,
    };
    const violations = validateFontVariants(tableNode);
    assert.strictEqual(violations.length, 1);
    assert.strictEqual(violations[0].fontName, "RegularOnly");
    assert.strictEqual(violations[0].slot, "bold");
  });
});
