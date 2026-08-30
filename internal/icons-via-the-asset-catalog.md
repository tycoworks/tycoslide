# Icons via the asset catalog

> Status: **planned (30 Aug 2026).** Supersedes, for now, the npm-resolved icon set in
> `icons-are-a-typeface.md`. That design is parked rather than abandoned: it stays the
> destination, and phase 2 below is a prerequisite for it either way.

## The decision

**Icons stay plain catalog assets. tycoslide gains no icon mechanism.** mz-slides expands
from 86 bundled PNGs to the whole Material set, rasterised at package time and catalogued
exactly as logos and illustrations already are.

What makes that affordable is one change, and it is not about icons: **split the asset
catalog out of `manifest.json`.** Layouts stay in the manifest, which the agent reads whole
every session. Assets move to `assets.json`, which it greps. Once the catalog is not read
whole, its size stops mattering, and 2,122 icons cost nothing but disk.

## Why not the npm design, yet

`icons-are-a-typeface.md` resolves a name against an npm set at build time. It is the right
end state and the argument in that doc still holds. It is parked because it is a new
mechanism — a schema block, a rasteriser dependency, a reserved `$icon` category, resolution
and caching — and the same user-visible outcome is reachable today with none of it. Proper
icon support lands later, on top of the split rather than instead of it.

## Why the catalog has to move first

Measured, not estimated. A catalog entry is 135 bytes pretty-printed:

```json
"water_drop": { "path": "assets/icons/water_drop.png", "type": "icon", "description": "Water drop" }
```

| Set | Icons | PNGs | Catalog |
|---|---|---|---|
| Classic Material Icons | 2,122 | ~3 MB | +0.29 MB ≈ **72k tokens** |
| Material Symbols | 7,806 | ~11 MB | +1.05 MB ≈ **263k tokens** |

`manifest.json` is 28 KB today and read in full every session, so those numbers are spent
before the agent reads a single layout — and the layouts are the part that matters. The 86
icons already account for 36% of it. Disk and zip size are not the constraint; the agent's
context is.

Note what the 135 bytes actually say. The path is derivable from the name, the type is
always `icon`, and the description restates the name. It is almost pure redundancy, which is
what a category-level declaration would collapse — but that is the parked design, and
splitting the file gets the same relief without it.

**This also beats the `icons.txt` idea that the parked design carried.** That file enumerated
names for a package installed *later*, so it could disagree with what actually resolved. A
catalog of PNGs sitting in the same zip cannot drift: the files it names are right next to
it, written by the same command.

## Phases

Each is independently verifiable. Do not start the next until the previous is green.

**0 — Revert mz-slides.** Restore the 86 icons, `theme.json`, `showcase.md`, `package.json`
to their committed state. *Verify: `showcase.md` builds, 34 slides.*

**1 — Author the skill's `package.json`.** *(Written, on branch `skill-package-json`, tests
green.)* A live defect, unrelated to icons: `tycoslide package` copies the theme's
`package.json` into the zip verbatim, carrying `"postinstall": "tycoslide package"` and the
engine as a `devDependency`. In a consumer's container that re-runs `package` during
`npm install` — failing their whole install if anything it writes is read-only — and under
`--omit=dev` the engine is never installed at all. Same failure class as
`cowork-field-report-2026-08.md` §1.1, reintroduced by us.

The fix authors a runtime-shaped manifest instead: theme dependencies plus the engine, no
scripts. Still owed: a unit test, and a **clean-room run** — unzip the real zip in a temp
dir, `npm install`, `npx tycoslide build`. That run also settles an open question, since the
authored file no longer matches `package-lock.json` (the engine moves dev → prod), so we
learn whether the lockfile stays in the zip or goes.

**2 — Split manifest and assets.** `generateManifest` writes two files: `manifest.json`
(layouts) and `assets.json` (the catalog). `cli.ts` writes both, `skillPaths` ships both,
`SKILL.md` says which is read and which is grepped. ~20 lines. It changes the agent contract
— `manifest.json` loses its `assets` key — so it is a minor version bump. Useful on its own:
the 40 non-icon assets benefit too. *Verify: tests, regenerate the mz-slides skill, check
both file sizes.*

**3 — Expand the icons.** A committed script rasterises the chosen set at 96px in `#BDB0E0`
into `assets/icons/`, and emits the catalog entries into `theme.json`. Committed so
regenerating is one command rather than an archaeology exercise. *Verify: zip size, showcase
renders, look at a rendered slide.*

**4 — Test the premise.** Ask an agent for twenty slides and watch whether it **greps
`assets.json` or reads it whole.** If it reads it whole, the tokens moved rather than
disappeared and phase 2 bought nothing. This is the phase that decides whether the plan
worked, and it is the one most likely to be skipped.

## Open decisions

1. **Which set.** Classic Material Icons (2,122) or Material Symbols (7,806)? Classic is
   where the existing 86 came from, so the grid and weight already match. **Confirm which
   style the 86 are — filled or outlined — before generating anything**, or the expansion
   will not match the slides that already ship.
2. **Key naming.** Move to snake_case matching the filenames (`import_export`, not
   `importExport`)? Script-generated and consistent with the source set, at the cost of
   rewriting the 10 `$icons.*` references in `showcase.md` once.
3. **The lockfile in the zip** — decided by the phase 1 clean-room run, not in advance.

## Risk

The whole plan rests on an agent greping a file rather than reading it. That is unproven,
and phase 4 is the only thing that tests it. If it fails, the fallback is a deliberately
curated few hundred icons — which is affordable in a single manifest, and which is a
different thing from the 86 that failed: those were one arbitrary category (Communication),
not a chosen set.

## Parked

`icons-are-a-typeface.md` and its implementation — two architecture reviews and a settled
argument for npm-resolved icons. It survives as a stash and a branch, not as anything
durable. Land it as a save point before this plan starts, or expect to lose it.
