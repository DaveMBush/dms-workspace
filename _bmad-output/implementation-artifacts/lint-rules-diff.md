# Lint Rules Diff — SmartNgRX v-next vs dms-workspace

> Comparison date: 2026-03-18
> Source: `DaveMBush/SmartNgRX` branch `v-next` — `eslint.config.js`
> Target: `DaveMBush/dms-workspace` branch `main` — `eslint.config.mjs`

---

## Rules to Add

These rules exist in SmartNgRX but are absent from dms-workspace.

| Rule                                     | Plugin          | Proposed Severity | Notes                                                                                                               |
| ---------------------------------------- | --------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| `@angular-eslint/component-class-suffix` | @angular-eslint | `error`           | Currently commented out in dms-workspace. SmartNgRX enforces it. Re-enable unless there's a reason it was disabled. |

**Note:** The two configs are nearly identical in their main rule blocks. Only one rule is completely missing. The major gap is the test-file linting section — SmartNgRX uses `eslint-plugin-jest`, while dms-workspace uses Vitest but has no vitest lint plugin. See "Vitest Substitutes" below.

---

## Rules to Skip (Jest-Specific)

These rules come from `eslint-plugin-jest` in SmartNgRX and do **not** apply to dms-workspace because it uses Vitest, not Jest.

| Rule                                                 | Plugin             | Reason                                                                                  |
| ---------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------- |
| `plugin:jest/recommended` (extends)                  | eslint-plugin-jest | Config preset — not applicable; replace with `@vitest/eslint-plugin` recommended config |
| `jest/expect-expect`                                 | eslint-plugin-jest | Direct vitest equivalent exists (see below)                                             |
| All other `jest/*` rules from the recommended preset | eslint-plugin-jest | Not applicable — we don't use Jest                                                      |

---

## Vitest Substitutes

These are the Jest rules from SmartNgRX that have direct `@vitest/eslint-plugin` equivalents. These should be added in Story 4.3.

