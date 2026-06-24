# Bullet and Text Controls

Configurable bullet appearance (character, color, size) and paragraph spacing. Currently hardcoded — theme authors cannot control these.

## Motivation

Corporate PowerPoint templates define detailed bullet styles per nesting level: specific characters (`●`, `○`, `■`), brand-colored bullets, explicit point sizes, and hanging indent geometry. tycoslide hardcodes CSS `disc` and pptxgenjs defaults, so all themes render identical bullet appearance regardless of what the source PPTX specifies.

The Materialize template demonstrates the full scope:

```xml
<a:lvl1pPr indent="-304800" marL="457200">
  <a:buClr><a:schemeClr val="lt2"/></a:buClr>
  <a:buSzPts val="1200"/>
  <a:buChar char="●"/>
</a:lvl1pPr>
<a:lvl2pPr indent="-304800" marL="914400">
  <a:buClr><a:schemeClr val="lt2"/></a:buClr>
  <a:buSzPts val="1200"/>
  <a:buChar char="○"/>
</a:lvl2pPr>
<a:lvl3pPr indent="-304800" marL="1371600">
  <a:buClr><a:schemeClr val="lt2"/></a:buClr>
  <a:buSzPts val="1200"/>
  <a:buChar char="■"/>
</a:lvl3pPr>
```

Properties: 12pt bullet size, scheme-colored bullets (independent of text color), three-character rotation by level, consistent 0.3" hanging indent with 0.45" level increments.

## Current State

| Capability | Status | Where |
|---|---|---|
| Bullet character | Hardcoded CSS `disc` / pptxgenjs default `•` | layoutHtml.tsx:847, pptxConfigBuilder.ts:173 |
| Bullet color | Missing — inherits text color | No field anywhere |
| Bullet size | Missing — inherits text size | No field anywhere |
| Bullet indent | Supported via `bulletIndentPt` on TextStyle | types.ts:188 |
| Paragraph spacing | Hardcoded `1em` / `fontSize * 1.0` | layoutHtml.tsx:869, pptxConfigBuilder.ts:189 |
| Line height per-token | Missing — only via named TextStyle | list.ts:91 |

## Design

### Phase 1: BulletStyle type + ListTokens

#### Core type

```typescript
// packages/core/src/core/model/types.ts

export interface BulletLevelStyle {
  characterCode?: string;  // 4-digit Unicode hex: '25CF' for ●, '25CB' for ○, '25A0' for ■
  color?: string;          // hex color, independent of text color
  sizePt?: number;         // absolute bullet size in points
}
```

#### Where it lives: TextNode

Bullet styling is a per-node concern, not a per-TextStyle concern. The same named text style ("body") may appear with bullets in a list and without bullets in a paragraph. This mirrors how `linkColor` and `bulletIndentPt` already work — they live on TextNode, not TextStyle.

```typescript
// packages/core/src/core/model/nodes.ts — add to TextNode

bulletLevels?: BulletLevelStyle[];  // index 0 = level 0, index 1 = level 1, ...
```

When rendering a bullet run at level N, look up `bulletLevels[N]`. If the array is shorter than the level, wrap around: `bulletLevels[N % bulletLevels.length]`. This handles the common corporate pattern of 3 styles rotating across 9 levels.

#### SDK surface: ListTokens

```typescript
// packages/sdk/src/components/list.ts — expand ListTokens

export interface ListTokens {
  // ... existing: style, color, linkColor, highlightColor, linkUnderline ...
  bulletLevels?: BulletLevelStyle[];  // per-level bullet appearance
}
```

In `renderList()`, pass through to TextNode:

```typescript
const node: TextNode = {
  // ... existing fields ...
  bulletLevels: tokens.bulletLevels,
};
```

#### Theme consumption

