# tycoslide

Read [README.md](README.md) first for what tycoslide is and how it is used. For the authoring model (layouts, slot types, syntax), see [the deck skill](theme-package/SKILL.template.md) and [markdown.md](docs/markdown.md). This file is only about working on the code.

## Build & Test

```bash
npm run typecheck    # Type-check (tsc --build)
npm test             # Run tests (node:test)
npm run lint         # Biome check
```

TypeScript runs natively via Node's `--experimental-strip-types`. `tsc --build` compiles `src/` to `dist/`, JavaScript and `.d.ts` declarations, which the CLI and the tests run.

## Releasing

A `v*` tag releases the package. The release workflow runs CI, checks the tag matches `package.json`, publishes to npm through trusted publishing (no token or one-time password), and drafts the GitHub release. A version npm has published can never be reused, so if publishing fails, fix the cause and re-run the workflow on the same tag.

1. **Check what ships is right, not just present.** `theme-package/SKILL.template.md` goes into every packaged theme as its `SKILL.md`, and both skills read `docs/` from the installed package, so a known-wrong line there (an example that no longer builds, a stale path form) is a release blocker, not a todo item.
2. **Bump in a PR**: `npm version <patch|minor|major> --no-git-tag-version`, commit as `release vX.Y.Z`, and merge once CI passes. CI's package check confirms what the tarball holds and that it installs and builds a deck.
3. **Tag the merge on `main`**: `git switch main && git pull`, then `git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z`.
4. **Publish the release notes**: edit the drafted release on GitHub, then publish it.

## Architecture

The product principles, layers and coding standards are in [ARCHITECTURE.md](ARCHITECTURE.md):

@ARCHITECTURE.md
