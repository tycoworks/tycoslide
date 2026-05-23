# Themes

Themes control all visual styling in tycoslide — typography, spacing, colors, backgrounds, and slide dimensions. A theme is a `Theme` that maps format names to complete visual configurations.

## What a Theme Contains

A `Theme` has two top-level concerns:

- **Fonts** — every font family the theme uses (embedded in the output file)
- **Formats** — named output shapes, each carrying slide dimensions, text styles, and templates

```typescript
import { defineTheme, brandFonts } from '@tycoslide/sdk';

export const theme = defineTheme({
  fonts: brandFonts(brand),
  formats: {
    presentation: buildPresentationFormat(brand.colors.light),
  },
});
```

Each format is a `ThemeFormat`:

| Field | Type | Description |
|-------|------|-------------|
| `slide` | `{ width: number; height: number }` | Slide dimensions in pixels (96 DPI) |
| `textStyles` | `Record<string, TextStyle>` | Named text styles (h1, h2, body, etc.) |
| `templates` | `Template[]` | Slide templates available in this format |

Templates are the named slide recipes authors select via `template:` frontmatter. See [Templates](./templates.md) for the full template reference.

---

## Using a Theme

Specify the theme and format in global frontmatter (the first frontmatter block in a markdown file):

```markdown
---
theme: "@tycoslide/theme-default"
format: presentation
---

---
template: title
title: My Presentation
---
```

**`format:` is required.** Omitting it is an error. The available format names are determined by the theme.

### Available Themes

**`@tycoslide/theme-default`** — Inter font, purple/navy palette, 9 templates, all built-in components.

```bash
npm install @tycoslide/theme-default
```

---

## Brand and Palette

Themes build on a `Brand` — the visual identity shared across all formats.

### Brand

```typescript
import type { Brand } from '@tycoslide/sdk';

const brand: Brand = {
  colors: { light: lightPalette, dark: darkPalette },
  fonts: {
    heading: interFont,
    body: interLightFont,
    code: firaCodeFont,
  },
};
```

### Palette

A `Palette` defines semantic color roles for a single appearance mode (light or dark):

| Role | Purpose |
|------|---------|
| `heading` | Primary heading text |
| `body` | Body text |
| `secondary` | Descriptions, captions |
| `muted` | Table headers, attribution |
| `accent` | Brand/interactive — links, accent bars |
| `accentSoft` | Tonal variant — agenda numbers |
| `background` | Page/area background |
| `surface` | Elevated fills (cards, containers) |
| `divider` | Borders and separators |
| `shadow` | Shadow color |
| `highlightTheme` | Syntax highlighting theme for code blocks |

All color values are hex strings with a `#` prefix (e.g., `#7C3AED`).

---

## Format

A `Format` defines per-format spatial configuration. Spatial values (spacing, padding, radius) are in pixels at 96 DPI. Strokes, font sizes, and shadow blur/offset are in points.

```typescript
import type { Format } from '@tycoslide/sdk';
import { SlideFormat, TEXT_STYLE } from '@tycoslide/sdk';

const presentationFormat: Format = {
  slide: SlideFormat.s16x9,
  spacing: { base: 24, tight: 12 },
  padding: 24,
  radius: 9,
  strokes: { hairline: 0.5, thin: 0.75, base: 1, thick: 2 },
  shadow: { type: SHADOW_TYPE.OUTER, opacity: 12, blur: 6, offset: 2, angle: 180 },
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
  textStyles: {
    [TEXT_STYLE.H1]: { fontFamily: headingFont, fontSize: 44, lineHeight: 1.4 },
    [TEXT_STYLE.BODY]: { fontFamily: bodyFont, fontSize: 14, lineHeight: 1.4 },
    // ... all text style keys
  },
};
```

### Slide Size Presets

Use `SlideFormat` presets from `@tycoslide/sdk` or specify custom dimensions:

| Preset | Dimensions |
|--------|-----------|
| `SlideFormat.s16x9` | 960 × 540 |
| `SlideFormat.s16x10` | 960 × 600 |
| `SlideFormat.s4x3` | 960 × 720 |
| `SlideFormat.letterPortrait` | 816 × 1056 |
| `SlideFormat.a4Portrait` | 794 × 1123 |

Custom dimensions:

```typescript
slide: { width: 960, height: 720 },
```

### Text Style Names

The SDK exports standard text style keys via `TEXT_STYLE`:

| Key | Value |
|-----|-------|
| `TEXT_STYLE.H1` | `"h1"` |
| `TEXT_STYLE.H2` | `"h2"` |
| `TEXT_STYLE.H3` | `"h3"` |
| `TEXT_STYLE.H4` | `"h4"` |
| `TEXT_STYLE.BODY` | `"body"` |
| `TEXT_STYLE.QUOTE` | `"quote"` |
| `TEXT_STYLE.CAPTION` | `"caption"` |
| `TEXT_STYLE.FOOTER` | `"footer"` |
| `TEXT_STYLE.CODE` | `"code"` |

