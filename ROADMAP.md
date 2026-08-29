# Roadmap

## Multi-template themes

A theme should support multiple PPTX template files for different formats (e.g., presentation, factsheet, one-pager). Deck files would declare `format: presentation` in global frontmatter, and the theme config resolves that to the correct PPTX. Layouts are scoped per-format — a "body" layout in a presentation may have a different slide number than in a factsheet.

## Theme creation

No guided process for turning a PPTX into a tycoslide theme. Today you manually write `theme.json` by inspecting the template's slide numbers and shape names. A `tycoslide init` command or skill that automates this would lower the barrier significantly.

## Vector mermaid diagrams

Mermaid renders as PNG — the only non-editable output tycoslide produces, where text, code and tables all land as native editable PowerPoint. The vector source is already in hand, since mermaid produces SVG in the browser and the Playwright renderer screenshots it, and SVG and DrawingML describe the same primitives. Converting that SVG to a DrawingML shape group, in place of the current `<a:blip>` image, would give PowerPoint a diagram it treats like any other. No off-the-shelf converter exists: the options are extracting PPT Master's (github.com/hugohe3/ppt-master) machinery, using a bridge library, or writing a converter for the constrained SVG subset mermaid emits. Known challenges are `foreignObject` HTML text needing a fallback, font availability in PowerPoint, and dense diagrams (sequence, class) being fiddlier than flowcharts.

## Charts

Data visualizations (bar, line, pie, scatter, area) authored in fenced blocks, the same developer experience as mermaid — write source in a ` ```chart ` or ` ```vega ` fence targeting a chart slot. Two paths, in order of aspiration: native PPTX chart objects via DrawingML `<c:chart>`, editable in PowerPoint and matching the "everything editable" ethos but meaningfully more to build; or a rasterized fallback shaped like mermaid's, with the same non-editable weakness. The source format has to map cleanly to PPTX chart types — Vega-Lite is declarative and widely known but much of it won't map, a bespoke YAML shape is less expressive and easier to map 1:1. Charts would inherit the theme palette and declare their type per slot. Overlaps with vector mermaid: one PPTX shape generator could serve both, so they are worth costing as a single push.

## Content-shape constraints on slots

Slots advertise `accepts` at the engine fill-type granularity — `text`, `table`, `image` — which is too coarse to constrain design: prose and a fenced code block are both `text`, a photo and a mermaid diagram are both `image`. So a `text` slot the designer styled for prose silently accepts a code block, which gets highlighted but rebuilt with the prose slot's paragraph styling, and the theme has no way to reject it. Let the theme constrain the **content shape** instead — `prose` / `code` / `table` / `image` / `mermaid` — so a designer can say "prose only, no code here". The compiler already detects the shape (it is how it decides to highlight a fence vs render prose), so `assertSlotRegion` would compare detected against allowed and fail fast, with engine fill types unchanged. Unlike a manifest hint this adds real validation, and it fits "the theme controls design". Revisit when a theme has a slot whose styling genuinely breaks for the wrong content shape.

## Open painter / component SDK (north-star, likely over-engineering for now)

The old tyco had an open component SDK — every component (text/table/image) was implemented against a public interface, so anyone could add custom components used from markdown. The current engine collapsed that to 4 built-in `FILLERS`. If theme painting keeps growing bespoke (see the summary-row saga), the seam to reopen is: (1) promote `Filler` to a public `(specimenDOM, content, config) → mutate` interface; (2) let a theme register painters by key and reference them per slot in the manifest; (3) carry each painter's config schema in the manifest so the agent/author knows what to write — layer 3 is the expensive, open-ended part. YAGNI for a single-theme, scratch-an-itch project: only worth it when a SECOND theme (or a paying custom-theme customer) needs a painter the engine can't express.

## Slot dimensions in the manifest

A slot's `accepts` says what kind of content fits, never how much room there is — so a half-inch icon well and a five-inch illustration frame look identical to an authoring agent, which is how a diagram ends up in an icon well. The only feedback is the `shrunk to X%` advisory, which fires after the deck is built. Emit each slot's rendered size (converted from its `frame`, in inches) alongside `accepts`, so size is visible while the agent is choosing a slot rather than after it has filled one. No engine or theme change: `stripSlot` already holds the slot, and every slot carries a real observed frame. Note this makes the mistake visible, not impossible — a slot that should refuse a diagram outright is the content-shape constraint above, not a size hint.
