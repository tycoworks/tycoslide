# PPTX Measurement Extraction Guide

How to extract exact element measurements from PowerPoint XML for use in tycoslide templates.

## PPTX File Structure

A `.pptx` file is a ZIP archive. Key paths after extraction:

```
ppt/
  presentation.xml        — slide dimensions
  slides/
    slide1.xml            — first slide content
    slide2.xml            — second slide content
  slideLayouts/           — layout definitions (master-level)
  slideMasters/           — master slide definitions
  media/                  — embedded images
  theme/
    theme1.xml            — color scheme, fonts
```

## Extracting Slides

```bash
unzip -o reference.pptx -d /tmp/pptx-extracted
```

## Coordinate System

PPTX uses **EMU (English Metric Units)** for all positions and dimensions.

| Unit | EMU | Pixels (96 dpi) |
|------|-----|-----------------|
| 1 inch | 914400 | 96 |
| 1 cm | 360000 | ~37.8 |
| 1 point | 12700 | ~1.33 |
| 1 pixel (96 dpi) | 9525 | 1 |

**Conversion formulas:**
- EMU to inches: `emu / 914400`
- EMU to pixels: `emu / 9525`
- Inches to pixels: `inches * 96`

### Standard Slide Dimensions

| Format | Width (in) | Height (in) | Width (px) | Height (px) |
|--------|-----------|------------|-----------|------------|
| 16:9 | 10.0 | 5.625 | 960 | 540 |
| 4:3 | 10.0 | 7.5 | 960 | 720 |

tycoslide uses 960x540 for 16:9.

## Reading Element Positions

Each shape on a slide is a `<p:sp>` element (or `<p:pic>` for images, `<p:grpSp>` for groups).

### Position and Size

```xml
<p:sp>
  <p:spPr>
    <a:xfrm>
      <a:off x="457200" y="5080000"/>   <!-- position: top-left corner -->
      <a:ext cx="201168" cy="164592"/>   <!-- size: width × height -->
    </a:xfrm>
  </p:spPr>
</p:sp>
```

- `x`, `y` = top-left corner position in EMU
- `cx`, `cy` = width and height in EMU

Example conversion:
- x = 457200 EMU ÷ 914400 = **0.50 inches** = 48px
- y = 5080000 EMU ÷ 914400 = **5.555 inches** = 533px
- cx = 201168 EMU ÷ 914400 = **0.22 inches** = 21px
- cy = 164592 EMU ÷ 914400 = **0.18 inches** = 17px

### Text Properties

Font size is in hundredths of a point:

```xml
<a:rPr lang="en-US" sz="2800" b="1" dirty="0">
  <a:solidFill>
    <a:srgbClr val="FFFFFF"/>
  </a:solidFill>
  <a:latin typeface="Host Grotesk"/>
</a:rPr>
```

- `sz="2800"` = 28pt (÷ 100)
- `b="1"` = bold
- `i="1"` = italic
- `<a:srgbClr val="FFFFFF"/>` = hex color
- `<a:latin typeface="..."/>` = font family (note: weight variants use different typeface strings, e.g. `"Inter Light"` vs `"Inter"`)

### Paragraph Properties

Paragraph-level properties on `<a:pPr>` control spacing and alignment:

```xml
<a:pPr algn="ctr">
  <a:lnSpc><a:spcPct val="200000"/></a:lnSpc>   <!-- line spacing: 200% -->
  <a:spcBef><a:spcPts val="600"/></a:spcBef>     <!-- space before: 6pt -->
  <a:spcAft><a:spcPts val="0"/></a:spcAft>        <!-- space after: 0pt -->
  <a:buFont typeface="Arial"/>                     <!-- bullet font -->
  <a:buChar char="●"/>                             <!-- bullet character -->
</a:pPr>
```

- `algn` = text alignment: `l` (left), `ctr` (center), `r` (right), `just` (justify)
- `<a:lnSpc>` = line spacing. `<a:spcPct val="200000"/>` = 200% (÷ 100000). `<a:spcPts val="1200"/>` = 12pt (÷ 100).
- `<a:spcBef>` / `<a:spcAft>` = space before/after paragraph in points (÷ 100)
- `<a:buChar char="●"/>` = bullet character (default `•` U+2022, corporate templates often use `●` U+25CF)
- `<a:buFont>` = font for the bullet character (often different from body text)
- `<a:buNone/>` = explicitly no bullet

