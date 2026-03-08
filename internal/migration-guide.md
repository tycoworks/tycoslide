# Theme Migration Guide: q2-layout-token-infrastructure

## Overview

The q2-layout-token-infrastructure refactoring (phases 1–5) fundamentally restructures how themes define and apply styling. The old system was component-centric with flat token maps and optional properties. The new system is layout-centric with nested token structures, compile-time validation via `.tokenMap()`, and a clear separation of concerns: designers own tokens, developers own layouts, and the theme object becomes a type-safe registry of layout and master variants.

**Key migration goals:**
- Replace component-based tokens with layout-based tokens (layouts define all tokens for their content slots)
- Change `: Theme` to `satisfies Theme` (preserves literal type inference for better autocomplete)
- Reduce spacing fields from 11 to 3 semantic values (`normal`, `tight`, `loose`)
- Move colors from `theme.colors` to local constants
- Replace `theme.components` with `theme.layouts` and `theme.masters`
- Add compile-time token validation via `defineLayout<TTokens>().tokenMap()`
- Define masters with `defineMaster<TTokens>()` and typed token acceptance

This guide walks through each change with before/after code examples. After completing these steps, your theme will be fully compatible with the new infrastructure.

---

## Step 1: Change Type Annotation from `: Theme` to `satisfies Theme`

**Why:** The new pattern preserves literal types for better autocomplete while still catching missing fields at compile time. TypeScript's type narrowing works better with `satisfies` because the inferred type is more specific.

**Before:**
```typescript
export const theme: Theme = {
  colors: { ... },
  spacing: { ... },
  textStyles: { ... },
  components: { ... },
};
```

**After:**
```typescript
export const theme = {
  slide: SLIDE_SIZE.S16x9,
  spacing: { normal: gap, tight: gapTight, loose: gapLoose },
  fonts: [assets.fonts.inter, assets.fonts.firaCode],
  textStyles: { ... },
  layouts: { ... },
  masters: { ... },
} satisfies Theme;
```

---

## Step 2: Replace `spacing` with Three Semantic Fields

**Why:** W3C Design Tokens Community Group (DTCG) model reduces variants to three semantic levels. Other spacing values (margin, padding, cellPadding, etc.) are now either baked into layout definitions or moved into component-specific tokens.

**Before:**
```typescript
const spacing = {
  unit: 0.03125,
  margin: unit * 16,
  gap: unit * 8,
  gapTight: unit * 4,
  gapLoose: unit * 16,
  padding: unit * 8,
  cellPadding: unit * 2,
  bulletSpacing: 1.5,
  bulletIndentMultiplier: 1.5,
  maxScaleFactor: 1.0,
  lineSpacing: 1.2,
};

export const theme: Theme = {
  spacing,
  // ...
};
```

**After:**
```typescript
const unit = 0.03125; // 1/32 inch

const gap = unit * 8;             // 0.25" → normal
const gapTight = unit * 4;        // 0.125" → tight
const gapLoose = unit * 16;       // 0.5" → loose
const padding = unit * 8;         // Used in component tokens, not theme
const cellPadding = unit * 2;     // Used in component tokens (table, etc.)
const bulletIndentMultiplier = 1.5;
const lineSpacing = 1.2;

export const theme = {
  spacing: { normal: gap, tight: gapTight, loose: gapLoose },
  // ...
} satisfies Theme;
```

**Usage:** In layouts and component tokens, reference spacing via the `GAP` enum or compute values inline:
```typescript
{ gap: GAP.NORMAL }      // Uses theme.spacing.normal
{ gap: GAP.TIGHT }       // Uses theme.spacing.tight
{ padding: 0.25 }        // Computed values live locally in token objects
```

---

## Step 3: Add `lineHeightMultiplier` and `bulletIndentPt` to TextStyle Definitions

**Why:** These values are now part of the TextStyle interface, not separate spacing fields. This keeps typography and text metrics together.

