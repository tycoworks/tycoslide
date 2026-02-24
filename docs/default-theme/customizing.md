# Customizing theme-default

How to customize or extend `tycoslide-theme-default` — adjusting colors, fonts, spacing, and component tokens without building a theme from scratch.

## Quick Extension Pattern

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

## Overriding Colors

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

## Overriding Fonts

Replace Inter with a system font or a custom `.woff2` file:

### System font (no file embedding)

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

### Custom font via @fontsource

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

### Adjusting font sizes only

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

## Overriding Spacing

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

## Overriding Component Tokens

Each component's appearance is controlled by tokens in `theme.components`. Every component must have at least a `default` variant.

### Changing card colors

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

### Adding a new card variant

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

### Overriding quote tokens

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

### Overriding table tokens

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

---

## Complete Component Token Reference

For a full list of token names and types per component, see [component-tokens.md](./component-tokens.md).

Import constants for token values from `tycoslide`:

```typescript
import {
  TEXT_STYLE,   // 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'small' | 'eyebrow' | 'footer'
  GAP,          // 'none' | 'tight' | 'normal' | 'loose'
  HALIGN,       // 'left' | 'center' | 'right'
  VALIGN,       // 'top' | 'middle' | 'bottom'
  BORDER_STYLE, // 'full' | 'internal' | 'horizontal' | 'vertical' | 'none'
  DASH_TYPE,    // 'solid' | 'dash' | 'dashDot' | 'lgDash' | ...
} from 'tycoslide';
```

---

## Building a Theme from Scratch

For complete control over all visual design, see [Creating Themes](../extending/creating-themes.md).
