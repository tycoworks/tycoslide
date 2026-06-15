# Extract Theme from PPTX

Bootstrap a complete tycoslide theme from a reference PowerPoint deck. This mode derives the shared foundations (palette, type scale, spacing, chrome) from the full deck before defining individual templates.

**Why foundations first:** A theme's palette, type scale, and chrome are shared across all templates. Defining them per-slide leads to inconsistencies — the same color mapped to different palette roles, font sizes that don't align with the TEXT_STYLE ladder. Extract the foundations from the full corpus, then templates fall into place.

**Two artifacts, two phases.** Extraction produces two markdown files in the theme's `reference/` directory:
- **`manifest.md`** — Raw catalog of every slide with exact measurements. No interpretation. This is the permanent record of what the PPTX contains.
- **`foundations.md`** — Synthesized analysis: palette, type scale, spatial constants, chrome, layout families. This is the designer's intent, backed out from the raw data. It drives implementation.

The manifest is Phase 1. The foundations are Phase 2. Both are committed to the theme repo (the PPTX/PDF source files are gitignored as proprietary binaries).

## Before You Start

1. **Read the reference guide.** Open `references/pptx-extraction.md` in this skill directory for PPTX XML format, coordinate systems, property extraction, and inheritance resolution.

2. **Get the reference PPTX.** The user provides a `.pptx` file. Unzip it per the reference guide (§ "Extracting Slides").

3. **Catalog everything.** Do not ask for a representative sample. Extract ALL slides — the manifest must be complete. Deduplication happens in Phase 2, not Phase 1. Use the layout-first strategy described below to make this efficient.

## Phase 1: Catalog

Extract measurements from every slide in the sample. Build one flat manifest covering the entire deck.

### Step 1: Map the deck structure

Before measuring individual elements, confirm dimensions and understand the deck's organization:

1. **Read slide dimensions.** Check `ppt/presentation.xml` for `<p:sldSz cx="..." cy="..."/>` and convert to inches. Standard 16:9 is 10.0 x 5.625". All margin calculations depend on this.

2. **Read slide-to-layout mappings.** For each slide, check its `.rels` file to find which slideLayout it uses:
   ```bash
   for f in /tmp/pptx-extracted/ppt/slides/_rels/*.rels; do
     slide=$(basename "$f" .xml.rels)
     layout=$(grep -o 'slideLayout[0-9]*' "$f")
     echo "$slide → $layout"
   done
   ```

3. **Read layout-to-master mappings.** For each slideLayout, find its slideMaster:
   ```bash
   for f in /tmp/pptx-extracted/ppt/slideLayouts/_rels/*.rels; do
     layout=$(basename "$f" .xml.rels)
     master=$(grep -o 'slideMaster[0-9]*' "$f")
     echo "$layout → $master"
   done
   ```

4. **Build the deck map.** Present it to the user:
   ```
   slideMaster1
   ├── slideLayout1 ("Title") → slides 1
   ├── slideLayout2 ("Agenda Dark") → slides 2, 5
   ├── slideLayout3 ("Agenda Light") → slides 3
   ├── slideLayout4 ("Body Dark") → slides 4, 7, 9, 12
   ├── slideLayout5 ("Body Light") → slides 6, 8, 10, 11
   └── slideLayout6 ("End") → slides 13
   ```

   Layout names come from the `<p:cSld name="...">` attribute in each slideLayout XML.

5. **Identify distinct templates.** Each slideLayout is a candidate template. Slides sharing a layout differ only in content. The user confirms which layouts to implement.

### Step 2: Extract per-slide manifests

Read XML directly — no script needed. The AI reads each file with the Read tool and extracts measurements by hand, using the reference guide for XML paths and conversions.

**Layout-first strategy:** Most 50-75 slide decks use 8-15 unique layouts. Read exhaustively in this order:
1. **Master** (1 file) — establishes palette, fonts, defaults
2. **All unique layouts** (8-15 files) — these ARE the templates; most properties live here
3. **All slides** — to capture per-slide content and overrides

For each slide, extract every element into the manifest table format defined in [pptx-extraction.md](references/pptx-extraction.md) § "Building the Manifest". Record:

- **Slide index and layout** — which slide and which slideLayout it uses
- **Element source** — master, layout, or slide (determines chrome vs content)
- **All properties** — per the manifest table in [pptx-extraction.md](references/pptx-extraction.md) § "Building the Manifest"

Also extract each slide's **background** (solid color hex or image reference).

**Inheritance resolution:** If an element is visible on a slide but not in its XML, check the layout XML, then the master XML. See [pptx-extraction.md](references/pptx-extraction.md) § "Inheritance Resolution" for the lookup chain.

