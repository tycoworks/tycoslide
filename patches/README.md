# PPTXGen.js Patches

Patches applied via [patch-package](https://github.com/ds300/patch-package) to pptxgenjs v4.0.1.

## Patch 1: Rich text arrays in slide masters

**Files:** `pptxgen.cjs.js`, `pptxgen.es.js` — `createSlideMaster()`

**Bug:** `defineSlideMaster()` always wraps master text content in `[{ text: ... }]`,
discarding any rich text array (multiple styled runs) passed by the caller.

**Fix:** Check if the text content is already an array before wrapping:
```js
// Before (broken):
addTextDefinition(tgt, [{ text: object[key].text }], object[key].options, false);

// After (fixed):
const _txtContent = Array.isArray(object[key].text) ? object[key].text : [{ text: object[key].text }];
addTextDefinition(tgt, _txtContent, object[key].options, false);
```

Applied to both `text` and `placeholder` branches.

## Patch 2: Slide number visibility in master XML

**Files:** `pptxgen.cjs.js`, `pptxgen.es.js` — `makeXmlMaster()`

**Bug:** The generated `slideMaster1.xml` contains `<p:hf sldNum="0"/>`, which tells
PowerPoint to hide slide numbers globally. There is no API to control this flag.

**Fix:** Change `sldNum="0"` to `sldNum="1"`:
```xml
<!-- Before (hidden): -->
<p:hf sldNum="0" hdr="0" ftr="0" dt="0"/>

<!-- After (visible): -->
<p:hf sldNum="1" hdr="0" ftr="0" dt="0"/>
```

## Workaround (in tycoslide, not patched): Master slideNumber propagation

**Bug:** PPTXGen.js does not propagate `slideNumber` defined on a slide master to
individual slides that use that master. Each slide must have `slide.slideNumber` set
explicitly, or no slide number appears.

**Workaround:** `PptxRenderer.defineMaster()` extracts slideNumber options from the
master canvas and stores them in a `masterSlideNumbers` Map. `renderSlide()` then
applies the master's slideNumber as a default on each slide before rendering
slide-level content (which can override it).

See `src/core/renderer.ts`.
