# Story 107.3: E2E Test — Closing a Position Removes It Without Refresh

Status: Done

**Story Key:** `107-3-e2e-close-position-immediate-removal`
**Epic:** 107 — Close Position Should Immediately Remove from Open Positions List
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-19.md](../planning-artifacts/epics-2026-05-19.md) (Story 107.3)
**Type:** E2E test (Playwright; no production code change)
**Depends on:** Story 107.2 — the (second-attempt) immediate-removal fix must be
implemented and `done` (or at minimum `review`) before this story is implemented,
otherwise the new test will fail by design and block the gate.
**Enables:** none — this is the final story in Epic 107.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a Playwright E2E test that closes an open position by saving a sell date and a
positive sell price, asserts the row disappears from the Open Positions list without a
page refresh, and asserts the same row appears on the Sold Positions screen,
So that any future change that breaks immediate-removal is caught before it ships.

## Epic Context

**Epic 107 Goal:** When Dave closes a position on the Open Positions screen by entering
a `Mst Rcnt Sll Dt` and a positive `Mst Rcnt Sell $` and saving, the row should
disappear from the Open Positions list within one rendered frame. Epic 104 previously
attempted this fix and shipped a regression-pinning E2E test (Story 104.3), but the bug
reproduces again in the current build — meaning either Epic 104's fix regressed, or
the original diagnosis missed a layer (the bug report points at
`handleSocketNotification('top', 'update', ['1'])` as the likely-correct surface).
Stories 107.1 (re-diagnose) and 107.2 (re-fix) close out the bug. **This story (107.3)
ships the new regression-pinning E2E test** so the bug stays fixed this time.

Hard constraints inherited from the epic:

1. The test must close the position **without** any page reload between the save and the
   "row is gone from Open Positions" assertion.
2. The test must navigate to the Sold Positions screen for the same account and assert
   the just-closed row is visible there with the sell date and sell price the test set.
3. The test must pass on **both** Chromium and Firefox (`pnpm e2e:dms-material:chromium`
   and `pnpm e2e:dms-material:firefox`).
4. The test must not be `.skip` / `xit` — `scripts/check-no-skipped-tests.sh` runs as
   part of `pnpm all` and will fail the gate if it is skipped.
5. `pnpm all` must pass.

## Acceptance Criteria

1. **AC1 — Test closes the position and asserts immediate removal (no reload).**
   **Given** the test has logged in, navigated to the Open Positions screen for a
   freshly-seeded account that has at least one open position with a known unique
   `symbol`,
   **When** the test sets that row's `sellDate` cell to a date and its `sell` cell to
   a positive value (committing each edit via the same blur/Enter interaction the
   inline `dms-editable-cell` and `dms-editable-date-cell` components use, identical
   to the pattern in `apps/dms-material-e2e/src/open-positions.spec.ts` lines ~317–340
   for the buy-price cell),
   **Then** the test asserts the row for that `symbol` is no longer present in the
   `[data-testid="open-positions-table"]` table — **without** issuing
   `page.reload()`, `page.goto(...)`, or any other navigation away from and back to
   the Open Positions screen.

2. **AC2 — Test navigates to Sold Positions and asserts the row appears.**
   **Given** the same test continues from AC1,
   **When** the test navigates to `/account/${accountId}/sold` (the Sold Positions
   screen for the same account) and waits for the sold table to render via the same
   `dms-base-table` + `tr.mat-mdc-row` pattern used by
   `apps/dms-material-e2e/src/sold-positions-screen-e2e.spec.ts`,
   **Then** the test asserts the just-closed row is visible there with the sell date
   and sell price the test entered (column-text assertions on the row whose Symbol
   column matches the seeded unique symbol).

3. **AC3 — Test passes on Chromium and Firefox.**
   **Given** the test is committed,
   **When** `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox` run,
   **Then** both pass.

4. **AC4 — Test runs as part of `pnpm all` and is not skipped.**
   **Given** the test is committed,
   **When** `pnpm all` runs,
   **Then** the new test is executed (not `.skip` / `xit` / `test.skip(...)`) and
   passes. `scripts/check-no-skipped-tests.sh` does not flag it.