**Batching strategy:** For slides sharing a layout, extract ONE slide in full detail and spot-check 1-2 others for overrides. Most per-slide variation is text replacement, not structural difference.

### Step 3: Read the theme color scheme (for reference only)

Extract the PPTX color scheme so you can resolve `schemeClr` references:

```bash
grep -A 20 'clrScheme' /tmp/pptx-extracted/ppt/theme/theme1.xml
```

Record the named colors (dk1, lt1, dk2, lt2, accent1-6). The ONLY purpose of this step is to know what hex value a `schemeClr val="dk1"` reference resolves to. Do NOT use the scheme to assign palette roles — that happens in Phase 2a based on what's actually on the slides.

### Step 4: Write manifest.md

Combine all extracted data into `reference/manifest.md` in the theme directory. Structure:

1. **Header sections** — color scheme, fonts, font sizes, deck map, chrome summary
2. **Per-slide manifests** — one section per slide with element tables and text content previews

This is the raw record. Do not interpret or deduplicate — that happens in Phase 2.

Present the manifest to the user and ask:
- Are any elements decorative-only?
- Anything surprising in the measurements?

## Phase 2: Derive Foundations

Analyze the full manifest to extract shared theme properties. Write the results to `reference/foundations.md` in the theme directory. This document captures the designer's intent — palette roles, type scale rationale, spatial constants, chrome spec, and layout family deduplication.

Each subsection below produces one section of foundations.md AND one theme file.

### 2a. Color Palette

**Goal:** Map every color in the catalog to a `Palette` role, and determine whether the deck has one or two palettes.

1. **Collect all unique hex colors.** For each, record how it is used:
   - As text color (on `<a:rPr>`)
   - As shape/background fill (on `<a:spPr>` or `<p:bg>`)
   - As border/stroke
   - On which slides (by index)

2. **Detect light vs dark contexts.** Compute relative luminance for each slide's background color:
   ```
   L = 0.2126 * R + 0.7152 * G + 0.0722 * B
   ```
   (Linearize sRGB values first: `v = v/255; v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)^2.4`)

   - `L > 0.5` → light-context slide
   - `L <= 0.5` → dark-context slide

   If only one context exists, the theme has one palette. If both exist, it has two.

3. **Group colors by context.** For each context (light slides, dark slides), collect all colors used and map to Palette roles:

   | Role | How to identify |
   |------|-----------------|
   | `text.heading` | Most common text color at large sizes (≥20pt). On light slides: typically darkest text. On dark slides: typically white. |
   | `text.body` | Most common text color at body sizes (12-18pt). Often same as heading. |
   | `text.secondary` | Second-most common text color. Lower contrast than body — used for subtitles, metadata. |
   | `text.subtle` | Third-most common, or the color on ≤10pt text (footers, captions). |
   | `brand.primary` | The chromatic accent color. High saturation (>30%), used sparingly for emphasis — accent bars, links, eyebrow text, numbering. Check PPTX `accent1` as a strong signal. |
   | `brand.soft` | Same hue family as primary (within 30° on color wheel) but lower saturation or higher lightness. |
   | `fill.background` | Most common slide background color for this context. |
   | `fill.surface` | A fill slightly different from background — cards, panels, alternating rows. Light context: slightly darker than white. Dark context: slightly lighter than the dark bg. |
   | `fill.emphasis` | The opposite-context background color. Light slides: the dark bg. Dark slides: white or light bg. |
   | `fill.divider` | Border/stroke color. Low saturation, between background and text. |
   | `fill.shadow` | Typically heading color (light context) or black (dark context). |
   | `accents[]` | Remaining chromatic colors (saturation >15%) used as fills or emphasis. `brand.primary` is first. Order by frequency. |

4. **Resolve `schemeClr` references.** Some text runs use `schemeClr val="dk1"` instead of a direct hex. Use the color scheme from Phase 1 Step 3 to convert these to hex values, then count them alongside direct hex values. The scheme is a lookup table, not a source of palette roles — frequency on actual slides determines the role assignment.

   **Composited fills.** Shapes often use a hex color with an `<a:alpha>` opacity (e.g., `#BDB0E0` at 20%). For palette values, pre-composite against the background: blend the color at the given opacity onto the slide's background color to get the effective hex.

5. **Present the proposed palettes to the user.** Show a table with role, hex, and evidence. Automated heuristics will get some roles wrong — the user confirms.

**Output:** `brand.ts` with light (and dark if detected) `Palette` objects.

### 2b. Font Families