**Before:**
```typescript
textStyles: {
  h1: { fontFamily: assets.fonts.inter, fontSize: 36, color: colors.text },
  h2: { fontFamily: assets.fonts.inter, fontSize: 28, color: colors.text },
  h3: { fontFamily: assets.fonts.inter, fontSize: 22, color: colors.text },
  body: { fontFamily: assets.fonts.inter, fontSize: 14, color: colors.text },
  // ... color was here
},
spacing: {
  lineSpacing: 1.2,
  bulletIndentMultiplier: 1.5,
  // ... lived in spacing object
},
```

**After:**
```typescript
const lineSpacing = 1.2;
const bulletIndentMultiplier = 1.5;

export const theme = {
  textStyles: {
    h1: {
      fontFamily: assets.fonts.inter,
      fontSize: 48,
      defaultWeight: FONT_WEIGHT.LIGHT,
      lineHeightMultiplier: lineSpacing,
      bulletIndentPt: 48 * bulletIndentMultiplier,
    },
    h2: {
      fontFamily: assets.fonts.inter,
      fontSize: 36,
      defaultWeight: FONT_WEIGHT.LIGHT,
      lineHeightMultiplier: lineSpacing,
      bulletIndentPt: 36 * bulletIndentMultiplier,
    },
    body: {
      fontFamily: assets.fonts.inter,
      fontSize: 14,
      defaultWeight: FONT_WEIGHT.LIGHT,
      lineHeightMultiplier: lineSpacing,
      bulletIndentPt: 14 * bulletIndentMultiplier,
    },
    // ... for each style
  },
} satisfies Theme;
```

**Key points:**
- `lineHeightMultiplier` replaces the old `lineSpacing` (same meaning)
- `bulletIndentPt` is calculated as `fontSize * bulletIndentMultiplier`
- `defaultWeight` specifies the base font weight for the style (e.g., `FONT_WEIGHT.LIGHT`, `FONT_WEIGHT.NORMAL`)
- No more `color` on TextStyle (color lives in token objects)

---

## Step 4: Move Colors to Local Constants (Remove `theme.colors`)

**Why:** Colors are no longer part of the Theme interface. Instead, define them as local constants and pass them into token maps. This reduces the Theme object's responsibility and makes tokens explicit and composable.

**Before:**
```typescript
export const theme: Theme = {
  colors: {
    background: 'FFFFFF',
    text: '1C1B1F',
    textMuted: '49454F',
    primary: '1976D2',
    secondary: 'E7E0EC',
    accents: {
      blue: '1976D2',
      green: '388E3C',
      red: 'D32F2F',
      yellow: 'FBC02D',
    },
  },
  // ... rest of theme
};
```

**After:**
```typescript
// Local constants — not on theme object
export const colors = {
  background: 'FFFFFF',
  text: '1A1A2E',
  textMuted: '4A4A5A',
  primary: '7C3AED',
  onPrimary: 'FFFFFF',
  secondary: 'F5F5F5',
  surfaceContainer: 'F5F5F5',
  surfaceContainerLow: 'FAFAFA',
  surfaceContainerHigh: 'EBEBEB',
  outlineVariant: 'E5E5E5',
  accents: {
    blue: '1A1A2E',
    green: '0E6245',
    red: 'B42318',
    yellow: 'B54708',
    purple: '7C3AED',
  },
};

export const theme = {
  slide: SLIDE_SIZE.S16x9,
  spacing: { normal: gap, tight: gapTight, loose: gapLoose },
  // ... no colors property
} satisfies Theme;
```

**Usage:** Pass colors into layout token maps:
```typescript
layouts: {
  body: {
    variants: {
      default: bodyLayout.tokenMap({
        text: { style: TEXT_STYLE.BODY, color: colors.text, ... },
      }),
    },
  },
},
```

---

## Step 5: Remove `theme.borders` — Use Local Constants Instead

**Why:** Border values are now passed directly in token objects where borders are needed (table, card, etc.), not centralized on the theme.

**Before:**
```typescript
export const theme: Theme = {
  borders: {
    width: 0.75,
    radius: 0.05,
  },
  // ...
};
```

**After:**
```typescript
const borderWidth = 0.75;
const cornerRadius = 0.08;

// Use directly in token objects:
const cardTokens = {
  background: {
    fill: colors.surfaceContainer,
    fillOpacity: 100,
    borderColor: colors.outlineVariant,
    borderWidth,           // Reference local constant
    cornerRadius,
  },
};
```