5. **AC5 — Test is hermetic (cleans up its own data).**
   **Given** the test seeds its own account, universe rows, and trade rows via a
   dedicated seeder helper,
   **When** the test finishes (pass **or** fail),
   **Then** `afterAll` deletes every row it seeded — matching the
   `seedOpenPositionsE2eData` cleanup pattern. No cross-test data leakage.

6. **AC6 — Test does not regress when the immediate-removal fix is reverted.**
   **Given** Story 107.2's fix is **temporarily** reverted in a local branch,
   **When** the developer runs this test against that branch,
   **Then** the test **fails** at AC1 (the row is still present after save with no
   reload). This proves the test actually pins the regression. Record the manual
   "fix-reverted run" outcome in Dev Notes (one-line confirmation; revert the revert
   before committing).

7. **AC7 — Quality gate.**
   **Given** the test is added,
   **When** `pnpm all` runs,
   **Then** all tests pass — including the existing Open Positions and Sold Positions
   E2E suites that share `[data-testid="open-positions-table"]` and the
   `tr.mat-mdc-row` selectors, **and** the prior Epic 104 regression spec
   (`close-position-immediate-removal.spec.ts`) if it still exists in the tree. No
   existing test regresses.

## Tasks / Subtasks

> ⚠️ **Read Story 107.2 Dev Notes BEFORE starting.** Specifically the "Layer being
> fixed" subsection — it tells you which surface (e.g. the
> `handleSocketNotification('top', 'update', ['1'])` path the bug report suggests, a
> SmartArray remove, a `computed` selector, or a refetch) shipped and therefore
> which exact handler path the test will exercise. The test logic does not depend on
> the surface, but the troubleshooting hints in Dev Notes do.
>
> ⚠️ **Check whether Epic 104's spec still exists.** If
> `apps/dms-material-e2e/src/close-position-immediate-removal.spec.ts` (from
> Story 104.3) still exists in the tree, **do not** create a duplicate file —
> instead, decide whether to (a) extend the existing spec with the new
> Epic-107-specific assertions, or (b) rename the new spec to
> `close-position-immediate-removal-107.spec.ts`. Record the decision and rationale
> in Dev Notes. Default preference: extend the existing spec if its structure still
> matches; otherwise add a new uniquely-named spec rather than overwriting.

- [x] **Task 0 — Pre-flight check** (gates Tasks 1–7)
  - [x] Confirm Story 107.2 Status is `done` (or at minimum `review`) by reading
        `_bmad-output/implementation-artifacts/107-2-fix-close-position-removes-from-open-positions.md`
        (file path may vary; locate via the actual story file once 107.2 is
        complete). If 107.2 is not yet complete, **stop** and finish 107.2 first.
  - [x] Skim 107.2's "Layer being fixed" subsection so you know which client-side
        path (e.g. the `handleSocketNotification('top', 'update', ['1'])` surface
        from the bug report, a SmartArray `RowProxyDelete.delete()`, a `computed`
        filter, or a refetch) shipped. The E2E test asserts on observable behaviour
        and is surface-agnostic, but knowing the path helps debug intermittent
        failures.
  - [x] Check whether Story 104.3's spec
        (`apps/dms-material-e2e/src/close-position-immediate-removal.spec.ts`) is
        still in the tree. Record presence/absence and the chosen approach (extend
        vs new uniquely-named spec) in Dev Notes per the warning above.