---

## Font Requirements

Fonts must be:
- **WOFF2 or TTF format** for custom fonts
- **Absolute path** to the font file, or empty string `''` for system fonts
- At minimum, `normal` weight is required; `bold` and `light` are optional

```typescript
import type { FontFamily } from '@tycoslide/sdk';

const font: FontFamily = {
  light: { name: 'Inter Light', path: './fonts/Inter-Light.woff2' },
  normal: { name: 'Inter', path: './fonts/Inter-Regular.woff2' },
  bold: { name: 'Inter Bold', path: './fonts/Inter-Bold.woff2' },
};
```

**System fonts** (no file needed):

```typescript
const systemFont: FontFamily = {
  normal: { name: 'Arial', path: '' },
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

Every font the theme uses must appear in the `fonts` array passed to `defineTheme()` — unlisted fonts are not embedded in the output file.

---

## Building a Custom Theme

### Theme Entry Point

A theme package exports two named values: `theme` and `components`. The CLI loads both at build time.

```typescript
// index.ts
import {
  brandFonts,
  defineTheme,
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
  listComponent,
  labelComponent,
} from '@tycoslide/sdk';
import { brand } from './brand.js';
import { buildPresentationFormat } from './formats/presentation.js';

export const components = [
  textComponent,
  labelComponent,
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
  listComponent,
];

export const theme = defineTheme({
  fonts: brandFonts(brand),
  formats: {
    presentation: buildPresentationFormat(brand.colors.light),
  },
});
```

### Step-by-Step Guide

#### 1. Set Up Files

```bash
mkdir my-theme && cd my-theme
npm init -y
npm install @tycoslide/sdk
```

#### 2. Define Brand Identity

Create a `brand.ts` with colors and fonts:

```typescript
import type { Brand, Palette } from '@tycoslide/sdk';
import { HIGHLIGHT_THEME } from '@tycoslide/sdk';

const light: Palette = {
  heading: '#1A1A2E',
  body: '#1A1A2E',
  secondary: '#4A4A5A',
  muted: '#696878',
  accent: '#0066CC',
  accentSoft: '#4285F4',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  divider: '#E5E5E5',
  shadow: '#1A1A2E',
  highlightTheme: HIGHLIGHT_THEME.GITHUB_DARK,
};

export const brand: Brand = {
  colors: { light, dark: darkPalette },
  fonts: {
    heading: myHeadingFont,
    body: myBodyFont,
    code: myMonoFont,
  },
};
```

#### 3. Define a Format

Create a format file (e.g., `formats/presentation.ts`) that builds a `ThemeFormat`. A format file defines spatial configuration, derives tokens from the palette, composes chrome into layouts, and assembles templates:

```typescript
import { defineTemplate, deriveTokens, SlideFormat, TEXT_STYLE } from '@tycoslide/sdk';
import type { Format, Palette, ThemeFormat } from '@tycoslide/sdk';
import { withFooterChrome } from '../chrome.js';
import { body, title, section } from '../layouts.js';

export function buildPresentationFormat(palette: Palette): ThemeFormat {
  const config: Format = {
    slide: SlideFormat.s16x9,
    spacing: { base: 24, tight: 12 },
    // ... spatial values
    textStyles: { /* ... */ },
  };

  const t = deriveTokens(palette, config);

  return {
    slide: config.slide,
    textStyles: config.textStyles,
    templates: [
      defineTemplate({
        name: 'title',
        description: 'Opening slide with large title.',
        layout: withMarginChrome(title, { margin: 48 }),
        background: t.surfaces.elevated,
        tokens: {
          title: { ...t.onLight.headings.h1, hAlign: HALIGN.CENTER },
          // ...
        },
      }),
      // ... more templates
    ],
  };
}
```

#### 4. Export Theme and Components

Wire everything together in `index.ts` as shown in [Theme Entry Point](#theme-entry-point).

---

## Extending an Existing Theme

Spread the default theme and override what you need:

```typescript
import { defineTheme } from '@tycoslide/sdk';
import { theme as defaultTheme } from '@tycoslide/theme-default';

export const theme = defineTheme({
  ...defaultTheme,
  // Override fonts or formats
});
```

### Overriding Fonts

Replace Inter with a system font:

```typescript
import { defineTheme, brandFonts } from '@tycoslide/sdk';
import type { Brand } from '@tycoslide/sdk';
import { theme as defaultTheme } from '@tycoslide/theme-default';

const helvetica: FontFamily = {
  normal: { name: 'Helvetica', path: '' },
  bold: { name: 'Helvetica', path: '' },
};

export const theme = defineTheme({
  fonts: [helvetica],
  formats: defaultTheme.formats,
});
```

---

## Using Custom Themes

**As an npm package:**

1. Build and publish the theme to npm
2. Install: `npm install my-custom-theme`
3. Reference in markdown:

```markdown
---
theme: my-custom-theme
format: presentation
---
```

**As a local module (TypeScript DSL):**

```typescript
import { Presentation } from '@tycoslide/sdk';
import { theme, components } from './my-theme/index.js';

