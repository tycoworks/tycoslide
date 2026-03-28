# Themes

Themes control all visual styling in tycoslide presentations — typography, spacing, colors, layout tokens, master tokens, and slide dimensions. Missing tokens are caught at build time.

## What Themes Control

- **Typography** — Font families, sizes, weights for all text styles
- **Font list** — Explicit list of all font families used by the theme; fonts not listed here are not embedded in the output file
- **Spacing** — Spacing values (inches) set in layout and component token maps
- **Layout tokens** — Visual styling for each layout variant (colors, alignment, component appearance)
- **Masters** — Background color, margins, fixed chrome (footers, slide numbers)
- **Slide size** — 16:9, 4:3, etc.

## Using a Theme

Specify the theme in global frontmatter (the first frontmatter block in a markdown file):

```markdown
---
theme: "@tycoworks/tycoslide-theme"
---

---
layout: title
title: My Presentation
---
```

### Available Themes

**`@tycoworks/tycoslide-theme`** is the currently available theme. Inter font, purple/navy palette, 11 layouts and all built-in components. See [Layouts](./layouts.md) for the full layout reference.

```bash
npm install @tycoworks/tycoslide-theme
```

See the [theme source](../packages/theme-tycoworks/src/theme.ts) for all default values, including bundled icon assets.

---

## Extending an Existing Theme

Start by copying or spreading the tycoworks theme and override what you need. The tycoworks theme is the reference implementation — it defines all required fields and serves as a starting point for any custom brand.

```typescript
import { defineTheme } from '@tycoworks/tycoslide';
import { theme as defaultTheme } from '@tycoworks/tycoslide-theme';

export const theme = defineTheme({
  ...defaultTheme,
  // Override textStyles, spacing, layouts, or masters
});
```

Then reference your package in the presentation frontmatter:

```markdown
---
theme: my-theme
---
```

---

### Overriding Fonts

Replace Inter with a system font or a custom `.woff2` file:

#### System font (no file embedding)

Use system fonts for quick prototyping to skip embedding font files. Use custom `.woff2` files for brand fonts that must render identically everywhere.

```typescript
import { defineTheme } from '@tycoworks/tycoslide';
import type { FontFamily } from '@tycoworks/tycoslide';
import { theme as defaultTheme } from '@tycoworks/tycoslide-theme';

const helvetica: FontFamily = {
  normal: { name: 'Helvetica', path: '' },  // path: '' = system font
  bold:   { name: 'Helvetica', path: '' },
};

export const theme = defineTheme({
  ...defaultTheme,
  textStyles: {
    h1:     { ...defaultTheme.textStyles.h1,     fontFamily: helvetica },
    h2:     { ...defaultTheme.textStyles.h2,     fontFamily: helvetica },
    h3:     { ...defaultTheme.textStyles.h3,     fontFamily: helvetica },
    h4:     { ...defaultTheme.textStyles.h4,     fontFamily: helvetica },
    body:   { ...defaultTheme.textStyles.body,   fontFamily: helvetica },
    small:  { ...defaultTheme.textStyles.small,  fontFamily: helvetica },
    eyebrow:{ ...defaultTheme.textStyles.eyebrow,fontFamily: helvetica },
    footer: { ...defaultTheme.textStyles.footer, fontFamily: helvetica },
  },
});
```

#### Custom font via @fontsource

```typescript
import { createRequire } from 'module';
import type { FontFamily } from '@tycoworks/tycoslide';

const require = createRequire(import.meta.url);

const plusJakarta: FontFamily = {
  light:  { name: 'Plus Jakarta Sans Light',  path: require.resolve('@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-300-normal.woff2') },
  normal: { name: 'Plus Jakarta Sans',        path: require.resolve('@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff2') },
  bold:   { name: 'Plus Jakarta Sans Bold',   path: require.resolve('@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff2') },
};
```

#### Adjusting font sizes only

```typescript
import { defineTheme } from '@tycoworks/tycoslide';
import { theme as defaultTheme } from '@tycoworks/tycoslide-theme';

export const theme = defineTheme({
  ...defaultTheme,
  textStyles: {
    ...defaultTheme.textStyles,
    h1: { ...defaultTheme.textStyles.h1, fontSize: 44 },
    h2: { ...defaultTheme.textStyles.h2, fontSize: 32 },
  },
});
```

