# Text Wrapping Discrepancy: Browser vs Slide Apps

Research into why PowerPoint, Keynote, and Google Slides all wrap text at slightly different points than Chromium/Playwright.

## The Problem

"The persistence is the skill." wraps "skill" to a second line in Keynote, Google Slides, AND PowerPoint Online — but fits on one line in Chromium/Playwright's HTML measurement. All three slide apps agree with each other and disagree with the browser. This is an edge case — most text renders fine — but success and failure is in the margins.

## Research Findings

### Does the OOXML spec prescribe text rendering?

**No.** ECMA-376 specifies the *data model* (shape dimensions in EMU, font sizes, insets, kerning thresholds) but does NOT define a normative line-breaking algorithm or text measurement method. Each application brings its own rendering engine. The spec defines *inputs* to layout, not the measurement engine. Line breaks are not stored in the PPTX file — each app re-flows text from scratch.

### What do the three slide apps share?

They do NOT share a rendering engine:
- **PowerPoint**: DirectWrite/GDI on Windows, CoreText on Mac
- **Keynote**: Core Text (Apple's text engine)
- **Google Slides**: Custom layout engine above HarfBuzz/Skia (NOT browser CSS layout)

What they share is **behavioral convergence for OOXML compatibility**:
- PowerPoint established the de facto standard with GDI-style integer-pixel-rounded advance widths
- Keynote matches this for .pptx import/export fidelity
- Google Slides matches this intentionally — it uses HarfBuzz for shaping (same as Chromium) but its own JavaScript layout engine for line breaking, deliberately bypassing browser CSS layout

### Why browsers differ

Chromium accumulates glyph advance widths as **sub-pixel floating-point values** throughout its layout pipeline (LayoutNG). No rounding occurs during accumulation — the line-break decision compares floats. A word that measures 599.3px fits in a 600px container.

Slide apps round each glyph's advance to the **nearest integer pixel** before accumulating. Over ~50 characters at 14pt, this accumulates ~5-15px of error, making text effectively wider → it wraps earlier.

### Key insight about Google Slides and Skia

Google Slides uses the same Skia + HarfBuzz stack as Chromium for *shaping*, but uses a completely separate custom layout engine for *line breaking*. The canvas-based rendering (since 2021) means line breaks are computed in application JavaScript, not by browser CSS reflow. This is architecturally similar to Android's Minikin library — a custom Google layout engine sitting above HarfBuzz.

### What won't work (researched and ruled out)

| Approach | Why it fails |
|----------|-------------|
| `text-rendering: geometricPrecision` | Chromium maps to `optimizeLegibility` for HTML; no effect on advances |
| `font-kerning: none` | Makes Chromium measure text *narrower* (wrong direction) |
| `canvas.measureText()` | Same HarfBuzz pipeline as CSS layout; same sub-pixel result |
| Font embedding in PPTX | Stores rasterized bitmaps, not vector data; doesn't affect measurement |
| Any CSS property | No CSS property forces integer-pixel advance accumulation |
| Chromium flags / DPR | Sub-pixel layout operates in "ideal" space regardless of devicePixelRatio |

---

## All Possible Causes (Enumerated)

### 1. OOXML Default Insets (bodyPr lIns/rIns)
**Status: RULED OUT**

OOXML defaults: lIns=91440 EMU (0.1"), rIns=91440 EMU (0.1"). If applied implicitly, text boxes are 0.2" narrower than assumed.

Confirmed NOT the cause: tycoslide sets `margin: 0` → pptxgenjs writes `lIns="0" rIns="0" tIns="0" bIns="0"` explicitly in XML. Traced through pptxgenjs source: `valToPts(0)` = 0, `genXmlBodyProperties` writes zero values (condition `lIns || lIns === 0` is true for 0).

### 2. Coordinate Conversion Rounding (px → inches → EMU)
**Status: NEEDS TESTING**

The conversion chain: HTML measures in CSS px → tycoslide converts to inches → pptxgenjs converts to EMU (integer). Could lose precision. But the math suggests negligible error: 595.3px / 96 = 6.20104166" × 914400 = 5,669,592 EMU → back to 595.2999px (0.0001px loss). Unlikely to be the cause, but should verify.

### 3. Per-Glyph Integer Pixel Rounding (GDI-style)
**Status: CONFIRMED AS PRIMARY THEORETICAL CAUSE — NEEDS QUANTIFICATION**

PowerPoint rounds each glyph's advance to nearest integer pixel before summing. Chromium accumulates sub-pixel floats. For Inter Light at 14pt (18.67px/em, 2048 UPM): a typical glyph has ~0.1-0.3px rounding error. Over 50 characters: 5-15px cumulative. A line that Chromium measures as 598px might measure as 605px with integer rounding.

### 4. CSS vs Application Layout Engine
**Status: CONFIRMED — NOT DIRECTLY FIXABLE**

Google Slides, Keynote, and PowerPoint all compute line breaks using direct font metric measurement into fixed-geometry text boxes. None of them use browser CSS layout. This is a fundamental architectural difference, not a configuration one.

### 5. OpenType Feature Differences (ligatures, contextual alternates)
**Status: POSSIBLE MINOR FACTOR**

Chromium applies full OpenType features (liga, calt, kern). PowerPoint may skip some — it uses the legacy `kern` table, not GPOS kern features. Inter may have features that make text narrower in Chromium.

### 6. Kerning Table Differences
**Status: POSSIBLE FACTOR FOR INTER SPECIFICALLY**

PowerPoint reads the legacy `kern` table (format 0). Chromium/HarfBuzz reads GPOS. If Inter's kern and GPOS tables differ, measurements diverge. Inter has documented kerning issues in PowerPoint (GitHub issues #603, #796).

### 7. Font Metric Table Selection
**Status: AFFECTS LINE HEIGHT ONLY, NOT WIDTH** — not the cause of horizontal wrapping differences.

### 8. autoFit / normAutofit
**Status: NOT APPLICABLE** — tycoslide uses noAutofit.

### 9. Something Unique to This Text Box
**Status: NEEDS TESTING** — could be specific to this slide's layout dimensions.

---

## Possible Solutions (Ranked)

### A. Fix dimensional mismatch (if found)
If the HTML container is even 1-2px wider than the PPTX text box due to conversion rounding, fixing it eliminates the edge case.

### B. fontkit-based correction factor
Use fontkit to compute `integer_rounded_width / sub_pixel_width` for a representative string at each font size. Apply this ratio as a width multiplier on the HTML measurement container. Principled (based on actual font metrics), not arbitrary. Single Chromium path — the correction is computed once at build time and applied as CSS.

### C. OpenType feature alignment
Disable `liga` and `calt` in the HTML measurement to match what slide apps apply. Low-risk CSS-only change.

### D. Letter-spacing compensation
Configurable `letter-spacing` in `em` applied to HTML measurement.

### E. Custom line-breaking engine
Use fontkit/harfbuzzjs inside Playwright with integer rounding, injecting explicit line breaks. Most accurate but most complex.

---

## NPM Packages for Font Measurement

| Package | WOFF2 | Kerning | Best for |
|---------|-------|---------|----------|
| **fontkit** | Native | Full GPOS | Loading WOFF2, full shaping |
| **opentype.js** | No (needs decompress) | Legacy kern table | Matching PowerPoint's kern behavior |
| **harfbuzzjs** | Via buffer | Full HarfBuzz | Matching Chromium's exact shaping |

## Key References

- [Text Rendering Hates You — Faultlore](https://faultlore.com/blah/text-hates-you/)
- [State of Text Rendering 2024 — Behdad Esfahbod](https://behdad.org/text2024/)
- [Introducing DirectWrite — Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/directwrite/introducing-directwrite)
- [Are line breaks encoded in OOXML? — Lukas Prokop](https://lukas-prokop.at/articles/2024-11-29-are-linebreaks-encoded-in-office-open-xml)
- [LayoutNG — Chromium Projects](https://www.chromium.org/blink/layoutng/)
- [LibreOffice/Collabora Typography](https://numbertext.org/typography/)
- [PowerPoint OpenType kerning — TypeDrawers](https://typedrawers.com/discussion/4771/powerpoint-please-vote-for-opentype-feature-support-eg-kerning)
- [Core Text Programming Guide — Apple](https://developer.apple.com/library/archive/documentation/StringsTextFonts/Conceptual/CoreText_Programming/Introduction/Introduction.html)
- [Google Docs Canvas Rendering — Google Workspace Updates](https://workspaceupdates.googleblog.com/2021/05/Google-Docs-Canvas-Based-Rendering-Update.html)