const pres = new Presentation(theme);
```

---

## Template Names

Themes expose template names as a `TEMPLATE` const for type-safe references:

```typescript
export const TEMPLATE = {
  TITLE: 'title',
  TITLE_DARK: 'title-dark',
  SECTION: 'section',
  BODY: 'body',
  BODY_CENTERED: 'body-centered',
  STATEMENT: 'statement',
  AGENDA: 'agenda',
  CARDS: 'cards',
  TRANSFORM: 'transform',
} as const;
```

Authors select templates via frontmatter:

```markdown
---
template: body
title: My Slide
---
```

---

## Optional Tokens

Templates and components may declare tokens as optional using `token.optional<T>()`. Omitting an optional token suppresses the associated visual feature — for example, omitting a card's `background` token removes the card's background shape entirely.

```typescript
import { token } from '@tycoslide/sdk';
import type { ShapeTokens } from '@tycoslide/sdk';

const tokens = token.shape({
  background: token.optional<ShapeTokens>(),
  padding: token.required<number>(),
});
```

---

## Assets

Themes bundle image assets (icons, logos, backgrounds) that deck authors reference via `$category.name` syntax in frontmatter. Each entry carries a relative file path and documentation. The compiler resolves paths to absolute disk locations via npm resolution — any file type (PNG, SVG, JPG) is supported.

### Asset Catalog

```typescript
import type { AssetCatalog } from "@tycoslide/sdk";

export const assetCatalog: AssetCatalog = {
  icons: {
    shield: {
      path: "assets/icons/shield.png",
      documentation: {
        description: "Shield/checkmark icon for security or trust topics",
        whenToUse: "Security features, compliance, trust signals",
      },
    },
  },
  brand: {
    logo: {
      path: "assets/brand/logo.svg",
      documentation: { description: "Full wordmark, dark variant" },
    },
  },
};
```

Each entry has two fields:

| Field | Required | Description |
|-------|----------|-------------|
| `path` | Yes | Relative path from the package root to the asset file (e.g., `assets/icons/shield.png`) |
| `documentation` | Yes | Documentation object — `description` (**required**), `whenToUse`, `whenNotToUse` |

Pass the catalog to `defineTheme`:

```typescript
export const theme = defineTheme({
  fonts: brandFonts(brand),
  formats: { presentation: buildPresentationFormat(palette) },
  assets: assetCatalog,
});
```

The theme's `package.json` must export the assets directory for npm resolution:

```json
{
  "exports": {
    ".": { "import": "./dist/index.js" },
    "./assets/*": "./assets/*"
  }
}
```

The `plugin` build step includes catalog descriptions in the generated manifest. Deck authors reference assets as `$category.name` (e.g., `image: $icons.shield`). The `$` prefix only triggers resolution for values matching the exact `$category.name` pattern — strings like `$100` pass through unchanged.

---

## Building a Theme Package

The theme build uses standard npm lifecycle scripts. `tsc --build` compiles TypeScript, then a small script generates the AI authoring skill from template metadata, and `cp` copies documentation references into the package.

```bash
npm run build    # tsc --build
npm run plugin   # generate manifest + copy docs
npm pack         # produces .tgz + .zip (via prepack/postpack hooks)
```

Output:

```bash
my-theme/
  dist/           # Compiled JS + types
  skills/         # AI authoring skill (generated)
  .claude-plugin/ # Plugin manifest (generated)
```

Add `skills/`, `.claude-plugin/`, `*.tgz`, and `*.zip` to `.gitignore`. The generated directories ship in the npm tarball — the published package works as both a runtime theme and an AI authoring plugin. The `.zip` bundles the plugin files with the `.tgz` for uploading to Claude co-work.

### Package Configuration

```json
{
  "scripts": {
    "build": "tsc --build",
    "plugin": "node scripts/generate-manifest.mjs && cp docs...",
    "prepack": "npm run build && npm run plugin",
    "postpack": "zip -r <name>.zip .claude-plugin/ skills/ *.tgz",
    "clean": "rm -rf dist skills .claude-plugin *.tgz *.zip"
  },
  "files": ["dist/", "assets/", "skills/", ".claude-plugin/"]
}
```

---

## Testing a Theme

Test with all built-in components to verify every token is correct:

```markdown
---
theme: my-theme
format: presentation
---

---
template: title
title: Theme Test
subtitle: Verifying all components
---

---
template: body
title: Components
---

:::card{title="Default"}
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

Test every template and format the theme defines. Test custom components if the theme includes them.

---

## Related

- [Templates](./templates.md) - Template authoring, layouts, chrome composition, and slots
- [Components](./components.md) - Built-in components and custom component API
- [Quick Start](./quick-start.md) - Build your first presentation
- [Markdown Syntax](./markdown-syntax.md) - Directive syntax and frontmatter