---

## Step 6: Replace `theme.components` with `theme.layouts` + `theme.masters`

**Why:** This is the architectural pivot. The old system had flat component tokens at the theme level. The new system has:
- **Layouts:** Define all tokens for content inside a slide layout (via `.tokenMap()`)
- **Masters:** Define chrome tokens (footer, background, margin) separately
- Token injection distributes layout tokens to components at compile time

**Before:**
```typescript
export const theme: Theme = {
  components: {
    card: {
      variants: {
        default: {
          padding: spacing.padding,
          cornerRadius: 0.05,
          backgroundColor: colors.secondary,
          backgroundOpacity: 15,
          borderColor: colors.secondary,
          borderWidth: 0.75,
          titleStyle: TEXT_STYLE.H4,
          titleColor: colors.text,
          descriptionStyle: TEXT_STYLE.SMALL,
          descriptionColor: colors.textMuted,
          gap: GAP.TIGHT,
        },
        flat: {
          padding: spacing.padding,
          cornerRadius: 0.05,
          backgroundColor: colors.background,
          backgroundOpacity: 0,
          borderColor: colors.secondary,
          borderWidth: 0,
          titleStyle: TEXT_STYLE.H4,
          titleColor: colors.text,
          descriptionStyle: TEXT_STYLE.SMALL,
          descriptionColor: colors.textMuted,
          gap: GAP.TIGHT,
        },
      },
    },
    quote: {
      variants: {
        default: {
          padding: spacing.padding * 2,
          cornerRadius: 0.05,
          backgroundColor: colors.secondary,
          backgroundOpacity: 15,
          borderColor: colors.secondary,
          borderWidth: 0.75,
          quoteStyle: TEXT_STYLE.BODY,
          quoteColor: colors.text,
          attributionStyle: TEXT_STYLE.SMALL,
          attributionColor: colors.textMuted,
        },
      },
    },
    table: {
      variants: {
        default: {
          borderStyle: BORDER_STYLE.FULL,
          borderColor: colors.secondary,
          borderWidth: 0.75,
          headerBackground: colors.background,
          headerBackgroundOpacity: 0,
          headerTextStyle: TEXT_STYLE.BODY,
          cellBackground: colors.background,
          cellBackgroundOpacity: 0,
          cellTextStyle: TEXT_STYLE.BODY,
          cellPadding: spacing.cellPadding,
          hAlign: HALIGN.LEFT,
          vAlign: VALIGN.MIDDLE,
        },
      },
    },
  },
};
```