1. **Collect all unique `<a:latin typeface="...">` values** from the catalog.
2. **Group by family.** Font names with weight suffixes are variants of the same family: `"Inter"` and `"Inter Light"` → one family with regular and light weights.
3. **Classify usage:**
   - Heading font: used at ≥20pt sizes
   - Body font: used at 10-18pt sizes (often a lighter weight of the heading font)
   - Code font: monospace (if present); default to Fira Code if none found
4. **Check for embedded fonts.** Look in `ppt/fonts/` for `.fntdata` files — many corporate decks embed their fonts. If present, these can be extracted directly.
5. **Ask the user** for font file paths or `@fontsource` package names.

**Output:** `fonts.ts` with `FontFamily` definitions.

### 2c. Type Scale

**Map sizes to visual roles first, then to TEXT_STYLE slots.** Do NOT just sort sizes descending and assign — that ignores which layouts use which sizes.

1. **Collect all unique font sizes** from the manifest. For each size, record:
   - Which **layout(s)** use it (by layout name, e.g. "TITLE", "SECTION_HEADER", "TITLE_AND_BODY")
   - Which **placeholder type** (`ctrTitle`, `title`, `body`, `sldNum`, or freeform shape)
   - Whether it comes from the **master default**, a **layout override**, or a **slide override**

   Master defaults are fallbacks — layouts and slides frequently override them upward. A master title default of 28pt does NOT mean H1=28pt if the cover layout overrides it to 40pt.

2. **Assign visual roles.** Look at WHERE each size appears, not just its magnitude:

   | Visual role | How to identify | TEXT_STYLE slot |
   |-------------|-----------------|-----------------|
   | Cover title | `ctrTitle` placeholder on the TITLE/cover layout | H1 |
   | Section header | `title` placeholder on SECTION_HEADER layouts | H2 |
   | Content title | `title` placeholder on standard content layouts (TITLE_AND_BODY, TWO_COLUMNS, etc.) — often the master default | H3 |
   | Subtitle / card title | Smaller heading text on content slides, often a different font weight | H4 |
   | Body text | `body` placeholder default on content layouts | BODY |
   | Hero stat | Large numbers on BIG_NUMBER/stat layouts (often 50-100pt) | QUOTE (or template override) |
   | Caption | Small text for labels, metadata (typically 8pt) | CAPTION |
   | Footer | Copyright, page numbers (typically 6-7pt) | FOOTER |
   | Code | Monospace font (if present) | CODE |

3. **Cross-check against the manifest.** Read back through the per-layout sections in manifest.md. Verify that each TEXT_STYLE slot matches the size actually rendered on that layout type. The manifest has the ground truth.

4. **When sizes outnumber slots:** Extra sizes are template-specific overrides. The template uses the closest TEXT_STYLE and overrides `style` in its tokens.

5. **When sizes are fewer than slots:** Interpolate missing values. A deck using only 32pt, 16pt, 10pt, 8pt maps to H1=32, H2=24, H3=20, H4=16, BODY=16, CAPTION=10, FOOTER=8.

5. **Line height conversion:** PPTX `spcPct` (e.g., `200000` = 200%) uses a "normal" baseline that varies by font. tycoslide uses CSS `lineHeight` semantics. For an approximate conversion, divide by the font's normal ratio (~1.2 for most sans-serif fonts): `pptxPct / 100000 / 1.2`. Flag that the first build will likely need line-height tuning.

**Output:** The `textStyles` map in the format file.

### 2d. Spatial Constants

1. **Derive the unit base.** Collect all margin, padding, and spacing values from the catalog. Find the largest integer that most values are multiples of. Common bases: 2, 3, 4, 6, 8.

2. **Extract Format fields:**
   - `spacing.base` — most common gap between major content sections
   - `spacing.tight` — most common gap within components (eyebrow-to-title, card internals)
   - `padding` — internal padding on cards, code blocks, tables (from `lIns/rIns` on text boxes with background fills)
   - `radius` — corner radius from rounded rectangles (from `<a:prstGeom prst="roundRect">` adjustment values)

3. **Strokes:** Collect border widths from shapes. Sort and assign to `{ hairline, thin, base, thick }`.

4. **Shadow:** If shapes have `<a:outerShdw>`, extract blur, offset, angle, and opacity.

**Output:** The `Format` object in the format file.

### 2e. Chrome Detection

1. **Collect all elements defined at the master or layout level** (not slide level) from the catalog.
2. **Group by slideLayout.** Elements on a layout are chrome for all slides using that layout.
3. **Find global chrome.** Elements that appear on every layout (or nearly every layout) from the same master — typically a footer row with logo, copyright, and page number.
4. **Find layout-specific chrome.** Elements on specific layouts only — like a background image on dark slides or a top color bar.