---

### Colors

Colors are string constants in the theme file. Layout and master token maps reference these constants, so changing a color constant updates every token that uses it.

See [`theme.ts`](../packages/theme-tycoworks/src/theme.ts) for the complete reference.

---

### Overriding Layout Tokens

Component styling lives in layout token maps in `theme.layouts`. Each layout declares the tokens it needs; the theme supplies values via `.tokenMap()`. Layout tokens control content appearance (text colors, styles, alignment); master tokens control fixed elements (background, margins, footer). `.tokenMap()` validates that all required tokens are present. For layouts without slots, unknown keys are also rejected — typos are caught at theme construction time. Slotted layouts allow extra keys because slot-injected component tokens are passed through the same map.

```typescript
import { bodyLayout } from '@tycoworks/tycoslide-theme';

layouts: {
  body: {
    variants: {
      default: bodyLayout.tokenMap({
        title:   { style: TEXT_STYLE.H3, color: colors.text, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE },
        eyebrow: { style: TEXT_STYLE.EYEBROW, color: colors.primary, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE },
        text:    { style: TEXT_STYLE.BODY, color: colors.text, linkColor: colors.primary, linkUnderline: true, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE, accents: colors.accents },
        list:    { style: TEXT_STYLE.BODY, color: colors.text, linkColor: colors.primary, linkUnderline: true, hAlign: HALIGN.LEFT, vAlign: VALIGN.TOP, accents: colors.accents },
        // slot component tokens (table, code, mermaid, quote, testimonial)
      }),
    },
  },
},
```

Each layout defines which token keys it accepts — the default theme's [`theme.ts`](../packages/theme-tycoworks/src/theme.ts) shows every layout with its full token set and default values.

---

### Optional Tokens

Layouts and components may declare tokens as optional using `token.optional<T>()`. Omitting an optional token suppresses the associated visual feature. For example, the `card.background` token is optional — omitting it removes the card's background shape entirely. The `stat` layout's `surface` token is optional — omitting it suppresses the stat cell background.

Theme authors use `token.optional<T>()` when defining custom components or layouts to allow themes to opt out of a feature without error:

```typescript
import { token } from '@tycoworks/tycoslide';
import type { ShapeTokens } from '@tycoworks/tycoslide';

const tokens = token.shape({
  background: token.optional<ShapeTokens>(),
  padding:    token.required<number>(),
});
```

Required tokens must always be provided in `.tokenMap()`. Optional tokens may be omitted.

---

## Building a Custom Theme

### Theme Structure

A theme is a TypeScript object passed to `defineTheme()`, which validates font configuration at definition time and returns the theme object:

```typescript
import { defineTheme, SLIDE_SIZE } from '@tycoworks/tycoslide';

export const theme = defineTheme({
  slide: SLIDE_SIZE.S16x9,
  fonts: [...],
  textStyles: { h1: {...}, h2: {...}, h3: {...}, h4: {...}, body: {...}, small: {...}, eyebrow: {...}, footer: {...}, code: {...} },
  layouts: {
    body:    { variants: { default: bodyLayout.tokenMap({...}) } },
    title:   { variants: { default: titleLayout.tokenMap({...}) } },
    // ... one entry per layout
  },
});
```

Layouts declare required token keys; themes provide their values. Master tokens are included in layout token maps — each layout carries a `master` token typed to its master's interface.

### Step-by-Step Guide

#### 1. Set Up Files

```bash
mkdir my-theme
cd my-theme
npm init -y
npm install @tycoworks/tycoslide @tycoworks/tycoslide-components
```

Create `theme.ts` for your theme object and `index.ts` as the entry point:

```typescript
// theme.ts
import { defineTheme } from '@tycoworks/tycoslide';

export const theme = defineTheme({
  // Filled in step by step below
});
```

```typescript
// index.ts — see "Registering Layouts in Themes" for the full entry point pattern
export { theme } from './theme.js';
export { components } from './components.js';
export { layouts } from './layouts.js';
export { masters } from './masters.js';
```