**After (layouts + masters):**
```typescript
// Define layout + master definitions ONCE
import { bodyLayout, cardLayout, ... } from './layouts.js';
import { defaultMaster, minimalMaster } from './master.js';

export const theme = {
  slide: SLIDE_SIZE.S16x9,
  spacing: { normal: gap, tight: gapTight, loose: gapLoose },
  fonts: [...],
  textStyles: { ... },

  // NEW: Layouts grouped by name with variants
  layouts: {
    body: {
      variants: {
        default: bodyLayout.tokenMap({
          title: { style: TEXT_STYLE.H3, color: colors.text, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE },
          eyebrow: { style: TEXT_STYLE.EYEBROW, color: colors.primary, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE },
          text: { style: TEXT_STYLE.BODY, color: colors.text, linkColor: colors.primary, linkUnderline: true, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE, accents: colors.accents },
          list: { style: TEXT_STYLE.BODY, color: colors.text, linkColor: colors.primary, linkUnderline: true, hAlign: HALIGN.LEFT, vAlign: VALIGN.TOP, accents: colors.accents },
          table: tableTokens,
          code: codeTokens,
          mermaid: mermaidTokens,
          quote: quoteSlotTokens,
          testimonial: testimonialSlotTokens,
        }),
      },
    },
    cards: {
      variants: {
        default: cardsLayout.tokenMap({
          title: headerTitle,
          eyebrow: headerEyebrow,
          intro: bodyText,
          caption: mutedCaption,
          card: {
            background: { fill: colors.surfaceContainer, fillOpacity: 100, borderColor: colors.outlineVariant, borderWidth, cornerRadius },
            padding: padding,
            gap: GAP.TIGHT,
            hAlign: HALIGN.CENTER,
            vAlign: VALIGN.TOP,
            title: cardTitle,
            description: cardDescription,
          },
        }),
        flat: cardsLayout.tokenMap({
          title: headerTitle,
          eyebrow: headerEyebrow,
          intro: bodyText,
          caption: mutedCaption,
          card: {
            background: { fill: colors.background, fillOpacity: 0, borderColor: colors.outlineVariant, borderWidth: 0, cornerRadius },
            padding: padding,
            gap: GAP.TIGHT,
            hAlign: HALIGN.CENTER,
            vAlign: VALIGN.TOP,
            title: cardTitle,
            description: cardDescription,
          },
        }),
      },
    },
    quote: {
      variants: {
        default: quoteLayout.tokenMap({
          quote: {
            bar: { color: colors.primary, width: 2, dashType: DASH_TYPE.SOLID },
            gap: GAP.NORMAL,
            quote: quoteText,
            attribution: quoteAttribution,
          },
        }),
      },
    },
  },

  // NEW: Masters (slide chrome) grouped by name with variants
  masters: {
    default: {
      variants: {
        default: defaultMaster.tokenMap({
          background: colors.background,
          margin: 0.5,
          footerHeight: footerHeight,
          footerText: 'tycoworks',
          slideNumber: { style: TEXT_STYLE.FOOTER, color: colors.textMuted, hAlign: HALIGN.RIGHT, vAlign: VALIGN.MIDDLE },
          footer: { style: TEXT_STYLE.FOOTER, color: colors.textMuted, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE },
        }),
      },
    },
    minimal: {
      variants: {
        default: minimalMaster.tokenMap({
          background: colors.background,
          margin: 0.5,
        }),
        dark: minimalMaster.tokenMap({
          background: colors.text,
          margin: 0.5,
        }),
      },
    },
  },
} satisfies Theme;
```

**Key concepts:**
- Layouts are organized by name (e.g., `body`, `cards`, `quote`)
- Each layout can have multiple variants (e.g., `default`, `flat`)
- Tokens are passed to `.tokenMap()` which validates them at compile time
- Masters are separate from layouts and define slide chrome
- Slot component tokens (table, code, mermaid, quote) are injected into layouts that use markdown body slots

---

## Step 7: Restructure Component Tokens from Flat to Nested

**Why:** Nested token structures match component token interfaces, enabling compile-time validation and better IDE autocomplete. The old flat prefixed keys were error-prone and invisible.

**Before (flat prefixed):**
```typescript
card: {
  variants: {
    default: {
      padding: spacing.padding,
      cornerRadius: 0.05,
      backgroundColor: colors.secondary,
      backgroundOpacity: 15,
      borderColor: colors.secondary,
      borderWidth: 0.75,
      titleStyle: TEXT_STYLE.H4,
      titleColor: colors.text,
      descriptionStyle: TEXT_STYLE.SMALL,
      descriptionColor: colors.textMuted,
      gap: GAP.TIGHT,
    },
  },
},
```

**After (nested):**
```typescript
// Define reusable component tokens
const cardTitle: TextTokens = {
  style: TEXT_STYLE.H4,
  color: colors.text,
  linkColor: colors.primary,
  linkUnderline: true,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.MIDDLE,
  accents: colors.accents,
};

const cardDescription: TextTokens = {
  style: TEXT_STYLE.SMALL,
  color: colors.textMuted,
  linkColor: colors.primary,
  linkUnderline: true,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.MIDDLE,
  accents: colors.accents,
};

// Use in layout token maps
card: {
  background: {
    fill: colors.surfaceContainer,
    fillOpacity: 100,
    borderColor: colors.outlineVariant,
    borderWidth: 0.75,
    cornerRadius: 0.08,
  },
  padding: 0.25,
  gap: GAP.TIGHT,
  hAlign: HALIGN.CENTER,
  vAlign: VALIGN.TOP,
  title: cardTitle,
  description: cardDescription,
},
```

