# Story 103.3: E2E Test — Both Add-Symbol Modals Validate With Correct Polarity

Status: Approved

**Story Key:** `103-3-e2e-add-symbol-modals-validation`
**Epic:** 103 — Add New Symbol on Universe Screen (Validation Polarity Fix)
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-13.md](../planning-artifacts/epics-2026-05-13.md) (Story 103.3)
**Type:** E2E test (Playwright; both Chromium and Firefox)
**Depends on:** Story 103.2 (the fix) — [_bmad-output/implementation-artifacts/103-2-fix-universe-add-validator-polarity.md](103-2-fix-universe-add-validator-polarity.md)
**Enables:** None (closes Epic 103)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a Playwright E2E test that drives both the Universe *Add Symbol* modal and the Open
Positions *Add* modal and asserts the "Add" button enables/disables for the correct symbol
states in each,
So that any future change to the Universe Add submit gate, either modal's symbol validator,
or the symbol-autocomplete wiring that re-introduces the polarity bug fails CI immediately
on both Chromium and Firefox.

## Epic Context

**Epic 103 Goal:** The "Add" button in the Universe screen's *Add Symbol* modal never
enabled, even after Dave entered a valid new symbol. Story 103.1 investigated the root cause
and Story 103.2 applied the fix. The two modals require **opposite** polarity on the "is
symbol in Universe?" check:

- Universe Add → "Add" enables only when the symbol is **NOT** in the Universe (R1).
- Open Positions Add → "Add" enables only when the symbol **IS** in the Universe (R2).

This story (103.3) pins both polarities with regression coverage so future refactors of
either modal, the symbol validators, or the shared `dms-symbol-autocomplete` cannot silently
re-introduce the bug.

**Critical premise correction inherited from Stories 103.1 and 103.2:** The epic
hypothesised a single shared validator with the wrong polarity. The investigation refuted
that — there are **two independent local validators** with the correct polarities for their
respective modals (`duplicateSymbolValidator` on `AddSymbolDialogComponent`,
`symbolExistsValidator` on `AddPositionDialogComponent`). The actual broken layer was the
Universe Add modal's `isSubmitDisabled` gate (it required `selectedSymbol`, set only when
the user clicked an autocomplete option). Story 103.2 fixed that gate to depend on
`form.valid`. **This E2E must therefore exercise the free-text path** (typing a valid
not-in-Universe ticker without ever clicking an autocomplete suggestion) for the Universe
Add modal — that is exactly the path the bug lived in.

## Acceptance Criteria

1. **AC1 — Universe Add: NOT-in-universe symbol enables the "Add Symbol" button.**
   **Given** a seeded test database with at least one symbol present in the Universe
   (`UNIV_IN`) and a known ticker the test will verify is NOT in the Universe
   (`UNIV_OUT`),
   **When** the test logs in, navigates to the Universe screen, opens the *Add Symbol to
   Universe* modal, types `UNIV_OUT` into the symbol autocomplete (without clicking any
   autocomplete option), and selects a Risk Group,
   **Then** the test asserts the submit button (`[data-testid="submit-button"]`) is
   **enabled**, no `Symbol already in universe` `mat-error` is visible, and the dialog
   container `[data-testid="add-symbol-dialog"]` is still visible.

2. **AC2 — Universe Add: IN-universe symbol keeps the "Add Symbol" button disabled and
   surfaces the duplicate error.**
   **Given** the same modal,
   **When** the test types `UNIV_IN` into the symbol autocomplete and selects a Risk
   Group,
   **Then** the test asserts the submit button is **disabled** and the
   `Symbol already in universe` `mat-error` (rendered when `symbolDuplicateError()` is
   true in
   [add-symbol-dialog.html](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.html))
   is visible inside `#symbol-errors`.

