# Extract Theme from PPTX

Bootstrap a complete tycoslide theme from a reference PowerPoint deck. This mode derives the shared foundations (palette, type scale, spacing, chrome) from the full deck before defining individual templates.

**Why foundations first:** A theme's palette, type scale, and chrome are shared across all templates. Defining them per-slide leads to inconsistencies — the same color mapped to different palette roles, font sizes that don't align with the TEXT_STYLE ladder. Extract the foundations from the full corpus, then templates fall into place.

## Before You Start

1. **Read the reference guide.** Open `references/pptx-extraction.md` in this skill directory for PPTX XML format, coordinate systems, and property extraction.

2. **Get the reference PPTX.** The user provides a `.pptx` file. Unzip it:
   ```bash
   unzip -o reference.pptx -d /tmp/pptx-extracted
   ```

3. **Ask which slides to catalog.** A 70-slide corporate deck has many duplicates. Ask the user to identify a representative sample (typically 5-15 slides covering all distinct layouts). If unsure, catalog the first 10 slides — they usually cover the major layouts.

## Phase 1: Catalog

Extract measurements from every slide in the sample. Build one flat manifest covering the entire deck.

### Step 1: Map the deck structure

Before measuring individual elements, understand the deck's organization:

1. **Read slide-to-layout mappings.** For each slide, check its `.rels` file to find which slideLayout it uses:
   ```bash
   for f in /tmp/pptx-extracted/ppt/slides/_rels/*.rels; do
     slide=$(basename "$f" .xml.rels)
     layout=$(grep -o 'slideLayout[0-9]*' "$f")
     echo "$slide → $layout"
   done
   ```

2. **Read layout-to-master mappings.** For each slideLayout, find its slideMaster:
   ```bash
   for f in /tmp/pptx-extracted/ppt/slideLayouts/_rels/*.rels; do
     layout=$(basename "$f" .xml.rels)
     master=$(grep -o 'slideMaster[0-9]*' "$f")
     echo "$layout → $master"
   done
   ```

3. **Build the deck map.** Present it to the user:
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

4. **Identify distinct templates.** Each slideLayout is a candidate template. Slides sharing a layout differ only in content. The user confirms which layouts to implement.

### Step 2: Extract per-slide manifests

For each slide in the sample, extract every element into the manifest table format defined in [pptx-extraction.md](references/pptx-extraction.md) § "Building the Manifest". Record:

- **Slide index and layout** — which slide and which slideLayout it uses
- **Element source** — master, layout, or slide (determines chrome vs content)
- **All properties** — position, size, font, color, anchor, alignment, line spacing, bullet char, box insets

Also extract each slide's **background** (solid color hex or image reference).

### Step 3: Read the theme color scheme

Extract the PPTX's built-in color scheme — it provides a starting point for palette construction:

```bash
grep -A 20 'clrScheme' /tmp/pptx-extracted/ppt/theme/theme1.xml
```

Record the named colors (dk1, lt1, dk2, lt2, accent1-6). These map loosely to tycoslide palette roles.

### Step 4: Present the catalog

Show the user the complete catalog: deck map, per-slide manifests, and color scheme. Ask:
- Are any slides missing from the sample?
- Are any elements decorative-only?
- Anything surprising in the measurements?

## Phase 2: Derive Foundations

Analyze the full catalog to extract shared theme properties. Each subsection produces one theme file.

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

4. **Cross-check with PPTX color scheme.** The `clrScheme` in `theme1.xml` often maps directly:
   - `dk1` → `text.heading` (light context) or `fill.emphasis` (dark context)
   - `lt1` → `fill.background` (light context) or `text.heading` (dark context)
   - `accent1` → `brand.primary`

5. **Present the proposed palettes to the user.** Show a table with role, hex, and evidence. Automated heuristics will get some roles wrong — the user confirms.

**Output:** `brand.ts` with light (and dark if detected) `Palette` objects.

### 2b. Font Families

