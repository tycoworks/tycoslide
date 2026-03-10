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
- Phase 2 (validateTextWrapping in measurement.ts): IN PROGRESS
- Next step: Replace fontkit with FreeType in `buildCharAdvances()` for faithful hinting

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
