# Story 4.3: Add Vitest-Equivalent Rules

Status: Done

## Story

As a developer,
I want the Jest-specific rules from SmartNgRX replaced with equivalent vitest/eslint-plugin-vitest rules,
so that our test code is held to the same quality bar as the source code.

## Acceptance Criteria

1. All rules from the "Vitest Substitutes" section of `lint-rules-diff.md` are added to `eslint.config.mjs` using `eslint-plugin-vitest`.
2. `pnpm all` passes with zero lint errors.
3. Each vitest rule added has a brief rationale comment in `eslint.config.mjs` explaining why it was added.

## Tasks / Subtasks

- [ ] Read `_bmad-output/implementation-artifacts/lint-rules-diff.md` — Section 3: Vitest Substitutes (AC: 1)
- [ ] Install `@vitest/eslint-plugin` (or `eslint-plugin-vitest`) (AC: 1)
  ```bash
  pnpm add -D @vitest/eslint-plugin
  ```
- [ ] Import and register the vitest plugin in `eslint.config.mjs` (AC: 1)
- [ ] Add a dedicated config block scoped to test files for vitest rules (AC: 1, 3)
  - [ ] Scope to: `**/*.spec.ts` and `apps/dms-material-e2e/**/*.ts`
  - [ ] Add each rule from the Vitest Substitutes mapping
  - [ ] Add a brief comment above each rule block explaining its purpose
- [ ] Run `pnpm lint` — resolve any violations in test files triggered by the new rules (AC: 2)
- [ ] Run `pnpm all` and confirm it passes with zero errors (AC: 2)
- [ ] Run `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox` — confirm no regressions

## Dev Notes

### Prerequisite

Story 4.1 must be complete. Story 4.2 should be complete (so the base config is stable before adding test rules).

### Package — Preferred Approach

Use the official Vitest ESLint plugin:

```bash
pnpm add -D @vitest/eslint-plugin
```

Import:

```js
import vitest from '@vitest/eslint-plugin';
```

> Note: `eslint-plugin-vitest` (community) is an alternative if `@vitest/eslint-plugin` lacks a needed rule, but prefer the official one.

### Config Block Pattern

Add a config block scoped specifically to spec and E2E test files — do NOT apply vitest rules to production source files:

```js
{
  // Vitest rules — test files only
  // These replace the Jest equivalents from SmartNgRX eslint.config.js
  files: ['**/*.spec.ts', 'apps/dms-material-e2e/**/*.ts'],
  plugins: {
    vitest,
  },
  rules: {
    // Prevents accidentally-skipped tests from being committed
    'vitest/no-disabled-tests': 'error',

    // Prevents focused tests (test.only) from being committed
    'vitest/no-focused-tests': 'error',

    // Ensures every test has at least one expect()
    'vitest/expect-expect': 'error',

    // ... additional rules from lint-rules-diff.md Section 3
  },
},
```

### @atdd Exemption

Files containing `// @atdd` are intentionally-skipped ATDD scaffolding. If `vitest/no-disabled-tests` fires on these files, add an override to restore the exemption:

```js
{
  files: ['**/*.spec.ts'],
  // @atdd files intentionally use it.skip — exempt from no-disabled-tests
  // See: architecture.md ADR-004
  rules: {
    'vitest/no-disabled-tests': 'off',
  },
}
```

Scope this override only to files that match `// @atdd`, or add it as a separate config block with a comment.

### Rationale Comment Convention

Each rule (or logical group) must have an inline comment:

```js
rules: {
  // Prevents accidentally-committed test.skip / xit — skipped tests are invisible bugs
  'vitest/no-disabled-tests': 'error',

  // Prevents test.only / fit leaking into CI — would silently skip all other tests
  'vitest/no-focused-tests': 'error',
}
```

### Lint Commands

```bash
# Check test files specifically
pnpm lint -- --rule '{"vitest/no-disabled-tests": "error"}' apps/dms-material/src/**/*.spec.ts

# Full check
pnpm all
```
