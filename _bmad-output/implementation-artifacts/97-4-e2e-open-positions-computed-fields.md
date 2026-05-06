# Story 97.4: E2E Test for Open Positions Computed Fields

Status: Approved

## Story

As a developer,
I want a Playwright e2e test that opens the Open Positions table and asserts the five
restored computed columns display non-blank, server-supplied values,
so that the regression that originally hid these columns cannot recur silently.

## Acceptance Criteria

1. **Given** an account with at least one open position seeded into the test database,
   **When** the e2e test navigates to the Open Positions tab,
   **Then** the cells for **Expected$**, **Last$ Unrlz Gain%**, **Unrlz Gain$**,
   **Target Gain**, and **Target Sell** each display a non-empty, numerically-valid value
   (parses to a finite `Number` after stripping currency / `%` formatting).

2. **Given** the test is written using the Playwright pattern used by Epics 92–96
   (request-based seeding + UI assertions, no `networkidle`, no `route.abort('failed')`),
   **When** the test is added under `apps/dms-material-e2e/`,
   **Then** it is named `open-positions-computed-fields.spec.ts` and runs as part of the
   existing Playwright suite (picked up by `pnpm e2e:dms-material:chromium` and
   `pnpm e2e:dms-material:firefox`).

3. **Given** all changes,
   **When** `pnpm e2e` and `pnpm all` run,
   **Then** all tests pass — including the new spec on both Chromium and Firefox.

## Tasks / Subtasks

