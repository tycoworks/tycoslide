# Assets ship as one archive

> Status: **proposed (2 Sep 2026).** A skill zip must be a small number of files. The
> assets a theme declares become a single archive inside it, which `tycoslide build`
> expands before it fills anything.

## The constraint

Cowork refuses a skill zip with more than 200 files: `Zip contains too many files
(maximum 200)`. The current mz-slides skill has **2,178**.

The breakdown matters, because it says where the fix belongs:

| | entries |
|---|---|
| under `assets/` | 2,168 |
| directory entries | 8 |
| everything else | **8** |

Eight files do the work of the skill: `SKILL.md`, `syntax.md`, `manifest.json`,
`assets.json`, `theme.json`, `package.json`, `package-lock.json`, and the template. The
other 2,168 are pictures.

## Why this and not the alternatives

The obvious fix — resolve icons from an npm package rather than bundling them
(`27882a7`, still in the reflog) — removes 2,122 of those files and does not solve the
problem. The cap counts **files**, and icons are merely the category that happens to be
huge today. A theme with 200 client logos, 200 screenshots, or 200 wordmark variants
breaks in exactly the same way, and nothing about that is unreasonable for a brand
library. A fix that only removes icons is a fix for this instance, not for the constraint.

Two other options were weighed:

- **Ship `assets/icons.zip` and tell the agent to unzip it.** Same file count, no engine
  change, and it works today. Rejected because it makes every image in the deck depend on
  an instruction being read and executed. Skip that step and the failure is a confusing
  missing-file error at fill time, not a clear "you forgot to unpack".
- **Curate the icon set down to ~145.** Fits, requires no code, and reintroduces the
  precise cliff the previous 86-icon set fell off — with the zip pinned at the cap and no
  headroom for a single new logo.

Archiving at the engine level is the only option that is bounded: it holds for any asset
count, in any category, without a threshold to tune.

## What archives and what does not

```
mz-slides/
  SKILL.md            plain   the agent reads this
  syntax.md           plain
  manifest.json       plain   layouts, read whole
  assets.json         plain   the asset catalog -- the INDEX
  theme.json          plain
  package.json        plain
  package-lock.json   plain
  template/deck.pptx  plain   one file, no gain from archiving
  assets.zip          ONE     every declared asset, at its declared path
```

**Eleven entries** -- nine files plus the two directory entries a zip carries for
`mz-slides/` and `mz-slides/template/`. The cap counts entries, so that is the number to
check. The catalog stays plain, and that is the load-bearing part of the design:
an index you have to unpack to read is not an index. The agent's whole job — read the
layouts, search the catalog, write the deck — touches only plain files.

```
1. read manifest.json     layouts             plain
2. search assets.json     names, descriptions plain
3. write deck.md          "![]($brand.primary)"
4. tycoslide build        <- expands assets.zip here, then fills
```

Binaries are needed at fill time, which is step 4. Extracting there is early enough, and
nothing before it wants the bytes.

**The limitation, stated plainly:** an agent cannot look at an illustration before
choosing it, only read its description. That is already true today — nothing instructs it
to open the PNGs, and its QA step inspects rendered slides rather than source assets. If
that ever needs to change, the archive is a real obstacle and this design is the wrong one.

## Packaging

`tycoslide package` already derives an allowlist from the theme config rather than walking
the directory (`skillZip.ts`): the config declares its template and its whole asset
catalog, so the zip stays correct no matter what else sits in the working directory. That
list simply splits in two.

```
skillPaths()  ->  { plain: string[], archived: string[] }
```

- `archived` is every path in the asset catalog.
- `plain` is everything read before or without an expansion: generated files, the template,
  `package.json`, `package-lock.json` when present, and any font the theme declares as a
  `./`- or `/`-prefixed file rather than a package specifier. Local fonts have to be plain:
  mermaid reads them during **compile**, before `buildDeck` expands anything.

Each `archived` path is written into a nested zip at **its path relative to the theme
root** (`assets/logos/primary.png`, not `primary.png`), so expanding it reproduces the
layout the catalog already refers to. No path rewriting anywhere: `theme.json` keeps
saying `assets/logos/primary.png` and that stays true on both sides.

A missing declared asset is still an error, as now. A missing optional support file is
still skipped.

**No compression**, declared rather than inherited from a library default: both zips pass
`compression: "STORE"`. The assets are PNGs, already compressed, so archiving is a
file-count measure and not a size one — the skill stays about 19 MB either way. Worth
saying so nobody later reads a size claim into it.

## Unpackaging

One function, called from `buildDeck` before any fill. `buildDeck` is the single entry the
CLI and programmatic callers both pass through, so one call site covers both. Both halves
of the format contract live in `src/assetsArchive.ts` rather than in the packaging module:
what they share is the path convention, and a convention split across two files is one that
drifts.

```
expandAssets(rootDir):
  if no assets.zip at rootDir: return          # a working theme, nothing to do
  for each entry in assets.zip:
    if the target file already exists: skip    # loose files win
    mkdir -p its directory
    write to <target>.<pid>.tmp, then rename   # atomic: no half-written asset
```

Three properties, each deliberate:

**Idempotent.** Repeated builds expand nothing after the first. The check is per file, not
a marker file or a flag, so an interrupted expansion completes on the next build instead of
being remembered as done -- which only holds if each write is atomic. A plain write is not:
a build killed partway through two thousand icons leaves a truncated file that the existence
check then skips forever, and the next build hands those bytes to the image sizer. So each
entry is written to a temp path and renamed, which is atomic within a filesystem. That also
makes two concurrent builds in one directory safe, rather than one seeing the other's
half-written file.

**Loose files win.** In a theme repo the real assets are on disk and `assets.zip` may be
stale from an earlier `package`; skipping existing files means the archive can never
overwrite the source of truth. In a packaged skill there are no loose files, so the archive
is the only truth and every entry lands. The same rule gives the right answer in both
places, which is why it is a rule and not two code paths.

**No cleanup.** `assets.zip` stays after expansion. Deleting it would make the skill
directory un-rebuildable from scratch and buys nothing.

## Consequences

**The dev loop is unchanged.** A theme repo has loose assets and no archive; `expandAssets`
returns immediately. Nobody working on a theme sees this feature at all.

**`.gitignore` gains one line** in a theme: `assets.zip` is generated, like
`manifest.json` and `assets.json`.

**A theme with no assets** produces no archive, and `expandAssets` is a no-op.

**A stale archive backfills an asset deleted from disk.** In a theme repo, removing a PNG
without repackaging means the next build silently restores it from the archive and succeeds
with a file that is no longer in git. That is the correct consequence of "loose files win"
-- the alternative is an archive that can overwrite the source of truth -- but it is the
one case where the rule is surprising rather than merely safe.

## Work

1. Split `skillPaths` into plain and archived lists; nest the archived ones into
   `assets.zip` inside the skill zip.
2. Add `expandAssets(rootDir)`; call it from `buildDeck` before fill.
3. Tests: an asset catalog becomes one archive entry rather than N; expansion writes files
   at their declared paths; expansion skips a file that already exists; expansion is a
   no-op with no archive present; a theme with no assets still packages.
4. Repackage mz-slides, confirm **11 entries**, unpack it in a clean directory,
   `npm install`, build a deck, and check a rendered slide actually shows its images.
5. Patch release, then upload to Cowork -- which is the only test that the cap is really
   satisfied.

## Open

Whether the template should archive too. It is one file today, so it makes no difference to
the count; a theme shipping several templates would want it. Left alone until one does.
