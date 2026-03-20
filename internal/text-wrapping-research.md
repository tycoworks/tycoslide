# Text Wrapping Discrepancy: Browser vs Slide Apps

Research into why PowerPoint, Keynote, and Google Slides all wrap text at slightly different points than Chromium/Playwright.

## The Problem

"The persistence is the skill." wraps "skill" to a second line in Keynote, Google Slides, AND PowerPoint Online — but fits on one line in Chromium/Playwright's HTML measurement. All three slide apps agree with each other and disagree with the browser. This is an edge case — most text renders fine — but success and failure is in the margins.

## Research Findings

### Does the OOXML spec prescribe text rendering?

**No.** ECMA-376 specifies the *data model* (shape dimensions in EMU, font sizes, insets, kerning thresholds) but does NOT define a normative line-breaking algorithm or text measurement method. Each application brings its own rendering engine. The spec defines *inputs* to layout, not the measurement engine. Line breaks are not stored in the PPTX file — each app re-flows text from scratch.

Font sizes are stored in hundredths of a point (`sz="1200"` = 12pt). `fontScale` and `lnSpcReduction` in `<a:normAutofit>` are OUTPUTS of PowerPoint's engine, not inputs — they record what PowerPoint computed, not what it should compute.

### What do the three slide apps share?