### Text Box Properties

`<a:bodyPr>` controls the text box container itself:

```xml
<a:bodyPr anchor="ctr" lIns="91440" tIns="45720" rIns="91440" bIns="45720"/>
```

- `anchor` = vertical text alignment within the box: `t` (top), `ctr` (center), `b` (bottom)
- `lIns/tIns/rIns/bIns` = internal margins in EMU (left/top/right/bottom). Default is 91440 EMU (~0.1") for left/right, 45720 EMU (~0.05") for top/bottom. Non-default values affect where text sits within its bounding rectangle.

### Colors

Colors can be specified several ways:

```xml
<!-- Direct hex -->
<a:solidFill><a:srgbClr val="C0B2E3"/></a:solidFill>

<!-- Theme color reference -->
<a:solidFill><a:schemeClr val="accent1"/></a:solidFill>

<!-- Theme color with transform -->
<a:solidFill>
  <a:schemeClr val="bg1">
    <a:alpha val="50000"/>  <!-- 50% opacity -->
  </a:schemeClr>
</a:solidFill>
```

To resolve theme colors, check `ppt/theme/theme1.xml` for the `<a:clrScheme>`:

```xml
<a:clrScheme name="Custom">
  <a:dk1><a:srgbClr val="1B1535"/></a:dk1>
  <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
  <a:accent1><a:srgbClr val="7B61FF"/></a:accent1>
  <!-- etc -->
</a:clrScheme>
```

### Images

```xml
<p:pic>
  <p:blipFill>
    <a:blip r:embed="rId2"/>  <!-- reference to media file -->
  </p:blipFill>
  <p:spPr>
    <a:xfrm>
      <a:off x="457200" y="5080000"/>
      <a:ext cx="201168" cy="164592"/>
    </a:xfrm>
  </p:spPr>
</p:pic>
```

Resolve `r:embed="rId2"` via the slide's `.rels` file:
`ppt/slides/_rels/slide1.xml.rels`

```xml
<Relationship Id="rId2" Type="...image" Target="../media/image1.png"/>
```

### Backgrounds

Slide backgrounds can be:

```xml
<!-- Solid fill -->
<p:bg>
  <p:bgPr>
    <a:solidFill><a:srgbClr val="1B1535"/></a:solidFill>
  </p:bgPr>
</p:bg>

<!-- Image fill -->
<p:bg>
  <p:bgPr>
    <a:blipFill>
      <a:blip r:embed="rId3"/>
      <a:stretch><a:fillRect/></a:stretch>
    </a:blipFill>
  </p:bgPr>
</p:bg>
```

## Building the Manifest

For each element on the slide, extract:

| Field | Source | Example |
|-------|--------|---------|
| Name | User/visual identification | "Logo", "Title", "Copyright" |
| Type | XML element | `p:sp`, `p:pic`, `p:grpSp` |
| Source | Inheritance level | master, layout, slide |
| Role | Chrome or content | chrome, content |
| X (inches) | `a:off x` ÷ 914400 | 0.50 |
| Y (inches) | `a:off y` ÷ 914400 | 5.29 |
| W (inches) | `a:ext cx` ÷ 914400 | 0.22 |
| H (inches) | `a:ext cy` ÷ 914400 | 0.18 |
| X (px) | X × 96 | 48 |
| Y (px) | Y × 96 | 508 |
| W (px) | W × 96 | 21 |
| H (px) | H × 96 | 17 |
| Font | `a:latin typeface` | Host Grotesk, Inter Light |
| Font size | `a:rPr sz` ÷ 100 | 28pt |
| Bold | `a:rPr b="1"` | yes/no |
| Color | `a:srgbClr val` | #FFFFFF |
| Anchor | `a:bodyPr anchor` | t, ctr, b |
| Align | `a:pPr algn` | l, ctr, r |
| Line spacing | `a:lnSpc a:spcPct val` ÷ 100000 | 200% |
| Space before | `a:spcBef a:spcPts val` ÷ 100 | 6pt |
| Bullet char | `a:buChar char` | ● (U+25CF) |
| Box insets | `a:bodyPr lIns/tIns/rIns/bIns` | non-default only |
| Notes | Anything unusual | "rotated 90°", "grouped" |

