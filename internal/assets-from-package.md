# Assets resolve from an npm package

> Status: **parked (26 Aug 2026).** Written when the host rejected the archive design's
> nested `assets.zip`. The rejection turned out to be by file extension only -- the same
> archive uploads fine as `assets.dat` (the host accepts `.pptx`, also a zip), so the
> shipped archive design stands. This design is the fallback if that filter ever starts
> sniffing content: declared assets move into an npm package the skill installs, and the
> engine resolves catalog paths through `node_modules` when they are not on disk.

## The constraint, revised

Cowork enforces two limits on a skill zip, neither documented anywhere official:

- `Zip contains too many files (maximum 200)` — hit at 2,178 entries.
- `Zip cannot contain nested zip files` — hit at 11 entries, when the previous design
  nested the 2,168 assets into one `assets.zip`.

So a skill zip must be both small in count and flat in kind. Whether a `.tar.gz` inside
the zip passes is untested and undocumented; a design resting on an unfiltered loophole
is a design that breaks on a filter update, so that route is not taken.

## Why this and not the alternatives

Community practice for asset-heavy skills reduces to four patterns: fetch from a CDN at
runtime, ship assets as an npm package, generate assets on first use, or split into many
skills. For this engine the choice is forced by one observation: **the skill already
depends on `npm install` working in the consumer's container** — that is how the engine
itself arrives. The registry is the one network path the design has already proven.

- **CDN / GitHub Release fetch at build time.** An unproven network path in a sandbox
  where npm is a proven one, plus cache, retry, and versioning logic the registry
  already provides for free. Rejected while the npm route exists.
- **Generate on first use.** The assets are a brand library — logos, client marks,
  illustrations. They cannot be generated.
- **Split into ~12 skills.** Multiplies maintenance and shatters the user experience to
  route around a packaging limit. Last resort.

This resurrects `27882a7` (icons from an npm package, still in the reflog), which the
previous design rejected because it "only removes icons." Generalized — **all** declared
assets ship in one package the theme names — that objection dissolves: it is bounded for
any asset count, in any category, exactly the property the archive had.

## The design

The theme config names an assets package, and asset resolution gains one fallback:

```
theme.json:
  "assetsPackage": "@tycoworks/mz-slides-assets"
```

- The catalog keeps its paths exactly as today: `assets/logos/primary.png`. No path
  rewriting anywhere, same as the archive design.
- **Resolution order: loose file first, then the package.** A path that exists under the
  theme root is used as-is; otherwise it resolves to
  `node_modules/<assetsPackage>/<path>`, via a `createRequire` anchored at the theme
  root so the skill's own `node_modules` is what answers.
- The same rule in both worlds, deliberately, as before: a theme repo has loose assets
  and never consults the package; a packaged skill has no loose assets, so every lookup
  lands in the package. Dev loop unchanged; nobody working on a theme sees this feature.

## What ships where

```
skill zip (~10 entries):        assets package (npm):
  SKILL.md                        package.json
  syntax.md                       assets/** (2,168 files, verbatim)
  theme.json
  manifest.json
  assets.json        <- the catalog stays in the zip: it is the index
  package.json       <- depends on the assets package + the engine
  package-lock.json
  template/deck.pptx
```

- `skillPaths` loses its `archived` list: declared assets simply do not enter the zip
  when the theme names an assets package. (A theme that names none keeps today's
  behavior — loose assets zip as plain entries — which is fine for small themes and
  keeps the feature opt-in.)
- `skillPackageJson` already carries the theme's dependencies through, so the theme
  declaring the assets package as a `dependency` is the only wiring: it flows into the
  authored manifest and `npm install` does the rest.
- `expandAssets` and `packAssets` retire with the archive. Nothing needs expanding when
  resolution reads through `node_modules` directly.

## Publishing the assets package

Static files as an npm package is an established pattern, and this theme already uses
it: `@fontsource/inter` is exactly this — versioned static assets, no code. Icon sets
(`@material-design-icons/svg`, `lucide-static`) and design-token packages ship the same
way.

The assets package owns its own derivation. tycoslide's contract is that the catalog
points at PNGs; how they were produced — rasterizing SVGs, colorizing an icon set to the
theme palette — is the package's build step, in the package's repo, and the engine never
learns it exists. Asset generation is out of scope here the way design is out of scope in
the engine.

**Where it can live.** `package.json` dependencies accept more than a registry name: a
git URL (`github:org/repo#tag`) or a plain tarball URL both work, so "publish to
npmjs.com" is optional. What is not optional: **the source must be publicly fetchable**,
because the consumer's container installs with no credentials — no npm token, no git
auth. Private npm, GitHub Packages, and private repos all fail at `npm install`, and
shipping a read token inside the skill zip hands that token to anyone who downloads the
skill. So the real choice is public npm vs. public GitHub (git dep or release tarball);
pick on ergonomics, not privacy, because there is none either way.

**Exposure, stated plainly:** whatever the source, the asset library is world-readable.
Materialize's logos, icons, and illustrations are already public on the website; the
`clients` category likely is too, but shipping customer logos to a public package is a
call the theme owner signs off on, not a default. If a category can't be public, use the
split the resolution order already supports: sensitive assets ship loose in the zip
(dozens of files, far under the cap) and everything else comes from the package — loose
files win, so no new mechanism is needed.

The theme pins the package version, so a skill is reproducible: engine version and asset
version are both in its lockfile.

## Consequences

- **The dev loop is unchanged.** Loose files win; a theme repo never resolves through
  the package.
- **Asset updates stop being uploads.** A new logo is a package publish plus a version
  bump in the theme, not a 19 MB re-upload of the skill.
- **The stale-backfill quirk disappears.** The archive design silently restored a
  deleted asset from a stale `assets.zip`; with resolution-time fallback there is no
  copy on disk to go stale — a deleted loose file falls through to whatever the pinned
  package holds, which is at least versioned and inspectable.
- **A new failure mode:** a catalog entry present in neither place fails at fill time,
  not package time. `tycoslide package` should verify every catalog path resolves
  (loose or package) before it writes the zip, so the error stays at packaging where it
  belongs.

## Work

1. `theme.json`: accept `assetsPackage`; thread it through config parsing and types.
2. Asset resolution: loose-file-first fallback through `createRequire(rootDir)`.
3. `skillPaths`: when `assetsPackage` is set, declared assets stay out of the zip;
   `package` verifies every catalog path resolves before zipping.
4. Retire `packAssets` / `expandAssets` and their tests; keep `ASSETS_ARCHIVE` handling
   out of new zips. (`expandAssets` stays exported for one release so a 0.13.2-packaged
   skill still builds, then goes.)
5. mz-slides: carve `assets/` into `@tycoworks/mz-slides-assets`, publish, pin, sign off
   on the `clients` category exposure, repackage — expect ~10 entries, no archive.
6. Upload to Cowork: the only test that counts, as the last design learned twice.

## Open

- Per-category packages (brand public, clients elsewhere) if the exposure call splits.
- Whether `assets.json` should record the resolved package version at package time, so
  a skill's catalog is self-describing without reading the lockfile.
