# Deck composition: consolidated research findings & the crux answer

> Status: **synthesis (Aug 2026).** Consolidates three parallel deep-research sweeps on
> deck composition into one doc, answers the crux fork the research was commissioned to
> settle, and maps the answer onto tycoslide's existing roadmap. Upstream companion to
> `internal/composition-vs-content-paradigm.md` — that doc builds the *sampler* (how a
> `.pptx` becomes a menu of fillable layouts); this doc settles *how an agent composes
> against that menu*, i.e. the deliberately-descoped "agent-guidance layer" (paradigm
> roadmap step 6) and the composition principles that live in the agent skill.
>
> Sources: `research-01-autolayout-tools.md` (commercial auto-layout tools),
> `research-02-llm-slide-gen.md` (LLM/code slide tools + academic layout generation),
> `research-03-narrative-scaffolds.md` (narrative scaffolds / is the sequence first-class?).
> Full findings + URLs archived in those files.

## The question

tycoslide fills a designer's `.pptx`. The sampler (paradigm doc) turns that file into a
menu of layouts, each with slots that `accept` observed content types. The open design
question sitting *on top* of that: **when an agent turns content into a deck, does it
reason slide-by-slide ("what layout fits this chunk?") or sequence-first ("this is a
pitch, so it needs this arc of slide-roles in roughly this order")?** And, relatedly, how
should the layout menu be *represented* to the agent — describe, or prescribe?

## Three convergent findings (across all three sweeps)

**1. Represent the menu by DESCRIBE (structured capability), not PRESCRIBE (rule tables).**
Every system that works converges here. A small structured per-element/per-slot schema —
*category / description / accepted-content* — beats both bare layout names (Slidev's 18
named layouts carry only a one-line "what it looks like," no "use when") and bare
structural directives (Marp has no named layouts at all). PPTAgent's per-slide schema
(`category` + `description` + `content`) outperformed flatter text-to-slides baselines on
content/design/coherence. In the adjacent layout-generation literature, HTML-like
*structured* representations (PosterLLaVa, PosterLlama) beat raw numeric coordinates, and
retrieval of *real exemplars* (VASCAR, LayoutRAG) beat generate-from-scratch. Tellingly,
even the community's LLM-tuned Slidev skill converged on tighter *descriptions*, not
prescriptive "use X when Y" rules. The one inspectable production engine (Deckbuilder MCP)
scores content along structure+intent axes and returns *ranked, explained* candidates —
not a decision tree.
→ **Strong convergence with tycoslide's already-chosen model.** The sampler's "each slot
`accepts` the content types *observed* at that position (real specimen, no extrapolation)"
IS the structured-capability-schema-of-real-exemplars that this literature says works.
We're already on the right side of this.

**2. Sequence-level planning beats independent per-slide choice — for narrative decks.**
PPTAgent generates a whole-deck *outline* (picking a reference layout per entry) *before*
filling any slide. Gamma's product flow is outline-first (approve the sequence of titles,
then generate cards). Duarte's *slide:ology* prescribes storyboarding the whole arc before
designing any slide. Auto-Slides (arXiv 2509.11062) restructures source content out of its
native order (IMRaD → a presentation-native Problem-Motivation-Results-Conclusion) and
*measures* a quality lift from doing so. The gain is real and it is specifically a
*sequence* property: Minto/SCQA shows the order of claims IS the argument (answer-first,
then support), and Duarte's sparkline shows persuasion depends on *contrast between
adjacent slides* — neither is recoverable by scoring slides independently.

**3. But the load-bearing unit is "these roles present," not "this exact order."**
Kawasaki and YC both explicitly say founders may reorder to lead with strengths; the
*menu of roles* is fixed, the order is a rhetorical choice. And the whole effect only
applies to one side of a clean dividing line the research draws:

> **Persuasive, audience-doesn't-know-the-answer-yet → needs an arc.**
> **Informational, audience-will-look-things-up → doesn't.**

Pitch / sales / QBR / any recurring persuasive deck benefit from a sequence scaffold.
Reference / catalog / technical-readout decks have *no* canonical scaffold in the research
(none surfaced despite searching) and gain nothing from an imposed one — each slide just
needs to fit its content.

## The negative example that validates our product line

Gamma, Tome, and Canva Magic Design all **collapse composition and design into a single
generative step** — they invent layout *and* color/type/imagery together. That is exactly
what tycoslide refuses to do. The closest *positive* structural precedent is
**Beautiful.ai**: the human/agent picks the slide *type* (composition), a deterministic
engine fills within it (mechanics), and a separate brand-lock layer fixes visual design.
That three-way split — **agent composes → engine fills → template designs** — is
tycoslide's architecture. The research gives us an existence proof that the split works
commercially, and three cautionary examples (Gamma/Tome/Canva) of what collapsing it looks
like. Nothing in the surveyed field implements "composition varies, design 100% fixed by an
external template." That gap is the product.

## The crux answer

**It is not per-slide *vs* sequence. It is a two-tier model, and per-slide is the floor.**

- **Tier A — per-slide fill against the sampler (always on).** Base mechanism. The agent
  maps a content chunk to a layout whose slots `accept` that content's types. This is the
  sampled-composition engine already built (paradigm doc slices 1–2). It is sufficient on
  its own for informational/reference/catalog decks, and it is the fallback for everything.

