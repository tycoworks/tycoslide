# Themes

Themes control all visual styling in tycoslide presentations. A theme is a TypeScript object that provides colors, typography, spacing, slide dimensions, and component token values. It is the single source of truth for all visual decisions.

## What Themes Control

- **Color scheme** — Background, text, accents
- **Typography** — Font families, sizes, weights for all text styles
- **Spacing** — Margins, gaps, padding, line height
- **Component styling** — How cards, quotes, tables, shapes look (via token variants)
- **Slide size** — 16:9, 4:3, etc.
- **Borders** — Default border width and corner radius

## Using a Theme

Specify the theme in global frontmatter (the first frontmatter block in a markdown file):

```markdown
---
theme: tycoslide-theme-default
---

---
layout: title
title: My Presentation
---
```

The theme applies to all slides in the presentation.

### Available Themes

**`tycoslide-theme-default`** is the currently available theme. It uses Material Design 3 colors and the Inter font, with three layouts (`title`, `section`, `body`) and all built-in components.

```bash
npm install tycoslide-theme-default
```

**Bundled icons:**

```typescript
import { assets } from 'tycoslide-theme-default';

assets.icons.barChart   // bar_chart (filled)
assets.icons.group      // group (filled)
assets.icons.lightbulb  // lightbulb (filled)
assets.icons.rocket     // rocket_launch (filled)
assets.icons.shield     // verified_user (filled)
```

See the [theme source](../packages/theme-default/src/theme.ts) for all default values.

---

## Extending an Existing Theme

### Quick Extension Pattern

Import the default theme and spread it with your overrides:

```typescript
import { theme as defaultTheme } from 'tycoslide-theme-default';
import type { Theme } from 'tycoslide';

const myTheme: Theme = {
  ...defaultTheme,
  // Override only what you need
};

export default myTheme;
```

Then reference your package in the presentation frontmatter:

```markdown
---
theme: my-theme
---
```

---

### Overriding Colors

Replace brand colors while inheriting everything else:

```typescript
import { theme as defaultTheme } from 'tycoslide-theme-default';
import type { Theme } from 'tycoslide';

const myTheme: Theme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    primary: 'FF6600',       // Your brand color (no # prefix)
    secondary: 'F0EAE0',     // Subtle surface color
    accents: {
      ...defaultTheme.colors.accents,
      blue: 'FF6600',        // Map accent names to your palette
      green: '00A86B',
    },
  },
};
```

All color values are 6-character hex strings without a `#` prefix.

**Color tokens and their roles:**

| Token | Role |
|-------|------|
| `background` | Slide background |
| `text` | Primary text color |
| `textMuted` | Secondary text, captions, footers |
| `primary` | Primary accent — buttons, highlights, `primary` shape variant |
| `secondary` | Subtle surface fills — card backgrounds, borders |
| `subtleOpacity` | Opacity (%) for subtle fills (0–100) |
| `accents.*` | Named inline highlight colors (`:name[text]` syntax) |

---

### Overriding Fonts

Replace Inter with a system font or a custom `.woff2` file:

#### System font (no file embedding)

```typescript
import { theme as defaultTheme } from 'tycoslide-theme-default';
import type { Theme, FontFamily } from 'tycoslide';

const helvetica: FontFamily = {
  normal: { name: 'Helvetica', path: '' },  // path: '' = system font
  bold:   { name: 'Helvetica', path: '' },
};

const myTheme: Theme = {
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
};
```

#### Custom font via @fontsource

```typescript
import { createRequire } from 'module';
import type { FontFamily } from 'tycoslide';

const require = createRequire(import.meta.url);

const plusJakarta: FontFamily = {
  light:  { name: 'Plus Jakarta Sans Light',  path: require.resolve('@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-300-normal.woff2') },
  normal: { name: 'Plus Jakarta Sans',        path: require.resolve('@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff2') },
  bold:   { name: 'Plus Jakarta Sans Bold',   path: require.resolve('@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff2') },
};
```

#### Adjusting font sizes only

```typescript
const myTheme: Theme = {
  ...defaultTheme,
  textStyles: {
    ...defaultTheme.textStyles,
    h1: { ...defaultTheme.textStyles.h1, fontSize: 44 },
    h2: { ...defaultTheme.textStyles.h2, fontSize: 32 },
  },
};
```

---

### Overriding Spacing

```typescript
const myTheme: Theme = {
  ...defaultTheme,
  spacing: {
    ...defaultTheme.spacing,
    margin: 0.625,   // Wider margins (was 0.5")
    gap: 0.375,      // More breathing room (was 0.25")
    gapTight: 0.25,  // Looser tight gap (was 0.125")
    padding: 0.375,  // More card padding (was 0.25")
  },
};
```

