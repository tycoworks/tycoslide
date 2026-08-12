# Image sizing & cropping — design

Give each image asset one declared property — **`type` (`icon | image | background`)** — and let the engine derive *everything else* (fit-to-frame vs fill-and-crop, the upscale ceiling, the low-resolution warning) from that `type` plus two numbers it already reads: the image's pixel dimensions and the slot frame's size. **No `fit` on the slot; no cues in the deck markdown.** The theme author tags assets; the engine does the rest.

Today the only control is `fit: contain | cover` on the slot, which describes what the *frame* wants and says nothing about what the *image* can survive — so a 100px icon in a big `contain` frame upscales ×10 into blur, and a `cover` slot will crop a logo in half.

## 1. Current state

- **`fit: contain | cover`** is required on every image parameter
  (`CompilerImageParameter.fit`, `markdown/types.ts`), flows into `ImageFill.fit`, and
  is enforced by `computeFit` (`engine/fillers/image.ts`). `cover` scales to
  `max(fitX, fitY)` and center-crops via `<a:srcRect>`; `contain` scales to
  `min(fitX, fitY)` and shrinks+recenters the frame. **Both scale with no floor and
  no ceiling** — `contain` upscales a small image without limit.
- **The asset catalog is mute.** `AssetEntry` (`markdown/types.ts`) is only
  `{ path, description, whenToUse? }`.
- **The theme already tags what we need — and the code ignores it.** Every entry in
  `mz-slides/theme.json` carries a `type: "icon" | "image"` field that `AssetEntry`
  doesn't declare and nothing reads (dead metadata), plus prose warnings like
  *"Icon-type: use in small slots, not a half-slide image area where it blows up."*
- **Data-flow fact that shapes the design:** the compiler resolves a raw frontmatter
  **path**, not a catalog key (`deckCompiler.ts` → `resolveImagePath` → `toImageFill`).
  There is no binding today between a filled image and its `AssetEntry`, and an
  author can supply a path with **no catalog entry at all** (a per-deck team photo).

## 2. The model — one authored control, everything derived

The composition choice (fit-to-frame vs fill-and-crop) is not an independent knob:
it falls out of what kind of image it is. An `icon` or an `image` (diagram,
screenshot) must show whole → **contain**; a `background` fills → **cover**. So the
slot never needs to state it — the asset's `type` does.

**Two inputs, and the engine already has both:**
- the asset's **`type`** — sets the *mode* (crop or not, cap upscaling or not);
- the **image pixels vs the frame size** — sets the *numbers* (scale factor,
  upscale detection, resolution warning).

```
type          →  crop? / upscale-cap? / show-whole-or-fill?
pixels ÷ frame →  by how much? / is it upscaling? / is it too low-res?
```

## 3. The `type` field

**Mandatory** — every image must resolve a `type`; a missing one is a fail-fast
error (no silent default, per house rule). It comes from one of two places:
- a **catalog asset** carries `type` on its `AssetEntry` (formalizes the theme's
  existing dead `type`);
- an **author-supplied image** (a per-deck path with no catalog entry — e.g. a team
  photo) gets its `type` from the **image parameter** the layout designer declares
  (mandatory on the parameter, theme-side, no markdown cue).

If a catalog asset with its own `type` lands in a parameter that also declares one,
the **asset wins** (its type is intrinsic to the pixels). If neither supplies a
`type`, the build fails naming the layout + slot.

```ts
export const AssetType = {
  Icon: "icon",             // crisp marks: logos, wordmarks, UI glyphs
  Image: "image",           // detailed, whole-frame-meaningful: diagrams, screenshots, illustrations, photos-shown-whole
  Background: "background",  // ambient / decorative: hero photos, textures, full-bleed art
} as const;
export type AssetType = (typeof AssetType)[keyof typeof AssetType];
```

## 4. What the engine derives (`type` × dimensions)

| `type` | composition | crop | upscale ceiling | low-res warning |
|---|---|:-:|:-:|:-:|
| `icon` | contain, centred | no | **native (1.0×)** — letterbox if frame is bigger | yes |
| `image` | contain | no | native *(or a tunable cap — §9)* | yes |
| `background` | cover (fill) | yes | unbounded | no |

- **Composition** (contain vs cover) = `background` fills, `icon`/`image` fit-whole.
- **Scale factor** = the existing `computeFit` geometry from frame ÷ image.
- **Upscale ceiling**: when the computed scale exceeds the ceiling, render at the
  capped size, centred (letterbox), rather than enlarging. Kills the blurry-icon case.
- **Low-res warning**: effective PPI = image px ÷ rendered inches (frame EMU ÷ 914400).
  Below a themeable floor → warn; grossly below (an `icon` forced into a full-bleed
  frame, effective upscale ≫ cap) → **error**.

Both `icon` and `image` carry the low-res warning — a **wordmark** is an `icon` yet
still wants a legibility floor, so the guards are a bundle, not one rule per type.

### 4a. Aspect mismatch — the case `type` exists to resolve

When the image and frame aspect ratios **match**, contain and cover are identical —
`type` is moot. They diverge only on a **mismatch** (a landscape image in a portrait
frame), and the divergence is stark:

- **contain** → whole image shown, large empty letterbox bands;
- **cover** → frame filled, the image's long edges cropped off.

