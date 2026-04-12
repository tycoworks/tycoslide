# Sequences — Slide Composition Patterns

Research and design direction for sequence-based deck composition. A sequence is a reusable pattern of 3-7 slides that form a coherent rhetorical unit — the missing abstraction between individual layouts and complete decks.

**Status**: Research complete. Not yet designed or implemented.

---

## The Insight

The right primitive for presentation generation is not individual slide layouts, but **sequences of layouts**. Like n-grams in language, where the unit of meaning is the phrase, not the word.

When a skill tries to pick layouts one-at-a-time, the result is syntactically correct but narratively flat — like writing a paragraph word-by-word without knowing the sentence. When you give it sequence patterns, it writes phrase-by-phrase. Much more natural.

A designer creating a product feature deck is implicitly using a "Feature Tour" sequence. Someone building a sales pitch is using AIDA or SCR. They don't think "which layout next?" — they think "I'm telling a Problem-Solution-Proof story" and the layout choices follow.

---

## The Hierarchy

Multiple traditions independently converged on the same layered structure:

```
Elements (text, image, shape)
  → Components (card, list, quote, table)
    → Layouts (body, cards, stat, two-column)
      → SEQUENCES (the missing layer)  ← this doc
        → Sections (intro, argument, proof, close)
          → Deck
```

tycoslide has the first three layers. The fourth — sequences — is what's missing.

| Analogy | Presentation |
|---------|-------------|
| Letters | Design tokens (colors, fonts) |
| Words | Components (text, card, image) |
| Phrases / Idioms | **Sequences** (Problem-Solution-Proof) |
| Sentence structures | Section arcs |
| Narrative voice | Theme |

---

## Named Sequence Patterns

From consulting, rhetoric, and narrative traditions:

### Argumentative

| Name | Pattern | Typical Layout Progression |
|------|---------|--------------------------|
| **SCR** (McKinsey) | Situation → Complication → Resolution | body → statement → cards |
| **SCQA** (Minto Pyramid) | Situation → Complication → Question → Answer | body → body → statement → cards |
| **Problem-Solution-Proof** | Problem → Solution → Evidence | body → cards → stat + quote |
| **AIDA** | Attention → Interest → Desire → Action | stat → body ×3 → cards → statement(CTA) |

### Narrative

| Name | Pattern | Typical Layout Progression |
|------|---------|--------------------------|
| **Case Study** | Context → Challenge → Solution → Result | body → statement → cards → stat |
| **Before/After** | Old way → Transformation → New way | two-column → statement → cards |
| **StoryBrand SB7** | Character → Problem → Guide → Plan → CTA → Stakes → Vision | body → statement → cards → agenda → statement → body → statement |

### Structural

| Name | Pattern | Typical Layout Progression |
|------|---------|--------------------------|
| **Feature Tour** | Overview → [Feature ×N] | agenda → [section → cards → body] ×N |
| **Comparison** | Ours vs theirs → Proof points | two-column → stat → quote |
| **Data Story** | Context → Metric → Interpretation | body → stat → statement |

### Framing

| Name | Pattern | Typical Layout Progression |
|------|---------|--------------------------|
| **Opening** | Hook → Agenda → Positioning | title → agenda → statement |
| **Closing** | Summary → Social proof → CTA | cards → quote → end |
| **Section Transition** | Divider → Context | section → body |

---

## Composition Rules

Rules for composing sequences into full decks:

### Rhythm
- Never use the same layout back-to-back
- Alternate between dense slides (body, cards, two-column) and breathing slides (statement, stat, quote, section)
- Every 3-5 content slides, insert a section divider

### Layout Selection by Content Type
- Single impressive number → stat
- 2-6 parallel items → cards
- One big idea, no details → statement
- Someone else's words → quote
- Step-by-step or agenda → agenda
- Side-by-side comparison → two-column or transform
- Everything else → body

### Anti-Patterns
- Don't use body for everything (most common AI failure)
- Don't put 3 statement slides in a row
- Don't skip section dividers in decks > 8 slides
- Don't use cards with 1 item (use statement) or 7+ items (split)

