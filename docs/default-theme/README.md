# tycoslide-theme-default

The default theme for tycoslide. Uses the Inter font family and a Material Design 3 color palette.

## Features

- **Inter font** — Light (300), Regular (400), and Bold (700) weights via `@fontsource/inter`
- **Material Design 3 colors** — WCAG AAA contrast ratios throughout
- **Spacing** — 1/32-inch grid unit base spacing
- **Three layouts** — `title`, `section`, `body`
- **All built-in components themed** — token values for text, card, quote, table, line, shape, slideNumber
- **Material Design icons** — five bundled SVG icons via `@material-design-icons/svg`

## Installation

```bash
npm install tycoslide-theme-default
```

## Usage

Reference the theme in your presentation's global frontmatter:

```markdown
---
theme: tycoslide-theme-default
---

---
layout: title
title: My Presentation
subtitle: A Brief Overview
---

---
layout: body
title: Key Points
eyebrow: OVERVIEW
---

Content goes here.
```

## What's Included

- **[Layouts](./layouts.md)** — `title`, `section`, `body`
- **[Component Tokens](./component-tokens.md)** — token reference for all themed components
- **[Customizing](./customizing.md)** — extend or replace colors, fonts, spacing, and component tokens

## Color Palette

All hex values are without the `#` prefix (as used throughout the tycoslide theme system).

| Token | Value | Usage |
|-------|-------|-------|
| `background` | `FFFFFF` | Slide background |
| `text` | `1C1B1F` | Body text (16.1:1 contrast, AAA) |
| `textMuted` | `49454F` | Secondary text, captions (7.5:1 contrast, AAA) |
| `primary` | `1976D2` | Material Blue 700 — primary accent |
| `secondary` | `E7E0EC` | Material surface-variant — subtle fills |
| `subtleOpacity` | `15` | Background opacity (%) for subtle fills |

Accent colors (used with `:name[text]` inline highlights):

| Token | Value |
|-------|-------|
| `accents.blue` | `1976D2` |
| `accents.green` | `388E3C` |
| `accents.red` | `D32F2F` |
| `accents.yellow` | `FBC02D` |
| `accents.purple` | `7B1FA2` |

## Typography

All text styles use Inter. Font sizes are in points.

| Style | Size | Color |
|-------|------|-------|
| `h1` | 36pt | `text` |
| `h2` | 28pt | `text` |
| `h3` | 22pt | `text` |
| `h4` | 18pt | `text` |
| `body` | 14pt | `text` |
| `small` | 12pt | `textMuted` |
| `eyebrow` | 10pt | `textMuted` |
| `footer` | 8pt | `textMuted` |

## Spacing

All values are in inches. The base unit is `0.03125"` (1/32 inch).

| Token | Value | Inches |
|-------|-------|--------|
| `unit` | `0.03125` | 1/32" |
| `margin` | `0.5` | 16 units |
| `gap` | `0.25` | 8 units |
| `gapTight` | `0.125` | 4 units |
| `gapLoose` | `0.5` | 16 units |
| `padding` | `0.25` | 8 units |
| `cellPadding` | `0.0625` | 2 units |
| `bulletSpacing` | `1.5` | (multiplier) |
| `bulletIndentMultiplier` | `1.5` | (multiplier) |
| `maxScaleFactor` | `1.0` | (multiplier) |
| `lineSpacing` | `1.2` | (multiplier) |

## Slide Size

`SLIDE_SIZE.S16x9` — 10" × 5.625", standard widescreen.

## Bundled Icons

The `assets` export provides paths to five Material Design SVG icons:

```typescript
import { assets } from 'tycoslide-theme-default';

assets.icons.barChart   // bar_chart (filled)
assets.icons.group      // group (filled)
assets.icons.lightbulb  // lightbulb (filled)
assets.icons.rocket     // rocket_launch (filled)
assets.icons.shield     // verified_user (filled)
```

## Documentation

For the full tycoslide framework — custom components, layout authoring, TypeScript DSL — see the [main tycoslide documentation](../README.md).
