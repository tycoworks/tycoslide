# Layout System Design

## Problem Statement

When AI (Claude) creates slides using TycoSlide, it tends to invent layouts rather than selecting from proven templates. The current `contentSlide(...components: Component[])` API gives unlimited freedom to compose arbitrary structures. Most compositions look bad.

**Root cause:** Claude operates at the Component layer and tries to compose its way up. It should select from named layouts instead.

## Goals

1. **Formalize Layout as a type** in tycoslide core
2. **Add descriptions** so AI knows when to use each layout
3. **Keep it simple** — no generics, no complex metadata schemas

## Design

### The Layout Interface

Add to `src/core/types.ts`:

```typescript
// ============================================
// LAYOUT
// ============================================

/** A Layout is a named slide template with a description for AI discovery */
export interface Layout {
  name: string;
  description: string;
  render: (...args: any[]) => Slide;
}
```

That's it. Three properties:
- `name` — identifier for the layout
- `description` — when to use it (for AI and docs)
- `render` — the function that creates the slide (typed at implementation)

### Theme Implementation

Each layout is an object implementing the interface:

```typescript
// In theme's layouts.ts

export const titleSlide: Layout = {
  name: 'title',
  description: 'Opening slide with logo and large title. Use for presentation start.',
  render(title: string, subtitle?: string): Slide {
    const slideBox = column([0, 1], [
      column({ height: unit * 8, align: ALIGN.START },
        image(assets.brand.logoWordmark),
      ),
      column({ gap: GAP.TIGHT, justify: JUSTIFY.CENTER },
        ...(subtitle ? [text(subtitle, { style: TEXT_STYLE.H3, color: theme.colors.textMuted })] : []),
        h1(title),
      ),
    ]);
    return {
      background: assets.brand.background,
      draw: (canvas, bounds) => slideBox.prepare(bounds)(canvas),
    };
  }
};

export const sectionSlide: Layout = {
  name: 'section',
  description: 'Section divider with centered title. Use to introduce new sections.',
  render(title: string): Slide {
    const slideBox = column({ justify: JUSTIFY.CENTER },
      text(title, { style: TEXT_STYLE.H2, hAlign: HALIGN.CENTER }),
    );
    return {
      draw: (canvas, bounds) => slideBox.prepare(bounds)(canvas),
    };
  }
};

export const contentSlide: Layout = {
  name: 'content',
  description: 'General content slide with eyebrow, title, and flexible content area. Use when no specific layout fits.',
  render(title: string, eyebrowText: string, ...elements: Component[]): Slide {
    const slideBox = column([0, 1], [
      column({ gap: GAP.TIGHT },
        eyebrow(eyebrowText.toUpperCase()),
        h3(title),
      ),
      column({ justify: JUSTIFY.CENTER, gap: GAP.NORMAL },
        ...elements,
      ),
    ], { gap: GAP.NONE });
    return {
      master: CONTENT_MASTER,
      draw: (canvas, bounds) => slideBox.prepare(bounds)(canvas),
    };
  }
};

export const twoColumnSlide: Layout = {
  name: 'twoColumn',
  description: 'Two equal columns. Use for text+image, or side-by-side comparison.',
  render(title: string, eyebrowText: string, left: Component, right: Component): Slide {
    return contentSlide.render(title, eyebrowText, row(left, right));
  }
};

export const bulletSlide: Layout = {
  name: 'bullet',
  description: 'Intro paragraph followed by bullet list. Use for explaining key points.',
  render(title: string, eyebrowText: string, intro: string, bullets: string[]): Slide {
    return contentSlide.render(
      title,
      eyebrowText,
      text(intro),
      bulletList(bullets, { markerColor: theme.colors.primary }),
    );
  }
};

export const cardSlide: Layout = {
  name: 'card',
  description: '2-3 cards in a row with intro text. Use for comparing options or showing a set of related items.',
  render(title: string, eyebrowText: string, intro: string, cards: CardProps[]): Slide {
    const built = cards.map(c => buildCard(c));
    return contentSlide.render(title, eyebrowText, text(intro), group(row({ gap: GAP.NORMAL }, ...built)));
  }
};
```

### Collected Layouts Object

```typescript
// Export individual layouts and collected object
export const layouts = {
  titleSlide,
  sectionSlide,
  contentSlide,
  twoColumnSlide,
  bulletSlide,
  cardSlide,
  imageSlide,
  tableSlide,
  // ... helpers
  buildCard,
};
```

### Type Safety

Type safety comes from the `render` function signature at each implementation:

```typescript
// TypeScript knows this signature
layouts.twoColumnSlide.render('Title', 'EYEBROW', leftComponent, rightComponent);

// This would be a type error:
layouts.twoColumnSlide.render('Title');  // Missing arguments
```

The `Layout` interface uses `(...args: any[]) => Slide` because each layout has different parameters. The actual type checking happens at the implementation level.

### Iteration for Catalog

```typescript
// Generate a catalog of all layouts
for (const layout of Object.values(layouts)) {
  if ('name' in layout && 'description' in layout) {
    console.log(`${layout.name}: ${layout.description}`);
  }
}
```

## Migration

### Phase 1: Add type to core

Add the `Layout` interface to `src/core/types.ts` and export from `src/index.ts`.

### Phase 2: Refactor theme layouts

Convert existing layout functions to Layout objects. The `render` method bodies stay the same.

**Before:**
```typescript
export function titleSlide(title: string, subtitle?: string): Slide {
  // ...
}
```

**After:**
```typescript
export const titleSlide: Layout = {
  name: 'title',
  description: 'Opening slide with logo and large title.',
  render(title: string, subtitle?: string): Slide {
    // ... same body
  }
};
```

### Phase 3: Update usage (optional)

Existing code can keep using `layouts.titleSlide(...)` if we make Layout callable:

```typescript
// Keep backward compatibility
export const titleSlide = Object.assign(
  (title: string, subtitle?: string) => titleSlideLayout.render(title, subtitle),
  titleSlideLayout
);
```

Or just update call sites to use `.render()`.

## Summary

| What | How |
|------|-----|
| Formal type | `Layout` interface in core |
| AI discovery | `name` + `description` properties |
| Type safety | Typed `render` signature per layout |
| Iteration | `Object.values(layouts)` |
| Simplicity | No generics, no metadata schemas |

**The key insight:** Claude should SELECT layouts, not COMPOSE them. The `description` field tells AI when to use each layout.
