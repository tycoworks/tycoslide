# Add Template to Existing Theme

Add a single template to a theme that already has `brand.ts`, `fonts.ts`, `chrome.ts`, and format files in place.

**Core principle: measure first, model second, code third.** Never eyeball positions — extract exact measurements from the source format.

## Before You Start

1. **Read the reference guide.** Open `references/pptx-extraction.md` in this skill directory. It covers PPTX XML format, coordinate systems, property extraction, and manifest field definitions.

2. **Identify the theme.** Read existing theme files:
   - `src/index.ts` — template name constants and theme entry point
   - `src/layouts.ts` — existing layout blueprints
   - `src/chrome.ts` — existing chrome wrappers (footer, margin, background)
   - `src/formats/*.ts` — format files where templates are defined with `defineTemplate()`
   - `src/brand.ts` — color palette
   - `src/assets.ts` — asset catalog (logos, backgrounds, icons)

3. **Identify the format.** Templates belong to a format (e.g., `presentation`, `factsheet`). Confirm which format file the new template goes into.

## Phase 1: Extract Measurements

Build a complete manifest of every element on the reference slide with exact positions, dimensions, and text properties.

### From PPTX (preferred — exact measurements)

1. Unzip the PPTX: `unzip -o reference.pptx -d /tmp/pptx-extracted`
2. Find the target slide: `ls /tmp/pptx-extracted/ppt/slides/`
3. **Trace the inheritance chain.** Every slide inherits from a slideLayout, which inherits from a slideMaster:
   - Check `ppt/slides/_rels/slideN.xml.rels` → find the slideLayout reference
   - Check `ppt/slideLayouts/_rels/slideLayoutN.xml.rels` → find the slideMaster reference
   - Read all three XMLs. Elements in the slide override layout; layout overrides master.
   - **Elements from the layout/master are shared chrome.** Elements only in the slide XML are content.
4. **Check which other slides share this layout:**
   ```bash
   grep -l "slideLayoutN.xml" ppt/slides/_rels/*.rels
   ```
5. **Extract all properties** for each element using the reference guide. For every element, capture position, size, and — for text elements — font, color, anchor, alignment, line spacing, bullet character, and box insets. See `references/pptx-extraction.md` for XML paths and conversion formulas.

6. **Build the manifest table.** One row per element. See [pptx-extraction.md](references/pptx-extraction.md) § "Building the Manifest" for the full field list. Example (abbreviated):

```
| Element       | Source | Role    | X (in) | Y (in) | W (in) | H (in) | Font        | Size | Color   | Anchor | Align | Line Sp | Bullet |
|---------------|--------|---------|--------|--------|--------|--------|-------------|------|---------|--------|-------|---------|--------|
| Logo          | layout | chrome  | 0.50   | 5.29   | 0.22   | 0.18   | —           | —    | —       | —      | —     | —       | —      |
| Copyright     | layout | chrome  | 5.09   | 5.33   | 4.11   | 0.10   | Inter Light | 6pt  | #C0B2E4 | top    | left  | —       | —      |
| Page Number   | layout | chrome  | 9.20   | 5.13   | 0.30   | 0.50   | Inter Light | 6pt  | #FFFFFF | center | right | —       | —      |
| Title         | slide  | content | 0.50   | 0.50   | 9.00   | 0.47   | Host Gr.    | 28pt | #FFFFFF | top    | left  | —       | —      |
| Body          | slide  | content | 0.50   | 0.97   | 9.00   | 4.16   | Inter       | 16pt | #FFFFFF | center | left  | 200%    | ●      |
```

### From PDF (approximate — use only when PPTX unavailable)

1. Visually scan the PDF and catalog all visible elements
2. Estimate positions relative to slide dimensions (10" x 5.625" for 16:9)
3. Flag every measurement as approximate — ask the user to confirm critical positions

### Ask the User

After building the manifest, present it and ask:
- Are any elements missing?
- Are any elements decorative-only (not needed in the template)?
- Which elements are chrome (shared across slides) vs content (unique to this template)?

## Phase 2: Classify and Model

Decide how to represent this slide in tycoslide's layout system. Steps are ordered — each constrains the next.

### Step 1: Establish the Margin Envelope

```
Left margin   = min(X) of all elements
Top margin    = min(Y) of all elements
Right margin  = slide width - max(X + W)
Bottom margin = slide height - max(Y + H)
```

