# Story 100.3: E2E Test — Universe Delete Persists Across Refresh

Status: Done

## Story

As a developer,
I want a Playwright E2E test that deletes a universe row via the trash-can icon, refreshes
the page, and asserts the row no longer appears — plus a test that simulates a delete
failure and asserts the UI reports the failure honestly,
So that this exact regression class (UI says "deleted" while the row survives a refresh)
can never silently return.

## Acceptance Criteria

1. **Given** the test database has a deletable symbol seeded into the universe,
   **When** the E2E test clicks the trash-can icon on that row and waits for the success
   indication (toast/inline confirmation per existing UX),
   **Then** the row is no longer visible in the universe list.

2. **Given** the page is then reloaded (hard navigation / `page.reload()`),
   **When** the universe finishes loading from the server,
   **Then** the test asserts the deleted symbol does not appear in the rows.

3. **Given** a separate test scenario where the server delete is forced to fail (via a
   Playwright route fulfill returning a non-2xx status — see Dev Notes — NOT
   `route.abort('failed')`),
   **When** the trash-can is clicked,
   **Then** the test asserts (a) a failure indication is shown to the user via the
   project's standard error mechanism (toast/inline error — match existing convention),
   and (b) the row remains visible in the list.

4. **Given** the new tests are committed,
   **When** `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox` run,
   **Then** both pass.

5. **Given** all changes,
   **When** `pnpm all` runs,
   **Then** the new test passes and is not skipped (no `.skip`, no `xit`).

## Tasks / Subtasks