```typescript
// In a theme's format file (e.g. materialize-theme presentation.ts)
list: {
  style: TEXT_STYLE.BODY,
  color: palette.text.body,
  bulletLevels: [
    { characterCode: '25CF', color: '#BDB0E0', sizePt: 12 },  // ● level 0
    { characterCode: '25CB', color: '#BDB0E0', sizePt: 12 },  // ○ level 1
    { characterCode: '25A0', color: '#BDB0E0', sizePt: 12 },  // ■ level 2
  ],
}
```

### Phase 2: Renderer changes

#### PPTX (pptxConfigBuilder.ts)

In `buildTextFragments()`, when constructing the bullet option for a run:

```typescript
if (run.bullet) {
  const level = run.bulletLevel ?? 0;
  const levelStyle = bulletLevels?.[level % (bulletLevels?.length || 1)];
  const base = run.bullet === true ? {} : run.bullet;
  const bulletOpt: Record<string, unknown> = { ...base, indent: bulletIndentPt };
  if (levelStyle?.characterCode && !base.type) {
    bulletOpt.characterCode = levelStyle.characterCode;
  }
  // sizePt and color require pptxgenjs patch (see below)
  options.bullet = bulletOpt;
}
```

#### pptxgenjs patch (PptxGenJS fork)

pptxgenjs does not expose `buClr`, `buFont`, or `buSzPts` in its user API. The fork at `/Users/chris.anderson/Development/PptxGenJS` needs a small patch.

In `src/gen-xml.ts` around line 932, where `strXmlBullet` is built:

```typescript
// Add before the existing buSzPct/buChar line:
let strXmlBulletColor = '';
if (textObj.options.bullet?.color) {
  strXmlBulletColor = `<a:buClr><a:srgbClr val="${textObj.options.bullet.color}"/></a:buClr>`;
}
let strXmlBulletSize = '<a:buSzPct val="100000"/>';
if (textObj.options.bullet?.sizePt) {
  strXmlBulletSize = `<a:buSzPts val="${Math.round(textObj.options.bullet.sizePt * 100)}"/>`;
}
strXmlBullet = strXmlBulletColor + strXmlBulletSize + '<a:buChar char="' + bulletCode + '"/>';
```

OOXML element ordering: `buClr` → `buSzPct`/`buSzPts` → `buFont` → `buChar`. The patch respects this.

Also add to the bullet interface in `src/core-interfaces.ts`:

```typescript
export interface IBulletOptions {
  // ... existing fields ...
  color?: string;   // hex color for bullet glyph
  sizePt?: number;  // absolute bullet size in points
}
```

#### HTML (layoutHtml.tsx)

In `renderTextRunsToHTML()`, when building `<ul>` / `<ol>`:

```typescript
// For custom character:
const levelStyle = bulletLevels?.[0];  // HTML doesn't track per-item level yet
const listStyleType = levelStyle?.characterCode
  ? `"\\${levelStyle.characterCode}  "`  // trailing spaces for visual gap
  : 'disc';

// For bullet color (requires wrapping text in span to isolate marker color):
if (levelStyle?.color) {
  parts.push(`<${tag} style="margin:0;padding:0 0 0 ${bulletIndentPx}px;list-style:${listStyleType} outside;color:${levelStyle.color}">`);
  // Each <li> wraps text in <span style="color:${textColor}"> to reset
} else {
  parts.push(`<${tag} style="margin:0;padding:0 0 0 ${bulletIndentPx}px;list-style:${listStyleType} outside">`);
}

// For bullet size: use font-size on ::marker or accept that HTML preview
// won't match PPTX exactly for bullet size. CSS ::marker font-size
// requires a <style> block, not inline styles. Accept the approximation.
```

**HTML limitation:** CSS inline styles cannot target `::marker` pseudo-element for independent bullet sizing. The HTML preview will use the text font size for bullets. This is acceptable — HTML is for measurement, PPTX is the deliverable.

### Phase 3: Paragraph Spacing

Independent of bullet work. Currently hardcoded.

#### Core type

```typescript
// packages/core/src/core/model/nodes.ts — add to TextNode

paragraphSpacing?: number;  // points — gap between paragraphs. Default: fontSize
```