## Inheritance Resolution

PPTX elements inherit properties through a three-level chain: **slide → slideLayout → slideMaster**. If a property is not specified at one level, check the next.

### Lookup chain

1. Check the slide XML (`ppt/slides/slideN.xml`)
2. If not found, check the layout XML (`ppt/slideLayouts/slideLayoutN.xml`) — find which layout via the slide's `.rels` file
3. If not found, check the master XML (`ppt/slideMasters/slideMaster1.xml`) — find which master via the layout's `.rels` file

### What inherits

| Property | Common inheritance pattern |
|----------|---------------------------|
| Font family | Often set on master or layout placeholders, overridden on slide |
| Font size | Usually set on layout placeholders |
| Colors | Mix — scheme colors on master, overrides on slide |
| Position/size | Usually set on layout placeholders, rarely overridden |
| Background | Cascades: slide → layout → master |
| Bullets | Often set on layout placeholders |

### Placeholder inheritance

Placeholders (`<p:ph type="title" idx="0"/>`) are the primary inheritance mechanism. A slide placeholder with `idx="0"` inherits from the layout placeholder with the same `idx`, which inherits from the master. Match by `idx` attribute, not by element name.

## Strokes and Borders

Shape outlines are defined with `<a:ln>` inside `<p:spPr>`:

```xml
<p:spPr>
  <a:ln w="28575">
    <a:solidFill><a:srgbClr val="7F4EFF"/></a:solidFill>
  </a:ln>
</p:spPr>
```

- `w` = stroke width in EMU. Common values: `9525` (0.75pt/1px hairline), `12700` (1pt), `28575` (2.25pt)
- Convert: `w / 12700` = points, or `w / 9525` = pixels
- `<a:noFill/>` inside `<a:ln>` = no visible border
- No `<a:ln>` element = no border (or inherited)

## Corner Radius

Rounded rectangles use `<a:prstGeom prst="roundRect">` with an adjustment list:

```xml
<a:prstGeom prst="roundRect">
  <a:avLst>
    <a:gd name="adj" fmla="val 16667"/>
  </a:avLst>
</a:prstGeom>
```

- `adj` value is in 1/100000ths of the shorter side. `16667` = 16.667% of the shorter dimension.
- To get radius in inches: `adj / 100000 * min(width, height)` where width/height are in inches.
- Default `roundRect` with no `<a:avLst>` uses `adj = 16667`.
- Regular rectangles use `prst="rect"` and have no radius.

## Shape Fills

Shape background fills are on `<p:spPr>`:

```xml
<p:spPr>
  <a:solidFill><a:srgbClr val="BDB0E0"/></a:solidFill>
</p:spPr>
```

- `<a:solidFill>` with `<a:srgbClr>` = solid hex color
- `<a:solidFill>` with `<a:schemeClr>` = theme color reference (resolve via theme1.xml)
- `<a:noFill/>` = transparent
- No fill element = inherited or transparent

## Shadows

Drop shadows use `<a:outerShdw>` inside `<a:effectLst>`:

```xml
<p:spPr>
  <a:effectLst>
    <a:outerShdw blurRad="50800" dist="38100" dir="5400000" algn="t" rotWithShape="0">
      <a:srgbClr val="000000"><a:alpha val="40000"/></a:srgbClr>
    </a:outerShdw>
  </a:effectLst>
</p:spPr>
```

- `blurRad` = blur radius in EMU (`50800` = 4pt)
- `dist` = shadow offset distance in EMU (`38100` = 3pt)
- `dir` = shadow direction in 60000ths of a degree (`5400000` = 90° = straight down)
- `<a:alpha val="40000"/>` = 40% opacity
- No `<a:effectLst>` = no shadow

## Quick Reference: Common Gotchas

- **EMU are huge numbers.** `457200` looks wrong but is just 0.5 inches.
- **Font sizes are ×100.** `sz="2800"` is 28pt, not 2800pt.
- **Theme colors need resolution.** `schemeClr val="accent1"` is not a hex — look it up in theme1.xml.
- **Slide vs layout vs master.** Elements may be defined in the slide XML, or inherited from the slide layout or master. Check all three if an element is visible but not in the slide XML.
- **Grouped shapes.** `<p:grpSp>` contains child shapes with positions relative to the group's transform. Apply the group offset.
