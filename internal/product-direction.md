# tycoslide product direction (settled Aug 2026)

> Status: **settled product line.** This is the north-star doc: what tycoslide is, what it
> deliberately is *not*, and how that sorts the roadmap. Supersedes the open questions in
> `internal/composition-findings.md` (the research that led here) and reprioritises
> `internal/composition-vs-content-paradigm.md` (the engine roadmap). Extends the
> **Product Principle** in `CLAUDE.md` ("tycoslide fills, it does not design").

## BLUF

**tycoslide is not smart about slides, on purpose.** We drop the ambition of an AI that
*chooses layouts* or *composes the deck* — that capability is commodity (any LLM does it
passably), undifferentiated, and something every user overrides with their own taste. We
invest everything in the two things nobody else does well:

1. **Faithful fill** of a real designer's `.pptx` — the brand reproduced *exactly*, coping
   with messy real-world files.
2. **Editable `.pptx` out** — a clean, on-brand **80% starting point** the user finishes
   themselves.

The magic lives in the **theme** (your brand, reproduced), not in the prompt.

## The user journey (end state)

1. **Talk it out** → transcript. *(voice tool — upstream, not tycoslide)*
2. **Shape into a rough narrative**, then a **slide-by-slide play** (role + content per
   slide, no layout, no brand). *(agent conversation — upstream, not tycoslide)*
3. **Fill the corp template.** ← tycoslide. The agent drops each play-slide's content into
   the brand template via **minimal plumbing** — enough to place content in the right slot,
   no clever composition.
4. **Editable, on-brand `.pptx` out** — an 80% base, not a finished deck.
5. **Finish the last 20% in PowerPoint**, where taste is personal. *(user — downstream)*

tycoslide owns **step 3 only.** Steps 1–2 are the user's (by voice + agent, as they
already work today); step 5 is the user's too. This is the strictest reading of "fills,
does not design": tycoslide *realizes* a story it is handed — it does not compose one and
it does not finish one.

**One-line pitch:** *"Get your rough story into a pixel-perfect, on-brand, editable deck in
seconds — then make it yours."*

## Why this is the line

- **Composition is commodity.** "Which layout fits this slide" is replaceable and everyone
  overrides it. Building a composition brain builds the part that isn't unique, isn't
  defensible, and that users fight. That is the skills-repo trap: polishing the 80% that
  everyone customises past.
- **Faithful fill + editability is the moat.** Gamma/Tome/Canva *invent* generic design;
  markdown tools (Marp/Slidev) ship *their* themes, not *your* brand. "Fill a designer's
  exact `.pptx`, output editable `.pptx`" is the hard, unglamorous, defensible core — and
  editability is precisely what makes "AI is just a starting point" *work*.
- **The theme is the product.** Quality comes from the template, not the prompt: a faithful
  reproduction of a real brand system makes every deck good. Effort compounds in theme
  fidelity, not agent cleverness.

## Where customisation lives (the honest answer to "everyone personalises")

Personalisation is a feature of the design, not a failure of the AI. It lives in two places,
**never** in an AI composition brain we'd have to defend:

- **Brand-level → the theme.** A company tailors tycoslide by authoring/refining its theme
  (its `.pptx` + manifest). Per-company, done once.
- **Slide-level → the output `.pptx`.** A user tailors a specific deck by editing the
  editable output in PowerPoint. Per-deck, every time.

## What this changes on the roadmap

Barely any *code* changes; the *emphasis* changes a lot. Against
`internal/composition-vs-content-paradigm.md` §5:

| Roadmap item | Before | Now |
|---|---|---|
| Engine: faithful fill, editable out, robust to messy files | core | **crown jewel — harden it** |
| Sampler (step 4): `.pptx` → reusable theme | automation | **crown jewel — maximise fidelity** |
| `accepts` menu (step 3) | "advertise slot capability" | **keep, reframed as minimal plumbing** — the least an agent needs to place content |
| Agent-guidance / composition intelligence (step 6) | descoped, "revisit" | **explicitly OUT** — not a product surface |
| Per-layout design guidance / `whenToUse` | deferred | **OUT — permanently** |
| Sequence scaffolds (Tier B) | out (story is input) | **still out** — reinforced here |

**Kept because they're required to fill at all** — not because they're smart: the sampler
and the `accepts` menu are plumbing into a real brand template, and *that* is the value.

**A light touch that survives:** the handful of *general* composition principles in the
agent skill (one idea per slide, answer-first headline, adjacent-slide contrast). Optional,
skill-level, general — never per-layout, never a recommendation engine.

## Explicitly OUT of scope (say no to these)

- An AI that **chooses the layout** for you (commodity; you'll override it).
- An AI that **composes / sequences the deck** (that's the upstream play, handed in as input).
- **Per-layout design guidance**, `whenToUse`, layout-recommendation scoring.
- Anything that makes the output *final* rather than *editable* — the 80% hand-off is the design.

## Immediate next steps (unchanged in code, resorted by priority)

1. **Harden the engine** — faithful fill + editable output + real-world-file robustness
   (the deferred engine gaps: speaker notes, mermaid proper dependency, table add/remove).
2. **Sampler fidelity** (paradigm roadmap step 4) — a real brand `.pptx` → a high-quality
   reusable theme is the single highest-leverage build.
3. **`accepts` menu (step 3)** — minimal, so the agent can place content. No more than that.
4. **Do NOT build** composition intelligence (step 6). Closed.
