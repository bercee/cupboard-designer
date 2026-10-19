# Repository Guidelines

## Project Structure & Module Organization

This is a static Vite and TypeScript application; it has no backend or
database. `src/main.ts` mounts the application. Keep calculation and business
rules in `src/domain/`: it must remain pure TypeScript with no DOM access.
Place browser interactions in `src/ui/` and shared presentation rules in
`src/styles/main.css`. Construction constants, labels, and output ordering
belong in `src/domain/constants.ts`.

Tests mirror the source concerns: use `tests/domain/` for unit tests,
`tests/ui/` for jsdom UI tests, and `tests/acceptance/` for worked end-to-end
examples. Do not edit generated `dist/` output.

## Build, Test, and Development Commands

- `npm ci` installs the locked dependencies; use it for a clean setup.
- `npm run dev` starts Vite at `http://localhost:5173/`.
- `npm test` runs the Vitest suite once; `npm run test:watch` keeps it running.
- `npm run typecheck`, `npm run lint`, and `npm run format:check` validate
  TypeScript, ESLint, and Prettier respectively.
- `npm run check` runs all validation gates, including tests.
- `npm run build` type-checks and writes the production site to `dist/`.

## Required QA Gate

Before every commit, run `npm run check` and `npm run build`. This covers
type checking, ESLint, Prettier, tests, and the production build. Fix every
failure before committing. If a failure cannot be resolved, do not commit the
change: report the failing command, error, and why
it remains unresolved. CI enforces the same checks for pushes and pull requests
to `main`.

## Coding Style & Naming Conventions

Write strict TypeScript with explicit domain types and `import type` for
type-only imports. Prettier is authoritative: 2-space indentation, double
quotes, semicolons, trailing commas, and 80-character lines. Use kebab-case
file names such as `generate-cut-list.ts`; name exported functions in
camelCase and types in PascalCase. Keep domain functions deterministic and
avoid mutating their inputs. Update the central constants instead of embedding
construction measurements or labels in UI code.

## Testing Guidelines

Use Vitest `describe` and `it` blocks, with files named `*.test.ts`. Add unit
tests for validation, formulas, aggregation, and TSV formatting; add UI tests
when changing DOM behavior. Cover boundary dimensions and both wall/base and
one/two-door paths where relevant.

## Commit & Pull Request Guidelines

Recent history uses short, imperative summaries, for example `Clarify
per-cupboard production list` and `fix some tests`. Keep each commit focused.
Pull requests should explain the user-visible or rule change, list validation
commands run, link the relevant issue when available, and include screenshots
for visual UI changes.