**Pattern:**
- Group related token properties under semantic keys (e.g., `title`, `description`, `background`)
- Use typed token objects (`TextTokens`, `ShapeTokens`, etc.) to enable IDE validation
- Reference shared token objects to avoid duplication

---

## Step 8: Update DSL Function Calls — Tokens as Second Argument

**Why:** The new DSL passes tokens explicitly as a separate argument, enabling type-safe token application and making the contract clear at call sites.

**Before (props-only):**
```typescript
// Text component — color and style lived in props
text(body, { style: 'h3', color: 'FF0000' })

// Card — all tokens mixed in props
card({ title: 'Hello', body: 'World', padding: 0.2, backgroundColor: 'F5F5F5' })

// Two parameters
component(name, props)
```

**After (props + tokens):**
```typescript
// Text component — tokens as second argument
text(body, {
  style: TEXT_STYLE.H3,
  color: 'FF0000',
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
  linkColor: '0066CC',
  linkUnderline: true,
  accents: { blue: '0066CC', ... },
})

// Card — tokens separate from props
card(
  { title: 'Hello', body: 'World' },
  {
    background: { color: 'F5F5F5', cornerRadius: 0.08, ... },
    padding: 0.2,
    gap: 'normal',
    title: { style: TEXT_STYLE.H4, color: '1A1A1A', ... },
    description: { style: TEXT_STYLE.BODY, color: '666666', ... },
  }
)

// Three parameters
component(name, props, tokens)
```

**TextTokens structure:**
```typescript
interface TextTokens {
  style: TextStyle;              // H1, H2, BODY, etc.
  color: string;                 // Hex color
  hAlign: HAlign;                // LEFT, CENTER, RIGHT
  vAlign: VAlign;                // TOP, MIDDLE, BOTTOM
  linkColor?: string;            // Link text color
  linkUnderline?: boolean;       // Link underline
  accents?: Record<string, string>;  // Accent colors for syntax, callouts
}
```

**ShapeTokens structure:**
```typescript
interface ShapeTokens {
  fill: string;                  // Hex color
  fillOpacity: number;           // 0–100
  borderColor?: string;          // Hex color
  borderWidth?: number;          // Points
  cornerRadius?: number;         // Inches
}
```

---

## Step 9: Define Layouts with Typed Token Support

**Why:** The new `defineLayout<TTokens>()` function enables compile-time validation of token requirements and provides a `.tokenMap()` method used in theme definitions.

**Before:**
```typescript
defineLayout({
  name: 'body',
  params: schema.object({
    title: schema.string(),
    body: schema.string(),
  }),
  slots: ['body'],
  render: (props) => {
    return column(
      plainText(props.title),
      // ... render body slots
    );
  },
})
```

**After:**
```typescript
interface BodyLayoutTokens {
  title: PlainTextTokens;
  eyebrow: PlainTextTokens;
  text: TextTokens;
  list: ListTokens;
  // Slot component tokens
  table?: TableTokens;
  code?: CodeTokens;
  mermaid?: MermaidTokens;
  quote?: QuoteTokens;
  testimonial?: TestimonialTokens;
}

export const bodyLayout = defineLayout<BodyLayoutTokens>({
  name: 'body',
  tokens: ['title', 'eyebrow', 'text', 'list', 'table', 'code', 'mermaid', 'quote', 'testimonial'],
  params: schema.object({
    title: schema.string().optional(),
    eyebrow: schema.string().optional(),
    body: schema.string(),
  }),
  slots: ['body'],
  render: (props, tokens) => {
    return column(
      ...(props.eyebrow ? [plainText(props.eyebrow, tokens.eyebrow)] : []),
      plainText(props.title, tokens.title),
      // ... render body with slot tokens injected
    );
  },
});
```

**Key points:**
- `defineLayout<TTokens>()` is parameterized with your token interface
- `tokens: [...]` array lists required token keys
- `render()` receives `tokens` as the second parameter
- `.tokenMap()` method validates that all required tokens are provided when used in the theme