1. **Collect all unique `<a:latin typeface="...">` values** from the catalog.
2. **Group by family.** Font names with weight suffixes are variants of the same family: `"Inter"` and `"Inter Light"` → one family with regular and light weights.
3. **Classify usage:**
   - Heading font: used at ≥20pt sizes
   - Body font: used at 10-18pt sizes (often a lighter weight of the heading font)
   - Code font: monospace (if present); default to Fira Code if none found
4. **Ask the user** for font file paths or `@fontsource` package names.

**Output:** `fonts.ts` with `FontFamily` definitions.

### 2c. Type Scale

1. **Collect all unique `(fontSize, lineHeight)` pairs** from the catalog.
2. **Sort font sizes descending.** Map to the TEXT_STYLE ladder:

   | Slot | How to identify |
   |------|-----------------|
   | QUOTE | Largest text size, used on quote/statement slides |
   | H1 | Largest title text (cover/title slides) |
   | H2 | Second-level headings or section divider titles |
   | H3 | Content slide titles (most common heading size) |
   | H4 | Subheadings, card titles |
   | BODY | Most frequently used paragraph/list size |
   | CAPTION | Small text for labels, metadata |
   | FOOTER | Smallest text (copyright, page numbers, typically 6-8pt) |
   | CODE | Monospace font size (if present) |

3. **When sizes outnumber slots:** Extra sizes are template-specific overrides. The template uses the closest TEXT_STYLE and overrides `style` in its tokens.

4. **When sizes are fewer than slots:** Interpolate missing values. A deck using only 32pt, 16pt, 10pt, 8pt maps to H1=32, H2=24, H3=20, H4=16, BODY=16, CAPTION=10, FOOTER=8.

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

**Map to chrome wrappers.** See [add-template.md](add-template.md) Phase 2 Step 2 for geometric detection heuristics and deduplication checks. Common patterns:
- Footer row (logo + text + page number) → `withFooterChrome()`
- Margin only → `withMarginChrome()`
- Novel patterns → create new wrappers in `chrome.ts` only if used by multiple templates

**Extract chrome token values:**
- `margin` — content area offset from slide edges
- `footerHeight` or `footerWeight` — footer band dimensions
- `bottomPadding` — gap between footer and content
- Footer text content, logo media reference, spacing between footer elements

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

### `deriveTokens` return shape

`deriveTokens(brand, config)` returns `{ onLight, onDark }`. Each context contains:

| Path | Type | Use for |
|------|------|---------|
| `headings.h1` … `headings.h4` | `LabelTokens` | Title/heading text |
| `text` | `TextTokens` | Body paragraphs |
| `list` | `ListTokens` | Bullet/numbered lists |
| `caption` | `TextTokens` | Secondary/muted text |
| `components.table` | `TableTokens` | Table slot injection |
| `components.code` | `CodeTokens` | Code block slot injection |
| `components.card` | `CardTokens` | Card slot injection |
| `components.quote` | `QuoteTokens` | Blockquote slot injection |
| `components.mermaid` | `MermaidTokens` | Diagram slot injection |
| `components.testimonial` | `TestimonialTokens` | Testimonial slot injection |
| `components.image` | `ImageTokens` | Image defaults |
| `surfaces.page` | color | Default slide background |
| `surfaces.elevated` | color | Slightly offset background |
| `surfaces.emphasis` | color | Opposite-context background (dark on light, light on dark) |
| `surfaces.card` | color | Card/panel fill |
| `primitives.accents` | color[] | Accent color pool |
| `primitives.border` | border tokens | Divider lines |
| `primitives.shadow` | shadow tokens | Drop shadows |

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

When converting manifest colors and sizes to tokens, always reference the foundations:
- Colors → `palette.text.heading`, `t.onDark.components.table`, etc.
- Font sizes → `TEXT_STYLE.H3`, `TEXT_STYLE.BODY`, etc.
- Spacing → `spacing`, `spacingTight`, `unit * N`

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