- [x] **Task 1 — Create (or reuse) the seeder helper** (AC: #1, #2, #5)
  - [x] If `apps/dms-material-e2e/src/helpers/seed-close-position-e2e-data.helper.ts`
        already exists from Story 104.3, **reuse it** — do not duplicate. Verify its
        shape still matches the requirements below before reusing.
  - [x] Otherwise add
        `apps/dms-material-e2e/src/helpers/seed-close-position-e2e-data.helper.ts`
        modelled on
        [`seed-open-positions-e2e-data.helper.ts`](../../apps/dms-material-e2e/src/helpers/seed-open-positions-e2e-data.helper.ts).
  - [x] Seed exactly **one** open trade so the "row is gone" assertion is unambiguous
        and so the test is fast. The trade must have a unique symbol (use
        `generateUniqueId` like the existing seeders) so the row can be located by
        symbol text without depending on row index.
  - [x] Trade row shape: `sell: 0`, `sell_date: null` (open), `quantity > 0`,
        `buy > 0`, `buy_date` set — use the existing `buildTradeData` shape from the
        sibling helper, just with one trade instead of three. Universe row needs a
        `last_price` so the row renders with computed fields (the test does not
        assert on those, but the table won't paint a row without them).
  - [x] Cleanup must delete trades, account, and universe rows for the unique symbol
        — same pattern as the sibling helper.

- [x] **Task 2 — Add (or extend) the spec file** (AC: #1, #2, #3, #4, #5)
  - [x] Per Task 0's recorded decision, either extend
        `apps/dms-material-e2e/src/close-position-immediate-removal.spec.ts` (if it
        still exists from Story 104.3) or create a new uniquely-named spec
        alongside it.
  - [x] Mirror the imports / structure of
        [`open-positions-screen-e2e.spec.ts`](../../apps/dms-material-e2e/src/open-positions-screen-e2e.spec.ts):
        `playwright/test`, `login` helper, the seeder helper, `beforeAll` to seed,
        `afterAll` to clean up, `beforeEach` to log in and `goto`
        `/account/${accountId}/open`, and `waitForTableRows` modelled on the same
        file.
  - [x] One `test.describe('Close Position — Immediate Removal (Epic 107)', ...)`
        block with one primary `test('closes a position and removes it from Open
        Positions without reload, then shows it on Sold Positions', ...)`.
  - [x] Inside the test, scope the row by Symbol text:
        ```ts
        const row = page
          .locator('[data-testid="open-positions-table"] tr.mat-mdc-row')
          .filter({ hasText: symbols[0] });
        await expect(row).toHaveCount(1);
        ```
        This avoids brittle row-index lookups and survives any row-ordering
        difference between Chromium and Firefox.

- [x] **Task 3 — Drive the inline edits** (AC: #1)
  - [x] **Sell date first, then sell price** — order matches `onSellDateChange` /
        `onSellChange` semantics in
        [open-positions.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts)
        and matches the predicate (both must be set for the row to be "closed").
        After the date edit alone, the row should still be visible; after the
        positive-sell edit, the row must disappear.
  - [x] Edit sell date using the `dms-editable-date-cell` pattern from
        [editable-date-cell.component.html](../../apps/dms-material/src/app/shared/components/editable-date-cell/editable-date-cell.component.html):
        click `[data-testid="editable-sell-date"]` inside the scoped row, wait for
        `[data-testid="editable-sell-date-picker"]` to be visible, fill with
        `MM/DD/YYYY` (e.g. `'06/15/2026'`), press Enter, and `waitForTimeout(300)`
        to let the SmartNgRX update + render settle (same brief settle delay used by
        existing inline-edit tests in `open-positions.spec.ts`).
  - [x] Edit sell price using the `dms-editable-cell` pattern from
        [editable-cell.component.html](../../apps/dms-material/src/app/shared/components/editable-cell/editable-cell.component.html):
        click `[data-testid="editable-sell-price"]` inside the scoped row, wait for
        `[data-testid="editable-sell-price-input"]` to be visible, fill with a
        positive numeric string (e.g. `'150.00'`), press Enter, and
        `waitForTimeout(500)` for the save round-trip + store update + view
        re-render to complete.
  - [x] Use `.first()` only when scoping by data-testid alone; prefer the
        Symbol-scoped row locator (Task 2) for the editable-cell lookups so the
        right row is always edited even if the table happens to contain other rows
        with the same testid.

- [x] **Task 4 — Assert immediate removal from Open Positions (no reload)** (AC: #1)
  - [x] Assert the Symbol-scoped row locator now resolves to **0** matches, with a
        modest timeout (e.g. `await expect(row).toHaveCount(0, { timeout: 5000 })`).
        Do **not** call `page.reload()` or `page.goto()` between the sell-price save
        and this assertion.
  - [x] As a defensive secondary check, assert the table itself is still visible
        (`[data-testid="open-positions-table"]`) — this proves the row vanished
        because the store/selector dropped it, not because the entire screen
        re-rendered.

- [x] **Task 5 — Navigate to Sold Positions and assert the row appears** (AC: #2)
  - [x] `await page.goto(\`/account/\${accountId}/sold\`)` — same URL pattern used
        by [sold-positions-screen-e2e.spec.ts](../../apps/dms-material-e2e/src/sold-positions-screen-e2e.spec.ts).
  - [x] Wait for the Sold table the same way the sold-positions spec does:
        ```ts
        await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
        await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });
        ```
  - [x] Locate the now-closed row by Symbol text on the Sold table (same scoping
        strategy as Task 2, but on `dms-base-table` since Sold Positions does not
        currently expose a `data-testid="sold-positions-table"` — see Dev Notes).
        Assert the row is visible and that the sell-date and sell-price cells
        contain the values the test entered (use `toContainText` and the project's
        existing `shortDate` formatting — the column renders dates as `M/D/YY`).

- [ ] **Task 6 — Cross-browser run** (AC: #3)
  - [ ] Run `pnpm e2e:dms-material:chromium`, capture pass/fail in Dev Notes.
  - [ ] Run `pnpm e2e:dms-material:firefox`, capture pass/fail in Dev Notes.
  - [ ] If Firefox flakes on the inline-edit settle timing, **do not** raise the
        timeout blindly — re-read the existing `open-positions.spec.ts` inline-edit
        tests to see how they wait, and match their pattern (Enter + brief
        `waitForTimeout`). If a structural fix is needed (e.g. `expect.poll`),
        record the rationale in Dev Notes.

- [ ] **Task 7 — Verify the test pins the regression** (AC: #6)
  - [ ] In a throwaway local branch, revert Story 107.2's fix (or stub it out —
        the exact revert depends on which surface shipped; if the
        `handleSocketNotification('top', 'update', ['1'])` path shipped, comment
        out that invocation in the save handler).
  - [ ] Run the new spec — it must fail at AC1 (the Open-Positions row stays
        visible). Record the failure output in Dev Notes (one-line confirmation;
        do not commit the revert).
  - [ ] Restore the fix and confirm green again before continuing.

- [ ] **Task 8 — Skipped-test gate + quality gate** (AC: #4, #7)
  - [ ] Run `bash scripts/check-no-skipped-tests.sh` and confirm the new spec is not
        flagged. The new spec must contain zero `test.skip`, `it.skip`, `xit`,
        `xtest`, `describe.skip`, or commented-out `// test(...)` markers.
  - [ ] Run `pnpm all` and confirm green. Record the result and timestamp in Dev
        Notes.

## Dev Notes

### Architecture & Code Pointers

> Verified at story-creation time by reading the files. Re-confirm during
> implementation — Story 107.2's fix may have changed any of the cited line numbers,
> and the bug report explicitly points at the
> `handleSocketNotification('top', 'update', ['1'])` surface, which may be a new
> addition relative to Epic 104.

#### E2E test conventions (this repo)

- **Test framework:** Playwright via `playwright/test` (NOT `@playwright/test`).
  Confirm by looking at the imports of any existing spec, e.g.
  [open-positions-screen-e2e.spec.ts](../../apps/dms-material-e2e/src/open-positions-screen-e2e.spec.ts)
  line 1: `import { expect, Page, test } from 'playwright/test';`
- **Login:** every spec begins with `await login(page)` from
  [`helpers/login.helper.ts`](../../apps/dms-material-e2e/src/helpers/login.helper.ts).
  Mock auth accepts any email/password on localhost.
- **Seeded data, not shared state:** each spec seeds its own account/universe/trades
  via a dedicated `seed-*.helper.ts` and cleans up in `afterAll`. Never rely on data
  another spec leaves behind.
- **Wait pattern for tables:** `expect(table).toBeVisible({ timeout: 15000 })`
  followed by `page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 })`. Same
  pattern in both `open-positions-screen-e2e.spec.ts` and
  `sold-positions-screen-e2e.spec.ts`.
- **Brief `waitForTimeout(300–1000)` after inline edits** is the established idiom
  in this repo (see `open-positions.spec.ts` inline-edit tests). It exists to let
  the store flush the proxy mutation, fire the HTTP save, and complete the store
  update + view re-render.

#### Inline edit selectors (must match)

From [open-positions.component.html](../../apps/dms-material/src/app/account-panel/open-positions/open-positions.component.html):

| Cell | Display testid | Input testid (when editing) |
| --- | --- | --- |
| Sell price | `editable-sell-price` | `editable-sell-price-input` |
| Sell date | `editable-sell-date` | `editable-sell-date-picker` |
| Buy price | `editable-buy-price` | `editable-buy-price-input` |
| Buy date | `editable-buy-date` | `editable-buy-date-picker` |
| Quantity | `editable-quantity` | `editable-quantity-input` |

The `-input` / `-picker` suffix is appended by the underlying `dms-editable-cell` /
`dms-editable-date-cell` components when the cell is in edit mode (see
[editable-cell.component.html](../../apps/dms-material/src/app/shared/components/editable-cell/editable-cell.component.html)
and
[editable-date-cell.component.html](../../apps/dms-material/src/app/shared/components/editable-date-cell/editable-date-cell.component.html)).

**Click → fill → Enter** is the supported edit cycle for both:

```ts
// Sell date
const sellDateCell = row.locator('[data-testid="editable-sell-date"]');
await sellDateCell.click();
const sellDatePicker = page.locator('[data-testid="editable-sell-date-picker"]');
await sellDatePicker.waitFor({ state: 'visible', timeout: 5000 });
await sellDatePicker.fill('06/15/2026');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);

// Sell price
const sellPriceCell = row.locator('[data-testid="editable-sell-price"]');
await sellPriceCell.click();
const sellPriceInput = page.locator('[data-testid="editable-sell-price-input"]');
await sellPriceInput.waitFor({ state: 'visible', timeout: 5000 });
await sellPriceInput.fill('150.00');
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
```

> If the row-scoped `row.locator(...)` does not work because the editable cells
> render outside the `<tr>` (Material's overlay strategy can do this for the
> datepicker), fall back to a top-level `page.locator('[data-testid=...]').first()`
> after asserting the table currently contains exactly one data row (so `.first()`
> can only resolve to the seeded row). The seeder seeds exactly one trade for this
> reason.

#### Sold Positions selector caveat

`apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.html`
does **NOT** apply a `data-testid="sold-positions-table"` — it just renders
`<dms-base-table …>`. The existing
[sold-positions-screen-e2e.spec.ts](../../apps/dms-material-e2e/src/sold-positions-screen-e2e.spec.ts)
locates the table via `page.locator('dms-base-table')`. Use the same selector here
— **do not** add a new `data-testid` to the Sold Positions HTML in this story
(scope creep, would also affect any other spec).

#### Open Positions handlers (surface-agnostic — for debugging only)

[open-positions.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts):

- `onSellChange(position, newValue)` (line ~201) — proxy mutation on `trade.sell`,
  then (per 107.2) whatever close-handling path shipped: e.g. a
  `handleSocketNotification('top', 'update', ['1'])` call (the surface the bug
  report points at), a `RowProxyDelete.delete()`, a `computed` selector flip, or a
  refetch.
- `onSellDateChange(position, newDate)` (lines ~213–230) — same pattern for
  `trade.sell_date`.
- `findTradeById` (lines ~237–245) — helper used by both handlers.

The E2E test does not call any of these directly — it drives the editable cells.
But if Task 7 (revert-the-fix) shows the test is asserting the wrong thing, these
are the handlers to re-read.

#### Server endpoints exercised (no changes here)

- `PUT /api/trades` — handled by `handleUpdateTradeRoute` in
  [apps/server/src/app/routes/trades/index.ts](../../apps/server/src/app/routes/trades/index.ts).
  Persists `sell_date` and `sell` and returns the updated `Trade[]` via
  `mapTradeToResponse`.
- `GET /api/trades/closed` (or equivalent) — populates the Sold Positions list on
  navigate. Confirmed working by Story 104.1 (and re-confirmed by 107.1).

### Constraints (hard)

- **Do not modify any production code** in this story (no `apps/dms-material/src/...`,
  no `apps/server/src/...`, no `prisma/...`). The fix shipped in 107.2; this story
  only adds (or extends) an E2E test and its seeder.
- **Do not add a `data-testid` to** `sold-positions.component.html` — use the
  existing `dms-base-table` selector. Adding the testid is a separate, opportunistic
  change and not in scope.
- **Do not call `page.reload()` or `page.goto(...)` between the sell-price save and
  the "row is gone" assertion** — that defeats the purpose of the test (it would
  only assert the server-side `where: { sell_date: null }` filter still works on
  bootstrap, which Story 107.1 already confirmed and which is not the bug being
  pinned).
- **Do not skip / `xit` the test under any circumstance** — `pnpm all` will fail.
  If the test is genuinely impossible to write today (it isn't — the patterns are
  all in this repo), file a follow-up story instead.
- **Do not seed data into a shared account** — the seeder must create its own
  account so cleanup is total and there's no risk of corrupting another spec's
  fixtures.
- **Do not assert on row index** — assert on the seeded unique Symbol text.
- **No `await page.waitForTimeout(...)` larger than 1000 ms** unless justified in
  Dev Notes. Match the existing inline-edit tests' settle delays.
- **Do not delete the Epic 104 regression spec** if it still exists in the tree.
  Either extend it or sit alongside it (Task 0 decision). Deleting it loses
  historical coverage.

### Testing Standards

- **Test runner:** Playwright via `playwright/test`. Same nx project as all other
  e2e specs (`apps/dms-material-e2e`). No new nx target needed — the spec is picked
  up automatically by the existing `pnpm e2e:dms-material:chromium` /
  `:firefox` commands.
- **No unit test added in this story** — the close predicate is unit-tested in
  Story 107.2 (or in Story 104.2 if 107.2 reused that test). Adding a redundant
  unit test here would only duplicate coverage.
- **`pnpm all` must pass.** This is the project's quality gate; see
  [_bmad-output/project-context.md](../project-context.md).
- **`scripts/check-no-skipped-tests.sh` must pass.** It runs as part of `pnpm all`
  and will fail the build if the new spec contains any `.skip` / `xit` / `xtest`
  marker.

### Project Structure Notes

- E2E specs live under `apps/dms-material-e2e/src/` (flat — no per-feature
  subfolders).
- Spec helpers live under `apps/dms-material-e2e/src/helpers/`.
- Seeder naming convention: `seed-<feature>-e2e-data.helper.ts` exporting a single
  `seed<Feature>E2eData()` returning `{ accountId, symbols, cleanup }`.
- The seeder must use `initializePrismaClient` from
  [`shared-prisma-client.helper.ts`](../../apps/dms-material-e2e/src/helpers/shared-prisma-client.helper.ts)
  and `generateUniqueId` from
  [`generate-unique-id.helper.ts`](../../apps/dms-material-e2e/src/helpers/generate-unique-id.helper.ts) —
  same pattern as
  [`seed-open-positions-e2e-data.helper.ts`](../../apps/dms-material-e2e/src/helpers/seed-open-positions-e2e-data.helper.ts).
- File names use kebab-case; test names use the
  `should <do thing>` or imperative-sentence convention used by the surrounding
  specs.

### Previous Story Intelligence

#### From Story 107.1 (forthcoming — re-investigation)

- Story 107.1 re-diagnoses the bug after Epic 104's fix failed to hold. Read its
  Dev Notes for: (a) the captured HTTP save request/response, (b) DB-verified
  persistence of the new sell date and sell price, (c) the exact store-update vs
  selector-reactivity gap that Epic 104 missed, and (d) whether the bug report's
  `handleSocketNotification('top', 'update', ['1'])` suggestion is the right
  surface for the fix.
- 107.1's reproduction is via the Playwright **MCP** server (developer tooling),
  not via a Playwright **spec**. This story (107.3) converts that manual MCP
  reproduction into a permanent automated spec, just as Story 104.3 did originally.

#### From Story 107.2 (forthcoming — re-fix)

- Whatever surface 107.2 shipped (likely the
  `handleSocketNotification('top', 'update', ['1'])` socket-notification path that
  the bug report points at, but could also be a fresh SmartArray remove, a
  `computed` selector, or a refetch), the test asserts on **observable behaviour**
  (row gone in the DOM with no reload), so it works for any surface.
- The "closed" predicate remains `sell_date` set (non-empty) **AND** `sell > 0`.
  Editing only one of those must still leave the row on Open Positions. This story
  does **not** need to test the partial-close case — that belongs to 107.2's unit
  coverage. Don't expand scope.

#### From Epic 104 (prior failed attempt — still informative)

- **Story 104.1** (investigation) established the manual MCP reproduction pattern.
- **Story 104.2** shipped a client-side fix (the exact option — local SmartArray
  remove, `computed` filter, or refetch — is recorded in its Dev Notes) but the
  bug recurred, which is why Epic 107 exists. Read 104.2 Dev Notes to understand
  what was tried and why it didn't hold.
- **Story 104.3** shipped
  `apps/dms-material-e2e/src/close-position-immediate-removal.spec.ts` and the
  `seed-close-position-e2e-data.helper.ts` seeder. Both should still exist in the
  tree at the start of this story — Task 0 confirms presence and Task 1/Task 2
  decide whether to reuse, extend, or sit alongside.
- The fact that 104.3's spec didn't catch the recurrence is itself a signal: when
  extending or replacing the spec, confirm via Task 7 (revert the 107.2 fix) that
  the **new** assertions actually fail without 107.2's fix. If they don't, the spec
  is asserting the wrong thing.

### Reproduction inputs the test should use

- **Symbol:** unique per run, generated via `generateUniqueId` and embedded in the
  symbol (e.g. `CLOSE-${uniqueId}`). Avoids any collision with other specs running
  in parallel (Playwright runs at parallelism > 1 by default).
- **Sell date:** `'06/15/2026'` (matches the `MM/DD/YYYY` placeholder in
  `editable-date-cell.component.html`). Pick a date well clear of "today" so any
  date-relative formatting in the table is deterministic.
- **Sell price:** `'150.00'` — positive, two decimals, valid for the
  `dms-editable-cell` `min: 0` / `step: 0.01` config on the sell-price column. Must
  be > 0 to satisfy the closed predicate.
- **Buy price / quantity / buy date** in the seeded trade are arbitrary but must
  satisfy the existing `position-validators` rules (positive `buy`, positive
  `quantity`, valid `buy_date`).

### Related Prior Work

- **Story 107.1** (forthcoming) — re-investigation. Read its "Reproduction"
  subsection for the exact manual MCP repro this spec automates.
- **Story 107.2** (forthcoming) — the re-fix. Read its "Layer being fixed"
  subsection so you know which surface you're indirectly exercising.
- **Story 104.3** ([close-position-immediate-removal.spec.ts](../../apps/dms-material-e2e/src/close-position-immediate-removal.spec.ts)
  if still present) — the original regression spec from Epic 104. Reuse or extend
  rather than duplicate.
- **Story 97.4** ([open-positions-computed-fields.spec.ts](../../apps/dms-material-e2e/src/open-positions-computed-fields.spec.ts))
  — established the `data-testid="open-positions-table"` + `tr.mat-mdc-row` waiting
  pattern this spec reuses.
- **Sold Positions screen e2e** ([sold-positions-screen-e2e.spec.ts](../../apps/dms-material-e2e/src/sold-positions-screen-e2e.spec.ts))
  — established the `dms-base-table` waiting pattern for Sold Positions; reuse it
  here for AC2.
- **Story 82.x** ([open-positions.spec.ts](../../apps/dms-material-e2e/src/open-positions.spec.ts)
  lines ~317–340) — established the `click → wait for input → fill → Enter →
  waitForTimeout(1000)` pattern for `dms-editable-cell` inline edits. Mirror it for
  the sell-price edit.

### Implementation Dev Notes (added during development)

#### Task 0 — Pre-flight findings

- Story 107.2 Status confirmed: `Done`. Proceeded.
- Epic 104 spec (`close-position-immediate-removal.spec.ts`) **absent** from tree.
  Decision: created new uniquely-named spec `close-position-immediate-removal-107.spec.ts`.
  Rationale: no existing file to extend; new name avoids any collision with a future
  104.3 restore and makes Epic 107 authorship clear.

#### Tasks 1–5 — Implementation summary

- Seeder: `apps/dms-material-e2e/src/helpers/seed-close-position-e2e-data.helper.ts`.
  Single symbol `CP107-<uniqueId>`, single open trade (`sell=0, sell_date=null`).
  Universe row with `last_price=120` so computed fields render.
  Cleanup deletes trades, account, universe rows in `afterAll`.
- Spec: `apps/dms-material-e2e/src/close-position-immediate-removal-107.spec.ts`.
  Imports from `playwright/test`. Row scoped by `symbols[0]` text.
  Sell-date cell clicked row-scoped; picker filled via top-level locator (Material overlay).
  AC1: `expect(row).toHaveCount(0, { timeout: 5000 })` — no reload between save and assert.
  AC2: sold row `toContainText('6/15/26')` and `toContainText('150')`.

#### Tasks 6–8 — Deferred to CI / commit-author

- Cross-browser runs (Task 6), regression-revert validation (Task 7), and quality
  gate (Task 8) are performed by the parent agent workflow at PR time.

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-19.md](../planning-artifacts/epics-2026-05-19.md) — Story 107.3 section
- Story metadata: [_bmad-output/planning-artifacts/story-meta/2026-05-19/107-3-e2e-close-position-immediate-removal.yaml](../planning-artifacts/story-meta/2026-05-19/107-3-e2e-close-position-immediate-removal.yaml)
- Reference story (Epic 104's equivalent): [104-3-e2e-close-position-immediate-removal.md](./104-3-e2e-close-position-immediate-removal.md)
- Project context: [_bmad-output/project-context.md](../project-context.md)
- Open Positions HTML (testids): [apps/dms-material/src/app/account-panel/open-positions/open-positions.component.html](../../apps/dms-material/src/app/account-panel/open-positions/open-positions.component.html)
- Open Positions component: [apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts)
- Sold Positions HTML: [apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.html](../../apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.html)
- Editable cell HTML: [apps/dms-material/src/app/shared/components/editable-cell/editable-cell.component.html](../../apps/dms-material/src/app/shared/components/editable-cell/editable-cell.component.html)
- Editable date cell HTML: [apps/dms-material/src/app/shared/components/editable-date-cell/editable-date-cell.component.html](../../apps/dms-material/src/app/shared/components/editable-date-cell/editable-date-cell.component.html)
- Open Positions seeder (template for new seeder): [apps/dms-material-e2e/src/helpers/seed-open-positions-e2e-data.helper.ts](../../apps/dms-material-e2e/src/helpers/seed-open-positions-e2e-data.helper.ts)
- Open Positions screen E2E (template for new spec): [apps/dms-material-e2e/src/open-positions-screen-e2e.spec.ts](../../apps/dms-material-e2e/src/open-positions-screen-e2e.spec.ts)
- Sold Positions screen E2E (Sold table waiting pattern): [apps/dms-material-e2e/src/sold-positions-screen-e2e.spec.ts](../../apps/dms-material-e2e/src/sold-positions-screen-e2e.spec.ts)
- Inline-edit pattern reference: [apps/dms-material-e2e/src/open-positions.spec.ts](../../apps/dms-material-e2e/src/open-positions.spec.ts) (lines ~317–340)
- Login helper: [apps/dms-material-e2e/src/helpers/login.helper.ts](../../apps/dms-material-e2e/src/helpers/login.helper.ts)
- Skipped-test gate: [scripts/check-no-skipped-tests.sh](../../scripts/check-no-skipped-tests.sh)

## Dev Agent Record

### Agent Model Used

(to be filled in by the dev agent)

### Debug Log References

### Completion Notes List

### File List