- **Tier B — sequence scaffold (optional, only for narrative deck types).** A *typed
  vocabulary of slide-roles in a default, rearrangeable order*, reasoned about at the deck
  level *before* per-slide fills — mirroring Gamma's outline-first and Duarte's
  storyboard-first. Applies only to the persuasive/recurring side of the dividing line.
  Soft, not rigid: roles may be omitted or reordered; the order is a default, not a
  constraint. The scaffold selects *which layouts, in what order*; Tier A then fills each.

The agent needs one cheap heuristic to pick the tier: **is the audience being persuaded
toward an answer they don't have yet (→ Tier B), or looking information up (→ Tier A)?**

## How this maps onto the existing roadmap

The paradigm doc's roadmap (its §5) already anticipated this and *descoped* it. The
research now tells us how to rescope:

- **Step 3 — "manifest advertises `accepts`."** Confirmed by finding #1: advertise each
  slot's accepted content types as a *structured capability* the agent reads. DESCRIBE.
  No change of plan — the research ratifies it. (Present the *real observed accepts*, not
  invented rules.)

- **Step 6 — "agent-guidance layer (was descoped): structural layout descriptions to help
  agents choose — revisit whether/how."** This is where the crux answer lands. Split it:
  - **6a — per-slot/per-layout structural description (DESCRIBE).** A terse purpose/shape
    blurb per layout ("two-column, image left"), plus its `accepts`. This is Tier A's
    guidance surface. Low-risk, clearly composition-not-design. In scope.
  - **6b — sequence scaffolds (Tier B).** Higher-stakes; see the boundary note below.
    Gate behind 6a. Only for narrative deck types.

- **The agent skill's "handful of composition principles."** Finding #2 gives the
  content: a *general* (not per-layout) short list — e.g. one idea per slide; answer-first
  headline (Minto/BLUF); contrast between adjacent slides (Duarte); restructure source
  material into a presentation-native order rather than echoing its native order
  (Auto-Slides). These are composition taste, not design, and not per-layout — they fit
  the already-approved "composition principles live in the skill" slot exactly.

## DECISION (user, Aug 2026): the story is INPUT; tycoslide implements it

> Superseded/extended by `internal/product-direction.md` — the settled product line
> (engine + theme fidelity + editability is the product; composition intelligence is OUT).
> Read that doc first; this section is the reasoning that led there.

**Resolved.** tycoslide assumes a **slide-by-slide description of the story already
exists** — the narrative and its decomposition into slides arrive as *input* (from the
user or an upstream agent). tycoslide's role is to **implement that plan in the template**,
one slide at a time. Consequences:

- **Tier B (sequence scaffolds) is OUT of scope, permanently** — not deferred, not
  "yes-in-principle." tycoslide never proposes, owns, or suggests the arc. The story-order
  question below is therefore *moot*; kept only as the reasoning that led here.
- **The crux fork dissolves.** Sequence-level composition is upstream, so tycoslide is
  **per-slide, always**: given "slide N conveys X (this content, this kind)," place it in
  the right layout and fill it. This is the strictest reading of "fills, does not design" —
  tycoslide realizes a story, it does not compose one.
- **What remains ours (and where the research still applies):** matching each given slide
  to a template layout + filling its slots. That per-slide matching keeps needing the
  DESCRIBE menu (sampler `accepts` + per-layout structural descriptions, roadmap step 3 +
  6a) and the general composition principles in the skill (good fill vs merely valid fill).
  Everything *below* the story line stays; everything *at* the story line is not ours.

---

## The product-boundary question this raises (SUPERSEDED by the decision above — kept for reasoning)

**tycoslide FILLS, it does not DESIGN.** Tier A and 6a are unambiguously on the fill/compose
side. Tier B (sequence scaffolds) is the one that needs an explicit ruling, because a
pitch-deck role-arc is neither visual design *nor* pure slot-mapping — it is **narrative
structure**, a third thing. Advocating "your deck should go Problem → Solution → Why-Now…"
edges toward *authoring the user's argument*, which could be read as outside "fills, does
not design."

Two coherent positions:

1. **Sequences are in scope as composition.** The scaffold isn't tycoslide inventing an
   argument — it's the *theme* advertising "this template family supports a pitch sequence
   made of these layout-roles." Ships with the designer's `.pptx`, same as the layouts do.
   Keeps "quality comes from the theme, not the prompt." The agent composes *within* a
   theme-provided scaffold, exactly as it composes within theme-provided layouts.

2. **Sequences are out — narrative is the user's job.** tycoslide offers the layout menu
   (Tier A + 6a) and general composition principles, and stops. The user/agent decides the
   arc. Smaller surface, cleaner line, no risk of the tool "designing the argument."

My recommendation: **position 1, but deferred** — keep Tier B out of the current build
(the sampler + 6a are plenty of runway and are unarguably in scope), and revisit sequences
as a distinct theme-level artifact once the per-slide menu is real. This matches the
research's own hierarchy: per-slide fill is the floor everything needs; the sequence layer
is an optional upper tier for a *subset* of decks. Building the floor first is correct
regardless of how the boundary question is later ruled.

## One-line takeaways

- Menu representation: **DESCRIBE** (structured capability of real observed specimens) —
  already what the sampler does. ✓
- Composition unit: **two-tier** — per-slide fill is the floor; sequence scaffolds are an
  optional upper tier for persuasive/recurring decks only.
- Architecture: our **agent-composes → engine-fills → template-designs** split is the
  validated Beautiful.ai pattern; Gamma/Tome/Canva are the collapse we avoid.
- Open decision for the user: **are theme-level sequence scaffolds in scope** (recommend:
  yes-in-principle, build-later), given "fills, does not design."