- [x] Task 1: Create the spec file (AC: #1, #4)
  - [x] Create `apps/dms-material-e2e/src/universe-delete-row.spec.ts`
  - [x] Use the existing `login` helper from
        `apps/dms-material-e2e/src/helpers/login.helper.ts`
  - [x] Follow file conventions of sibling specs such as
        `apps/dms-material-e2e/src/open-positions-screen-e2e.spec.ts` and the universe
        regression specs (`universe-sort-stickiness.spec.ts`,
        `universe-duplicate-symbols.spec.ts`,
        `universe-symbol-sort-empty-rows.spec.ts`)

- [x] Task 2: Seed a deletable universe symbol (AC: #1, #2)
  - [x] Reuse the existing universe seeding helper used by other universe E2E specs
        (likely under `apps/dms-material-e2e/src/helpers/`); confirm by reading the
        sibling universe specs first
  - [x] If no suitable helper exists, add the symbol via the same seeding pattern other
        universe specs use — do NOT introduce a new seeding mechanism
  - [x] The seeded symbol must have no foreign-key references that would block deletion
        (no associated trades / positions); pick a "scratch" symbol distinct from any
        symbol other universe specs depend on

- [x] Task 3: Happy-path delete + refresh test (AC: #1, #2)
  - [x] Navigate to the Universe screen using the same navigation pattern as the
        existing universe specs
  - [x] Resolve the row containing the seeded symbol by header-text-derived column
        index (do NOT hard-code numeric indexes — see Dev Notes pattern)
  - [x] Click the trash-can icon on that row; if a confirmation dialog exists, confirm
        it (read the current Universe component to determine the actual UX before
        coding; document what you find in Dev Agent Record)
  - [x] `expect.poll` until the row is removed from the visible list
  - [x] Call `page.reload()` and re-assert the symbol is not present after the universe
        finishes loading
  - [x] No `page.waitForLoadState('networkidle')` — use `expect.poll()` /
        `toBeVisible()` / `toHaveText()` matchers (project convention)

- [x] Task 4: Failure-path test — honest error UX (AC: #3)
  - [x] In a separate `test(...)` (NOT a separate spec file unless setup demands it),
        register a `page.route(...)` handler that intercepts the universe delete
        request and responds with `route.fulfill({ status: 500, ... })` — NEVER use
        `route.abort('failed')` (project convention, see Dev Notes)
  - [x] Click the trash-can on the seeded symbol
  - [x] Assert (a) the project's standard failure UX appears (toast / inline error —
        match what Story 100.2 actually wires up; if Story 100.2 is not yet merged,
        write the assertion against the contract from the epic and let the test fail
        red until 100.2 lands), and (b) the row remains visible

- [x] Task 5: Verify (AC: #4, #5)
  - [x] `pnpm nx lint dms-material-e2e --skip-nx-cache` passes
  - [x] `pnpm format` passes
  - [x] `pnpm all` passes
  - [x] `pnpm e2e:dms-material:chromium` passes locally (or note CI deferral with
        reason in Dev Agent Record, per the pattern in Story 97.4)
  - [x] `pnpm e2e:dms-material:firefox` passes locally (or note CI deferral)

## Dev Notes

### Story Context

This is the final story of Epic 100 — "Delete Row on Universe Screen" — a pure-test
regression-locking story. By the time this story runs, Story 100.1 has identified the
broken layer in the delete pipeline and Story 100.2 has fixed it end-to-end (server
actually deletes, client store removes the row on success, failure responses produce
honest error UX). This story locks both the happy path and the failure path with E2E
tests so the bug class — "UI shows success, row survives refresh" — cannot silently
return (R3, R4, R5 from the epic; NFR3, NFR5).

### What This Story Is NOT

- Not a fix for the delete pipeline — that's Story 100.2
- Not a diagnosis story — that's Story 100.1
- Not a unit-test story — Vitest unit tests for the server handler / client effect
  belong in 100.2
- Not a place to introduce a new seeding helper — reuse what other universe specs use

### E2E Test Environment & Conventions

- E2E tests run against the dev server at port **4301** (`http://localhost:4301`).
- Run individual project: `pnpm e2e:dms-material:chromium` and
  `pnpm e2e:dms-material:firefox`.
- Login helper: `apps/dms-material-e2e/src/helpers/login.helper.ts`.
- Do **not** use `page.waitForLoadState('networkidle')` — use `expect.poll()` or
  `toBeVisible()` / `toHaveText()` matchers (project convention).
- Do **not** use `route.abort('failed')` — use
  `route.fulfill({ status: 500, contentType: 'application/json', body: '...' })` for
  failure simulation (project convention; see Story 97.4 Dev Notes).
- For path resolution inside specs: spec files in `apps/dms-material-e2e/src/` are 3
  levels from the workspace root (use `../../..`); helpers in `src/helpers/` are 4
  levels (`../../../..`). Real bug fixed in Story 92.2 — do not regress.

### Reference Specs to Mirror

- `apps/dms-material-e2e/src/universe-sort-stickiness.spec.ts` (Story 54.1) — universe
  navigation + assertion pattern
- `apps/dms-material-e2e/src/universe-duplicate-symbols.spec.ts` (Story 55.1) — universe
  data-mutation + verification pattern
- `apps/dms-material-e2e/src/universe-symbol-sort-empty-rows.spec.ts` (Story 56.1) —
  universe load + scroll/sort assertions
- `apps/dms-material-e2e/src/open-positions-computed-fields.spec.ts` (Story 97.4) —
  reference for `expect.poll` + numeric/textual cell assertions and the column-by-header
  index pattern
- `apps/dms-material-e2e/src/import-volatility-after-import.spec.ts` (Story 92.2) —
  request-based seeding + assertion-against-API-then-UI pattern; also the canonical
  example of `route.fulfill` for forced failures
- `apps/dms-material-e2e/src/helpers/login.helper.ts` — login fixture

> Confirm the **exact** rendered selectors against the live UI (or the universe column
> definitions) before committing — table markup conventions (e.g. `tr.mat-mdc-row`,
> `mat-icon[svgIcon=...]` for the trash icon) may have shifted. Mirror what the
> sibling universe specs are doing today.

### Forced-Failure Pattern (AC #3)

Project convention is `route.fulfill`, never `route.abort('failed')`:

```typescript
await page.route('**/api/universe/**', async (route) => {
  if (route.request().method() === 'DELETE') {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Forced failure for E2E regression' }),
    });
    return;
  }
  await route.continue();
});
```

Register the route handler BEFORE clicking the trash icon. Tear down (or scope to a
single `test(...)`) so the happy-path test is unaffected.

### Honest-Error-UX Assertion

Story 100.2 chooses the actual error mechanism (toast / inline error / both). This
test must assert against whatever 100.2 wires up — read the Story 100.2 file (and the
implementation) before finalizing the assertion. If a snackbar is used, locate via
`mat-snack-bar-container` (or the equivalent selector other specs use today). The
assertion must verify (a) some user-visible failure indication AND (b) the row is
still present in the list (CSS row count unchanged for the targeted symbol).

### Column / Row Resolution Pattern

Resolve column indexes by header text rather than numeric position so the test does
not break if the column order changes (mirrors Story 97.4):

```typescript
const headerCells = page.locator('tr.mat-mdc-header-row th.mat-mdc-header-cell');
const headerTexts = await headerCells.allInnerTexts();
const idxOf = (label: string) => {
  const i = headerTexts.findIndex((t) => t.trim() === label);
  expect(i, `column "${label}" not found`).toBeGreaterThanOrEqual(0);
  return i + 1; // CSS :nth-child is 1-based
};
```

Resolve the target row by symbol text (the seeded scratch symbol) rather than by row
index — universe row order is not stable across runs.

### Key Commands

```bash
pnpm start:server                   # API server (required for E2E)
pnpm start:dms-material             # Angular dev server (port 4301)
pnpm e2e:dms-material:chromium      # Chromium E2E
pnpm e2e:dms-material:firefox       # Firefox E2E
pnpm all                            # Lint + build + test (all projects)
pnpm format                         # Format
```

### Project Structure Notes

The new spec lives at `apps/dms-material-e2e/src/universe-delete-row.spec.ts` and
follows the flat `src/` layout already used by every other spec. No new helpers, no
new fixtures, no config changes are required — if you find yourself wanting to add a
helper, first check whether an equivalent helper already exists (universe seeding has
been added by prior epics — 54, 55, 56, 68 — so reuse, don't duplicate).

### Out of Scope (do NOT do in this story)

- Any production code change (server, client store, UI) — that is Story 100.2's
  responsibility
- Diagnosing why the original bug occurred — that is Story 100.1's responsibility
- Sold-positions / open-positions delete behaviour — only Universe screen delete is
  in scope (R3–R5 from the epic)
- Adding new universe seeding helpers — reuse existing ones

### What Must Be Preserved

- Existing universe E2E specs must continue to pass — the new spec must not interfere
  with their seeding or shared state
- The chosen scratch symbol must not be a symbol any other universe / open-positions /
  sold-positions / dividend spec depends on; pick something obviously test-only

### References

- [_bmad-output/planning-artifacts/epics-2026-05-08.md](../planning-artifacts/epics-2026-05-08.md) — Epic 100 (Story 100.3 source)
- [_bmad-output/implementation-artifacts/97-4-e2e-open-positions-computed-fields.md](./97-4-e2e-open-positions-computed-fields.md) — pattern reference (Playwright E2E regression test for an Open Positions regression)
- Stories 100.1 and 100.2 must be completed before this story runs in CI

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

None required.

### Completion Notes List

- The spec file `apps/dms-material-e2e/src/universe-delete-row.spec.ts` was already created
  by Story 100.2 (commit da59a2af) before this story worktree was branched. The spec fully
  satisfies all acceptance criteria of Story 100.3.
- Delete UX investigation findings:
  - No confirmation dialog on delete; clicking the trash-can routes through
    `findAndDeleteUniverseRow(...)` to locate the SmartNgRX RowProxy by id, then calls
    its `delete()` which triggers the DELETE HTTP request.
  - Delete button has `data-testid="delete-symbol-{i}"` and `aria-label="Delete unused symbol"`.
  - Delete button is only shown for rows where `is_closed_end_fund === false && position === 0`.
  - Error UX: MatSnackBar via `NotificationService`; error snackbar has class `snackbar-error`.
- `pnpm nx lint dms-material-e2e --skip-nx-cache` — PASS
- `pnpm format` — PASS (no changes)
- `CI=1 pnpm all` — PASS (no affected tasks; spec was already committed on main via 100.2)
- E2E runs deferred to CI per project convention (no server running locally during implementation).

### File List

- `apps/dms-material-e2e/src/universe-delete-row.spec.ts` (pre-existing from Story 100.2,
  fully satisfies Story 100.3 ACs; no modifications needed)

### Change Log

- No new files created; spec was contributed by Story 100.2.