Spacing values are in inches. The base `unit` (1/32") is used for sub-pixel precision in component layouts.

---

### Overriding Component Tokens

Each component's appearance is controlled by tokens in `theme.components`. Every component must have at least a `default` variant.

#### Changing card colors

```typescript
const myTheme: Theme = {
  ...defaultTheme,
  components: {
    ...defaultTheme.components,
    card: {
      variants: {
        default: {
          ...defaultTheme.components.card.variants.default,
          backgroundColor: 'F5F0FF',   // Custom card background
          backgroundOpacity: 20,
          borderColor: 'C4B5FD',
        },
        flat: {
          ...defaultTheme.components.card.variants.flat,
        },
      },
    },
  },
};
```

#### Adding a new card variant

```typescript
const myTheme: Theme = {
  ...defaultTheme,
  components: {
    ...defaultTheme.components,
    card: {
      variants: {
        ...defaultTheme.components.card.variants,
        // New "highlight" variant
        highlight: {
          ...defaultTheme.components.card.variants.default,
          backgroundColor: 'FF6600',
          backgroundOpacity: 100,
          titleColor: 'FFFFFF',
          descriptionColor: 'FFD4B3',
        },
      },
    },
  },
};
```

Then use it in markdown:

```markdown
:::card{title="Featured" variant="highlight"}
This card uses the highlight variant.
:::
```

#### Overriding quote tokens

```typescript
components: {
  ...defaultTheme.components,
  quote: {
    variants: {
      default: {
        ...defaultTheme.components.quote.variants.default,
        quoteStyle: 'h3',         // Larger quote text
        padding: 0.5,
        vAlign: 'middle',
      },
    },
  },
},
```

#### Overriding table tokens

```typescript
import { BORDER_STYLE } from 'tycoslide';

components: {
  ...defaultTheme.components,
  table: {
    variants: {
      default: {
        ...defaultTheme.components.table.variants.default,
        borderStyle: BORDER_STYLE.HORIZONTAL,  // Horizontal lines only
        headerBackground: 'F0F0F0',
        headerBackgroundOpacity: 100,
      },
    },
  },
},
```

## When to Build a Custom Theme

Build a custom theme when:
- You need specific brand colors and fonts
- You want complete design control
- You're building a reusable theme for your organization

**For quick customization:** Extend an existing theme using the spread operator pattern (see above).

**For full control:** Build from scratch (this guide).

## Theme Structure

A theme is a TypeScript object implementing the `Theme` interface:

```typescript
import type { Theme } from 'tycoslide';

const myTheme: Theme = {
  colors: { /* ... */ },
  slide: { /* ... */ },
  spacing: { /* ... */ },
  borders: { /* ... */ },
  textStyles: { /* ... */ },
  components: { /* ... */ },
};
```

All fields are required. Missing fields cause a TypeScript compile error.

## Design Token System

tycoslide uses the W3C Design Tokens (DTCG) model:

- **Components declare** required token keys (e.g., `backgroundColor`, `textColor`)
- **Themes provide** token values in `theme.components`
- **No hidden defaults** in framework code — all values must be explicit
- **Missing tokens fail the build** immediately with an actionable error

## Step-by-Step Guide

### 1. Set Up Files

```bash
mkdir my-theme
cd my-theme
npm init -y
npm install tycoslide tycoslide-components
```

Create `index.ts`:

```typescript
import type { Theme } from 'tycoslide';

export const theme: Theme = {
  // Filled in step by step below
};
```

### 2. Define Colors

```typescript
colors: {
  background: 'FFFFFF',
  text: '1A1A1A',
  textMuted: '666666',
  primary: '0066CC',
  secondary: 'E0E0E0',
  subtleOpacity: 15,
  accents: {
    teal: '00B8A9',
    purple: '6B5B95',
    orange: 'FF6600',
    green: '34A853',
    red: 'EA4335',
    blue: '4285F4',
  },
}
```

**Required fields:**

| Field | Type | Purpose |
|-------|------|---------|
| `background` | hex string (no `#`) | Slide background color |
| `text` | hex string | Primary text color |
| `textMuted` | hex string | Secondary/muted text color |
| `primary` | hex string | Primary brand color |
| `secondary` | hex string | Secondary brand color |
| `subtleOpacity` | number 0–100 | Opacity for subtle backgrounds |
| `accents` | `Record<string, string>` | Named accent colors |

Accent colors are used for inline text highlighting in Markdown:

```markdown
This is :teal[highlighted in teal].
This is :blue[highlighted in blue].
```

### 3. Configure Text Styles

Define styles for all eight text style names:

```typescript
textStyles: {
  h1: { fontFamily: myFont, fontSize: 36, color: colors.text },
  h2: { fontFamily: myFont, fontSize: 28, color: colors.text },
  h3: { fontFamily: myFont, fontSize: 22, color: colors.text },
  h4: { fontFamily: myFont, fontSize: 18, color: colors.text },
  body: { fontFamily: myFont, fontSize: 14, color: colors.text },
  small: { fontFamily: myFont, fontSize: 12, color: colors.textMuted },
  eyebrow: { fontFamily: myFont, fontSize: 10, color: colors.textMuted },
  footer: { fontFamily: myFont, fontSize: 8, color: colors.textMuted },
}
```

All eight styles (`h1`, `h2`, `h3`, `h4`, `body`, `small`, `eyebrow`, `footer`) are required.

### 4. Define Spacing

```typescript
const unit = 0.03125; // 1/32 inch

spacing: {
  unit,
  margin: unit * 16,              // 0.5"
  gap: unit * 8,                  // 0.25"
  gapTight: unit * 4,             // 0.125"
  gapLoose: unit * 16,            // 0.5"
  padding: unit * 8,              // 0.25"
  cellPadding: unit * 2,          // 0.0625"
  bulletSpacing: 1.5,             // Line spacing multiplier for lists
  bulletIndentMultiplier: 1.5,    // Indent = fontSize * multiplier
  maxScaleFactor: 1.0,            // Max image upscale (1.0 = native)
  lineSpacing: 1.2,               // Default line height multiplier
}
```

All dimension values are in inches. Multipliers are dimensionless.

### 5. Set Slide Size

```typescript
import { SLIDE_SIZE } from 'tycoslide';

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

### 6. Configure Borders

```typescript
borders: {
  width: 0.75,    // Border width in points
  radius: 0.05,   // Corner radius in inches
}
```

### 7. Provide Component Tokens

Each component requires a `components` entry with at least a `default` variant. Every token the component declares must be present — missing tokens fail the build. The shape is the same for all components:

```typescript
components: {
  card: {
    variants: {
      default: {
        // All required tokens for card — colors, spacing, text styles, alignment
      },
    },
  },
  // ... same pattern for each component
}
```

**All 7 token-bearing components must be configured:** `card`, `quote`, `table`, `line`, `slideNumber`, `text`, `shape`

Each component's required token keys are defined in its component definition. Use framework constants (`TEXT_STYLE`, `GAP`, `BORDER_STYLE`, `DASH_TYPE`, `HALIGN`, `VALIGN`) for enum-valued tokens.

See [`theme.ts`](../packages/theme-default/src/theme.ts) for the complete reference implementation with all token keys and default values.

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
import { Presentation } from 'tycoslide';
import { theme } from './my-theme';

const pres = new Presentation(theme);
```

## Variants System

Every component supports named variants for different visual styles. Variants are defined per-component in the theme.

**Using variants in Markdown:**

```markdown
:::card{title="Default"}
Uses default variant.
:::

:::card{title="Flat Card" variant="flat"}
Uses flat variant styling from the theme.
:::
```

**Defining variants:**

Each component token config must include a `variants` object with at least a `default` variant. Every variant must be a complete token set — all required tokens must be present. Missing tokens cause a build error.

```typescript
card: {
  variants: {
    default: { /* all required tokens */ },    // Required
    flat: { /* all required tokens */ },       // Optional additional variant
    accent: { /* all required tokens */ },     // Optional additional variant
  },
}
```

If a user specifies `variant="name"` for a component and that variant is not defined in the theme, the build fails.

## Font Requirements

Fonts must be:
- **WOFF2 or TTF format** for custom fonts
- **Absolute path** to the font file, or empty string `''` for system fonts
- At minimum, `normal` weight is required; `bold` and `light` are optional

```typescript
import type { FontFamily } from 'tycoslide';

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

## Registering Layouts in Themes

Themes typically also register layouts. Import the layouts file for side-effect registration from the theme entry point:

```typescript
// my-theme/index.ts
import './layouts';  // Registers layouts with layoutRegistry
export { theme } from './theme';
export { assets } from './assets';

// Re-export components so users only need one import
import * as components from 'tycoslide-components';
export { components };
export * from 'tycoslide-components';
```

When a user imports the theme, layouts are registered automatically.

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

::::grid{columns=3}
:::card{title="Default" height="fill"}
Test card.
:::
:::card{title="Flat" variant="flat" height="fill"}
Test card.
:::
:::card{title="Third" height="fill"}
Test card.
:::
::::

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

## Recommended Workflow

**For quick customization:**
1. Start with `tycoslide-theme-default`
2. Override colors and fonts using the [spread operator pattern](#extending-an-existing-theme)
3. Export as a new theme

**For full control:**
1. Create theme from scratch following the step-by-step guide
2. Define all tokens explicitly
3. Test with all components
4. Package as an npm module