| Jest Rule                                         | Vitest Equivalent              | Notes                                                                                                                                                   |
| ------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jest/expect-expect`                              | `vitest/expect-expect`         | SmartNgRX config: `['error', { assertFunctionNames: ['expect', 'expectObservable', 'expectSubscriptions'] }]`. Apply same `assertFunctionNames` option. |
| `jest/no-disabled-tests` (from recommended)       | `vitest/no-disabled-tests`     | Prevents `it.skip`/`test.skip` from being committed. Must exempt `@atdd` files per ADR-004.                                                             |
| `jest/no-focused-tests` (from recommended)        | `vitest/no-focused-tests`      | Prevents `it.only`/`test.only` from reaching CI.                                                                                                        |
| `jest/valid-title` (from recommended)             | `vitest/valid-title`           | Ensures test titles are strings and follow conventions.                                                                                                 |
| `jest/no-identical-title` (from recommended)      | `vitest/no-identical-title`    | Prevents duplicate test names within a describe block.                                                                                                  |
| `jest/no-conditional-expect` (from recommended)   | `vitest/no-conditional-expect` | Prevents expect() inside conditionals.                                                                                                                  |
| `jest/no-standalone-expect` (from recommended)    | `vitest/no-standalone-expect`  | Prevents expect() outside of test blocks.                                                                                                               |
| `jest/no-export` (from recommended)               | `vitest/no-export`             | Prevents exporting from test files. Verify compatibility with any shared test helpers.                                                                  |
| `jest/no-mocks-import` (from recommended)         | —                              | No direct vitest equivalent; not applicable since vitest uses `vi.mock()` instead of `__mocks__` directories. Skip.                                     |
| `jest/no-deprecated-functions` (from recommended) | —                              | Not applicable to vitest. Skip.                                                                                                                         |
| `jest/valid-expect` (from recommended)            | `vitest/valid-expect`          | Ensures `.resolves`/`.rejects` are awaited and expect has assertions.                                                                                   |
| `jest/no-jasmine-globals` (from recommended)      | —                              | Not applicable to vitest. Skip.                                                                                                                         |

---

## Config Option Differences

These rules exist in both configs but with different options. Listed for awareness — these are intentional dms-workspace customizations and should **not** be changed to match SmartNgRX.

| Rule                                                | SmartNgRX Config                                                                        | dms-workspace Config                                    | Reason to Keep DMS Version                                                                                   |
| --------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `@angular-eslint/component-selector`                | prefix: `['dmb']`                                                                       | prefix: `['dms']`                                       | Project-specific prefix                                                                                      |
| `@angular-eslint/directive-selector`                | prefix: `['dmb']`                                                                       | prefix: `['dms']`                                       | Project-specific prefix                                                                                      |
| `@angular-eslint/pipe-prefix`                       | prefixes: `['dmb']`                                                                     | prefixes: `['dms']`                                     | Project-specific prefix                                                                                      |
| `@typescript-eslint/naming-convention` (const vars) | `format: ['camelCase']`                                                                 | `format: ['camelCase', 'UPPER_CASE']`                   | DMS allows `UPPER_CASE` constants (e.g., `const MAX_RETRIES = 5`)                                            |
| `@typescript-eslint/no-invalid-void-type`           | `'error'` (no options)                                                                  | `['error', { allowInGenericTypeArguments: true }]`      | DMS needs generics like `Observable<void>`                                                                   |
| `@typescript-eslint/no-misused-promises`            | `'error'` (no options)                                                                  | `['error', { checksVoidReturn: { arguments: false } }]` | DMS has Angular callbacks that return void promises                                                          |
| `@typescript-eslint/unbound-method`                 | `['error', { ignoreStatic: true }]`                                                     | Commented out (crash bug in typescript-eslint 8.51.0)   | Re-enable when upstream bug is fixed                                                                         |
| `unused-imports/no-unused-vars`                     | `{ vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' }` | `{ args: 'after-used', argsIgnorePattern: '^_+' }`      | DMS uses `_+` pattern (one or more underscores); consider adding `vars: 'all'` and `varsIgnorePattern: '^_'` |

---

## DMS-Only Rules (Not in SmartNgRX)

These rules exist in dms-workspace but not in SmartNgRX. They are intentional additions and should be kept.

| Rule                                                     | Notes                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `@angular-eslint/component-max-inline-declarations`      | Enforces external templates/styles/animations (template: 0, styles: 0, animations: 0) |
| `sonarjs/no-hardcoded-passwords: 'off'` (test files)     | Test-specific override                                                                |
| `sonarjs/assertions-in-tests: 'off'` (test files)        | Test-specific override                                                                |
| `sonarjs/pseudo-random: 'off'` (test files)              | Test-specific override                                                                |
| `sonarjs/no-alphabetical-sort: 'off'` (test files)       | Test-specific override                                                                |
| `@typescript-eslint/no-deprecated: 'off'` (dms-material) | Workaround for RxJS 7 false positives                                                 |
| `sonarjs/deprecation: 'off'` (e2e files)                 | E2E-specific override                                                                 |

---

## Already Present

**~185 rules** are present in both configs with identical or functionally equivalent settings. These include all core ESLint, TypeScript-ESLint, Angular-ESLint, SonarJS, RxJS, NgRx, Unicorn, Import, Stylistic, and Smarttools rules. No action required.

---

## Summary

| Category           | Count | Action                          |
| ------------------ | ----- | ------------------------------- |
| Rules to Add       | 1     | Story 4.2                       |
| Jest Rules to Skip | 4     | No action (not applicable)      |
| Vitest Substitutes | 9     | Story 4.3                       |
| Config Differences | 8     | Keep DMS versions (intentional) |
| DMS-Only Rules     | 7     | Keep (intentional additions)    |
| Already Present    | ~185  | No action                       |

### Recommended `unused-imports/no-unused-vars` Enhancement

Consider aligning the `unused-imports/no-unused-vars` config to add `vars: 'all'` and `varsIgnorePattern: '^_'` from SmartNgRX. This catches unused variables (not just arguments) while still allowing `_`-prefixed throwaway variables. This is a low-risk improvement for Story 4.2.
