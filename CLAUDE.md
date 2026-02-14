# Context for Claude

tycoslide is a TypeScript presentation framework that compiles a DSL into measured, positioned PPTX slides via Playwright-based HTML measurement.

## Key Paths
- `src/` - Core framework (layout, measurement, rendering)
- `src/compiler/` - Markdown document compiler (in progress)
- `docs/` - Design documents and feature specs
- `test/` - Tests (uses `node:test`, NOT vitest)

## Build & Test
- `npm run build` — compile TypeScript to `dist/`
- `npm test` — run test suite
- ALWAYS rebuild (`npm run build`) before any consumer runs slides, since `package.json` points `main` at `dist/index.js`

## Spec-Driven Development

Design docs in `docs/` define features with phased implementation plans. When implementing against a design doc:

1. **Read the spec first** — understand the phase requirements, decisions, and constraints before writing code
2. **Execute against the spec** — implement what the doc says, not more
3. **Verify automatically** — after completing implementation, always verify the result against the spec using the architect agent. Reference the specific phase/section. Do not wait for the user to ask for verification.