#### PPTX renderer

```typescript
// pptxConfigBuilder.ts — replace hardcoded gap
fragments[idx].options.paraSpaceBefore = paragraphSpacing ?? style.fontSize * getParagraphGapRatio();
```

#### HTML renderer

```typescript
// layoutHtml.tsx — replace hardcoded 1em
const gapCss = paragraphSpacing ? `${paragraphSpacing * 1.333}px` : '1em';  // pt to px
parts.push(`<div style="margin-top:${gapCss}">${spans}</div>`);
```

#### SDK surface

```typescript
// list.ts — add to ListTokens
paragraphSpacing?: number;  // points
```

### Phase 4: Line Height Override (trivial)

SDK-only. Add optional `lineHeight` to `ListTokens`:

```typescript
lineHeight?: number;  // CSS multiplier, overrides textStyle.lineHeight
```

In `renderList()`:

```typescript
lineHeight: tokens.lineHeight ?? textStyle.lineHeight,
```

Zero core changes — `TextNode.lineHeight` already exists.

## Implementation Order

All phases are independent. Recommended order by value:

1. **Phase 1 + 2** together — BulletStyle type + renderer changes. Ship bullet character, color, and size in one pass.
2. **Phase 3** — Paragraph spacing. Small, self-contained.
3. **Phase 4** — Line height override. Trivial.

The pptxgenjs patch (for `buClr` and `buSzPts`) is a prerequisite for Phase 1+2 to produce correct PPTX output.

## Files Changed

| Phase | File | Change |
|---|---|---|
| 1 | `packages/core/src/core/model/types.ts` | Add `BulletLevelStyle` interface |
| 1 | `packages/core/src/core/model/nodes.ts` | Add `bulletLevels` to TextNode |
| 1 | `packages/sdk/src/components/list.ts` | Add `bulletLevels` to ListTokens, pass through |
| 1 | `packages/core/src/index.ts` | Export `BulletLevelStyle` |
| 2 | `packages/core/src/core/rendering/pptxConfigBuilder.ts` | Use bulletLevels for characterCode/color/size |
| 2 | `packages/core/src/core/layout/layoutHtml.tsx` | Custom list-style-type, marker color |
| 2 | PptxGenJS `src/gen-xml.ts` | Emit `<a:buClr>` and `<a:buSzPts>` |
| 2 | PptxGenJS `src/core-interfaces.ts` | Add `color`, `sizePt` to IBulletOptions |
| 3 | `packages/core/src/core/model/nodes.ts` | Add `paragraphSpacing` to TextNode |
| 3 | `packages/core/src/core/rendering/pptxConfigBuilder.ts` | Parameterize paraSpaceBefore |
| 3 | `packages/core/src/core/layout/layoutHtml.tsx` | Parameterize margin-top |
| 3 | `packages/sdk/src/components/list.ts` | Add `paragraphSpacing` to ListTokens |
| 4 | `packages/sdk/src/components/list.ts` | Add `lineHeight` to ListTokens |

## Decisions

- **BulletLevelStyle on TextNode, not TextStyle.** Bullet appearance varies by component context (lists have bullets, paragraphs don't). Same text style, different bullet config.
- **Array with wrap-around for levels.** 3 styles cover 9 PPTX levels via modulo. Matches the corporate pattern.
- **Absolute sizePt, not percentage.** The Materialize template uses `buSzPts` (absolute), not `buSzPct` (relative). Absolute is simpler to reason about and matches the PPTX more directly. Can add percentage later if needed.
- **pptxgenjs patch required.** The fork is local. The patch is ~15 lines. No workaround exists for bullet color/size without raw XML injection.
- **HTML bullet size is approximate.** CSS inline styles can't independently size `::marker`. Accept the deviation — HTML is for measurement, PPTX is the deliverable.
- **Defer bulletFont.** No concrete need yet. pptxgenjs hardcodes `buFont` and the patch surface is larger. Add when a theme needs it.