They do NOT share a rendering engine:
- **PowerPoint**: DirectWrite/GDI on Windows, CoreText on Mac
- **Keynote**: Core Text (Apple's text engine)
- **Google Slides**: Custom layout engine above HarfBuzz/Skia (NOT browser CSS layout)

What they share is **behavioral convergence for OOXML compatibility**:
- PowerPoint established the de facto standard with GDI-style integer-pixel-rounded advance widths
- Keynote matches this for .pptx import/export fidelity
- Google Slides matches this intentionally — it uses HarfBuzz for shaping (same as Chromium) but its own JavaScript layout engine for line breaking, deliberately bypassing browser CSS layout

### PowerPoint's Text Stack: DirectWrite in GDI_CLASSIC Mode

PowerPoint uses Microsoft's **DirectWrite** text API in **`DWRITE_MEASURING_MODE_GDI_CLASSIC`** mode. DirectWrite has three measuring modes:

| Mode | Behavior | Used by |
|------|----------|---------|
| `DWRITE_MEASURING_MODE_NATURAL` | Sub-pixel fractional advances | Modern browsers, WPF |
| `DWRITE_MEASURING_MODE_GDI_CLASSIC` | Integer pixel-aligned advances (GDI-compatible) | **PowerPoint**, Office apps |
| `DWRITE_MEASURING_MODE_GDI_NATURAL` | Hybrid: natural widths, GDI-compatible rendering | Some Windows apps |

GDI_CLASSIC gives DirectWrite's rendering quality but GDI-compatible integer-pixel advance widths. The key API is `GetGdiCompatibleGlyphAdvances()` which returns `INT32*` — described in Microsoft docs as "pixel-aligned advances."

Microsoft documentation explicitly states: "GDI applies pixel snapping to letters, where letters are snapped to whole pixels."

### GDI API Evidence for Integer Advances

The legacy GDI APIs that PowerPoint's behavior is compatible with all return integer types:

| API | Return type | Notes |
|-----|-------------|-------|
| `GetCharABCWidths()` | `int` / `UINT` fields | No floating-point fields |
| `GLYPHMETRICS.gmCellIncX` | `short` (16-bit integer) | Horizontal advance |
| `ScriptPlace()` (Uniscribe) | `int* piAdvance` | Integer array |
| `GetGdiCompatibleGlyphAdvances()` | `INT32*` | DirectWrite's GDI-compat API |

Microsoft docs: "Device units are always rounded to the nearest pixel."

### Why browsers differ

Chromium accumulates glyph advance widths as **sub-pixel floating-point values** throughout its layout pipeline (LayoutNG). No rounding occurs during accumulation — the line-break decision compares floats. A word that measures 599.3px fits in a 600px container.

Slide apps round each glyph's advance to the **nearest integer pixel** before accumulating. Over ~50 characters at 14pt, this accumulates ~5-15px of error, making text effectively wider → it wraps earlier.

Chromium uses HarfBuzz + Skia with sub-pixel (fractional) advance positioning. PowerPoint uses DirectWrite GDI_CLASSIC with integer pixel-aligned advances. Even identical fonts produce different advances at the sub-pixel level. Different contrast/gamma values between Skia and DirectWrite compound this.

### TrueType Hinting and Rounding Direction

The base formula for converting design-space advances to device pixels rounds to nearest integer. However, TrueType fonts contain **hinting bytecode programs** that override this default. The font's own bytecode sets advances to specific integers using instructions like RTG (Round To Grid), RUTG (Round Up To Grid), RDTG (Round Down To Grid).

Per rastertragedy.com: "At 15pt, 19 out of 26 advance widths happen to round UP." This means hinting predominantly widens glyphs for common Latin fonts at typical presentation sizes (12-24pt).

### Key insight about Google Slides and Skia

Google Slides uses the same Skia + HarfBuzz stack as Chromium for *shaping*, but uses a completely separate custom layout engine for *line breaking*. The canvas-based rendering (since 2021) means line breaks are computed in application JavaScript, not by browser CSS reflow. This is architecturally similar to Android's Minikin library — a custom Google layout engine sitting above HarfBuzz.

### Community Evidence

The exact cross-renderer text fitting problem is **unsolved across the entire PPTX ecosystem**:

| Project | Evidence |
|---------|----------|
| python-pptx | "Auto-fit behavior is performed by the rendering engine" — has `fit_text()` for font-size shrinking but explicitly cannot predict line breaks |
| PptxGenJS | Multiple open issues about text overflow (#544, #779, #316) — no line prediction |
| LibreOffice | Bug #136231: Wrong line breaks even with metrically identical fonts |
| node-canvas | Issue #331: 2-4px divergence on a 7-character string between renderers |

### What won't work (researched and ruled out)

| Approach | Why it fails |
|----------|-------------|
| `text-rendering: geometricPrecision` | Chromium maps to `optimizeLegibility` for HTML; no effect on advances |
| `font-kerning: none` | Makes Chromium measure text *narrower* (wrong direction) |
| `canvas.measureText()` | Same HarfBuzz pipeline as CSS layout; same sub-pixel result |
| Font embedding in PPTX | Stores rasterized bitmaps, not vector data; doesn't affect measurement |
| Any CSS property | No CSS property forces integer-pixel advance accumulation |
| Chromium flags / DPR | Sub-pixel layout operates in "ideal" space regardless of devicePixelRatio |
| `--font-render-hinting=none` | Linux-only Chromium flag, dead end |
| Letter-spacing adjustment | Fundamentally flawed — uniform shift doesn't match per-glyph rounding |
| `maxWidth: 98.62%` | Ratio-based shrink, arbitrary, breaks multi-line text |
| `maxWidth: calc(100% - Npx)` | Per-text-node delta — shrinks container uniformly, breaks multi-line |

---

## All Possible Causes (Enumerated)

### 1. OOXML Default Insets (bodyPr lIns/rIns)
**Status: RULED OUT**

OOXML defaults: lIns=91440 EMU (0.1"), rIns=91440 EMU (0.1"). If applied implicitly, text boxes are 0.2" narrower than assumed.

Confirmed NOT the cause: tycoslide sets `margin: 0` → pptxgenjs writes `lIns="0" rIns="0" tIns="0" bIns="0"` explicitly in XML. Traced through pptxgenjs source: `valToPts(0)` = 0, `genXmlBodyProperties` writes zero values (condition `lIns || lIns === 0` is true for 0).

### 2. Coordinate Conversion Rounding (px → inches → EMU)
**Status: RULED OUT (negligible)**

The conversion chain: HTML measures in CSS px → tycoslide converts to inches → pptxgenjs converts to EMU (integer). The math shows negligible error: 595.3px / 96 = 6.20104166" × 914400 = 5,669,592 EMU → back to 595.2999px (0.0001px loss). Not the cause.

### 3. Per-Glyph Integer Pixel Rounding (GDI-style)
**Status: CONFIRMED — PRIMARY CAUSE**

PowerPoint rounds each glyph's advance to nearest integer pixel before summing. Chromium accumulates sub-pixel floats. For Inter Light at 14pt (18.67px/em, 2048 UPM): a typical glyph has ~0.1-0.3px rounding error. Over 50 characters: 5-15px cumulative. A line that Chromium measures as 598px might measure as 605px with integer rounding.

Experimentally validated: fontkit + Math.ceil per-glyph advances predicts PowerPoint's 4-line wrapping for the 3x test text at 864px container width, where Chromium renders 3 lines. Math.ceil is a conservative approximation of GDI hinting behavior (see "Experimental Validation" section below).

### 4. CSS vs Application Layout Engine
**Status: CONFIRMED — NOT DIRECTLY FIXABLE**

Google Slides, Keynote, and PowerPoint all compute line breaks using direct font metric measurement into fixed-geometry text boxes. None of them use browser CSS layout. This is a fundamental architectural difference, not a configuration one.

### 5. OpenType Feature Differences (ligatures, contextual alternates)
**Status: MITIGATED**

Chromium applies full OpenType features (liga, calt, kern). PowerPoint may skip some — it uses the legacy `kern` table, not GPOS kern features. tycoslide now disables ligatures in measurement HTML CSS to align with slide app behavior.

### 6. Kerning Table Differences
**Status: POSSIBLE FACTOR FOR INTER SPECIFICALLY**

PowerPoint reads the legacy `kern` table (format 0). Chromium/HarfBuzz reads GPOS. If Inter's kern and GPOS tables differ, measurements diverge. Inter has documented kerning issues in PowerPoint (GitHub issues #603, #796).

### 7. Font Metric Table Selection
**Status: AFFECTS LINE HEIGHT ONLY, NOT WIDTH** — not the cause of horizontal wrapping differences.

### 8. autoFit / normAutofit
**Status: NOT APPLICABLE** — tycoslide uses noAutofit.

---

## Experimental Validation

### Test Case

```
"You mentioned applications earlier — let's talk about what those need." The persistence is the skill.
```

Repeated 3x, rendered at 14pt Inter Light in an 864px container:
- **Chromium**: 3 lines
- **PowerPoint**: 4 lines
- **fontkit + Math.ceil prediction**: 4 lines (MATCH with PowerPoint)

### Rounding Model Comparison (7 models tested at 864px)

| Model | Result | Match? |
|-------|--------|--------|
| Sub-pixel (no rounding) | 4 lines 3x, 1 line 1x | Partial |
| Math.round | 3 lines 3x, 1 line 1x | WRONG |
| **Math.ceil** | **4 lines 3x, 2 lines 1x** | **MATCH** |
| Math.floor | Too narrow | WRONG |

Math.round actually makes text NARROWER (sub-pixel 2592.93px → round 2584px). Math.ceil makes text wider (2592.93px → ceil 2748px), matching slide app behavior.

### Why Math.ceil Works (Approximately)

Math.ceil is a conservative overestimate that happens to match GDI hinting behavior for most Latin glyphs at presentation sizes. TrueType hinting bytecode predominantly rounds advances UP for common fonts at 12-24pt. However, Math.ceil is an **approximation**, not an exact replica — GDI runs actual TrueType bytecode that can round up, down, or to nearest per glyph.

### Limitation of fontkit

fontkit reads design-space metrics and scales them linearly. It does NOT execute TrueType hinting bytecode programs. This means:
- fontkit gives unhinted advance widths (fractional floats)
- We apply Math.ceil as a proxy for hinting
- The real GDI pipeline executes font bytecode to determine rounding direction per glyph
- Math.ceil will be wrong for glyphs whose hinting rounds DOWN (a minority, but they exist)

---

## The Correct Solution: FreeType

### Why FreeType

FreeType is the open-source TrueType rasterizer used by Linux, Android, ChromeOS, and many other platforms. Critically, it **executes actual TrueType hinting bytecode** — the same mechanism that GDI and DirectWrite GDI_CLASSIC use to determine integer-rounded glyph advances.

Where fontkit reads unhinted design-space metrics and we approximate with Math.ceil, FreeType runs the font's own hinting programs and returns grid-fitted integer advances. This is the faithful reproduction of the GDI pipeline.

### Node.js Binding: `freetype2`

The `freetype2` npm package (v2.1.0, by Eric Freese) is a native C++ addon wrapping the FreeType C library.

**Key API:**

```typescript
import { NewMemoryFace, NewFace } from 'freetype2';

// Load font
const face = NewMemoryFace(buffer);  // or NewFace(filepath)

// Set size: fontSizePt * 64 (26.6 fixed-point), at 96 DPI
face.setCharSize(0, fontSizePt * 64, 96, 96);

// Load glyph WITH hinting (default — noHinting is false)
const glyph = face.loadChar(charCode);

// Hinted advance width in pixels (integer for hinted glyphs)
const advancePx = glyph.metrics.horiAdvance / 64;
```

FreeType uses 26.6 fixed-point format: values are in 1/64 pixel units. Divide by 64 for pixel values. For hinted glyphs, `horiAdvance` will be a multiple of 64 (i.e., an integer number of pixels).

### How This Replaces Math.ceil

In `buildCharAdvances()` (fontMetrics.ts), replace:

```typescript
// Current: fontkit + Math.ceil approximation
advancePx: Math.ceil(shaped.positions[i].xAdvance * scale * PX_PER_PT)
```

With:

```typescript
// Correct: FreeType hinted advances
const glyph = face.loadChar(charCode);
advancePx: glyph.metrics.horiAdvance / 64  // already integer-rounded by hinting
```

### Additional Capabilities

FreeType also exposes kerning (`getKerning`), font properties, and glyph rendering — though for our use case, hinted advance widths are the critical feature.

---

## Solution Architecture: Two-Pass Post-Measurement Validation

### Approach

Rather than applying a correction to all text (which breaks multi-line), use a surgical two-pass approach:

1. **Pass 1**: Playwright measures normally (accurate Chromium positions for all nodes)
2. **Pass 2**: For each text node, compare Chromium's line count (derived from measured height) against FreeType's predicted line count at the measured container width
3. **Only intervene on mismatches**: Use binary search to find minimal `maxWidth` shrink that makes Chromium match, applied only to the specific mismatching element
4. **Re-measure**: After corrections, re-extract all measurements (siblings may have shifted)

### Why This Works

- No correction needed for most text (prediction matches → no change)
- Corrections are per-element, not per-container (doesn't break multi-line)
- Binary search finds the minimal intervention
- At most 2 Playwright round-trips (initial + correction)

### Implementation Status

- Phase 0 (validate assumption): COMPLETE — Math.ceil predicts correctly for test case
- Phase 1 (cleanup): COMPLETE — removed broken calc(100%-Npx), kept infrastructure
- Phase 2 (validateTextWrapping in measurement.ts): PARKED — italic font registration fixed the primary edge case
- Missing font validation: COMPLETE — `MissingFontError` throws at compile time when bold/italic used on fonts without those slots; overridable with `--force`
- FreeType binary search: PARKED — engineering investment not justified by current risk level (see "Updated Recommendation" below)

---

## NPM Packages for Font Measurement

| Package | WOFF2 | Hinting | Best for |
|---------|-------|---------|----------|
| **fontkit** | Native | No (unhinted metrics only) | Loading WOFF2, design-space metrics |
| **freetype2** | Via buffer | **Yes (executes bytecode)** | **Faithful GDI-compatible advances** |
| **opentype.js** | No (needs decompress) | No | Legacy kern table reading |
| **harfbuzzjs** | Via buffer | No | Matching Chromium's exact shaping |

## Key References

### Microsoft Documentation
- [DirectWrite Measuring Modes](https://learn.microsoft.com/en-us/windows/win32/api/dcommon/ne-dcommon-dwrite_measuring_mode) — NATURAL vs GDI_CLASSIC vs GDI_NATURAL
- [GetGdiCompatibleGlyphAdvances](https://learn.microsoft.com/en-us/windows/win32/api/dwrite_1/nf-dwrite_1-idwritefontface1-getgdicompatibleglyphadvances) — INT32 pixel-aligned advances
- [Introducing DirectWrite](https://learn.microsoft.com/en-us/windows/win32/directwrite/introducing-directwrite) — sub-pixel positioning vs GDI compatibility
- [GDI Device vs Design Units](https://learn.microsoft.com/en-us/windows/win32/gdi/device-vs--design-units) — "rounded to nearest pixel"
- [IE11 Natural Metrics](https://learn.microsoft.com/en-us/archive/blogs/asiatech/web-page-layout-broken-issue-due-to-natural-metrics-in-ie11) — concrete px example of GDI vs Natural

### Text Rendering Research
- [Text Rendering Hates You — Faultlore](https://faultlore.com/blah/text-hates-you/)
- [State of Text Rendering 2024 — Behdad Esfahbod](https://behdad.org/text2024/)
- [TrueType Rasterization Challenges — rastertragedy.com](http://rastertragedy.com/RTRCh4.htm) — "19/26 round up"
- [Text layout is a loose hierarchy — Raph Levien](https://raphlinus.github.io/text/2020/10/26/text-layout.html)
- [Mozilla Bug 1722963](https://bugzilla.mozilla.org/show_bug.cgi?id=1722963) — GDI Classic wider than Chrome

### OOXML and Slide Apps
- [Are line breaks encoded in OOXML? — Lukas Prokop](https://lukas-prokop.at/articles/2024-11-29-are-linebreaks-encoded-in-office-open-xml)
- [LayoutNG — Chromium Projects](https://www.chromium.org/blink/layoutng/)
- [LibreOffice/Collabora Typography](https://numbertext.org/typography/)
- [PowerPoint OpenType kerning — TypeDrawers](https://typedrawers.com/discussion/4771/powerpoint-please-vote-for-opentype-feature-support-eg-kerning)
- [Google Docs Canvas Rendering — Google Workspace Updates](https://workspaceupdates.googleblog.com/2021/05/Google-Docs-Canvas-Based-Rendering-Update.html)

### Platform Text APIs
- [Core Text Programming Guide — Apple](https://developer.apple.com/library/archive/documentation/StringsTextFonts/Conceptual/CoreText_Programming/Introduction/Introduction.html)
- [Introducing DirectWrite — Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/directwrite/introducing-directwrite)

---

## Italic Font Registration Fix (March 2025)

### What happened

The FontFamily redesign (commit `e5c255d`) added proper italic/boldItalic font slots. This fixed the text wrapping edge case in the showcase — the test text now wraps identically in Chromium and PowerPoint.

### Root cause analysis

The old FontFamily model had weight slots (light/normal/bold) but **no italic slots**. This meant:

- **HTML measurement**: No italic `@font-face` rules existed. When CSS `font-style: italic` was applied, Chromium used **synthetic italic** (visual shear transform, identical advance widths to regular).
- **PPTX output**: `italic: true` was set on text runs, but italic font files weren't bundled. However, pptxgenjs does not embed fonts in the PPTX — it references fonts by name, and PowerPoint resolves them from system fonts at open time. If the user has Inter installed (common — it's one of the most popular Google Fonts), PowerPoint found the **real italic** Inter Light from the system and used its wider advance widths.

The wrapping mismatch was caused by **real vs synthetic italic advance widths**: PowerPoint used the real italic font (wider advances) while Chromium used synthetic italic (regular advances). Real italic Inter Light has redesigned letterforms that are genuinely wider than regular — this is not a shear transform but a completely different set of glyph outlines.

After registering real italic fonts:
- **HTML**: Italic `@font-face` rules now exist → Chromium uses the **real italic font file** → same wider advances as PowerPoint
- **PPTX**: Both engines now use the same real italic font → identical advance widths → identical wrapping

**Why bold was broken differently:** Bold had its own bug in the old model. The per-font `name` field meant the PPTX builder emitted font names like "Inter Bold" rather than "Inter" as the `fontFace`. PowerPoint couldn't resolve this name, so bold text rendered in a completely different substitution font. Italic worked correctly in PPTX because there was no italic slot — the code just used the family name ("Inter Light") with `italic: true`, which PowerPoint could resolve.

### Key insight: root cause fix for this case, residual GDI risk remains

The italic registration fix addressed the actual root cause of this specific wrapping mismatch (real vs synthetic italic). GDI integer-pixel rounding is a separate, real phenomenon (validated in Phase 0 with fontkit + Math.ceil), but it was not the primary driver of this test case. The GDI rounding produces small per-glyph differences that are less likely to cross wrapping boundaries on their own.

---

## Synthetic Italic: Not a Text Wrapping Risk

### Finding: synthetic italic does NOT change advance widths

Research across all major rendering systems confirms that synthetic italic (faux oblique) is **purely a visual shear transform** that does not modify glyph advance widths. The layout engine sees the same horizontal metrics as the regular (upright) variant.

| System | Mechanism | Shear Angle | Advances Changed? |
|--------|-----------|-------------|-------------------|
| FreeType `FT_GlyphSlot_Oblique` | Shear matrix on outline | 12° | **No** (source: "we don't touch the advance width") |
| Chromium/Skia `setSkewX` | Shear at draw time | ~14° | **No** (metrics "do not account for text skew") |
| CSS `font-synthesis: auto` | Browser oblique synthesis | 14° default | **No** (rendering-only transform) |
| PowerPoint/DirectWrite | OS-level GDI synthetic italic | ~20° | **No** (metrics unchanged) |

**Sources:**
- FreeType ftsynth.c: explicit "don't touch advance" comment
- Skia SkFont::getWidths() docs: advances returned "as if drawn through identity matrix"
- FreeType mailing list: "The advance width doesn't change if you slant a glyph. This is intentional behavior."

### Implication for tycoslide

When a font lacks an italic variant (e.g., Fira Code) and synthetic italic kicks in:
- Both Chromium and PowerPoint use the **regular advance widths** for line breaking
- The visual shear (slant) differs in angle (14° vs 20°) but this is cosmetic only
- **Line breaks will be identical** to non-italic text — the synthetic italic is invisible to the layout engine

Therefore: synthetic italic is NOT a text wrapping risk factor. The FreeType binary search solution does not need to account for synthetic italic separately. Measure with regular advance widths and the result matches what both engines produce.

The one visual caveat: sheared glyphs protrude slightly beyond their advance boundary (top-right corner). This is the "italic correction" problem (addressed in TeX with `/` kerning), but it only affects visual collision between adjacent italic and upright runs — not where line breaks occur.

---

## Synthetic Bold: A Real Text Wrapping Risk

### Finding: synthetic bold behavior diverges across engines

Unlike synthetic italic (which uniformly preserves advance widths), synthetic bold (faux bold / algorithmic emboldening) **changes glyph advance widths in some engines but not others**. This creates a cross-engine wrapping mismatch when a font lacks a real bold variant.

| Engine | Platform | Advances Modified? | Method |
|--------|----------|-------------------|--------|
| Chromium/Skia (FreeType path) | Linux/Android | **No** | Calls `FT_Outline_Embolden` directly (not `FT_GlyphSlot_Embolden`), intentionally skips advance update |
| Chromium/Skia (CoreText path) | macOS | **No** | Stroke/fill rendering, advance from `CTFontGetAdvancesForGlyphs` unchanged |
| Chromium/Skia (DirectWrite path) | Windows | **No** | Uses Skia's own stroke-based fake bold, not `DWRITE_FONT_SIMULATIONS_BOLD` |
| PowerPoint/DirectWrite | Windows | **Yes** | `DWRITE_FONT_SIMULATIONS_BOLD` applies a "widening algorithm", advance widths explicitly increased |
| FreeType `FT_GlyphSlot_Embolden` | Standalone | **Yes** | Adds `units_per_EM × y_scale / 24` to `horiAdvance` (except monospace fonts) |

**Sources:**
- Skia SkFont reference: "Does not scale the advance or bounds by fake bold"
- FreeType ftsynth.c: `slot->metrics.horiAdvance += xstr` in `FT_GlyphSlot_Embolden`
- Microsoft Learn DWRITE_FONT_SIMULATIONS: "increases weight by applying a widening algorithm"
- Mozilla bug 624310: documents that DirectWrite synthetic bold widens advances; HarfBuzz had to compensate
- Mozilla bug 1587094: confirms Chrome and DirectWrite produce different advance widths for synthetic bold

### Why this differs from synthetic italic

Synthetic italic is a pure **shear transform** — glyphs are skewed but their horizontal extent is unchanged. The advance width is mathematically invariant under horizontal shear.

Synthetic bold must **thicken strokes** by expanding outlines outward in all directions. This physically widens glyphs. The question is whether the rendering engine reports this extra width in the advance metrics:
- **Chromium/Skia**: Intentionally does not — the emboldened glyph overflows its advance box silently
- **DirectWrite (PowerPoint)**: Reports wider advances via the shaping API — text is measurably wider

### The FreeType angle

FreeType has two emboldening APIs with different advance behavior:
- `FT_Outline_Embolden`: Modifies outline points only, does **not** touch advance metrics. This is what Chromium/Skia calls.
- `FT_GlyphSlot_Embolden`: Calls `FT_Outline_Embolden` internally, then **additionally** widens `horiAdvance` by `~fontSize/24`. This is the higher-level API.

The widening formula (`units_per_EM × y_scale / 24`) is proportional to font size: ~1px at 24px, ~2px at 48px. This may approximate DirectWrite's proprietary widening algorithm, but the exact match is unknown. A FreeType-based prediction of PowerPoint's synthetic bold wrapping would catch some cases but not guarantee pixel-perfect agreement.

### Implication for tycoslide

When a font lacks a real bold variant and synthetic bold is used:
- **Chromium** (HTML measurement): advance widths unchanged — text same width as non-bold
- **PowerPoint**: advance widths increased — text measurably wider, may wrap earlier

This is a **real wrapping risk**, unlike synthetic italic. The mitigation is to require real bold font files for any font used with `**bold**` markdown. See "Recommended approach" below.

---

## PowerPoint Autofit: Ruled Out

### What autofit does

PowerPoint's `<a:normAutofit>` (shrink text on overflow) shrinks font size when text overflows a text box. OOXML properties:

- `fontScale`: percentage multiplier (100000 = 100%) applied uniformly to all runs
- `lnSpcReduction`: percentage subtracted from line spacing
- Shrink sequence: reduce line spacing first (up to ~20%), then reduce font size in whole-point steps

pptxgenjs supports this via `fit: 'shrink'` (emits `<a:normAutofit/>` with no attributes).

### Why it doesn't work for tycoslide

1. **Inconsistent font sizes**: Some slides render at 14pt, others at 13pt or 12pt because autofit kicked in. This is visible and distracting.
2. **Multi-line reflow problem**: If a wrapping mismatch adds one extra line, autofit shrinks ALL text in the box (not just the overflowing line). A paragraph that was perfect at 14pt now renders at 13pt because a sibling paragraph overflowed.
3. **Not a true safety net**: Autofit records what PowerPoint computed — the `fontScale` in the XML is an OUTPUT, not an INPUT. Other renderers (Google Slides, LibreOffice) may or may not recalculate it.
4. **Contradicts deterministic layout**: tycoslide measures precisely in Chromium. Autofit means "trust PowerPoint to fix it" — the opposite of the design philosophy.
5. **Already ruled out**: tycoslide uses `noAutofit` (lIns=0, rIns=0, no autofit child element).

**Sources:**
- Microsoft Learn: NormalAutoFit Class
- python-pptx analysis: "fontScale and lnSpcReduction are outputs, not inputs"
- pptxgenjs issues #779, #330: autofit behavior limitations

---

## Updated Recommendation (March 2025)

### Status: wrapping risk is manageable with real font files

The italic font registration fix addressed the root cause of the showcase wrapping mismatch (real vs synthetic italic). The remaining risks fall into two categories:

**Synthetic font risks (preventable):**
- **Synthetic bold**: Chromium and PowerPoint diverge on advance widths — real wrapping risk. Preventable by requiring real bold font files.
- **Synthetic italic**: No wrapping risk (advances unchanged across all engines). Visual quality degrades but line breaks are identical.

**GDI integer rounding (residual):**
- GDI_CLASSIC integer-pixel rounding vs Chromium sub-pixel accumulation is a real phenomenon (validated in Phase 0)
- Per-glyph differences are small — unlikely to cross wrapping boundaries for most text
- When both engines use identical real font files, the GDI rounding is the only discrepancy source
- A FreeType-based prediction (using `FT_GlyphSlot_Embolden`'s `~fontSize/24` formula) could approximate PowerPoint's behavior for some additional cases, but would not guarantee pixel-perfect agreement since DirectWrite's exact algorithm is proprietary

### Recommended approach

1. **Require real font files** ✅: `MissingFontError` throws at compile time when markdown uses `**bold**`, `*italic*`, or `***boldItalic***` on a font that lacks the corresponding slot. Overridable with `-f` (force).
2. **Accept synthetic italic fallback**: When force-compiled, synthetic italic has no wrapping impact (advances unchanged). Synthetic bold is the real risk.
3. **Keep optional slots in FontFamily**: The type system keeps italic/bold/boldItalic optional. The compile-time check is in the markdown → node pipeline, not the type definition.
4. **Park FreeType prediction**: Could catch some GDI rounding edge cases in future, but engineering investment not justified by current risk level. The `~fontSize/24` widening formula is a starting point if revisited.
5. **Reject autofit**: Contradicts deterministic layout, introduces visual inconsistency.

---

## CSS Half-Leading Gap (March 2025)

### The problem

CSS `line-height` adds symmetric padding (half-leading) above and below text glyphs. PowerPoint, Keynote, and Google Slides place glyphs using font metrics directly — no half-leading. This causes a visible ~1px gap below text in HTML previews that is not present in PPTX output. The gap is proportional to `(line-height - 1) * fontSize / 2`.

### Investigation

**`text-box-trim` / `text-box` shorthand**: CSS has a property designed to eliminate half-leading. Chrome 133+ supports the `text-box` shorthand (`text-box: trim-both cap text`). Tested and confirmed working — dramatically reduces text box heights to match slide-tool rendering.

**Browser support quirk**: Chrome 145 (Playwright's bundled Chromium) supports the `text-box` shorthand but NOT the `text-box-trim` longhand. `CSS.supports('text-box-trim', 'both')` returns false; `CSS.supports('text-box', 'trim-both cap alphabetic')` returns true.

**`text-box-edge` values**:
- `cap alphabetic`: Trims to baseline — cuts off descenders (too aggressive)
- `cap text`: Preserves descender space — correct visual result

### Why we can't use it

The same HTML serves both measurement (Playwright extracts bounding boxes) and preview. `text-box-trim` changes the element's measured bounding box — it is defined in the W3C spec as a **layout operation**, not a visual one (CSSWG issue #8829). This means:

- **With `text-box-trim`**: HTML preview looks correct (matches slide tools), but measurements shrink → PPTX text boxes are too small → PowerPoint text overflows
- **Without `text-box-trim`**: PPTX looks correct (Chrome's half-leading roughly matches PowerPoint's internal text spacing), but HTML preview has the ~1px gap

### Alternatives exhaustively ruled out

| Technique | Changes visual? | Changes measured box? | Usable? |
|---|---|---|---|
| `text-box: trim-both cap text` | Yes | Yes | No — breaks PPTX |
| `ascent-override` / `descent-override` | Only with `line-height: normal` | Only with `line-height: normal` | No — we use fixed `line-height` |
| `line-gap-override: 0%` | No-op for Inter | No-op for Inter | N/A — Inter has 0 line gap |
| Capsize (negative margins) | Yes | Yes — box shrinks | No — same as text-box-trim |
| `transform: translateY()` | Shifts whole element | No | Shifts, doesn't trim |
| `clip-path` / `overflow: hidden` | Clips ink | No | Clips, doesn't close gap |
| `leading-trim` | Renamed to text-box-trim | Same | Same behavior |

### Conclusion

The ~1px HTML gap is an accepted known limitation. CSS has no mechanism to eliminate half-leading without also changing the element's measured bounding box. Decoupling measurement CSS from preview CSS would work but adds architectural complexity for a minor cosmetic improvement. The PPTX output (the primary deliverable) renders correctly.
