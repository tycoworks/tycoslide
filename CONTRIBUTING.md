# Contributing

Bug reports, ideas, and pull requests are welcome. For anything bigger than a small fix, open an [issue](https://github.com/tycoworks/tycoslide/issues) first, so we can agree on the approach before you write the code.

## Building from source

You'll need Node.js 24 or later.

```bash
git clone https://github.com/tycoworks/tycoslide.git
cd tycoslide
npm install
npm run build
```

To try your build on a deck, run its CLI from your theme's folder, such as `node ../tycoslide/bin/tycoslide.js build deck.md`.

## Testing

```bash
npm test       # builds, type-checks, and runs the tests
npm run lint   # Biome, including the import rules between layers
```

CI runs lint and the tests on Node 24 and 26 on every pull request, and checks that the package installs and builds a deck with a mermaid diagram. A pull request merges only once they pass.

## Pull requests

- Branch from `main`, and keep each commit to one change.
- Write each commit message as a short sentence saying what changed, such as `Image fit belongs to the slot`.
- Follow the principles and coding standards in [ARCHITECTURE.md](ARCHITECTURE.md), which also explains how tycoslide is built.
- If you change what a deck or theme can say, update [markdown.md](docs/markdown.md) or [theme.md](docs/theme.md). The tests check their examples.

## Releasing

Releases follow semantic versioning. To release, set the version in `package.json`, merge it, and push a matching tag, such as `v0.18.0`. The release workflow checks the tag, publishes the package to npm, and drafts the GitHub release for you to edit and publish.
