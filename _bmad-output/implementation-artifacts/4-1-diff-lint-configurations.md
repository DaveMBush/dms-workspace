# Story 4.1: Diff Lint Configurations

Status: Approved

## Story

As a developer,
I want to compare the SmartNgRX `eslint.config.js` against our current `eslint.config.mjs`,
so that I know exactly which rules are new, missing, or replaced.

## Acceptance Criteria

1. Both configuration files are compared rule-by-rule.
2. Output is a documented list of three categories: rules to add, rules to skip (jest-specific), and vitest equivalents to substitute.
3. The diff is saved to `_bmad-output/implementation-artifacts/lint-rules-diff.md`.

## Tasks / Subtasks

- [ ] Fetch the SmartNgRX `eslint.config.js` from the `v-next` branch (AC: 1)
  - [ ] Clone or download `https://github.com/DaveMBush/SmartNgRX/blob/v-next/eslint.config.js`
  - [ ] Save locally for side-by-side comparison (do not commit this file)
- [ ] Extract the full rule set from the SmartNgRX config (AC: 1)
  - [ ] List every named rule and its severity/config
- [ ] Extract the full rule set from our `eslint.config.mjs` (AC: 1)
  - [ ] List every named rule and its severity/config across all config blocks
- [ ] Diff the two rule sets and classify each delta (AC: 2)
  - [ ] **Add**: rules in SmartNgRX but not in ours
  - [ ] **Skip**: rules that are jest-specific (e.g., from `eslint-plugin-jest`) — not applicable here
  - [ ] **Vitest-substitute**: jest rules that have a direct vitest/eslint-plugin-vitest equivalent
  - [ ] **Already present**: rules present in both (document for completeness, no action needed)
- [ ] Write `_bmad-output/implementation-artifacts/lint-rules-diff.md` (AC: 3)
  - [ ] Section 1: Rules to Add (with proposed severity)
  - [ ] Section 2: Rules to Skip — Jest-specific (with rationale)
  - [ ] Section 3: Vitest Substitutes (jest rule → vitest equivalent mapping)
  - [ ] Section 4: Already Present (summary count, no detail needed)

## Dev Notes

### Source Files

| File | Location |
|------|----------|
| SmartNgRX reference | `https://github.com/DaveMBush/SmartNgRX/blob/v-next/eslint.config.js` |
| Our current config | `eslint.config.mjs` (workspace root) |

### Current Plugin Inventory

Our `eslint.config.mjs` already imports these plugins — cross-reference to avoid duplicating:

- `@eslint/js`, `@nx/eslint-plugin`, `eslint-plugin-jsdoc`
- `eslint-plugin-sonarjs`, `eslint-plugin-import`, `eslint-plugin-eslint-comments`
- `eslint-plugin-unicorn`, `@smarttools/eslint-plugin-rxjs`, `@smarttools/eslint-plugin`
- `@typescript-eslint/eslint-plugin`, `eslint-plugin-unused-imports`
- `@ngrx/eslint-plugin`, `eslint-plugin-max-params-no-constructor`
- `@stylistic/eslint-plugin-js`, `eslint-plugin-playwright`
- `eslint-plugin-simple-import-sort` (via FlatCompat)
- **NOT present**: `eslint-plugin-vitest` — this is the gap Story 4.3 addresses

### Jest Rules to Watch For

SmartNgRX likely includes rules from `eslint-plugin-jest` such as:
- `jest/no-disabled-tests`, `jest/no-focused-tests`, `jest/expect-expect`, `jest/valid-title`, etc.

These must be classified as **Skip** (we use Vitest, not Jest) and their vitest equivalents noted, e.g.:
- `jest/no-disabled-tests` → `vitest/no-disabled-tests`
- `jest/expect-expect` → `vitest/expect-expect`

### Output Document Format

```markdown
# Lint Rules Diff — SmartNgRX v-next vs dms-workspace

## Rules to Add

| Rule | Plugin | Proposed Severity | Notes |
|------|--------|-------------------|-------|
| no-console | @eslint/js | error | ... |

## Rules to Skip (Jest-Specific)

| Rule | Plugin | Reason |
|------|--------|--------|
| jest/no-disabled-tests | eslint-plugin-jest | We use Vitest |

## Vitest Substitutes

| Jest Rule | Vitest Equivalent | Notes |
|-----------|-------------------|-------|
| jest/no-disabled-tests | vitest/no-disabled-tests | Direct equivalent |

## Already Present

N rules already present in both configs (no action required).
```