| Pattern | Signature | tycoslide primitive |
|---------|-----------|---------------------|
| Uniform | All four margins within 5px | `padding: margin` (single number) |
| Symmetric horizontal | Left ≈ Right, Top ≠ Bottom | `Insets(top, side, bottom, side)` |
| Asymmetric | All four differ | `Insets(top, right, bottom, left)` |
| Zero on one side | One margin is 0 or near-0 | Full-bleed; likely `stack()` or background image |

### Step 2: Identify Chrome Bands

Chrome bands are rows of small elements (logos, copyright, page numbers) at consistent Y positions, outside the main content area.

**Detection:**
- **Footer:** Elements whose `Y + H` is within 20px of the slide bottom. Record top edge, height, and weight (height / slide height, typically 0.04-0.10).
- **Header/top bar:** Elements whose `Y` is within 20px of 0. A colored rectangle spanning full width.
- **Sidebar:** A tall, narrow element pinned to left/right edge.

**Chrome deduplication:** Before creating any chrome wrapper, check:

1. Does `chrome.ts` already have a source comment mentioning this slideLayout?
2. Do other slides share the same slideLayout? If yes, the chrome wrapper already exists.
3. If measurements match an existing wrapper, add the slideLayout to its source comment and reuse.

When creating or updating a chrome wrapper, add a source comment:
```typescript
// Source: slideLayout4 ("Title and body - Dark"), slideLayout5 ("Title and body - Light")
```

| Chrome found | Action |
|--------------|--------|
| Footer row (logo + text + page) | Reuse `withFooterChrome()` with matching tokens |
| Margin only, no footer | Reuse `withMarginChrome()` |
| Full-bleed background image | Reuse `withBackgroundImage()` |
| Top bar + footer | Create new only if used by multiple templates |

### Step 3: Derive the Content Area

Subtract chrome bands and margins from the slide dimensions. Every remaining element's position should fall within this rectangle. If an element falls outside, it is either chrome you missed or a decorative element — flag it.

### Step 4: Detect the Content Structure

Within the content area, determine the dominant arrangement axis.

**Horizontal scan:** Distinct vertical bands of elements?
- Two bands, equal → `row(column(left), column(right))` with equal `SIZE.FILL`
- Two bands, unequal → `row()` with `weight` ratios
- Three+ bands → multi-column or grid

**Vertical scan:** Distinct horizontal bands?
- Title at top + body below → `column()` with header block + content block
- Stats/KPI row + body → `column(row(stats), column(body))`
- Uniform vertical stack → `column()` with `spacing`

**Common structures:**

| Pattern | tycoslide structure |
|---------|---------------------|
| Title + body | `column(header, column(body, vAlign: MIDDLE))` |
| Two-column | `row(column(left), column(right))` |
| Weighted split | `row(weight: N)` children |
| Centered statement | `column(text, vAlign: MIDDLE, hAlign: CENTER)` |
| Full-bleed + overlay | `stack(image, column(text))` |
| Section divider | `column(label, vAlign: MIDDLE, hAlign: CENTER)` |

### Step 5: Determine Alignment and Spacing

For each container:
- **Vertical alignment:** `VALIGN.TOP`, `VALIGN.MIDDLE`, or `VALIGN.BOTTOM`
- **Horizontal alignment:** `HALIGN.LEFT`, `HALIGN.CENTER`, or `HALIGN.RIGHT`
- **Spacing:** Gap between adjacent sibling elements (Y of element 2 minus (Y + H) of element 1). Corporate slides often have tighter spacing between eyebrow and title (8-12px) than between header and body (24-48px).

### Step 6: Classify the Layout Type

Compare your structure to existing layouts in `src/layouts.ts`:

| Structure | Existing layout | Action |
|-----------|----------------|--------|
| Title at top + markdown body | `body` | Reuse with new tokens |
| Centered title + subtitle | `title` | Reuse with new tokens |
| Logo + title + subtitle | `cover` | Reuse with new tokens |
| None of the above | — | New layout needed |

A new layout is justified only when the spatial skeleton is genuinely different — not when styling or tokens differ.

**Positioning approach:**
- **Content layouts** use proportional flex (`SIZE.FILL`, weights, `vAlign`/`hAlign`) — content adapts to variable text
- **Brand compositions** (cover, title card) use `Insets` padding for fixed positions — the position IS the design

### Step 7: Write the Structure Summary

Before implementing, write a one-paragraph summary:

```
Structure: [chrome wrapper] wrapping [layout name].
Margins: [values] ([symmetric/asymmetric]).
Chrome: [footer description] at weight [N].
Content: [structure description] with [vAlign] alignment.
Spacing: [header spacing]px header, [body spacing]px body.
Key feature: [the one thing that defines this slide's spatial character].
```