5. **Record chrome measurements** — margin values, footer band position/height, footer element positions, logo media reference. These become the inputs for chrome wrapper implementation in Phase 4 (via [add-template.md](add-template.md) Phase 2 Step 2).

**Output:** `chrome.ts` with wrapper functions and token interfaces.

## Phase 3: Build Theme Files

With all foundations derived and confirmed by the user, write the theme package:

```
theme-{name}/
  src/
    brand.ts           ← Phase 2a (ALL colors live here)
    fonts.ts           ← Phase 2b
    assets.ts          ← logos/images extracted from ppt/media/
    chrome.ts          ← Phase 2e
    layouts.ts         ← standard set + any custom layouts
    formats/
      presentation.ts  ← Phase 2c (textStyles) + Phase 2d (spatial) + templates
    index.ts           ← defineTheme() + TEMPLATE const + component list
  assets/              ← extracted media files
  examples/
    test-{name}.md     ← test deck
  package.json
  tsconfig.json
```

### File construction order

1. **`brand.ts`** — Light and dark palettes. Every hex color in the theme traces back to this file.
2. **`fonts.ts`** — Font family definitions with file paths.
3. **`assets.ts`** — Asset catalog. Copy logo/background images from `ppt/media/` into `assets/`.
4. **`chrome.ts`** — Chrome wrappers from Phase 2e. Import palette-agnostic token interfaces.
5. **`layouts.ts`** — Start with standard layouts (`body`, `title`, `cover`, `section`, etc.). Add custom layouts only for genuinely novel spatial structures.
6. **`formats/presentation.ts`** — The `Format` object, `deriveTokens(brand, config)` call, chrome token builders, and all `defineTemplate()` calls. Wrap everything in a builder function: `export function buildPresentationFormat(brand: Brand): ThemeFormat`.
7. **`index.ts`** — `TEMPLATE` const, component list, `defineTheme()` call.

### `deriveTokens` usage

`deriveTokens(brand, config)` returns `{ onLight, onDark }` with text tokens, component tokens, surfaces, and primitives for each context. See the `ThemeTokens` type in the SDK for the full shape.

Use `t.onLight.*` for light-background templates, `t.onDark.*` for dark-background templates. The `background` field on `defineTemplate()` determines the visual context.

### Key rules

- **Zero hardcoded hex in format files.** All colors come from `palette.*` or `t.onLight.*`/`t.onDark.*`. Run `grep -n '#[0-9A-Fa-f]' src/formats/*.ts` — zero matches expected.
- **All font sizes map to TEXT_STYLE constants.** If a template needs a size between H3 and H4, use the closest TEXT_STYLE and note the compromise.
- **Spacings use `unit` multiples or `config.spacing.*`.** No magic numbers.

## Phase 4: Add Templates

For each slideLayout identified in Phase 1, add a template. Follow the process in [add-template.md](add-template.md) Phase 2-3:

1. Classify the layout type ([add-template.md](add-template.md) Phase 2 "Classify the Layout Type")
2. Write the structure summary ([add-template.md](add-template.md) Phase 2 "Write the Structure Summary")
3. Implement the template definition ([add-template.md](add-template.md) Phase 3)

The manifest data from Phase 1 replaces add-template's Phase 1 — measurements are already extracted.

## Phase 5: Verify

### Full-deck build

```bash
node <cli-path>/dist/index.js build examples/test-{name}.md --preview
```

Open every slide's HTML preview. Compare side-by-side with the reference PDF/PPTX.

### Position comparison

For critical templates, unzip the generated PPTX and compare EMU values against the reference. See [add-template.md](add-template.md) Phase 4 Step 2 for the comparison table format.

### Color and text property audits

See [add-template.md](add-template.md) Phase 4 Steps 3-4 for the color audit (`grep` for hardcoded hex) and text property audit (bullet chars, line spacing, font variants).

## Common Mistakes

- **Skipping the deck map** — Jumping straight to element extraction without understanding slide-to-layout relationships leads to duplicate chrome definitions and inconsistent palette choices.
- **Hardcoding colors in format files** — Every hex outside `brand.ts` is a maintenance hazard. Dark/light palette symmetry breaks when colors are scattered.
- **Overfitting the type scale** — A deck with 12 distinct font sizes does not need 12 TEXT_STYLE slots. Map to the 9-slot ladder and use template-level overrides for outliers.
- **Building templates before foundations** — The whole point of this mode. Derive palette, type scale, spacing, and chrome FIRST. Templates are the last step.
- **Ignoring line height conversion** — PPTX 200% line spacing ≠ CSS `lineHeight: 2.0`. The normalRatio factor means the first build will need visual tuning. Flag it, don't ignore it.
