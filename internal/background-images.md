# Background Images

Background images on slides go through the Image component pipeline (SVG rasterization + tinting) and are placed as full-bleed image shapes on the master layer. Native OOXML backgrounds (`<p:bg>`) are not used because they do not support `<a:duotone>` tinting.

## Design Decisions

**Native OOXML backgrounds are a dead end.** The `<p:bg><p:bgPr><a:blipFill>` element only supports `<a:lum/>` (luminance). Regular image shapes (`<p:pic>`) support `<a:duotone>` for tinting. Since tycoslide's image pipeline handles tinting, background images must be image shapes, not native backgrounds.

**Background images are declared on `Background`, not as a separate template field.** Theme authors set `background: { color, image: { src, tint } }` in `defineTemplate()`. The SDK strips `image` at the boundary before passing to core.

**The SDK owns the wider type.** Core's `Background` stays minimal (`{ color?, opacity? }`). The SDK defines its own `Background` with an optional `image?: BackgroundImage` field, following the established `CoreX` / `X` pattern used by TextStyle and FontFamily in `format.ts`.

**RenderContext stays immutable.** No setters, no callbacks, no mutation. The background image is injected into the component tree by `defineTemplate()`'s render wrapper.

**Image shapes on the master layer are visually identical to native backgrounds.** They sit at z-index 0, are not selectable on the slide, share the same deduplication via `defineMaster()`, and support tinting and SVG rasterization. The only difference is the PowerPoint "Format Background" dialog, which is irrelevant for generated output.

## Types

### SDK (`packages/sdk/src/theme/format.ts`)

```typescript
import type { Background as CoreBackground } from "@tycoslide/core";

export interface BackgroundImage {
  src: string;        // absolute path to image (PNG, SVG, etc.)
  fit?: Fit;          // default: FIT.COVER
  tint?: string;      // duotone tint color
}

export interface Background {
  color?: string;
  opacity?: number;
  image?: BackgroundImage;
}
```

### Core (`packages/core/src/core/model/types.ts`)

Remove the dead `image?: string` field from `Background`. Core's type becomes:

```typescript
export interface Background {
  color?: string;
  opacity?: number;
}
```

## Mechanism

### `defineTemplate()` render injection

When `background.image` is provided, `defineTemplate()` wraps the layout's render function to inject a master-layer image node behind the content:

```typescript
render: (params, slots, tokens): SlideNode => {
  const content = templateLayout.render(params, slots, tokens);
  if (!bgImage) return content;

  const bg = image(bgImage.src, { fit: bgImage.fit ?? FIT.COVER, tint: bgImage.tint });
  const bgContainer = column({ width: SIZE.FILL, height: SIZE.FILL }, bg);
  bgContainer.layer = LAYER.MASTER;
  return stack({ width: SIZE.FILL, height: SIZE.FILL }, bgContainer, content);
},
```

The `image()` call creates a ComponentNode. Core's `renderTree()` processes it through the Image component, which handles SVG rasterization (via `canvas.renderHtml()`) and tinting. The `column` container carries `LAYER.MASTER`, so `splitByLayer()` routes it to the master slide. `collectMasterObjects()` serializes it as a pptxgenjs master image object.

### `templatesToLayouts()` boundary

Strips the `image` field when converting SDK `Background` to core `Background`:

```typescript
function resolveBackground(bg: Background): CoreBackground {
  return {
    ...(bg.color != null && { color: bg.color }),
    ...(bg.opacity != null && { opacity: bg.opacity }),
  };
}
```

Called in `templatesToLayouts()` when building `TemplateConfig`:

```typescript
layouts[t.layout.name] = {
  background: resolveBackground(t.background),
  tokens: t.tokens,
};
```

## Theme Author API

```typescript
defineTemplate({
  name: TEMPLATE.COVER,
  documentation: { description: "Title slide with full-bleed background" },
  layout: margin(title),
  background: {
    color: "#100C21",
    image: { src: bgTitle },
  },
  tokens: { ... },
});
```

Background color acts as a fallback/underlay behind the image. The image renders on top via the master layer. Both are optional and compose independently.

## Implementation

### Files changed

| Package | File | Change |
|---------|------|--------|
| sdk | `theme/format.ts` | Add `BackgroundImage` type, SDK `Background` type |
| sdk | `theme/template.ts` | Read `background.image`, inject render wrapper |
| sdk | `theme/index.ts` | `resolveBackground()` in `templatesToLayouts()` |
| sdk | `index.ts` | Export `BackgroundImage`, SDK `Background` |
| core | `model/types.ts` | Remove dead `image?: string` from `Background` |
| theme-materialize | `chrome.ts` | Delete `withBackgroundImage` |
| theme-materialize | `formats/presentation.ts` | Replace `bg()` wrapper with `background.image` |

### Phasing

1. Add SDK types and `defineTemplate()` injection
2. Update Materialize theme to use new API (start with COVER template)
3. Remove dead `image?: string` from core `Background`
4. Delete `withBackgroundImage` from theme chrome