---

## Step 10: Define Masters with Typed Tokens

**Why:** Masters now declare their token requirements and receive resolved tokens (not the entire theme), enabling type-safe chrome definitions.

**Before:**
```typescript
// Old pattern: Master was a simple object with getContent(theme)
const master = {
  name: 'default',
  getContent(theme) {
    const contentBounds = new Bounds(
      theme.spacing.margin,
      theme.spacing.margin,
      slideSize.width - theme.spacing.margin * 2,
      slideSize.height - theme.spacing.margin * 2 - theme.spacing.footerHeight,
    );
    return {
      content: ...,
      contentBounds,
      background: theme.colors.background,
    };
  },
};
```

**After:**
```typescript
interface DefaultMasterTokens {
  background: string;
  margin: number;
  footerHeight: number;
  footerText: string;
  slideNumber: SlideNumberTokens;
  footer: PlainTextTokens;
}

export const defaultMaster = defineMaster<DefaultMasterTokens>({
  name: 'default',
  tokens: ['background', 'margin', 'footerHeight', 'footerText', 'slideNumber', 'footer'],
  getContent: (tokens, slideSize) => {
    const { background, margin, footerHeight } = tokens;
    const contentBounds = new Bounds(
      margin,
      margin,
      slideSize.width - margin * 2,
      slideSize.height - margin * 2 - footerHeight,
    );

    const content = column(
      { height: SIZE.FILL, vAlign: VALIGN.BOTTOM, padding: margin },
      row(
        { gap: GAP.TIGHT, height: footerHeight, vAlign: VALIGN.MIDDLE },
        plainText(tokens.footerText, tokens.footer),
        slideNumber(tokens.slideNumber),
      ),
    );

    return { content, contentBounds, background };
  },
});
```

**Key points:**
- `defineMaster<TTokens>()` declares token requirements upfront
- `tokens: [...]` lists required token keys
- `getContent()` receives only the resolved tokens, not the entire theme
- Background color comes from tokens, not separately

---

## Step 11: Update Slide Creation to Use `masterName` + `masterVariant` Strings

**Why:** Slides now reference masters by name and variant string, not Master objects. This decouples slides from the master registry and enables flexible master switching.

**Before:**
```typescript
// Slide object held Master reference
const slide: Slide = {
  master: myMaster,
  content: column(...),
};
```

**After:**
```typescript
// Slide object uses masterName + masterVariant strings
export function masteredSlide(...content: SlideNode[]): Slide {
  return {
    masterName: 'default',
    masterVariant: 'default',
    content: column({ gap: GAP.NONE, height: SIZE.FILL }, ...content),
  };
}

const slide: Slide = {
  masterName: 'default',
  masterVariant: 'default',
  content: column(...),
};

// With minimal master
const slideMinimal: Slide = {
  masterName: 'minimal',
  masterVariant: 'default',
  content: column(...),
};

// Minimal with dark background
const slideDark: Slide = {
  masterName: 'minimal',
  masterVariant: 'dark',
  content: column(...),
};
```

**Key points:**
- Both `masterName` and `masterVariant` are REQUIRED strings
- They match keys in `theme.masters[masterName].variants[masterVariant]`
- Enables dynamic master selection without coupling to Master objects

---

## Step 12: Export `masters` from Theme Package Index

**Why:** The package needs to register masters alongside layouts and components.

**Before:**
```typescript
// index.ts
export const components = [textComponent, cardComponent, ...];
export const layouts = allLayouts;
export { theme } from './theme.js';
```

**After:**
```typescript
// index.ts
import { allLayouts } from './layouts.js';
import { defaultMaster, minimalMaster } from './master.js';
import type { MasterDefinition } from 'tycoslide';

export const components = [textComponent, cardComponent, ...];
export const layouts = allLayouts;

export const masters: MasterDefinition[] = [defaultMaster, minimalMaster];

export { theme } from './theme.js';
export { assets } from './assets.js';
export type { Assets } from './assets.js';
export * from 'tycoslide-components';
```

---

## Step 13: Remove Deleted Exports and Update References