3. **AC3 — Open Positions Add: IN-universe symbol enables the "Add Position" button (no
   regression to existing behaviour).**
   **Given** the test database also has at least one open-positions account where the same
   `UNIV_IN` symbol exists in the Universe,
   **When** the test navigates to that account's Open Positions screen, opens the *Add New
   Position* dialog (`[data-testid="dialog-title"]` = "Add New Position"), types
   `UNIV_IN` into `[data-testid="symbol-autocomplete"] input`, picks the matching
   autocomplete option (Open Positions Add still relies on the autocomplete-set
   `selectedUniverseId` per [add-position-dialog.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts)
   — see Dev Notes), fills `[data-testid="quantity-input"]` with a positive integer,
   `[data-testid="price-input"]` with a positive decimal, and
   `[data-testid="purchase-date-input"]` with a valid past date,
   **Then** the test asserts `[data-testid="add-position-button"]` is **enabled** and no
   `[data-testid="symbol-invalid-error"]` is visible.

4. **AC4 — Open Positions Add: NOT-in-universe symbol keeps the "Add Position" button
   disabled and surfaces `invalidSymbol` (no regression).**
   **Given** the same Open Positions Add dialog,
   **When** the test types `UNIV_OUT` into the symbol autocomplete (which will not match a
   Universe entry), then tabs/blurs to commit the value,
   **Then** the test asserts `[data-testid="add-position-button"]` is **disabled** and
   `[data-testid="symbol-invalid-error"]` is visible (the existing `invalidSymbol` error
   path; do not change the error key).

5. **AC5 — Test runs on both Chromium and Firefox via the standard pnpm scripts.**
   **Given** the new spec is committed under `apps/dms-material-e2e/src/`,
   **When** `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox` are run
   (or whatever the repo's current `pnpm all` E2E entrypoints are — see
   [project-context.md](../project-context.md) and [package.json](../../package.json) for
   the canonical script names),
   **Then** both runs pass.

6. **AC6 — Test is real, not skipped, and is part of `pnpm all`.**
   **Given** the new spec,
   **When** `scripts/check-no-skipped-tests.sh` runs,
   **Then** it does NOT flag the new file (no `test.skip`, `it.skip`, `xit`,
   `xdescribe`, or `.only`). The test must execute as part of `pnpm all` exactly like the
   other E2E specs in the directory.

7. **AC7 — Test data is seeded and torn down by the test, not by hand.**
   **Given** the existing seed-helper conventions in
   `apps/dms-material-e2e/src/helpers/` (see e.g.
   [seed-universe-e2e-data.helper.ts](../../apps/dms-material-e2e/src/helpers/seed-universe-e2e-data.helper.ts)
   and
   [seed-open-positions-e2e-data.helper.ts](../../apps/dms-material-e2e/src/helpers/seed-open-positions-e2e-data.helper.ts)),
   **When** the new spec runs,
   **Then** it seeds its own Universe symbols, Risk Groups, and (for AC3/AC4) an Open
   Positions account via a helper module, returns a `cleanup()` function, and calls
   `cleanup()` in `afterAll` / `afterEach` so subsequent tests are not polluted.
   `UNIV_OUT` must be a ticker the seeder verifies is NOT inserted into the Universe in
   the same run (use a `generateUniqueId()`-suffixed prefix that is never inserted, the
   same way other helpers ensure isolation).

8. **AC8 — Quality gate.**
   **Given** all changes are committed,
   **When** `pnpm format` then `pnpm all` runs,
   **Then** lint, format, build, unit, and E2E (Chromium + Firefox) all pass. No
   pre-existing tests regress. Record the green run in Completion Notes.

## Tasks / Subtasks