---

## Prior Art

### Academic (Computational)

- **DOC2PPT** (AAAI 2022) — Hierarchical RNN that learns slide-sequence patterns from ~6K paired (document, deck) examples. One model learns section-level sequences, another learns slide ordering within sections. Literally a learned grammar for presentations.

- **Slide Gestalt** (CHI 2023) — Analyzed real decks, found three recurring structural patterns through unsupervised sequence alignment: divider slides (section breaks), build slides (progressive reveals), topic-split slides.

- **PPTAgent / SlideSpawn** (2024-2025) — Multi-agent LLM pipelines with an explicit "outline agent" that plans the slide sequence BEFORE generating individual slides. The outline is the sequence plan. PPTAgent is open source (MIT, ~4K stars) but targets academic paper-to-slides, not business presentations. Key insight worth borrowing: LLMs are bad at designing layouts from scratch but good at filling structured templates.

- **Gap**: No one has applied sequential pattern mining (PrefixSpan, n-gram analysis) to a labeled slide-type corpus for business presentations. Open research question.

### Design Theory

- **Nancy Duarte** ("Resonate") — Maps presentations to story structure. The "sparkline" model alternates between "what is" and "what could be" — a sequence pattern at the section level.

- **McKinsey Pyramid Principle** (Barbara Minto) — SCQA structure. Widely used in consulting. Maps directly to slide sequences.

- **Christopher Alexander** ("A Pattern Language") — Named, composable patterns for architecture. The concept of a "pattern language" for slide decks — named, composable sequences — is the same idea applied to presentations.

### Tool Landscape

No competitor has formalized sequences as a composable, named, programmable primitive:
- Beautiful.ai works at the slide level
- Gamma works at the card level
- PowerPoint themes define layouts but not sequences
- PPTAgent generates sequences internally but does not expose them as user-facing composable units

---

## The Learned Sequences Idea

Beyond named patterns, there's an opportunity to **learn sequences from existing decks** — the specific layout progressions that work with a specific theme.

Concept: Feed the system N existing decks built with a theme. Extract the layout-type sequence from each (e.g., `title → agenda → statement → body → cards → stat → quote → section → ...`). Apply n-gram analysis to find recurring subsequences. These become the theme's learned sequences — not generic "Problem-Solution-Proof" but "here's how this company presents a product feature, based on the 10 decks we've already built."

**Limitation**: Requires enough decks to extract patterns. Works better for companies with 20+ existing presentations than for bootstrapping.

---

## How This Fits Into tycoslide

### As a skill concept (near-term)

Sequences live in the skill's composition rules section. The skill says "I need a Problem-Solution-Proof sequence" and uses the named pattern to select layouts. No product changes needed — just better skill prose.

### As a first-class theme concept (future)

Sequences could be declared in themes:

```yaml
sequences:
  problem-solution-proof:
    description: "Present a problem, propose a solution, prove it works"
    slides:
      - layout: body
        role: problem
      - layout: statement
        role: transition
      - layout: cards
        role: solution
      - layout: stat
        role: evidence
      - layout: quote
        role: evidence
```

This is speculative. The skill-level approach should be tested first.

### Relationship to multi-format themes

Sequences are format-aware. A "Problem-Solution-Proof" sequence for a presentation (16:9) uses different layouts than the same narrative arc for a battle card (US letter). The sequence pattern is the same; the layout mapping differs per format. This naturally extends the multi-format theme architecture.

---

## Open Questions

1. Should sequences be theme-level or skill-level? (Start with skill, graduate to theme if proven.)
2. How prescriptive vs. suggestive should sequences be? (Probably suggestive — "typically uses" not "must use".)
3. Can we extract sequences from existing decks with only 5-10 examples? (Probably not statistically, but manually curating from a small corpus is feasible.)
4. How do sequences interact with multi-format? (Same narrative pattern, different layout mappings per format.)