**What changed:**
- `theme.colors` → removed (use local `colors` constant)
- `theme.borders` → removed (use local `borderWidth`, `cornerRadius` constants)
- `theme.components` → removed (replaced by `theme.layouts` + `theme.masters`)
- `theme.spacing.*` → reduced to `theme.spacing.{normal, tight, loose}`
- `DEFAULT_VARIANT` const → removed (variants are arbitrary strings, 'default' is convention)
- `ColorScheme` type → removed
- `Master` type → removed (replaced by `MasterDefinition`)
- `InferProps<T>` → renamed to `ComponentProps<T>`
- `componentRegistry.validateTheme()` → removed (validation is compile-time via `.tokenMap()`)

**Check for removed exports:**
```bash
grep -r "DEFAULT_VARIANT\|ColorScheme\|validateTheme" src/
```

**Replace `InferProps` with `ComponentProps`:**
```typescript
// Before
import { InferProps } from 'tycoslide-components';
type MyComponentProps = InferProps<typeof myComponent>;

// After
import { ComponentProps } from 'tycoslide-components';
type MyComponentProps = ComponentProps<typeof myComponent>;
```

---

## Step 14: Replace `InferProps` with `ComponentProps`

**Why:** Renamed for clarity. `ComponentProps<T>` reads as "extract the props type from component T".

**Before:**
```typescript
import { InferProps } from 'tycoslide-components';

type CardProps = InferProps<typeof cardComponent>;
```

**After:**
```typescript
import { ComponentProps } from 'tycoslide-components';

type CardProps = ComponentProps<typeof cardComponent>;
```

---

## Step 15: Remove `validateTheme()` Calls

**Why:** Theme validation moved to compile time. The `.tokenMap()` method on layouts and masters validates tokens at theme definition time. If a required token is missing, TypeScript will error immediately.

**Before:**
```typescript
import { componentRegistry } from 'tycoslide';

// Theme validation at runtime
const validation = componentRegistry.validateTheme(theme);
if (!validation.valid) {
  throw new Error(`Theme validation failed: ${validation.errors.join(', ')}`);
}
```

**After:**
```typescript
// No validation call needed.
// If a token is missing, .tokenMap() will error:
//   TS2345: Argument of type '...' is not assignable to parameter of type '...'

export const theme = {
  layouts: {
    body: {
      variants: {
        default: bodyLayout.tokenMap({
          // If you're missing a required token, TypeScript errors here
          title: ...,
          // ...error if 'text' is missing
        }),
      },
    },
  },
} satisfies Theme;
```

---

## Step 16: Build and Fix TypeScript Errors

The last step is mechanical but critical: rebuild and fix any remaining type errors.

```bash
# From theme package directory
npx tsc --build

# Or from repo root (if using workspaces)
npm run build

# If errors remain:
npm run typecheck
```

**Common errors:**

1. **Missing required tokens in `.tokenMap()`:**
   ```
   TS2345: Argument of type '{ title: ..., eyebrow: ... }' is not assignable
   to parameter of type 'BodyLayoutTokens'.
   Property 'text' is missing.
   ```
   → Add the missing token object.

2. **Unused local constants:**
   ```
   TS6133: 'oldSpacing' is declared but never used.
   ```
   → Delete it or move it into a token object.

3. **Old component variants still referenced:**
   ```
   TS2339: Property 'card' does not exist on type 'Theme'.
   ```
   → Move card tokens into a layout's token map.

---

## Migration Checklist

Use this checklist to ensure complete migration:

- [ ] **Step 1:** Change `: Theme` to `satisfies Theme`
- [ ] **Step 2:** Replace `spacing` with three-field `{ normal, tight, loose }`
- [ ] **Step 3:** Add `lineHeightMultiplier` and `bulletIndentPt` to every TextStyle
- [ ] **Step 4:** Move colors from `theme.colors` to local `colors` constant
- [ ] **Step 5:** Remove `theme.borders`, use local `borderWidth` and `cornerRadius` constants
- [ ] **Step 6:** Replace `theme.components` with `theme.layouts` + `theme.masters`
  - [ ] Create layout token interfaces for each layout
  - [ ] Use `defineLayout<TTokens>()` with token lists
  - [ ] Call `.tokenMap()` in theme variants
  - [ ] Define masters with `defineMaster<TTokens>()`
