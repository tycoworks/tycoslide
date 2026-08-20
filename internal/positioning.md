# tycoslide positioning

> Status: **strategy doc (Aug 2026).** Written to resolve the fork the founder is weighing after
> testing Claude Design. Extends `internal/product-direction.md` ("engine + theme fidelity +
> editability is the product; composition intelligence is OUT") and the `CLAUDE.md` Product
> Principle ("tycoslide fills, it does not design"). This doc is about *how we talk about the
> product and what we bet on* — not the code.

## BLUF

Lean into the **original frame** and drop the "AI agent composes decks" headline. The durable
product is: **reproducible, editable, exactly-on-brand `.pptx` built from markdown — collateral-as-code.**
Claude Design just proved the agent-composition capability is commodity (Anthropic ships it, for
free, and it's *good*). What Claude Design structurally *cannot* do — and won't, without contradicting
its own model — is give you a **versionable source of truth** that **deterministically** rebuilds a
**pixel-exact** deck on a **real designer's template**, that you can **manage at scale and wire into a
pipeline**. That is the whole game. The agent is one *consumer* of that interface, not the pitch.

---

## 1. Category & competitive map

There are two categories, and we have been standing with one foot in each.

**Category A — AI deck *generators* (composition + design in one generative step).**
Gamma, Tome, Canva Magic Design, PowerPoint Designer, and now **Claude Design**. You give a prompt
(or a source doc); they invent an outline, a layout, and a visual design, and hand you a finished-ish
deck. Claude Design is the new state of the art here: it ingests a `.pptx`, *derives* a design system
from it, and composes autonomously and well.

Where they win: cold-start speed, "I have nothing and need something in 90 seconds," genuinely good
autonomous composition.

Where they **structurally** fail — by design, not by lack of polish:

- **Brand fidelity is approximate.** They *derive* or *invent* design. Claude Design derived a system
  from the uploaded `.pptx` and was still off-brand in places. Deriving is not reproducing. A brand
  team's answer to "close to on-brand" is "no."
- **No source of truth.** The artifact *is* the output. There is no markdown, no spec, no text file
  behind it. You cannot `diff` it, code-review it, or point to "the thing that made this."
- **Non-deterministic.** Run it twice, get two decks. There is no "rebuild the same deck" — every
  regeneration is a new roll of the dice.
- **Not manageable at scale.** 100 decks = 100 hand-made artifacts. A rebrand means redoing 100 decks
  by hand (and re-rolling the composition dice on each).
- **No pipeline surface.** They are apps for a human in a browser. You cannot put "generate the
  Q3 customer deck from this data" in CI, in a cron job, in a Zapier/agent workflow, and get a
  byte-stable, on-brand file out the other end.

**Category B — code/markdown deck tools.**
Marp, Slidev, reveal.js, Beautiful.ai (partial). These give you a text source of truth and
determinism — but they ship **their** themes, not **your** brand, and they output HTML/PDF or a
generic PPTX, not a faithful reproduction of a real corporate template. Brand teams can't ship on them.

**The empty quadrant is ours:** *source-of-truth + determinism (Category B) applied to a faithful
reproduction of a real designer's `.pptx` (what Category A gestures at but can't lock).* Nothing in
either category does "composition varies, design 100% fixed by an external real template, and there's
a diffable text source behind it." That gap is the product.

---

## 2. tycoslide's durable wedge (the moat)

The moat is a **chain of four properties that only hold together**, and each one is something a
generator would have to *abandon its own model* to match:

1. **Markdown is the source of truth.** The deck is *authored as text* (or emitted by anything that
   writes text — a human, a script, an agent). This is the root property; everything else follows.
   A generator can't add this without becoming a compiler — the artifact stops being the source.
2. **Deterministic / reproducible builds.** Same markdown + same theme → the same `.pptx`, every
   time, on any machine, in CI. Generators are generative by definition; determinism is the one thing
   they can't offer without ceasing to be generators.
3. **Exact brand fidelity by *filling*, not *deriving*.** We clone the designer's real slides — fonts,
   color, layout, chrome come from the actual `.pptx`, never regenerated. "The theme is the product."
   Claude Design *derives* a system and drifts; we *reproduce* one and can't drift, because we never
   generate design in the first place.
4. **Editable `.pptx` out.** The output is a clean, on-brand 80% base the user finishes in PowerPoint.
   This is what makes "AI is just a starting point" actually usable — not a dead-end artifact.

Why a generator can't copy this: their entire value proposition is *"you don't need a source, just
prompt us."* The moment they add a versionable text source + deterministic rebuild + template-lock,
they've built tycoslide and unbuilt Gamma. The properties are in tension with their business.

**Collateral-as-code** is the name for the bundle: decks become artifacts you author, version, review,
build, and regenerate like software — on rails that guarantee the brand.

---

## 3. Resolving the fork — decisive

**Emphasize "reproducible editable on-brand `.pptx` from markdown (collateral-as-code)." De-emphasize
"AI agent composes decks."** This is the right call, and Claude Design is the proof, not a threat:

- The agent-composition angle was always our *weakest* differentiator (the product-direction doc
  already conceded composition is commodity). Claude Design just removed all doubt: the best AI lab in
  the world ships it for free and does it well. Competing on "our agent composes decks" is competing
  with Anthropic on Anthropic's home turf, with a worse model. **Losing bet. Abandon it as a headline.**
- Everything Claude Design *can't* do maps exactly onto our four moat properties. The competitor's
  demo is our marketing: "Claude Design made you a good deck. Now version it. Now rebuild it identically.
  Now guarantee it's pixel-on-brand. Now do it for 100 decks on a rebrand. You can't — because there's
  no source and it isn't deterministic. tycoslide is that missing layer."

**Reconciling "Canva for AI agents":** keep the *insight*, demote the *framing*. The insight was that
AI needs a higher-level, safe substrate for slides. That's still true and still ours — but the agent is
**one consumer of a markdown/programmatic interface, not the headline.** The headline is the interface
and its guarantees (text in → identical, on-brand, editable `.pptx` out). Precisely *because* the
substrate is deterministic and design can't drift, an agent can fill decks **safely** — the agent
never touches design, so it can't wreck the brand. So the agent story becomes a *proof point of the
substrate* ("safe enough that even an agent can drive it") rather than the pitch. "Canva for agents"
was selling the driver; sell the rails.

**One line:** *Claude Design composes; tycoslide is the build system underneath — and the build system
is the durable business.*

---

## 4. "Build editable `.pptx` from markdown, so you can ___"

The five strongest completions, in priority order:

1. **…regenerate your entire deck library on a rebrand — swap the theme, rebuild, done.** Change fonts
   or colors once in the template; every deck rebuilds exactly on the new brand. This is the killer
   completion — it is *impossible* for every generator and every hand-made-deck workflow.
2. **…version and diff decks in git like code** — review a deck change in a PR, see exactly what text
   changed, roll back, branch. Decks become reviewable artifacts, not opaque binaries.
3. **…wire deck generation into CI / data pipelines / agent workflows** — "generate the customer QBR
   from this quarter's numbers" runs headless and emits a byte-stable, on-brand file.
4. **…keep collateral exactly on-brand at scale** — hundreds of decks, zero drift, because design is
   locked in the template and can never be regenerated.
5. **…let agents fill decks *safely*** — the agent maps content into slots; it *cannot* alter design,
   so the brand is structurally protected no matter what the agent does.

---

## 5. ICP & use cases

**Primary ICP (win here first): brand / marketing ops teams at companies with a real, enforced brand
system and a high volume of recurring decks.** They feel every one of the four pains acutely: brand
drift is their literal job to prevent, they own the `.pptx` template already, they suffer rebrands, and
they manage a sprawling deck library by hand today. "Collateral-as-code" is language they will
immediately understand and want.

**Strong secondary ICPs:**
- **Sales enablement / RevOps** — recurring, templated decks (QBRs, customer one-pagers) that must
  stay on-brand and get regenerated from data. High volume, low tolerance for off-brand.
- **DevRel / eng-adjacent teams** — already live in markdown and git; "decks as code" is native to
  them; they'll adopt with zero friction and evangelize.
- **Agencies / brand studios** — they *build* the templates; tycoslide lets them ship a client a
  living brand system, not a static file.

**Wedge use case to win first:** **the rebrand / template-swap regeneration.** It is the single most
visceral demo of the moat, it is flatly impossible for any competitor, and it lands on the primary
ICP's most expensive recurring pain. "Your brand changed. Rebuild all 80 decks in one command,
pixel-perfect." Lead with that.

---

## 6. Positioning statement, taglines, category

**Positioning statement (one sentence):**
*tycoslide is a build system for presentations: it compiles markdown into editable PowerPoint that is
pixel-exact on your real brand template — deterministically, so your decks become versionable,
regenerable collateral-as-code instead of one-off files.*

**Taglines (pick one, test the rest):**
- **Collateral-as-code.**
- **Decks you can rebuild.**
- **The build system for on-brand slides.**
- **Markdown in. Your exact brand out. Every time.**

**Category to claim:** **"collateral-as-code"** (or, one rung more concrete, *"a build system /
compiler for branded presentations"*). Do **not** claim "AI presentation generator" — that category is
owned, commoditized, and now includes Anthropic. Own the category *underneath* it.

---

## 7. Emphasize vs de-emphasize (roadmap + messaging implications)

This confirms and sharpens the already-settled product-direction. Claude Design is the forcing
function that makes the choice obvious.

**Emphasize (invest, message loudly):**
- **Determinism & reproducibility** as a first-class, *stated* guarantee — byte-stability, "rebuild the
  same deck," CI-friendliness. Make it a headline feature, not an implementation detail.
- **Theme fidelity / the sampler** — `.pptx` → faithful reusable theme. This is the crown jewel
  (product-direction §immediate-steps agrees). Every point of fidelity is moat.
- **Editable-`.pptx`-out** — the 80% base you finish yourself. This is the honest answer to "AI isn't
  perfect" (Claude Design isn't either — but *you can't fix its output at the source*; you can fix ours).
- **The rebrand/regeneration and git-diff workflows** — build the demos and docs around these.
- **Engine hardening + real-world-file robustness** — coping with messy templates is unglamorous and
  exactly what a generator will never bother to do.

**De-emphasize (don't build, don't headline):**
- **Agent composition intelligence** — layout choice, sequencing, "smart" deck assembly. Already OUT
  per product-direction; Claude Design confirms it's a commodity we'd lose at. Let the upstream
  agent/LLM do it; we consume the result.
- **"Canva for AI agents" as the headline.** Keep the safe-substrate insight; demote the framing to a
  proof point (§3).
- **Any feature that makes the output feel *final* / generative** rather than a versionable, editable
  base. That's drifting into the category we're beating.

Net: **barely any code changes; the messaging changes a lot.** We stop selling the smart agent and
start selling the build system.

---

## 8. Risks & honest counterarguments

- **Is the reproducible-markdown-deck market big enough?** Real risk. "People who want to author decks
  in markdown *and git*" is a narrow, technical slice today. Mitigation: the ICP isn't "markdown
  lovers," it's **brand/marketing ops who feel brand-drift and rebrand pain** — they don't have to love
  markdown, they have to want on-brand-at-scale + regeneration, and the markdown is plumbing they never
  see (an agent or a form can emit it). If we message this as "markdown tool," the market is small; as
  "collateral-as-code / rebrand-in-one-command," it's the whole brand-ops budget line. **The framing
  determines the market size — this is the central bet.**
- **Does Claude Design (or Gamma) just add export + versioning and eat us?** The strongest counter.
  Answer: they *can* add a `.pptx` export (some do). They *cannot* cheaply add **determinism + a text
  source of truth + template-exact fidelity** without contradicting the generative model that is their
  entire value prop and business. Export is a feature; being a deterministic compiler over a real
  template is an architecture. They'd have to become us. Still, this is the risk to watch — if a
  generator ships credible "regenerate identically from a saved spec on your exact template," the moat
  narrows. Our defense is depth of fidelity (the sampler) and owning the brand-ops workflow before they
  turn that way.
- **Defensibility beyond first-mover?** The moat is the **theme/sampler fidelity** — faithfully turning
  arbitrary messy real-world `.pptx` files into high-fidelity fillable themes is genuinely hard and
  compounds with every template we handle. That, not the markdown parser, is the defensible asset. Under-
  invest there and we're a thin wrapper; over-invest there and we're uncopyable.
- **Chicken-and-egg on themes.** The product is worthless without a good theme, and authoring one is
  work. Mitigation: make the sampler so good that "point it at your `.pptx`, get a theme" is a
  90-second experience — theme creation is explicitly the next big build, and it *is* the go-to-market.
- **We concede the cold-start moment to Claude Design.** True, and fine. Let them win "I have nothing,
  make me something." We win "I have a brand and a hundred decks and they must stay perfect." Different,
  larger, stickier buyer.

---

## Bottom line

**Resolve the fork toward the original frame: tycoslide is collateral-as-code — a deterministic build
system that compiles markdown into editable, pixel-exact-on-brand `.pptx`.** Claude Design didn't
threaten the product; it validated it by making the agent-composition angle obviously commodity while
leaving the four things it structurally can't do — source of truth, determinism, exact template
fidelity, manageable-at-scale editability — entirely to us. Stop selling the smart agent; sell the
build system and the guarantees. The agent becomes one safe consumer of a versionable interface, not
the headline. Lead the go-to-market with the rebrand/regeneration demo to the brand-ops ICP, invest
everything in sampler/theme fidelity as the real moat, and claim the category *underneath* the
generators rather than fighting them inside it.