#### 2. Define Color Constants

Colors are local constants referenced in layout and master token maps:

```typescript
const colors = {
  background: '#FFFFFF',
  text: '#1A1A1A',
  textMuted: '#666666',
  primary: '#0066CC',
  secondary: '#E0E0E0',
  accents: {
    blue: '#4285F4',
    green: '#34A853',
    red: '#EA4335',
    yellow: '#FBBC05',
  },
};
```

All color values are hex values with a `#` prefix. Accent names are open vocabulary — define whatever names make sense for your brand.

#### 3. Configure Text Styles

Define styles for all required text style names. Each `TextStyle` includes:

```typescript
import { FONT_WEIGHT } from '@tycoworks/tycoslide';

textStyles: {
  h1:      { fontFamily: myFont, fontSize: 48, defaultWeight: FONT_WEIGHT.LIGHT,   lineHeightMultiplier: 1.2, bulletIndentPt: 72 },
  h2:      { fontFamily: myFont, fontSize: 36, defaultWeight: FONT_WEIGHT.LIGHT,   lineHeightMultiplier: 1.2, bulletIndentPt: 54 },
  h3:      { fontFamily: myFont, fontSize: 24, defaultWeight: FONT_WEIGHT.LIGHT,   lineHeightMultiplier: 1.2, bulletIndentPt: 36 },
  h4:      { fontFamily: myFont, fontSize: 16, defaultWeight: FONT_WEIGHT.LIGHT,   lineHeightMultiplier: 1.2, bulletIndentPt: 24 },
  body:    { fontFamily: myFont, fontSize: 14, defaultWeight: FONT_WEIGHT.LIGHT,   lineHeightMultiplier: 1.2, bulletIndentPt: 21 },
  small:   { fontFamily: myFont, fontSize: 12, defaultWeight: FONT_WEIGHT.LIGHT,   lineHeightMultiplier: 1.2, bulletIndentPt: 18 },
  eyebrow: { fontFamily: myFont, fontSize: 11, defaultWeight: FONT_WEIGHT.NORMAL,  lineHeightMultiplier: 1.0, bulletIndentPt: 16.5 },
  footer:  { fontFamily: myFont, fontSize:  8, defaultWeight: FONT_WEIGHT.LIGHT,   lineHeightMultiplier: 1.0, bulletIndentPt: 12 },
  code:    { fontFamily: myMono, fontSize: 11, defaultWeight: FONT_WEIGHT.NORMAL,  lineHeightMultiplier: 1.6, bulletIndentPt: 0 },
}
```