- [ ] Task 1: Create the spec file (AC: #2)
  - [ ] Create `apps/dms-material-e2e/src/open-positions-computed-fields.spec.ts`
  - [ ] Use the existing `login` helper from `apps/dms-material-e2e/src/helpers/login.helper.ts`
  - [ ] Follow the file conventions of sibling specs such as
        `apps/dms-material-e2e/src/open-positions-screen-e2e.spec.ts` and
        `apps/dms-material-e2e/src/import-volatility-after-import.spec.ts` (see Dev Notes)

- [ ] Task 2: Seed an account with at least one open position (AC: #1)
  - [ ] Reuse the existing open-positions seed helper
        (`apps/dms-material-e2e/src/helpers/seed-open-positions-e2e-data.helper.ts` or the
        equivalent factory used by `open-positions-screen-e2e.spec.ts`) so the seeded
        symbol is in the universe with the fields needed by the server `Trade` mapper
        (price, target buy/sell inputs, etc.) — Story 97.3's server changes must be
        present for those values to appear
  - [ ] Verify via `request.get('/api/trades/...')` that the response includes non-null
        `expected_dollars`, `last_dollars_unrealized_gain_percent`, `unrealized_gain_dollars`,
        `target_gain`, and `target_sell` for the seeded row before asserting the UI

- [ ] Task 3: Navigate to Open Positions and assert the 5 columns are non-blank (AC: #1)
  - [ ] Log in and navigate to the Open Positions tab using the same navigation pattern as
        `open-positions-screen-e2e.spec.ts`
  - [ ] Resolve the column index for each of the 5 target columns by reading the
        `<th>` header text (do NOT hard-code numeric indexes — column order may shift)
  - [ ] For at least one data row (the seeded row), read the cell text for each of the 5
        columns
  - [ ] Assert each cell text is non-empty AND, after stripping `$`, `,`, and `%`,
        `Number.isFinite(parseFloat(text))` is `true`
  - [ ] Use `expect.poll` (or `expect(locator).toHaveText(/.../)`) to handle async render —
        do NOT use `page.waitForLoadState('networkidle')`

- [ ] Task 4: Verify (AC: #3)
  - [ ] `pnpm e2e:dms-material:chromium` passes
  - [ ] `pnpm e2e:dms-material:firefox` passes
  - [ ] `pnpm all` passes
  - [ ] `pnpm format` passes

## Dev Notes

### Story Context

This is the final story of Epic 97 — "Restore Missing Open Positions Computed Fields on the
Server". It is a pure-test story: by the time this runs, Story 97.2 has already added
`expected_dollars`, `last_dollars_unrealized_gain_percent`, `unrealized_gain_dollars`, and
`target_gain` to the server `Trade` response, and Story 97.3 has moved `target_sell` to the
server. This story locks those gains in with a regression test so the columns cannot silently
go blank again.

### What "computed columns" means here

The 5 columns under test are server-supplied fields on each `Trade` row returned from the
trades API. The Open Positions table renders them; this test asserts they render non-blank
and look like numbers. Do NOT re-derive the formulas in the test — that's the unit-test
job (covered in Stories 97.2 and 97.3). This test only confirms the server values reach the
UI.

### E2E Test Environment & Conventions

- E2E tests run against the dev server at port **4301** (`http://localhost:4301`).
- Run individual project: `pnpm e2e:dms-material:chromium` and
  `pnpm e2e:dms-material:firefox`.
- Login helper: `apps/dms-material-e2e/src/helpers/login.helper.ts`.
- Do **not** use `page.waitForLoadState('networkidle')` — use `expect.poll()` or
  `toBeVisible()` / `toHaveText()` matchers (project convention).
- Do **not** use `route.abort('failed')` — use `route.fulfill({ status: 500, ... })` if
  failure simulation is ever needed (not needed for this story).
- For path resolution inside specs: spec files in `apps/dms-material-e2e/src/` are 3 levels
  from the workspace root (use `../../..`); helpers in `src/helpers/` are 4 levels
  (`../../../..`). This was a real bug fixed in Story 92.2.

### Reference Specs to Mirror

- [apps/dms-material-e2e/src/open-positions-screen-e2e.spec.ts](apps/dms-material-e2e/src/open-positions-screen-e2e.spec.ts) — primary reference for navigating to the Open Positions tab and the table selectors used there.
- [apps/dms-material-e2e/src/import-volatility-after-import.spec.ts](apps/dms-material-e2e/src/import-volatility-after-import.spec.ts) — Story 92.2 example of request-based seeding + assertion-against-API-then-UI pattern.
- [apps/dms-material-e2e/src/svol-column.spec.ts](apps/dms-material-e2e/src/svol-column.spec.ts) (Story 86.3) — example of resolving columns by header text and asserting cell content with `expect.poll`.
- [apps/dms-material-e2e/src/helpers/seed-open-positions-e2e-data.helper.ts](apps/dms-material-e2e/src/helpers/seed-open-positions-e2e-data.helper.ts) — open-positions seeding (or use the helper that `open-positions-screen-e2e.spec.ts` already uses).
- [apps/dms-material-e2e/src/helpers/login.helper.ts](apps/dms-material-e2e/src/helpers/login.helper.ts) — login fixture.

### Column-Header Resolution Pattern

Resolve column indexes by header text rather than numeric position so the test does not
break if the column order changes. Example:

```typescript
const headerCells = page.locator('tr.mat-mdc-header-row th.mat-mdc-header-cell');
const headerTexts = await headerCells.allInnerTexts();
const idxOf = (label: string) => {
  const i = headerTexts.findIndex((t) => t.trim() === label);
  expect(i, `column "${label}" not found`).toBeGreaterThanOrEqual(0);
  return i + 1; // CSS :nth-child is 1-based
};

const targetColumns = [
  'Expected$',
  'Last$ Unrlz Gain%',
  'Unrlz Gain$',
  'Target Gain',
  'Target Sell',
];
```

> Confirm the **exact** rendered header strings against the live UI (or the columns
> definition file under `apps/dms-material/src/app/.../open-positions/...columns.ts`) before
> committing — the labels above match the epic spec but the rendered text may include
> tooltip-affecting whitespace. If a header label differs, update the array to match what
> the table actually renders.

### Numeric-Validity Assertion

Strip non-numeric formatting before parsing:

```typescript
const numericish = (s: string) => Number.isFinite(parseFloat(s.replace(/[$,%\s]/g, '')));
```

Then for each row × column intersection:

```typescript
const cell = page.locator(`tr.mat-mdc-row:nth-child(1) td:nth-child(${idx})`);
await expect.poll(async () => (await cell.innerText()).trim().length > 0).toBeTruthy();
const text = (await cell.innerText()).trim();
expect(text, `${label} should be non-empty`).not.toBe('');
expect(numericish(text), `${label} text "${text}" should parse as a number`).toBe(true);
```

### Why API-Verify Before UI-Assert

The volatility import test (Story 92.2) established the pattern: assert the API response
shape first (`request.get('/api/trades/...')`) so a failure is unambiguous between
"server didn't return the field" vs "UI didn't render the field". Apply the same pattern
here — it makes a regression in either Story 97.2 or 97.3 immediately diagnosable from the
test failure message.

### Out of Scope for This Story

- Asserting the **values** themselves (formula correctness) — covered by unit tests in
  Stories 97.2 and 97.3.
- Sold Positions and Dividend Deposits computed fields — explicitly out of scope per the
  Epic 97 scope statement.
- Adding new seed helpers — reuse the existing open-positions seeder.

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

The new spec lives at `apps/dms-material-e2e/src/open-positions-computed-fields.spec.ts` and
follows the flat `src/` layout already used by every other spec in the project. No new
helpers, no new fixtures, no config changes are required.

### References

- [_bmad-output/planning-artifacts/epics-2026-05-05.md](../planning-artifacts/epics-2026-05-05.md) — Epic 97 (Story 97.4 source)
- [apps/dms-material-e2e/src/open-positions-screen-e2e.spec.ts](apps/dms-material-e2e/src/open-positions-screen-e2e.spec.ts)
- [apps/dms-material-e2e/src/import-volatility-after-import.spec.ts](apps/dms-material-e2e/src/import-volatility-after-import.spec.ts)
- [apps/dms-material-e2e/src/svol-column.spec.ts](apps/dms-material-e2e/src/svol-column.spec.ts)
- [apps/dms-material-e2e/src/helpers/login.helper.ts](apps/dms-material-e2e/src/helpers/login.helper.ts)
- [apps/dms-material-e2e/src/helpers/seed-open-positions-e2e-data.helper.ts](apps/dms-material-e2e/src/helpers/seed-open-positions-e2e-data.helper.ts)
- Stories 97.1, 97.2, and 97.3 must be completed before this story

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