- [ ] **Task 1 — Confirm Story 103.2 is merged and the fix is in place** (AC: #1, #3)
  - [ ] Read [103-2-fix-universe-add-validator-polarity.md](103-2-fix-universe-add-validator-polarity.md)
        Status field. If not `Done`, STOP and `correct-course` — this story is
        regression coverage *for* that fix and is meaningless without it.
  - [ ] Open
        [add-symbol-dialog.ts](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts)
        and confirm `isSubmitDisabled` no longer requires `selectedSymbol()` — it should
        depend on `isLoading()` and `form.invalid` (or an equivalent form-status-driven
        signal). If it still uses `!this.selectedSymbol()`, STOP — 103.2 is incomplete.
  - [ ] Open
        [add-position-dialog.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts)
        and confirm `symbolExistsValidator` still emits `{ invalidSymbol: true }` when
        the symbol is NOT in the Universe (this is the polarity AC4 asserts).

- [ ] **Task 2 — Add a seed helper for this test's data** (AC: #7)
  - [ ] Create
        `apps/dms-material-e2e/src/helpers/seed-add-symbol-modals-e2e-data.helper.ts`.
  - [ ] Pattern after
        [seed-open-positions-e2e-data.helper.ts](../../apps/dms-material-e2e/src/helpers/seed-open-positions-e2e-data.helper.ts):
        use `generateUniqueId()` to make a per-run prefix; create at least one
        `UNIV_IN` symbol via `prisma.universe.createMany` and at least one Risk Group;
        create one Open Positions account with a single open trade on `UNIV_IN`; and
        compute a `UNIV_OUT` ticker that uses the same per-run prefix but is **not**
        inserted (e.g. `OUT-${uniqueId}` truncated to fit `^[A-Z]{1,5}$` if needed —
        note: the Universe Add validator pattern is `^[A-Z]{1,5}$`, so the chosen
        free-text symbol must be 1–5 uppercase letters; use a deterministic 5-char
        ticker that is verified-not-in-Universe by a final `prisma.universe.findFirst`
        check inside the seeder).
  - [ ] Return
        `{ accountId, riskGroupId, universeInSymbol, universeOutSymbol, cleanup }`.
        `cleanup()` must delete the trade, the account, and the inserted Universe
        symbol(s) — and only those — so it cannot wipe other tests' data.
  - [ ] Reuse [shared-prisma-client.helper.ts](../../apps/dms-material-e2e/src/helpers/shared-prisma-client.helper.ts)
        and [shared-risk-groups.helper.ts](../../apps/dms-material-e2e/src/helpers/shared-risk-groups.helper.ts);
        do **not** instantiate a fresh `PrismaClient` directly.

- [ ] **Task 3 — Create the E2E spec** (AC: #1, #2, #3, #4, #5, #6)
  - [ ] Create `apps/dms-material-e2e/src/add-symbol-modals-validation.spec.ts`.
  - [ ] Use `import { test, expect } from 'playwright/test';` (the repo convention — see
        [add-symbol-dialog.spec.ts](../../apps/dms-material-e2e/src/add-symbol-dialog.spec.ts)
        and [open-positions.spec.ts](../../apps/dms-material-e2e/src/open-positions.spec.ts)).
  - [ ] Use [login.helper.ts](../../apps/dms-material-e2e/src/helpers/login.helper.ts) in
        `beforeEach`. Wait for `domcontentloaded` / `networkidle` consistent with the
        sibling specs.
  - [ ] In `beforeAll`, call the new seed helper; store its result in module-scope
        bindings; call `cleanup()` in `afterAll`. Use `test.describe.configure({ mode: 'serial' })`
        so the four AC tests share one seed.
  - [ ] **Universe Add — AC1 path:** navigate to `/global/universe`, wait for the table,
        click `button[mattooltip="Add Symbol"]` (consistent with
        [add-symbol-dialog.spec.ts](../../apps/dms-material-e2e/src/add-symbol-dialog.spec.ts)
        line ~15) to open the modal, type `universeOutSymbol` into the symbol
        autocomplete input — **do not** click any `mat-option` — choose a Risk Group via
        the `mat-select`, then assert
        `await expect(page.locator('[data-testid="submit-button"]')).toBeEnabled()`.
  - [ ] **Universe Add — AC2 path:** in the same dialog (or after re-opening), clear the
        symbol input, type `universeInSymbol`, choose a Risk Group, then assert
        `[data-testid="submit-button"]` is disabled and the `Symbol already in universe`
        `mat-error` inside `#symbol-errors` is visible.
  - [ ] Close the dialog (Cancel or Escape) cleanly between AC1 and AC2 to avoid leaking
        state.
  - [ ] **Open Positions Add — AC3 path:** navigate to
        `/account/${accountId}/open`, wait for `networkidle`, click
        `[data-testid="add-new-position-button"]`, type `universeInSymbol` into
        `[data-testid="symbol-autocomplete"] input`, click the matching `mat-option`
        (Open Positions Add requires a real autocomplete pick to set
        `selectedUniverseId` — verify in
        [add-position-dialog.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts)),
        fill `quantity-input` (e.g. `10`), `price-input` (e.g. `123.45`), and
        `purchase-date-input` (e.g. `1/15/2024` — same format used by
        [open-positions.spec.ts](../../apps/dms-material-e2e/src/open-positions.spec.ts)),
        then assert `[data-testid="add-position-button"]` is enabled and
        `[data-testid="symbol-invalid-error"]` is NOT visible.
  - [ ] **Open Positions Add — AC4 path:** clear the symbol input, type
        `universeOutSymbol`, blur (Tab) to commit, then assert
        `[data-testid="add-position-button"]` is disabled and
        `[data-testid="symbol-invalid-error"]` is visible.
  - [ ] Cancel the dialog at the end of AC4 so subsequent tests are not affected.
  - [ ] Do **not** include `test.skip`, `test.only`, `xit`, or `xdescribe`. Do **not**
        introduce arbitrary `waitForTimeout` calls beyond what the sibling specs already
        use; prefer `waitForSelector` / `expect(...).toBeVisible({ timeout })`.

- [ ] **Task 4 — Run on Chromium and Firefox locally** (AC: #5)
  - [ ] Start the local stack required by E2E (e.g.
        [scripts/start-local-dev.sh](../../scripts/start-local-dev.sh) or whatever the
        repo's E2E launcher is — defer to repo convention; see Dev Notes).
  - [ ] Run `pnpm e2e:dms-material:chromium`. If the script name differs in the current
        repo, find the equivalent in
        [package.json](../../package.json) under `scripts.e2e*` and use that. Capture
        the green result in Completion Notes.
  - [ ] Run `pnpm e2e:dms-material:firefox` (or the repo equivalent). Capture the green
        result in Completion Notes.
  - [ ] If a flake is observed, do **not** add `test.retry` or weaken assertions —
        diagnose the timing or selector cause and fix it (see NFR5 in the epic).

- [ ] **Task 5 — Quality gate** (AC: #6, #8)
  - [ ] Run `pnpm format`.
  - [ ] Run `scripts/check-no-skipped-tests.sh` and confirm it passes for the new file.
  - [ ] Run `pnpm all` and confirm lint, build, unit, and E2E all pass on both browsers.
        Record the result in Completion Notes.
  - [ ] If `pnpm dupcheck` (or equivalent) is part of `pnpm all` and it flags shared
        logic between the new helper and an existing seed helper, factor the shared
        bit out into a small helper rather than copy-pasting.

## Dev Notes

### Architecture & Code Pointers

#### Universe Add modal (post-103.2 fix)

- **Component:** [apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts)
- **Template:** [apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.html](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.html)
- **Tests (unit):** [apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.spec.ts](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.spec.ts)
- **Submit button selector:** `[data-testid="submit-button"]`
- **Dialog container selector:** `[data-testid="add-symbol-dialog"]`
- **Cancel button selector:** `[data-testid="cancel-button"]`
- **Open trigger on Universe screen:** `button[mattooltip="Add Symbol"]` (used by
  [add-symbol-dialog.spec.ts](../../apps/dms-material-e2e/src/add-symbol-dialog.spec.ts)).
- **Symbol input:** the `<dms-symbol-autocomplete>` component renders an `input`
  underneath. Selector pattern from the existing spec is `dms-symbol-autocomplete input`;
  prefer that over the generic `mat-input` selector.
- **Duplicate-symbol error:** the `Symbol already in universe` `<mat-error>` is rendered
  inside `#symbol-errors` when `symbolDuplicateError()` is true. The simplest reliable
  assertion is
  `await expect(page.locator('#symbol-errors mat-error', { hasText: 'Symbol already in universe' })).toBeVisible()`.

#### Open Positions Add modal (must NOT regress)

- **Component:** [apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts)
- **Template:** [apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.html](../../apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.html)
- **Submit (Save) button:** `[data-testid="add-position-button"]`
- **Dialog title:** `[data-testid="dialog-title"]` (text: "Add New Position")
- **Symbol autocomplete:** `[data-testid="symbol-autocomplete"]` (the inner `input`)
- **Validation errors (relevant):**
  - `[data-testid="symbol-required-error"]` (control empty)
  - `[data-testid="symbol-invalid-error"]` (validator fired `invalidSymbol` — i.e. symbol
    is NOT in Universe — this is what AC4 asserts visible)
- **Other inputs the test must fill:** `[data-testid="quantity-input"]` (positive int),
  `[data-testid="price-input"]` (positive decimal),
  `[data-testid="purchase-date-input"]` (string date in `M/D/YYYY` per
  [open-positions.spec.ts](../../apps/dms-material-e2e/src/open-positions.spec.ts) line ~106).
- **Open trigger on Open Positions screen:**
  `[data-testid="add-new-position-button"]` (used by
  [open-positions.spec.ts](../../apps/dms-material-e2e/src/open-positions.spec.ts) line ~46).
- **Why AC3 must click an autocomplete option:** Open Positions Add's `onSave()` requires
  `selectedUniverseId`, which is set when the autocomplete picks a real Universe row. Do
  not skip the option-click for AC3 or the Save button will (correctly) stay disabled
  even with a valid in-Universe ticker.

### Test seeding conventions to follow

- Use [shared-prisma-client.helper.ts](../../apps/dms-material-e2e/src/helpers/shared-prisma-client.helper.ts)
  to obtain the `PrismaClient`. **Never** import `@prisma/client` directly into a test.
- Use [generate-unique-id.helper.ts](../../apps/dms-material-e2e/src/helpers/generate-unique-id.helper.ts)
  to namespace inserted rows so parallel runs do not collide.
- Use [shared-risk-groups.helper.ts](../../apps/dms-material-e2e/src/helpers/shared-risk-groups.helper.ts)
  to create / fetch the Equity / Income / Trend-Follow risk groups.
- Symbol-format constraint: the Universe Add validator pattern is `^[A-Z]{1,5}$`, so any
  ticker the test types **must be 1–5 uppercase letters**. The existing helpers use
  longer test prefixes (e.g. `OPAAA-${uniqueId}`) for *seeded* rows; that pattern is for
  the database side. For the *typed* `universeOutSymbol` (the value we type into the
  Universe Add modal in AC1), choose a 5-letter all-caps ticker that the seeder verifies
  is not present in the Universe at run time — e.g. pick from a small candidate set
  like `["ZZZZZ", "QQQQQ", "XXXXX"]` and `findFirst` to confirm it's not used; if all are
  used, fail fast with a clear seeder error.
- For the *typed* `universeInSymbol` (AC2 / AC3), the symbol the seeder inserts into the
  Universe **must also conform to** `^[A-Z]{1,5}$` because the Universe Add validator
  runs the pattern check on the typed value before the duplicate check fires. Do **not**
  use the helper-style `OPAAA-${uniqueId}` symbols for `universeInSymbol`; those would
  fail the pattern validator and we would assert the wrong error. Pick a deterministic
  5-letter ticker (e.g. `IUNIV`) and `findFirst` to confirm it is not pre-existing
  before insert; on collision pick a fallback or fail with a clear seeder error.

### Why this isn't covered by the unit specs

The two existing unit specs
([add-symbol-dialog.spec.ts](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.spec.ts)
and the corresponding spec for `add-position-dialog`) verify component-level behaviour
with mocked services. They cannot catch a regression caused by a wiring change in the
shared `dms-symbol-autocomplete`, the actual `SymbolSearchService`, the
`SmartNgRX/SmartSignals` Universe selector, or a route guard that prevents the modal from
opening at all. The E2E in this story exercises the real wiring end-to-end on both
browsers, which is what makes it a true regression net for the Epic 103 polarity bug.

### Testing standards

- Spec lives under `apps/dms-material-e2e/src/`; helpers under
  `apps/dms-material-e2e/src/helpers/`.
- Run via `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox` (verify
  exact script names in [package.json](../../package.json)). Both must pass.
- `pnpm all` must pass at the end (NFR1).
- No `it.skip` / `xit` / `xdescribe` / `test.only` may be introduced
  ([scripts/check-no-skipped-tests.sh](../../scripts/check-no-skipped-tests.sh) enforces).
- Test assertions must not be weakened to make tests pass; root causes must be fixed at
  the source (NFR5).
- Playwright MCP server may be used during development to debug selectors / timing, but
  the committed test must run in the standard headless Playwright runner.

### Project Structure Notes

- New spec file: `apps/dms-material-e2e/src/add-symbol-modals-validation.spec.ts` — fits
  the existing flat layout of `apps/dms-material-e2e/src/`.
- New seed helper:
  `apps/dms-material-e2e/src/helpers/seed-add-symbol-modals-e2e-data.helper.ts` — fits
  the existing `seed-*-e2e-data.helper.ts` naming convention.
- No production source files are modified by this story.
- Conventions per [project-context.md](../project-context.md): Vitest for unit tests,
  Playwright for E2E (Chromium + Firefox), tests are authoritative.

### Previous Story Intelligence

From [103-1](103-1-investigate-add-symbol-validator-polarity.md):

- **Two independent local validators, not a shared one.** Re-verify before coding the
  test (in case other in-flight stories moved this code) — but the test itself only
  needs the post-103.2 *behaviour*, not the validator topology.
- **Reproduction must use Playwright, not paraphrase.** The bug only shows up when a
  user types a free-text ticker without picking an autocomplete option. AC1 above
  faithfully reproduces that path.

From [103-2](103-2-fix-universe-add-validator-polarity.md):

- **`isSubmitDisabled` now depends on `form.invalid` (and `isLoading`), not
  `selectedSymbol`.** Therefore AC1 must pass without the test ever clicking a
  `mat-option`. If a future refactor reverts to gating on `selectedSymbol`, AC1 will
  fail — which is exactly the regression net we want.
- **Open Positions Add was untouched** by 103.2. Its existing
  `selectedUniverseId`-required submit gate is correct and still in place; AC3 must
  click an autocomplete option to satisfy it. Do not generalise the AC1 pattern (no
  option-click) to AC3.
- **Shared validator was not extracted.** Both modals still use their own local methods.
  If a follow-up story extracts a shared
  `apps/dms-material/src/app/shared/validators/symbol-in-universe.validator.ts`, this
  E2E should keep passing without modification because it asserts behaviour, not code
  shape.

### Git Intelligence

Before starting Task 3, run:

```
git log --oneline -n 10 apps/dms-material/src/app/universe-settings/add-symbol-dialog/
git log --oneline -n 10 apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/
git log --oneline -n 10 apps/dms-material-e2e/src/add-symbol-dialog.spec.ts
```

Capture the most relevant 1–3 commits for each (especially the 103.2 commit) in
Completion Notes so the reviewer can see what code shape this E2E is layered on top of.

### Latest Tech Information

- **Playwright + Angular 21 zoneless:** the dialogs are `OnPush` and signal-first.
  `expect(...).toBeEnabled()` / `.toBeVisible()` poll Angular's rendered DOM, which is
  driven by signal updates — no extra `waitForChangeDetection` is required. If a button
  enable lags after a form-status change, prefer
  `await expect(button).toBeEnabled({ timeout: 5000 })` over `waitForTimeout`.
- **Material `mat-error` rendering:** `mat-error` only renders when the form control is
  in `touched` / `dirty` state per Angular Material defaults. The
  Universe Add modal renders errors via `@if (showSymbolErrors())` — verify the error
  shows on the typed value path; if the field is not flagged as `touched`, blur the input
  (Tab) before asserting `mat-error` visibility.
- **No new external dependencies** are needed for this story.

### Project Context Reference

- Project context: [_bmad-output/project-context.md](../project-context.md) (loaded by the
  workflow's `persistent_facts`).
- Sprint status: [_bmad-output/implementation-artifacts/sprint-status.yaml](sprint-status.yaml)
  — note: at story-creation time no `development_status` entry exists for `103-3-…` (and
  none for the rest of the 103-series). Per user instruction, this workflow has **not**
  added one.

### Related Prior Work

- **Story 103.1** — Investigation. Establishes that the bug is the
  `selectedSymbol` submit gate, not the validator polarity. Read the "Recommendation
  for Story 103.2" subsection if anything in the 103.2 fix shape is unclear.
- **Story 103.2** — The fix. Read its Acceptance Criteria and Dev Notes to understand
  exactly what behaviour this E2E must pin.
- **[add-symbol-dialog.spec.ts](../../apps/dms-material-e2e/src/add-symbol-dialog.spec.ts)** —
  Existing E2E covering open / close / cancel / "Add disabled initially" paths. Borrow
  its selector patterns and `beforeEach` shape; do **not** duplicate its assertions.
- **[open-positions.spec.ts](../../apps/dms-material-e2e/src/open-positions.spec.ts)** —
  Existing E2E covering the Open Positions Add dialog's required-fields and inline-edit
  paths. Borrow its dialog-open and form-fill patterns for AC3 / AC4.

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-13.md](../planning-artifacts/epics-2026-05-13.md) — Story 103.3 section
- Investigation: [_bmad-output/implementation-artifacts/103-1-investigate-add-symbol-validator-polarity.md](103-1-investigate-add-symbol-validator-polarity.md)
- Fix: [_bmad-output/implementation-artifacts/103-2-fix-universe-add-validator-polarity.md](103-2-fix-universe-add-validator-polarity.md)
- Project context: [_bmad-output/project-context.md](../project-context.md)
- Universe Add component: [apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts)
- Universe Add template: [apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.html](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.html)
- Open Positions Add component: [apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts)
- Open Positions Add template: [apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.html](../../apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.html)
- Symbol autocomplete: [apps/dms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.ts](../../apps/dms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.ts)
- Existing E2E (Universe Add core): [apps/dms-material-e2e/src/add-symbol-dialog.spec.ts](../../apps/dms-material-e2e/src/add-symbol-dialog.spec.ts)
- Existing E2E (Open Positions Add core): [apps/dms-material-e2e/src/open-positions.spec.ts](../../apps/dms-material-e2e/src/open-positions.spec.ts)
- Login helper: [apps/dms-material-e2e/src/helpers/login.helper.ts](../../apps/dms-material-e2e/src/helpers/login.helper.ts)
- Open Positions seed helper (pattern reference): [apps/dms-material-e2e/src/helpers/seed-open-positions-e2e-data.helper.ts](../../apps/dms-material-e2e/src/helpers/seed-open-positions-e2e-data.helper.ts)
- Universe seed helper (pattern reference): [apps/dms-material-e2e/src/helpers/seed-universe-e2e-data.helper.ts](../../apps/dms-material-e2e/src/helpers/seed-universe-e2e-data.helper.ts)
- Skipped-test guard: [scripts/check-no-skipped-tests.sh](../../scripts/check-no-skipped-tests.sh)

## Dev Agent Record

### Agent Model Used

(to be filled in by the dev agent)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created.

### File List
