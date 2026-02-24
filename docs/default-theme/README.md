# tycoslide-theme-default

The default theme for tycoslide. Uses the Inter font family and a Material Design 3 color palette.

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
```

## What's Included

- **[Layouts](./layouts.md)** — `title`, `section`, `body`
- **[Customizing](./customizing.md)** — extend or replace colors, fonts, spacing, and component tokens

For all color, typography, and spacing values, see [`theme.ts`](../../packages/theme-default/src/theme.ts).

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