`fontFamily` — a `FontFamily` object (see [Font Requirements](#font-requirements))
`fontSize` — in points
`defaultWeight` — `FONT_WEIGHT.LIGHT`, `FONT_WEIGHT.NORMAL`, or `FONT_WEIGHT.BOLD`
`lineHeightMultiplier` — dimensionless multiplier applied to `fontSize`
`bulletIndentPt` — indent distance for bulleted list items, in points

#### 4. Set Slide Size

```typescript
import { SLIDE_SIZE } from '@tycoworks/tycoslide';

slide: SLIDE_SIZE.S16x9,  // 16:9 aspect ratio (10" × 5.625")
```

**Available presets:**

| Constant | Dimensions |
|----------|-----------|
| `SLIDE_SIZE.S16x9` | 10" × 5.625" |
| `SLIDE_SIZE.S16x10` | 10" × 6.25" |
| `SLIDE_SIZE.S4x3` | 10" × 7.5" |
| `SLIDE_SIZE.WIDE` | 13.33" × 7.5" |

Custom dimensions:

```typescript
slide: { layout: 'CUSTOM', width: 10, height: 7.5 }
```

#### 5. Declare Fonts

Every font the theme uses must appear in the `fonts` array so it gets embedded in the .pptx:

```typescript
fonts: [myFont, myMonoFont],
```

Each entry is a `FontFamily` object (see [Font Requirements](#font-requirements)). Every font used in `textStyles` or layout token maps must appear here — unlisted fonts are not embedded in the .pptx.

#### 6. Define Layouts with Token Maps

Each layout in the theme gets a `variants` object. The `default` variant is required. Call `.tokenMap()` on the layout definition to produce a typed token record. `.tokenMap()` validates that all required tokens are present and rejects unknown keys — slotted layouts allow extra keys for slot injection.

```typescript
import { bodyLayout, titleLayout, sectionLayout } from './layouts.js';
import { HALIGN, VALIGN } from '@tycoworks/tycoslide';
const TEXT_STYLE = { H1: "h1", H2: "h2", H3: "h3", H4: "h4", BODY: "body", SMALL: "small", EYEBROW: "eyebrow", FOOTER: "footer", CODE: "code" } as const;

layouts: {
  title: {
    variants: {
      default: titleLayout.tokenMap({
        title:    { style: TEXT_STYLE.H1, color: colors.background, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE },
        subtitle: { style: TEXT_STYLE.H3, color: colors.background, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE },
      }),
    },
  },
  body: {
    variants: {
      default: bodyLayout.tokenMap({
        title:   { style: TEXT_STYLE.H3, color: colors.text,      hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE },
        eyebrow: { style: TEXT_STYLE.EYEBROW, color: colors.primary, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE },
        text:    { style: TEXT_STYLE.BODY, color: colors.text, linkColor: colors.primary, linkUnderline: true, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE, accents: colors.accents },
        list:    { style: TEXT_STYLE.BODY, color: colors.text, linkColor: colors.primary, linkUnderline: true, hAlign: HALIGN.LEFT, vAlign: VALIGN.TOP,    accents: colors.accents },
        // table, code, mermaid, quote, testimonial slot tokens...
      }),
    },
  },
  // ... one entry per layout
},
```

See [`theme.ts`](../packages/theme-tycoworks/src/theme.ts) for the complete reference with all layouts and their full token sets.

#### 7. Define Master Configs

Master tokens flow through layout token maps as shared constants. Define them once, reference from multiple layouts:

```typescript
import { defaultMaster, minimalMaster } from './masters.js';
import { HALIGN, VALIGN } from '@tycoworks/tycoslide';
const TEXT_STYLE = { H1: "h1", H2: "h2", H3: "h3", H4: "h4", BODY: "body", SMALL: "small", EYEBROW: "eyebrow", FOOTER: "footer", CODE: "code" } as const;

// Shared master config constants — define once, reference from multiple layouts
const defaultMasterConfig = defaultMaster.tokenMap({
  background:  colors.background,
  margin:      0.5,
  footerHeight: 0.25,
  footerText:  'My Company',
  slideNumber: { style: TEXT_STYLE.FOOTER, color: colors.textMuted, hAlign: HALIGN.RIGHT, vAlign: VALIGN.MIDDLE },
  footer:      { style: TEXT_STYLE.FOOTER, color: colors.textMuted, hAlign: HALIGN.LEFT,  vAlign: VALIGN.MIDDLE },
});

const lightMinimalMaster = minimalMaster.tokenMap({ background: colors.background, margin: 0.5 });
const darkMinimalMaster  = minimalMaster.tokenMap({ background: colors.text,       margin: 0.5 });
```

Then include in layout token maps:

```typescript
layouts: {
  body:    { variants: { default: bodyLayout.tokenMap({ ..., master: defaultMasterConfig }) } },
  title:   { variants: { default: titleLayout.tokenMap({ ..., master: darkMinimalMaster }) } },
  section: { variants: { default: sectionLayout.tokenMap({ ..., master: darkMinimalMaster }) } },
  // ...
},
```

Layouts sharing the same config constant produce the same PPTX slide master.

---

## Using Custom Themes

**As an npm package:**

1. Build and publish your theme to npm
2. Install: `npm install my-custom-theme`
3. Reference in Markdown:

```markdown
---
theme: my-custom-theme
---
```

**As a local module (TypeScript DSL):**

```typescript
import { Presentation } from '@tycoworks/tycoslide';
import { theme } from './my-theme';

const pres = new Presentation(theme);
```

---

## Variants System

Variants are defined per-layout and per-master in the theme. A layout variant controls the complete visual treatment of a slide — text colors, alignment, component styling, and slot tokens. A master variant controls background color and chrome. When no `variant` is specified in frontmatter, the `default` variant is used.

**Using variants in Markdown:**

```markdown
---
layout: statement
variant: hero
---
```

**Defining layout variants:**

Each layout entry in `theme.layouts` has a `variants` object. Every variant is a complete token set produced by `.tokenMap()`. The `default` variant is required; additional variants are optional.

```typescript
statement: {
  variants: {
    default: statementLayout.tokenMap({ title: headerTitle, eyebrow: headerEyebrow, body: bodyText, caption: mutedCaption }),
    hero:    statementLayout.tokenMap({ title: headerTitle, eyebrow: headerEyebrow, body: { ...bodyText, style: TEXT_STYLE.H3 }, caption: mutedCaption }),
  },
},
```

If a slide specifies `variant="name"` for a layout and that variant is not defined in the theme, the build reports the error.

---

## Font Requirements

Fonts must be:
- **WOFF2 or TTF format** for custom fonts
- **Absolute path** to the font file, or empty string `''` for system fonts
- At minimum, `normal` weight is required; `bold` and `light` are optional

```typescript
import type { FontFamily } from '@tycoworks/tycoslide';

const font: FontFamily = {
  light: { name: 'Inter Light', path: './fonts/Inter-Light.woff2' },
  normal: { name: 'Inter', path: './fonts/Inter-Regular.woff2' },
  bold: { name: 'Inter Bold', path: './fonts/Inter-Bold.woff2' },
};
```

**System fonts** (no file needed):

```typescript
const systemFont: FontFamily = {
  normal: { name: 'Arial', path: '' },  // Empty path = system font
};
```

**Using `@fontsource` npm packages:**

```typescript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const interFont: FontFamily = {
  normal: {
    name: 'Inter',
    path: require.resolve('@fontsource/inter/files/inter-latin-400-normal.woff2'),
  },
  bold: {
    name: 'Inter Bold',
    path: require.resolve('@fontsource/inter/files/inter-latin-700-normal.woff2'),
  },
};
```

---

## Registering Layouts in Themes

Theme packages export four named values: `theme`, `components`, `layouts`, and `masters`. The CLI registers components, layouts, and masters at load time so they are available when compiling slides.

```typescript
// my-theme/index.ts
import {
  textComponent,
  imageComponent,
  cardComponent,
  quoteComponent,
  testimonialComponent,
  tableComponent,
  codeComponent,
  mermaidComponent,
  lineComponent,
  shapeComponent,
  slideNumberComponent,
  rowComponent,
  columnComponent,
  stackComponent,
  gridComponent,
} from '@tycoworks/tycoslide-components';
import type { MasterDefinition } from '@tycoworks/tycoslide';
import { allLayouts } from './layouts.js';
import { defaultMaster, minimalMaster } from './masters.js';

export const components = [
  textComponent,
  imageComponent,
  cardComponent,
  quoteComponent,
  testimonialComponent,
  tableComponent,
  codeComponent,
  mermaidComponent,
  lineComponent,
  shapeComponent,
  slideNumberComponent,
  rowComponent,
  columnComponent,
  stackComponent,
  gridComponent,
];

export const layouts = allLayouts;

export const masters: MasterDefinition[] = [defaultMaster, minimalMaster];

export { theme } from './theme.js';
```

See [`packages/theme-tycoworks/src/index.ts`](../packages/theme-tycoworks/src/index.ts) for the complete reference entry point.

---

## Testing Your Theme

Test with all built-in components to verify every token is correct:

```markdown
---
theme: my-theme
---

---
layout: title
title: Theme Test
subtitle: Verifying all components
---

---
layout: body
title: Components
---

:::card{title="Default"}
Test card.
:::

:::card{title="Flat"}
Test card.
:::

:::card{title="Third"}
Test card.
:::

:::quote{attribution="Test Author"}
Test quote text here.
:::

| Header | Header |
|--------|--------|
| Cell   | Cell   |

:::mermaid
flowchart LR
    A --> B --> C
:::
```

Test each variant you define. Test custom components if your theme includes them.
