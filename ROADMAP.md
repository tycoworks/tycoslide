# Roadmap

## Excess content limits

Enforce `maxChars`, `maxLines`, `maxItems` limits declared per parameter/slot in the manifest. Today the `limit` fields are advertised in the manifest but not enforced — over-limit content fills without warning. Should surface as a compile-time or generation-time error consistent with the rest of the fail-fast validation family.

## Multi-template themes

A theme should support multiple PPTX template files for different formats (e.g., presentation, factsheet, one-pager). Deck files would declare `format: presentation` in global frontmatter, and the theme config resolves that to the correct PPTX. Layouts are scoped per-format — a "body" layout in a presentation may have a different slide number than in a factsheet.

## Theme creation

No guided process for turning a PPTX into a tycoslide theme. Today you manually write `theme.json` by inspecting the template's slide numbers and shape names. A `tycoslide init` command or skill that automates this would lower the barrier significantly.

## Vector mermaid diagrams

Mermaid diagrams currently render as PNG images — the only non-editable output tycoslide produces. Everything else (text, code, tables) lands as native editable PowerPoint. Vectorizing mermaid via SVG → DrawingML conversion would close this gap: mermaid-cli can emit SVG directly (PNG is just a rasterization of it), and both SVG and DrawingML describe the same vector primitives (rectangles, paths, text, lines). The result would be a shape group in the slide that PowerPoint treats like any other editable diagram.

Approach: convert mermaid's SVG output to a DrawingML shape group and insert as the asset (in place of the current `<a:blip>` image). No off-the-shelf converter exists; options are extracting PPT Master's (github.com/hugohe3/ppt-master) SVG→DrawingML machinery, using a bridge library, or writing a mermaid-scoped converter for the constrained SVG subset mermaid actually emits.

Known challenges: `foreignObject` HTML text in some mermaid outputs doesn't map cleanly to DrawingML (needs fallback), font availability in PowerPoint, dense diagrams (sequence, class) fiddlier than flowcharts.

## Charts

Data visualizations (bar, line, pie, scatter, area) authored in markdown fenced blocks. Similar developer experience to mermaid — write source in a ` ```chart ` or ` ```vega ` fence targeting a chart slot on the layout.

Two implementation paths, in order of aspiration:

- **Native PPTX chart objects.** PPTX supports native charts via DrawingML `<c:chart>` elements. Output is editable in PowerPoint (data table, chart type, colors all live) — consistent with tycoslide's "everything editable" ethos. Requires generating chart XML, embedding the data table, and honoring theme colors. Meaningful implementation cost.
- **Rasterized fallback.** Same shape as mermaid — render via a headless chart library to PNG, treat as an image asset. Simpler MVP, but non-editable output (same weakness as mermaid).

Source format: pick one that maps cleanly to PPTX chart types. Candidates: Vega-Lite (declarative, widely known, but many features won't map cleanly), a bespoke YAML shape (less expressive but easier to map 1:1), or lean on mermaid's future pie/xy support.

Theme integration: charts inherit the theme's color palette (same accent-color-round-robin idea as mermaid). Chart type declared per slot in the manifest so the layout designer constrains what kind of chart lands where.

Overlaps with the "vector mermaid diagrams" item — if we build a serious PPTX chart-object generator, the same machinery could handle mermaid's flowchart output as native shapes too. Worth considering as a combined push rather than two parallel projects.

## Image sizing and cropping controls

Today the only image-fit control is `fit` on an image slot (required, `contain | cover`) — a layout-designer decision baked into the slot, not a per-asset or per-slide override. This doesn't cover the fuller question of image sizing behavior:
- Should there be a minimum size below which the engine warns or errors (avoid supplying tiny images to full-bleed slots)?
- Should there be a maximum size / auto-downscale for very large images (avoid inflating PPTX file size)?
- Should fit modes be more expressive — e.g., padding on contain, focal-point cover, or fit-to-width vs fit-to-height?
- Should sizing behavior stay on the slot (declared by the layout designer) or move to the asset entry (declared by the theme's asset catalog), or split across both?

Prior conversation touched on the layout-vs-asset ownership question and left it undecided pending a use case. Revisit when image behavior starts biting.

## Parameter type safety

Parameters today are typed only as `template` or `image`. A richer per-layout parameter schema — enums, bounded numbers, typed asset references — validated before render, would sharpen author feedback: the compiler could reject unknown or malformed frontmatter keys, and fail fast on violation with layout + key context. tycoslide's `template | image` is the right non-over-engineered choice for now, but this is a natural extension — a manifest could declare a parameter as an enum (`variant: "dark" | "light"`), a bounded number, or a typed asset reference. Would let the manifest express designer intent the current two-kind split can't. Revisit if authors start needing constrained non-template/image inputs.
