# Parameters are only template fills

> Status: **proposed (29 Aug 2026).** Redraws the parameter/slot line. Supersedes the
> `parameters` half of the split approved in
> `internal/composition-vs-content-paradigm.md` §6; slots are unchanged.

## The rule

**A parameter is a template fill. Everything else is a slot.**

- **Slot** — a shape whose content is replaced: text, table, image. Filled from a
  `::key::` region in the body.
- **Parameter** — a `{key}` placeholder inside a styled shape, substituted into the
  shape's existing runs so the surrounding styling survives. One shape can carry
  several. Filled from a frontmatter line.

Nothing else distinguishes them, and a theme author chooses nothing.

There is no backward compatibility. A raw asset path in frontmatter does not get a
deprecation path; it stops existing, and `$category.name` in a body region becomes the
only way to name an asset. That closes the two-addressing-schemes problem
`composition-vs-content-paradigm.md` §8 deferred, by deleting one of them.

Nothing shipped should mention the old model. `SKILL.md`, `syntax.md`, `README.md` and
code comments describe what is — no "previously", no "no longer a parameter", no
"instead of". This doc is the exception: recording why is what it is for.

## Why the current split is wrong

Today `parameters` means "inputs written as a frontmatter line" and holds two unrelated
things: template placeholders and image shapes. It groups by *how the author types the
value*, not by what the fill does to the shape.

That grouping silently decides capability. A mermaid fence is a block, so it can only
fill a slot. Declaring an image shape as a parameter therefore makes it permanently
diagram-proof — a decision nobody knew they were taking, recorded nowhere, enforced by
nothing.

The result in mz-slides: exactly one layout has an image *slot*, and its frame spans the
whole slide, so diagrams render behind the title. Two layouts have a well-proportioned
4.91 × 4.63in image area, declared as parameters, where no diagram can ever go. The
shapes diagrams need already exist and are unreachable.

## Why template fills genuinely differ

They are not slots that happen to be terse. Three independent reasons, each fatal to
modelling them as slots:

1. **A template parameter has no key.** Its author-facing keys are the `{}` placeholders
   in its template string, and one parameter flattens into N manifest entries. "One key,
   one slot" is simply false here.
2. **There is no region to write into.** The template string owns the line structure —
   `{name}\n{jobTitle}` is two lines of one shape — and the author supplies inline values.
   A value cannot contain a newline, because the lines belong to the designer's shape.
3. **A `TemplateFill` is not a block.** It is positional substitution into runs that
   already exist, not content replacement. `AcceptType` excludes it at the type level, and
   there is no markdown an author could write that yields one.

So the line is not a stylistic preference. Replacing a shape's content and substituting
into its runs are different operations, and the two concepts name that difference.

The names stay `parameters` and `slots`. `parameters` only read as a misnomer while the
list held image shapes as well; holding template fills alone, a named value the author
supplies is exactly what a parameter is.

## What this is not

Rejected on the way here, recorded so they are not re-proposed:

- **Collapse everything into slots.** Template fills do not fit, for the three reasons
  above. Modelling them as slots means an `accepts` arm that can never appear in
  `accepts`, turning a compile-time guarantee into a runtime check.
- **Let an image slot also take a frontmatter line.** Terser decks, but it gives one shape
  two doors, needs a fail-fast rule for double-fills, and needs the manifest to advertise
  which slots accept which channel. More machinery than the verbosity is worth.
- **Let the theme author choose per shape, with the choice documented.** This is the
  status quo plus a rule nobody reads. The channel is a consequence of the content type,
  not an authoring decision.
- **"A slot takes frontmatter when its value is scalar."** Sounds symmetric, but the
  frontmatter schema is built before any value is seen, so it cannot inspect values. Made
  static, it admits text — 27 of 30 slots in mz-slides — down a path that bypasses the
  block registry, the inline parser and Shiki. `code:` would render unhighlighted.

## Consequences

**Deck syntax.** An image moves from a frontmatter line to a body region:

```markdown
---
layout: Three columns with icons dark
col1_icon: assets/icons/check.png
---
```

becomes

```markdown
---
layout: Three columns with icons dark
---

::col1_icon::

$icons.check
```

Two lines where there was one, on 19 image shapes, 16 of them required. That is the price
of the rule, paid so that every image shape can equally hold a diagram.

**The code gets smaller.** With `parameters` holding only template fills, `ParameterType`
becomes a single-member enum and goes; `CompilerParameter` and `ParameterSchema` stop
being unions; the 14 references to `ParameterType.*` collapse, and six `switch` statements
over the parameter type become straight-line code.

**The manifest changes shape.** Image entries move from `parameters` to `slots`. No new
field is needed: an agent reads the channel off `accepts`, exactly as it does today, and
the rule is one sentence in SKILL.md rather than a flag that could contradict `accepts`.

## Work

1. Delete the image arm of the parameter type. `ParameterType` becomes a single member and
   is removed; the parameter schema, the compiler's frontmatter loop, the manifest
   projection and `toEngineLayout` lose their type switches.
2. Delete raw-path asset resolution. `$category.name` in a body region already works and
   becomes the only addressing form.
3. Convert the 19 image parameters in mz-slides' `theme.json` to slots, recording each
   shape's observed frame.
4. Rewrite the 22 frontmatter image lines across `showcase.md` and `decks/demo.md`.
5. Rewrite `SKILL.md` and `syntax.md` around the new rule — the old split is their
   organising idea, and `syntax.md`'s "Image parameters" section goes. Describe only what
   is; no trace of the old model survives in either.
6. Build a deck with a diagram in one of the newly reachable inset frames, and look at it.

Ship as one change. An intermediate state where some image shapes are parameters and
others are slots is the current confusion made worse.

## Open

- Whether an icon well should refuse a diagram at all. Under this rule a diagram is legal
  in a 0.3in icon shape. The constraint, if it is one, is about size and belongs nowhere
  near the channel — the render pass already makes the mistake obvious.