- [ ] **Step 7:** Restructure component tokens from flat prefixed to nested objects
  - [ ] Define reusable token objects (`cardTitle`, `bodyText`, etc.)
  - [ ] Group related properties (`background`, `title`, `description`)
  - [ ] Use typed token interfaces (`TextTokens`, `ShapeTokens`, etc.)
- [ ] **Step 8:** Update DSL function calls to pass tokens as second argument
  - [ ] Review all `text()`, `card()`, `table()` calls
  - [ ] Pass full token objects (not partial props)
- [ ] **Step 9:** Update layout definitions to declare and accept tokens
  - [ ] Add `TypeTokens` interface for each layout
  - [ ] Add `tokens: [...]` array listing required keys
  - [ ] Update `render(props, tokens)` signature
- [ ] **Step 10:** Define masters with `defineMaster<TTokens>()`
  - [ ] Add token interface for each master
  - [ ] Add `tokens: [...]` array
  - [ ] Update `getContent(tokens, slideSize)` signature
- [ ] **Step 11:** Update Slide creation to use `masterName` + `masterVariant` strings
  - [ ] Replace `master: myMaster` with `masterName: 'default', masterVariant: 'default'`
  - [ ] Ensure both fields are strings (not objects)
- [ ] **Step 12:** Export `masters` from theme package index.ts
  - [ ] Add `export const masters: MasterDefinition[] = [...]`
- [ ] **Step 13:** Remove references to deleted exports
  - [ ] Search for `DEFAULT_VARIANT`, `ColorScheme`, `validateTheme`
  - [ ] Remove or replace as needed
- [ ] **Step 14:** Replace `InferProps` with `ComponentProps`
  - [ ] Update all imports and type aliases
- [ ] **Step 15:** Remove `validateTheme()` calls
  - [ ] Delete runtime validation code
- [ ] **Step 16:** Build and fix TypeScript errors
  - [ ] Run `npm run build` or `npx tsc --build`
  - [ ] Fix any remaining errors
  - [ ] Verify all tests pass (if applicable)
  - [ ] Verify slide compilation works: `npx tycoslide build deck.md -o deck.pptx`

---

## Verification

After migration, verify the theme works end-to-end:

```bash
# Build the theme
npm run build

# Build a test slide deck
npx tycoslide build test-deck.md -o test-deck.pptx

# Check that .pptx contains expected styling
```

If your theme is used by other projects, rebuild those projects as well to ensure compatibility:

```bash
# From a consumer project
npx tsc --build
npm test
```

---

## Troubleshooting

**Problem:** `satisfies Theme` is a TypeScript 4.9+ feature.
→ Update TypeScript: `npm install -D typescript@latest`

**Problem:** `.tokenMap()` method doesn't exist on layout/master.
→ Ensure you're importing from the latest `tycoslide` version.
→ Run `npm install @latest tycoslide tycoslide-components`

**Problem:** Token validation errors in `.tokenMap()`.
→ Check the layout/master token interface for required fields.
→ Hover over the error in your IDE to see the required fields.
→ Add all missing tokens to the object passed to `.tokenMap()`.

**Problem:** Old `theme.colors` still referenced.
→ Use the local `colors` constant defined in theme.ts.
→ Replace `theme.colors.primary` with `colors.primary`.

**Problem:** Slide creation fails with `masterName` / `masterVariant` not recognized.
→ Ensure theme object has `masters` property (Step 12).
→ Verify master names match theme registry keys exactly.

---

## Summary

The q2-layout-token-infrastructure migration restructures themes from a flat component-centric model to a nested layout-centric model with compile-time validation. The changes enable:
- **Type safety:** Missing tokens caught at build time, not runtime
- **Composability:** Tokens defined once, reused across variants
- **Maintainability:** Token structure mirrors component interface
- **Designer-developer separation:** Designers own tokens, developers own layouts

After completing these 16 steps, your theme will be fully compatible with the new infrastructure and ready for future development.