The engine does **not** heuristically guess which is less bad — the right answer
depends on what the image *is*, which is exactly what `type` declares: `image` →
**contain** (letterbox; cropping a screenshot destroys content, empty bands don't);
`background` → **cover** (crop; filling is the point). So the mismatch is precisely
where `type` earns its keep. The size assessment still runs — it computes *how much*
is cropped or left empty — and emits a **warning on a severe mismatch** (e.g. cover
would crop > 50%, or contain leaves > 50% empty): a "bad asset for this slot"
signal, same spirit as the low-res warning. The decision stays deterministic from
`type`; only the warning is dimensional.

## 5. Slot `fit` is removed

The architect's strongest case for keeping slot `fit` was the "mixed hole"
(`theme.json:970`, `whenToUse: "product screenshot or illustration"`, currently
`fit: cover`). Run it through §4 with **no slot fit**:

- a **screenshot** (`type: image`) → **contain** (and this *fixes* today's bug where
  `fit: cover` crops it);
- a **photo** (`type: background`) → **cover**.

Both correct — from the asset's `type` alone. The slot's `fit: cover` did nothing
for the screenshot; the asset overrode it. That example argues for deriving from
`type`, not for a slot knob.

The *only* thing slot `fit` uniquely bought: forcing a **croppable** asset
(`background`) to render **contain** in one specific hole — the same photo shown
"filled" one place and "whole" another. That intent (*show whole vs fill*) is
already what `type` encodes (`image` = whole, `background` = fill), so if a single
photo is needed both ways it gets **two catalog entries** with different `type`s.
The intent travels with the tagged asset-use, which is where it belongs.

So `fit` is deleted from the image parameter. Neither the layout designer nor the
deck author writes anything about fit.

## 6. Data model & engine changes

The engine stays catalog-ignorant. The **compiler** expands `type` → generic numbers
and stamps them on `ImageFill`; the engine never learns "icon"/"background".

```ts
// engine/types.ts — replaces `fit`
export type ImageConstraints = {
  allowCrop: boolean;        // true → cover geometry; false → contain
  maxUpscale: number;        // 1 = never enlarge; Infinity = unbounded
  minShortEdgePx?: number;   // low-res floor for the warning
};
export type ImageFill = {
  type: typeof SlotType.Image;
  path: string;
  constraints: ImageConstraints;   // was `fit`
};
```

- **Compiler** (`toImageFill`, `deckCompiler.ts`): build a `path → AssetEntry` index
  from `config.assets`, look up the resolved path, map `type` → `ImageConstraints`.
  The `type → constraints` table is the one place the vocabulary lives.
- **Engine** (`computeFit` → takes `constraints`): pick contain/cover from
  `allowCrop`, clamp scale to `maxUpscale`, warn/error on `minShortEdgePx`. The
  existing geometry (srcRect crop, frame resize) is unchanged; we add the clamp and
  the warning. `FitMode` becomes an internal geometry detail derived from
  `allowCrop`, not an authored field.

## 7. Edge cases

- **Author-supplied image** (a raw path with no `AssetEntry` — the team-photo case
  from §1). It still needs a `type`, so the **image parameter declares one**
  (mandatory — §3). A headshot slot declares `type: background` (arrivals fill+crop);
  a "supply your own diagram" slot declares `type: image` (arrivals shown whole). No
  fallback, no guessing — a slot that accepts author images and declares no `type`
  fails at compile time.
- **Wordmark** (mark + "Materialize", wide): `type: icon`. Contain preserves the wide
  aspect, whole lockup shows, never cropped, never upscaled; the low-res warning
  still fires if it would render too small. Requires the asset be exported at
  adequate resolution — the warning says when it isn't.
- **Mermaid**: already projects to an Image fill rendered contain → `image` semantics.

## 8. Migration

Near-zero authored change. `mz-slides/theme.json` already stamps `type` on 100% of
assets:
- declare `type` on `AssetEntry` (required), retag genuinely full-bleed/ambient
  assets `image → background`;
- **delete `fit`** from the ~20 image parameters;
- swap `ImageFill.fit` for `ImageFill.constraints`; teach `computeFit` the clamp +
  warning.

## 9. Open decisions

1. **`image` upscale ceiling** — native (never enlarge) vs a modest cap (~1.5–2×).
   Lean **native + rely on the warning**; a cap is a one-line change if diagrams look
   soft.
2. **Low-res floor + mismatch threshold** — default PPI (≈96 screen / 150 print),
   the warn-vs-error thresholds, and the crop/empty percentage that trips the
   aspect-mismatch warning (§4a).

## 10. Out of scope

- **Optional slot-side `fit` override** — an escape hatch for the same-photo-two-ways
  case if two catalog entries feels clumsy. Not needed now.
- **Focal-point cropping** (`object-position`-style anchor for cover) — later; MVP
  centre-crops.
- **Auto-detecting `type`** from the file (alpha channel / colour count) so the theme
  author needn't tag — possible future automation; needs pixel inspection and can
  misclassify, so `type` stays declared.

## 11. Why this shape — three-way blind convergence

Three independent design passes, given the same neutral problem and no shared
framing, each proposed a **required three-value kind on the asset**, the engine kept
generic via compiler-expanded numeric constraints, and each independently found the
dead `type` field the theme already writes:

| this doc | pass A | pass B | pass C |
|---|---|---|---|
| `background` | `free` | `photo` | `fluid` |
| `image` | `framed` | `diagram` | `whole` |
| `icon` | `crisp` | `icon` | `fixed` |

All three kept a slot-side `fit`; an architecture review then showed the slot's fit
is **derivable from the asset `type`** in every real case (the "mixed hole" it cited
as the counterexample is actually *solved* by the asset's type), so this design goes
one step further and removes it. Composition, crop, scale, and warnings all fall out
of `type` + dimensions.