This is the contract between Phase 2 and Phase 3. If you cannot write it clearly, you have not finished analyzing.

## Phase 3: Implement

### Step 1: Add the template name

In `src/index.ts`, add the template name to the `TEMPLATE` const (kebab-case).

### Step 2: Add a layout (only if needed)

In `src/layouts.ts`: define a token interface, add an ASCII diagram, export the `Layout` object. Layouts define WHERE content goes, not HOW it looks — all visual styling comes from tokens.

### Step 3: Define the template

In the format file:

```typescript
defineTemplate({
  name: TEMPLATE.NEW_TEMPLATE,
  documentation: {
    description: "One sentence describing the slide.",
    whenToUse: "When to choose this template.",
    whenNotToUse: "When another template is better.",
    limits: ["Content constraints."],
  },
  layout: footer(body),
  background: t.onLight.surfaces.page,
  tokens: { /* manifest → tokens */ },
})
```

### Step 4: Convert measurements to tokens

Use the manifest from Phase 1:

- **Margin/padding:** inches × 96 = pixels. Round to nearest `unit` multiple when possible.
- **Font size:** PPTX `sz` ÷ 100 = points. Map to `TEXT_STYLE` constants when possible.
- **Colors:** Use palette values (`palette.*`, `t.onLight.*`, `t.onDark.*`). **Never hardcode hex** — a single chrome wrapper often serves both dark and light variants, and hardcoded colors become invisible on the wrong background. When the same chrome serves dark+light templates, construct separate token sets.
- **Fixed-size chrome:** Elements with known pixel dimensions (logos, page numbers, footer bands) use `SIZE.FIXED` with the pixel value in `weight`. Do not compute proportional ratios.
- **Positions:** Convert to flex layout equivalents. A title at y=0.5" → `vAlign: VALIGN.TOP` with `margin: 48` (0.5" × 96).

### Step 5: Add test content

In `examples/test-*.md`, add a slide using the new template. Use text from the reference PPTX. Do not invent placeholder content.

## Phase 4: Verify

Every property in the manifest should be reproducible in the output.

### Step 1: Build and extract

```bash
node <cli-path>/dist/index.js build examples/test-*.md
unzip -o output.pptx -d /tmp/generated-pptx
```

### Step 2: Position comparison

For each manifest element, compare EMU values between reference and generated PPTX (check both slide and slideLayout XML — chrome elements live on the layout):

```
| Element     |     | X (EMU)   | Y (EMU)   | W (EMU)   | H (EMU)   | Delta |
|-------------|-----|-----------|-----------|-----------|-----------|-------|
| Logo        | ref | 457199    | 4837175   | 197509    | 164592    |       |
|             | gen | 457200    | 4760565   | 457944    | 382935    | W: +132% — FAIL |
```

**Tolerances:** Position (x, y) ±50000 EMU (~5px). Size ±20% for text boxes, ±5% for images/fixed shapes. Any FAIL must be traced to root cause and fixed — do not guess-and-adjust.

### Step 3: Text property audit

For each text element in the manifest, verify the generated PPTX matches:

| Property | What to check |
|----------|---------------|
| Bullet char | `<a:buChar char="●"/>` |
| Line spacing | `<a:spcPct val="200000"/>` |
| Space before | `<a:spcPts val="600"/>` |
| Text anchor | `<a:bodyPr anchor="ctr"/>` |
| Font variant | `<a:latin typeface="Inter Light"/>` |

Missing or wrong text properties are the most common source of "it looks close but not right."

### Step 4: Color audit

```bash
grep -n '#[0-9A-Fa-f]\{3,6\}' src/formats/*.ts
```

Every match is a potential bug:
- Exists in the palette? → Replace with `palette.*`
- In a chrome token shared across dark AND light templates? → **BUG.** Split into separate token sets.
- Genuinely custom and not in the palette? → Acceptable, but document why.

### Step 5: Visual confirmation

After all automated checks pass, open the HTML preview for a final visual sanity check.

## Common Mistakes

- **Creating unnecessary layouts** — Most templates reuse `body` or `title` with different tokens. Only create a layout for a genuinely new spatial skeleton.
- **Duplicating chrome** — If the footer/header matches an existing wrapper, reuse it. Same structure, different tokens.
- **Mixing up chrome vs content** — An element on every slide is chrome, even if it looks like content. Chrome goes on `LAYER.MASTER`. The PPTX inheritance chain tells you directly.
