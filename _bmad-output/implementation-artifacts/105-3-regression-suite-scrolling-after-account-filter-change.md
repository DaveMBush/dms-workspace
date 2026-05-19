# Story 105.3: Regression Test Suite — Scrolling Stays Clean After Account / Filter Change

Status: InProgress

**Story Key:** `105-3-regression-suite-scrolling-after-account-filter-change`
**Epic:** 105 — Janky Scrolling After Account / Filter Change (Round 8)
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-13.md](../planning-artifacts/epics-2026-05-13.md) (Story 105.3)
**Type:** E2E regression suite (additive — no production code changes)
**Depends on:** Story 105.1 (reproduction matrix — `Done`) and Story 105.2 (root-cause + fix — `Done` with the AC11 "Hand-off Note for Story 105.3" filled in)
**Enables:** Round 9 of this epic NEVER starts.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a focused E2E regression suite that, on every virtual-scrolled screen, performs a
context change (account swap and/or filter apply-clear) and then drives slow scrolling and
asserts the same header invariants as Epic 101's suite,
So that any future change that breaks the Round-8 fix fails CI immediately and Round 9 of
this epic never starts.

## Epic Context

**Epic 105 Goal:** Epic 101 (Round 7) eliminated header-under-header, flicker, and
header-with-content drag on **freshly loaded** screens — and Story 101.3 hardened that
guarantee with a persistent regression suite. Round 8 (Epic 105) found those guarantees
evaporate when the **same screen** has its data swapped out by an account change or a
filter apply/clear. Story 105.1 inventoried the failing cells; Story 105.2 identified the
root cause and shipped the fix. **This story (105.3)** is the equivalent of Story 101.3
for the **context-change** scenario: a persistent E2E suite that drives the
context-change trigger (account swap and/or filter apply/clear) **before** the slow
scroll and asserts the header invariants on every frame, so that a future regression of
the 105.2 fix fails CI immediately.

This story exists because Epic 101's suite (`scrolling-regression-101.spec.ts`) only
exercises the freshly-loaded baseline — it cannot catch a Round-8 regression. Round 8
exists precisely because that gap was not covered.

**Hard rules:**

- **No production code changes** in this story. The suite is purely additive E2E
  coverage.
- **Tests are authoritative (NFR5):** if an assertion proves flaky, stabilise via
  step size / `expect.poll`, never by weakening the invariant. The Round-8 invariant
  Story 105.2 enforces is the same tight invariant Epic 101 chose; 105.3 must encode it
  with the same rigour.
- The suite **must run as part of `pnpm all`** in both Chromium and Firefox — no
  `test.skip`, no `describe.skip`, no Playwright project gating that excludes it from
  the default run.

## Acceptance Criteria

1. **AC1 — Per-screen context-change spec exists for every screen in 105.1's matrix.**
   **Given** every screen identified in the Story 105.1 reproduction matrix
   ([105-1-reproduce-scrolling-after-account-filter-change.md](./105-1-reproduce-scrolling-after-account-filter-change.md)),
   **When** the regression suite is built,
   **Then** each such screen has at least one regression test that (a) loads the screen,
   (b) confirms a clean Epic-101 baseline scroll, (c) performs the **context change** —
   account swap on screens whose 105.1 cells failed under `account-change`, **and / or**
   apply-then-clear of a column / global filter on screens whose 105.1 cells failed
   under `filter-change` — (d) slow-scrolls the resulting virtual list (4px / 16ms,
   same cadence as `scrolling-regression-101.spec.ts`), and (e) asserts the header
   element remains at the top of its scroll container and does not visually overlap the
   parent header at any frame. Both triggers are exercised on screens whose 105.1 matrix
   shows failures under both.

2. **AC2 — Frame-level header-invariant assertions, not resting-state assertions.**
   **Given** the suite is built,
   **When** the slow scroll runs after the context change,
   **Then** every test samples the sticky header `boundingClientRect` and the parent
   header `boundingClientRect` on every animation frame (via `requestAnimationFrame` /
   `page.evaluate`, same pattern as Story 101.3) and asserts on every sampled frame:
   - `header.top >= parentHeader.bottom - 1` (no header-under-header; 1px subpixel
     tolerance)
   - `abs(header.top − viewport.top) <= 1` (no header-with-content drift)
   - No two consecutive frames show the same logical row's `top` differing by more than
     `rowHeight` (no flicker)
   Resting-state-only assertions are **insufficient** and explicitly disallowed (Round 8
   reproduces *during* the scroll, not at the resting position — same lesson Epic 101
   already paid for).

3. **AC3 — Both browsers green.**
   **Given** Chromium and Firefox,
   **When** the suite runs in both (`pnpm e2e:dms-material:chromium` and
   `pnpm e2e:dms-material:firefox`),
   **Then** every assertion passes in both browsers. Browser-specific flakiness MUST be
   stabilised via step size / `expect.poll`, not via `test.skip`, conditional skips per
   browser, or `test.fixme`.

4. **AC4 — Suite runs as part of `pnpm all`, not skipped or gated.**
   **Given** the suite is committed,
   **When** the CI pipeline runs (or the developer runs `pnpm all` locally),
   **Then** the suite is part of the normal `pnpm all` execution and is not skipped.
   Specifically:
   `grep -rE "test\.skip|test\.fixme|describe\.skip|describe\.fixme|test\.fail" apps/dms-material-e2e/src/ | grep -E "scrolling-regression-105|105-3"`
   returns **zero** results for the new specs added by this story. Any
   `test.fail()`-annotated tests in `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts`
   left over from Story 105.1 must be removed (or the spec replaced by the persistent
   suite in this story).

5. **AC5 — Manually verified to fail when the Story 105.2 fix is reverted.**
   **Given** the Story 105.2 fix is locally reverted on a throw-away branch
   (do NOT commit the revert),
   **When** the suite is run,
   **Then** at least one assertion fails on at least one `screen × browser × trigger`
   pair — confirming the suite would actually catch a Round-8 regression for the
   **context-change** scenario specifically. After confirming the failure, the revert
   is restored and the suite is re-run green. Dev Notes record: which test failed,
   which assertion, which browser, which trigger, and a screenshot from the failing
   run (Playwright MCP per NFR3 if practical).

6. **AC6 — Epic 101's suite still green (no Round-7 regression introduced by helpers).**
   **Given** the existing Round-7 suite
   `apps/dms-material-e2e/src/scrolling-regression-101.spec.ts` and any helpers it uses,
   **When** the new helpers in this story are introduced (or existing helpers extended),
   **Then** Epic 101's suite continues to pass unchanged in both browsers.
   Specifically: the assert-sticky-header-invariant helper (`assert-sticky-header-invariant.helper.ts`)
   is **extended**, not replaced, if it already exists from Story 101.3; the
   slow-scroll helper (`slow-scroll.helper.ts`) is reused, not duplicated.

7. **AC7 — `pnpm all` passes (NFR1) and `pnpm format` is a no-op.**
   **Given** the suite is complete,
   **When** `pnpm all` and then `pnpm format` are run,
   **Then** all tests pass and `pnpm format` reports no changes required.

8. **AC8 — `git diff --stat` is scope-clean.**
   **Given** the story is complete,
   **When** `git diff --stat` is inspected,
   **Then** it contains only:
   - this story file
   - new spec file(s) under `apps/dms-material-e2e/src/` (per Tasks 4–8)
   - new or extended helper(s) under `apps/dms-material-e2e/src/helpers/` (Tasks 2–3)
   - optional removal of any leftover `test.fail()` from the 105.1 reproduction spec
     (per AC4) — the spec itself may be deleted if the persistent suite supersedes it,
     or kept un-`fail`-ed if it remains useful as targeted reproduction
   No production code under `apps/dms-material/src/` is modified. No architecture-doc
   edits.

## Tasks / Subtasks

- [x] **Task 1 — Read 105.1 matrix and 105.2 hand-off note as the specification**
      (AC: #1, #5)
  - [x] Open
        [`105-1-reproduce-scrolling-after-account-filter-change.md`](./105-1-reproduce-scrolling-after-account-filter-change.md)
        and read the full reproduction matrix and Live Root-Cause Candidates list.
        Confirm 105.1 status is `Done`. **HALT** if not — this story cannot start
        without the matrix.
  - [x] Open
        [`105-2-root-cause-and-fix-scrolling-on-context-change.md`](./105-2-root-cause-and-fix-scrolling-on-context-change.md)
        and read the **Hand-off Note for Story 105.3** subsection (AC11 of 105.2).
        Confirm 105.2 status is `Done` and the hand-off note is filled in. **HALT** if
        either condition fails — the hand-off note is the spec for which DOM invariants
        the suite must encode, which seed-helpers to reuse, which UI-control selector
        per screen drives the context change, and which structural constraints the
        suite must guard against silently re-introducing.
  - [x] In Dev Notes "Target Inventory (from 105.1)", record the explicit list of
        cells (`screen × browser × trigger`) the suite must cover. Each cell becomes one
        test (or one assertion within a per-screen combined test).
  - [x] In Dev Notes "Hand-off Inputs (from 105.2)", record verbatim:
        - The DOM invariant(s) to encode.
        - The seed-helper composition (must include
          `seed-scroll-fetch-universe-ids.helper.ts` per 105.1 / 105.2 — for
          multi-account seeding so an account swap actually changes the dataset).
        - The per-screen UI-control selector for the context-change trigger.
        - The structural constraint(s) the suite must guard against re-introducing.

- [x] **Task 2 — Reuse / extend the sticky-header invariant helper** (AC: #2, #6)
  - [x] Check whether
        `apps/dms-material-e2e/src/helpers/assert-sticky-header-invariant.helper.ts`
        already exists (Story 101.3 Task 2 created it).
  - [x] **If yes:** extend it only as needed to support the Round-8 invariants. Do not
        change the existing signature in a way that would break
        `scrolling-regression-101.spec.ts` (AC6). Prefer adding optional parameters or a
        new exported function alongside the existing one.
  - [ ] **If no:** create it with the same shape Story 101.3 specified — accept a
        `Page`, a screen-specific table-host selector, a `parentHeaderSelector`, and a
        scroll-container selector. Sample bounding rects on every animation frame via
        `page.evaluate` + `requestAnimationFrame`. Return the captured frame array for
        the test to assert against.
  - [ ] Per-frame assertions (named functions per `@smarttools/no-anonymous-functions`):
        - `header.top >= parentHeader.bottom - 1` (subpixel tolerance only)
        - `abs(header.top − viewportTop) <= 1`
        - No two consecutive frames where the same logical row's `top` differs by more
          than `rowHeight` (flicker check)
  - [ ] Use `expect.poll` for any async settling. **No** `waitForTimeout`. **No**
        `waitForLoadState('networkidle')`.

- [x] **Task 3 — Reuse the slow-scroll helper** (AC: #1)
  - [x] Check whether
        `apps/dms-material-e2e/src/helpers/slow-scroll.helper.ts` exists (Story 101.3
        Task 3). Reuse it for the post-context-change scroll. Default cadence: 4px / 16ms
        (matching `scrolling-regression-101.spec.ts`); make configurable.
  - [ ] If a helper does not exist, create it with the shape from the Story 101.3 sketch
        — drive `scrollTop` from inside `page.evaluate` with `requestAnimationFrame`
        between increments so the framework actually paints intermediate frames.

- [x] **Task 4 — Build the per-screen context-change driver helper** (AC: #1, #3)
  - [x] Create
        `apps/dms-material-e2e/src/helpers/context-change.helper.ts` (new file — there
        is no equivalent in 101.3 because 101.3 had no context-change requirement).
  - [x] Export two named functions:
        - `swapActiveAccount(page, { fromAccountId, toAccountId })` — drives the swap
          via the **UI control** Dave actually uses (sidebar / toolbar account
          dropdown). Per 105.2 / 105.1: do NOT call `currentAccountSignalStore.setCurrentAccountId`
          directly — the bug is in the rendered consequence of the user-facing path.
        - `applyAndClearColumnFilter(page, { columnSelector, filterValue })` — opens
          the column filter UI hosted by `base-table.component`, applies the filter,
          waits for the table to reflect the filtered set (via `expect.poll` /
          `toBeVisible`), then clears it and waits for the unfiltered set.
  - [x] For Universe / Screener, also expose `applyAndClearGlobalFilter(page, ...)` if
        Story 105.1's matrix shows a global-filter cell. Selectors come from the 105.2
        hand-off note (Task 1).
  - [x] All callbacks (`page.evaluate`, `subscribe`, `requestAnimationFrame`) use named
        functions per `@smarttools/no-anonymous-functions`.

- [x] **Task 5 — Per-screen regression spec: Universe** (AC: #1, #2, #3, #4)
  - [x] Create `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts` (new file —
        the persistent Round-8 suite). If a `test.fail()`-annotated reproduction spec
        of the same name was committed by Story 105.1, **replace** it with this
        persistent suite (or delete the old file and create the new one). Either way:
        no `test.fail()`, no `describe.skip()` after this task.
  - [x] Add a `describe('Universe — context-change scrolling regression', ...)` block.
  - [x] **Account-change test** (if 105.1 cells under Universe × `account-change`
        failed): seed two accounts via the per-screen seed helper +
        `seed-scroll-fetch-universe-ids.helper.ts`; load Universe; baseline
        slow-scroll → confirm clean (Epic-101 baseline holds); reset; swap accounts via
        `swapActiveAccount`; wait for new dataset; slow-scroll; assert the Task 2
        invariants on every captured frame.
  - [x] **Filter-change test** (if 105.1 cells under Universe × `filter-change`
        failed): seed; load Universe; baseline scroll; reset; apply-and-clear filter via
        `applyAndClearColumnFilter` (or `applyAndClearGlobalFilter` if the failing cell
        was the global filter); slow-scroll; assert invariants.
  - [x] Use `seed-scroll-universe-data.helper.ts` (≥ 60 rows — established in Story 87.3
        / 101.3); for the multi-account variant, combine with
        `seed-scroll-fetch-universe-ids.helper.ts` so both accounts have enough rows.

- [x] **Task 6 — Per-screen regression spec: Open Positions, Sold Positions, Dividend
      Deposits** (AC: #1, #2, #3, #4)
  - [x] Add `describe(...)` blocks to `scrolling-regression-105.spec.ts` for each of
        the three account-panel screens (Open Positions, Sold Positions, Dividend
        Deposits). Same structure as Task 5 but per-screen seed helpers:
        - Open Positions: `seed-scroll-open-positions-data.helper.ts` (≥ 40 rows in
          same account)
        - Sold Positions: `seed-scroll-sold-positions-data.helper.ts` (≥ 40 rows)
        - Dividend Deposits: `seed-scroll-div-deposits-with-symbols-data.helper.ts`
          (≥ 60 rows)
        For the account-change variant, seed two accounts with the same helper invoked
        per account.
  - [x] Only add tests for the cells 105.1's matrix flagged FAIL — do NOT spuriously
        add filter-change tests for screens that didn't fail under filter-change. (If
        105.1's matrix shows a screen failing under both triggers, both tests exist.)

- [x] **Task 7 — Per-screen regression spec: Screener** (AC: #1, #2, #3, #4)
  - [x] Add a `describe('Screener — context-change scrolling regression', ...)` block.
        Screener typically lacks an in-place "active account" concept — exercise only
        the trigger(s) flagged by 105.1's matrix (likely `filter-change`, both
        per-column and global if 105.1 catalogued both).
  - [x] Use `seed-scroll-screener-data.helper.ts`.

- [x] **Task 8 — Any other virtual-scrolled screen flagged by 105.1** (AC: #1)
  - [x] If Story 105.1's matrix lists any virtual-scrolled screen NOT covered by Tasks
        5–7 (e.g. a screen added since Epic 101), add a `describe(...)` block for it
        following the same pattern.
  - [x] If 105.1 lists no additional screens, document that fact in Dev Notes
        "Completion Notes" — this task is then complete.

- [ ] **Task 9 — Cross-browser verification** (AC: #3)
  - [ ] Run `pnpm e2e:dms-material:chromium` — every new spec must pass.
  - [ ] Run `pnpm e2e:dms-material:firefox` — every new spec must pass.
  - [ ] Browser-specific flakiness MUST be stabilised via step size / `expect.poll` /
        explicit waits on a settled UI condition — never via `test.skip`, conditional
        per-browser skips, or `test.fixme`. Document any stabilisation tweak in Dev
        Notes.

- [ ] **Task 10 — Manual revert-fix verification** (AC: #5)
  - [ ] On a local throw-away branch (do NOT commit), revert the production-code
        change from Story 105.2 (the file list is in 105.2's "File List" / "Dev Agent
        Record"). If 105.2's diff touched multiple files, revert all of them so the
        Round-8 fix is fully removed.
  - [ ] Run the new suite (Chromium first; Firefox if Chromium passes despite the
        revert — that itself is a finding worth recording).
  - [ ] Confirm at least one assertion fails (header overlap, drift, or flicker on at
        least one `screen × browser × trigger` cell).
  - [ ] Restore the 105.2 fix; rerun the suite; confirm green again.
  - [ ] Record in Dev Notes "Revert-Fix Verification": which test failed, which
        assertion, which browser, which trigger, plus a screenshot if practical (use
        Playwright MCP per NFR3 if available).
  - [ ] Do NOT commit the revert.

- [ ] **Task 11 — Confirm no skips, no `test.fail()`, and `pnpm all` green**
      (AC: #4, #7, #8)
  - [ ] Run:
        `grep -rE "test\.skip|test\.fixme|describe\.skip|describe\.fixme|test\.fail" apps/dms-material-e2e/src/ | grep -E "scrolling-regression-105|105-3"`
        and confirm zero results.
  - [ ] Run `pnpm all`; confirm all tests pass.
  - [ ] Run `pnpm format`; confirm no files changed.
  - [ ] Run `git diff --stat` and confirm scope-cleanliness per AC8 — only this story
        file, the new spec file(s), the new / extended helpers, and (optionally) the
        deletion or de-`fail`-ing of the 105.1 reproduction spec. **No** files under
        `apps/dms-material/src/` are modified.

## Dev Notes

### What This Story Is (And Isn't)

**Is:** the Round-8 equivalent of Story 101.3 — a persistent E2E regression suite that
locks in the Story 105.2 fix for the **context-change** scenario (account swap and / or
filter apply/clear) so that Round 9 of this epic never starts. Same methodology as 101.3
(frame-by-frame `requestAnimationFrame` sampling; named-function callbacks; both
browsers; part of `pnpm all`); new dimension is the context-change trigger interposed
between baseline scroll and the asserted scroll.

**Isn't:**

- A reproduction story (that was 105.1).
- A root-cause / fix story (that was 105.2).
- An architecture-doc / SCROLLING REGRESSION HISTORY appendix update — the in-source
  history block in `base-table.component.ts` was updated by 105.2 (its AC8). Any
  architecture-doc updates from Round 8 are out of scope here unless 105.2's hand-off
  note explicitly delegated one to this story (then add it to Task 11 / Dev Notes).
- A production-code change story.

### Read 105.1 and 105.2 First (Non-negotiable)

This story MUST NOT begin without:

1. The full Dev Notes from
   [105-1-reproduce-scrolling-after-account-filter-change.md](./105-1-reproduce-scrolling-after-account-filter-change.md)
   — specifically the reproduction matrix and Live Root-Cause Candidates list.
2. The full Dev Notes from
   [105-2-root-cause-and-fix-scrolling-on-context-change.md](./105-2-root-cause-and-fix-scrolling-on-context-change.md)
   — specifically the **"Hand-off Note for Story 105.3"** subsection (AC11 of 105.2)
   which dictates: which DOM invariant(s) to encode, which seed-helpers to compose,
   which UI control to drive per screen, and which structural constraint(s) to guard.

If either is incomplete or missing, **HALT** and surface it (do not improvise an
invariant — that's how Round 9 starts).

### Why Frame-by-Frame Sampling (carry-over from 101.3)

Round 8 — like Rounds 1–6 before it — reproduces *during* the scroll, not at the resting
position. Every prior epic that asserted only the post-scroll resting state shipped a
test that passed while users still saw the artifact. Story 101.3 fixed this by sampling
header/parent rects on every `requestAnimationFrame` and asserting per frame; Story
105.3 reuses that helper for the same reason. Resting-state-only assertions are
explicitly disallowed by AC2.

### Context-Change Trigger Sequence (the Round-8 delta vs 101.3)

The new trigger sequence per test:

1. Seed data (per-screen helper; for account-change variant, seed two accounts via
   `seed-scroll-fetch-universe-ids.helper.ts` + per-screen helper invoked per account).
2. Login as Dave (use `apps/dms-material-e2e/src/helpers/login.helper.ts`).
3. Navigate to the screen.
4. **Baseline slow scroll** (Epic-101 / Round-7 baseline) — confirm clean using the
   Task 2 invariant helper. If baseline is dirty, that is a Round-7 regression, not a
   Round-8 finding — record and stop (do NOT bury it in this suite's diff).
5. Reset scroll to top.
6. **Trigger the context change:**
   - Account swap → `swapActiveAccount(page, { fromAccountId, toAccountId })` (Task 4).
     Drive via the UI control Dave uses (sidebar / toolbar dropdown). Do NOT call
     `currentAccountSignalStore.setCurrentAccountId` directly — the bug is in the
     rendered consequence of the user-facing path.
   - **OR** filter apply / clear →
     `applyAndClearColumnFilter(page, ...)` /
     `applyAndClearGlobalFilter(page, ...)` (Task 4). Selectors come from the 105.2
     hand-off note.
7. Wait for the new dataset / filtered set to render (via `expect.poll` /
   `toBeVisible` — never `waitForLoadState('networkidle')`, never `page.waitForTimeout`).
8. **Asserted slow scroll** — invariants per Task 2 / AC2 must hold on every captured
   frame.

### Reproduction Matrix → Test Coverage Map (fill in during Task 1)

> Fill from 105.1's matrix in Task 1. Only add a test for a cell flagged FAIL by 105.1
> — do NOT spuriously add filter-change tests for screens that did not fail under
> filter-change. Both triggers exist for screens whose 105.1 matrix shows failures
> under both.

| Screen            | account-change test? | filter-change test? | Combined or split? | Notes |
| ----------------- | -------------------- | ------------------- | ------------------ | ----- |
| Universe          | YES — 2 tests (h-s-w-c + h-u-h) | YES — 2 tests (symbol column) | Split per invariant | toolbar `.account-select mat-select` |  
| Open Positions    | YES — 2 tests | YES — 2 tests (symbol search `[data-testid="symbol-search-input"]`) | Split per invariant | Route navigation |  
| Sold Positions    | YES — 2 tests | YES — 2 tests (`thead input[placeholder="Search Symbol"]`) | Split per invariant | Route navigation |  
| Dividend Deposits | YES — 2 tests | N/A (no filter UI) | N/A | Route navigation |  
| Screener          | n/a (no in-place account swap) | YES — 2 tests (risk-group `[data-testid="risk-group-filter"]`) | N/A |  |  
| (other if 105.1 found one) | NO additional screens found | | | |

### Hand-off Inputs (from 105.2)

- **DOM invariant to encode:** `th.mat-mdc-header-cell` `boundingClientRect.top` must not drift below the viewport top after a context-change. Specifically: for every slow-scroll frame, `headerTop <= viewportTop + PIXEL_TOLERANCE` (no downward drift) and `viewportTop <= headerTop + PIXEL_TOLERANCE` (no upward slide behind app bar).
- **Root cause (105.2):** CDK virtual scroll did not call `scrollToIndex(0)` after an in-place data-array swap. The fix: `contextId` `@Input()` on `BaseTableComponent` + per-screen `contextKey$` computed signal. When `contextId()` changes, `ngOnChanges` calls `this.viewport.scrollToIndex(0)`.
- **Seed-helper composition:** reuse existing per-screen seed helpers (no new helpers). For account-change variants, invoke the same seed helper twice with separate calls — `seedScrollOpenPositionsData()` twice yields two different accounts. Dividend Deposits uses `seedScrollDivDepositsWithSymbolsData()`. Universe account-change uses `seedScrollUniverseData()` + `seedScrollOpenPositionsData()` (so the toolbar account-select has a second option with data).
- **Per-screen UI-control selectors:**
  - Universe account-change: `.account-select mat-select` → `mat-option.nth(1)` (toolbar dropdown)
  - Open/Sold/Dividend Deposits account-change: `page.goto('/account/${toAccountId}/${routeSuffix}')` (route navigation)
  - Universe filter-change: `${VIEWPORT_SELECTOR} thead input[placeholder]` (symbol column filter)
  - Open Positions filter-change: `[data-testid="symbol-search-input"]`
  - Sold Positions filter-change: `${VIEWPORT_SELECTOR} thead input[placeholder="Search Symbol"]`
  - Screener filter-change: `[data-testid="risk-group-filter"]` (mat-select; apply "Income" → clear to "All")
- **Structural constraint:** do NOT call `currentAccountSignalStore.setCurrentAccountId()` directly from tests — the regression is in the rendered consequence of the user-facing navigation path.
- **Header selector (CRITICAL):** use `th.mat-mdc-header-cell` (NOT `tr.mat-mdc-header-row`). Chrome returns natural-flow bounding box for `tr`, not the sticky position. `th` returns the actual on-screen sticky position.

### Application URLs (Round-7 set; confirm via 105.1 in Task 1)

| Screen            | URL                                                      |
| ----------------- | -------------------------------------------------------- |
| Universe          | `http://localhost:4301/universe`                         |
| Open Positions    | `http://localhost:4301/accounts/{id}/open-positions`     |
| Sold Positions    | `http://localhost:4301/accounts/{id}/sold-positions`     |
| Dividend Deposits | `http://localhost:4301/accounts/{id}/div-deposits`       |
| Screener          | `http://localhost:4301/screener`                         |

### E2E Test Environment

- Port: **4301** (`pnpm start:dms-material`)
- Run with: `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox`
- Login helper: `apps/dms-material-e2e/src/helpers/login.helper.ts`
- Do **not** use `waitForLoadState('networkidle')`
- Do **not** use fixed `page.waitForTimeout()` — use `expect.poll()` or `toBeVisible()`
- Tests are authoritative: do NOT weaken assertions to make them pass; if an
  assertion fails, the production code (or the 105.2 fix) is wrong, not the test (NFR5)

### Frame-Sampling Pattern (sketch — same shape as Story 101.3 Task 2)

```typescript
const samples = await page.evaluate(
  function captureFrames({ headerSel, parentSel, containerSel, scrollMs, stepPx }) {
    return new Promise(function runScroll(resolve) {
      const out: Array<{ t: number; headerTop: number; parentBottom: number; viewportTop: number; scrollTop: number }> = [];
      const header = document.querySelector(headerSel) as HTMLElement;
      const parent = document.querySelector(parentSel) as HTMLElement;
      const container = document.querySelector(containerSel) as HTMLElement;
      const start = performance.now();
      function step(now: number) {
        const headerRect = header.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();
        const viewportRect = container.getBoundingClientRect();
        out.push({
          t: now - start,
          headerTop: headerRect.top,
          parentBottom: parentRect.bottom,
          viewportTop: viewportRect.top,
          scrollTop: container.scrollTop,
        });
        if (now - start < scrollMs) {
          container.scrollTop += stepPx;
          requestAnimationFrame(step);
        } else {
          resolve(out);
        }
      }
      requestAnimationFrame(step);
    });
  },
  { headerSel, parentSel, containerSel, scrollMs: 4000, stepPx: 4 },
);
```

Per-frame assertion (named function per `@smarttools/no-anonymous-functions`):

```typescript
samples.forEach(function assertNoOverlap(sample) {
  expect(sample.headerTop, `frame at t=${sample.t}ms`).toBeGreaterThanOrEqual(
    sample.parentBottom - 1,
  );
});
samples.forEach(function assertNoDrift(sample) {
  expect(Math.abs(sample.headerTop - sample.viewportTop), `frame at t=${sample.t}ms`).toBeLessThanOrEqual(1);
});
```

### Required Selectors per Screen

The suite needs four selectors per screen: the **table header**, the **parent header**
(app chrome the table header must stay below), the **scroll container**
(`cdk-virtual-scroll-viewport`), and the **context-change UI control** (account dropdown
or column / global filter input). All four come from the 105.2 hand-off note (Task 1) /
the 105.1 matrix (Task 1) — do not guess. If a screen's template uses a wrapping element
between the parent header and the scroll viewport, the selectors must reflect that.

### Data Volume Requirements

CDK virtual scroll activates only when there are more rows than fit in the viewport.
Use these established minimums (from Stories 87.3 / 101.3, do not weaken):

| Screen            | Minimum Rows              | Existing Seed Helper                                   |
| ----------------- | ------------------------- | ------------------------------------------------------ |
| Universe          | 60 rows per account       | `seed-scroll-universe-data.helper.ts`                  |
| Open Positions    | 40 rows per account       | `seed-scroll-open-positions-data.helper.ts`            |
| Sold Positions    | 40 rows per account       | `seed-scroll-sold-positions-data.helper.ts`            |
| Dividend Deposits | 60 deposits per account   | `seed-scroll-div-deposits-with-symbols-data.helper.ts` |
| Screener          | 60 rows                   | `seed-scroll-screener-data.helper.ts`                  |

For the **account-change** variant, seed at minimum **two** accounts (using
`seed-scroll-fetch-universe-ids.helper.ts` to fetch the cross-account ID set, then
invoking the per-screen helper twice with different account IDs) so the swap actually
changes the dataset.

### Existing Scrolling Specs — Extend or Add Alongside, Do Not Replace (AC #6)

| File                                                                                | This Story's Action |
| ----------------------------------------------------------------------------------- | ------------------- |
| `apps/dms-material-e2e/src/scrolling-regression-101.spec.ts`                        | Read-only. Must remain green (AC6). |
| `apps/dms-material-e2e/src/scrolling-regression-87.spec.ts`                         | Read-only. Must remain green. |
| `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts`                   | Read-only. Must remain green. |
| `apps/dms-material-e2e/src/universe-smooth-scroll.spec.ts`                          | Read-only. Must remain green. |
| `apps/dms-material-e2e/src/open-positions-smooth-scroll.spec.ts`                    | Read-only. |
| `apps/dms-material-e2e/src/open-positions-scrolling-regression.spec.ts`             | Read-only. |
| `apps/dms-material-e2e/src/sold-positions-scrolling-regression.spec.ts`             | Read-only. |
| `apps/dms-material-e2e/src/div-deposits-smooth-scroll.spec.ts`                      | Read-only. |
| `apps/dms-material-e2e/src/div-deposits-scrolling-regression.spec.ts`               | Read-only. |
| `apps/dms-material-e2e/src/screener-smooth-scroll.spec.ts`                          | Read-only. |
| `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts` (if 105.1 committed it) | **Replace** with the persistent suite from Tasks 5–8 (or delete + recreate). No `test.fail()` after this story. |
| `apps/dms-material-e2e/src/helpers/assert-sticky-header-invariant.helper.ts` (if 101.3 created it) | **Extend** if needed; do not break the 101.3 signature. |
| `apps/dms-material-e2e/src/helpers/slow-scroll.helper.ts` (if 101.3 created it)     | **Reuse**; do not duplicate. |
| `apps/dms-material-e2e/src/helpers/context-change.helper.ts`                        | **New** in this story (Task 4). |

The new context-change suite from Tasks 5–8 is **additive** to the file inventory
above. It does not replace any existing spec.

### Test Naming Convention

Follow the project pattern (per 87.3 / 101.3):

- `'<screen> — slow scroll keeps header anchored under parent header after account change'`
- `'<screen> — slow scroll keeps header anchored under parent header after filter apply/clear'`
- `'<screen> — no header drift with content during slow scroll after context change'`
- `'<screen> — no header flicker during slow scroll after context change'`

Prefer the **combined-invariant per `screen × trigger`** form (one `test()` that
captures one frame array and asserts all three invariants on it) to keep `pnpm all`
runtime down. Split tests are acceptable when needed for clarity.

### Round-8 Failure Modes (what we're hunting — same artifact set as 101.3)

A cell is `FAIL` only if the artifact does NOT appear on the freshly-loaded baseline
(step 4 of the trigger sequence) and DOES appear after the context change. A cell that
fails on both is a Round-7 regression and must be escalated, not catalogued as Round 8.

1. **Header-under-header** — sticky `<thead>` slides upward behind the parent header.
2. **Flicker** — content rows jitter mid-scroll (Y delta > rowHeight then snap back).
3. **Header-scrolls-with-content** — sticky header drifts down with content rows.

### Account-Change Trigger Mechanics (per 105.1 / 105.2)

`apps/dms-material/src/app/account-panel/account-selection-integration.spec.ts` shows
how the account selection signal works:

- `currentAccountSignalStore.setCurrentAccountId(...)` — underlying state mutation.
- `selectCurrentAccountSignal` — consumer signal.

For 105.3 tests, drive the swap via the **UI control** Dave actually uses (sidebar /
toolbar account dropdown — confirmed in 105.1 Task 1 and re-stated in 105.2 hand-off
note). Do NOT call the store directly; the bug is in the rendered consequence of the
user-facing path.

### Filter-Change Trigger Mechanics (per 105.1)

Column filters are hosted by `base-table.component`. The Universe and Screener screens
may also expose global filter chips / search inputs. Only exercise the trigger flavour
that 105.1's matrix flagged FAIL for the given screen.

### Manual Revert-Fix Verification (AC #5) — How To

1. Note the production files Story 105.2 modified (its "File List" / Task 4 diff).
2. On a throw-away branch, revert each one (`git checkout main -- <file>` per file, or
   `git revert -n <105.2-merge-commit>` if 105.2 has a single squashed commit).
3. Run `pnpm e2e:dms-material:chromium` against the new suite. Confirm at least one
   assertion fails with the expected artifact (header overlap, drift, or flicker).
4. Restore the 105.2 fix (`git restore --source=main <file>` or
   `git stash` + checkout, depending on how the revert was applied).
5. Rerun the suite; confirm green.
6. Capture a screenshot from step 3 if practical (Playwright MCP per NFR3).
7. **DO NOT** commit the revert. Confirm `git status` is clean before continuing.

### Forbidden Patterns (re-stating for prominence)

- **No `test.skip`, no `test.fixme`, no `describe.skip`, no `describe.fixme`,
  no `test.fail()`** in any spec added by this story (AC4).
- **No conditional per-browser skipping** (AC3).
- **No resting-state-only assertions** (AC2).
- **No** `waitForLoadState('networkidle')` or `page.waitForTimeout()` in the new specs
  / helpers (project NFR; same rule as 101.3).
- **No production code changes** under `apps/dms-material/src/` (AC8).
- **No weakening of the Task 2 invariants** to make a test pass — if an invariant
  fails after the context change, the 105.2 fix is incomplete. Loop back to 105.2 via
  `correct-course` before lowering the bar (NFR5).
- **No anonymous callbacks** inside `subscribe`, `requestAnimationFrame`,
  `page.evaluate`, etc. — use named functions per
  `@smarttools/no-anonymous-functions`.

### Browsers

Both Chromium and Firefox must be exercised — Epic 105 explicitly calls out NFR
coverage (R7) across both. Safari/WebKit is **not** in the project's supported matrix.

### Project Conventions Reminder

(From `_bmad-output/project-context.md`.)

- Angular 21 zoneless: `inject()`, `OnPush`, signal-first state. The new helpers are
  test-only TS; even so, any helper code that touches Angular contexts must follow
  these rules.
- SmartNgRX / SmartSignals for state.
- Vitest for unit, Playwright (Chromium + Firefox) for E2E.
- `pnpm all` must pass after every story.
- Tests are authoritative — do not weaken assertions to make a test pass.
- Playwright **MCP server** required for the live-app verification per NFR3
  (specifically for the AC5 revert check screenshot).

### Out of Scope

- Production code changes under `apps/dms-material/src/` (that was 105.2).
- The reproduction matrix itself (that was 105.1).
- Any architecture-doc / SCROLLING REGRESSION HISTORY appendix update (105.2 owned the
  in-source history block at AC8; doc updates beyond that are not part of this story
  unless the 105.2 hand-off note explicitly delegated one).
- Safari/WebKit reproduction.
- Re-investigation of the freshly-loaded case (Round 7 / Epic 101 closed it; Story
  101.3's existing suite covers it).
- New seed helpers (reuse only — see "Data Volume Requirements" table).

### Project Structure Notes

- All paths align with the existing project layout (no new directories).
- New persistent spec lives at
  `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts` (same naming pattern as
  `scrolling-regression-101.spec.ts` / `scrolling-regression-87.spec.ts`).
- New helper lives at
  `apps/dms-material-e2e/src/helpers/context-change.helper.ts`.
- Existing helpers under `apps/dms-material-e2e/src/helpers/` are extended in place
  (Task 2) or reused unchanged (Task 3) — no new copies of frame-sampling or
  slow-scroll logic.

### References

- [_bmad-output/planning-artifacts/epics-2026-05-13.md](../planning-artifacts/epics-2026-05-13.md) — Epic 105 source spec (Story 105.3 section)
- [105-1-reproduce-scrolling-after-account-filter-change.md](./105-1-reproduce-scrolling-after-account-filter-change.md) — Round-8 reproduction matrix + Live Root-Cause Candidates (this story's coverage spec)
- [105-2-root-cause-and-fix-scrolling-on-context-change.md](./105-2-root-cause-and-fix-scrolling-on-context-change.md) — Round-8 root-cause + fix; the **Hand-off Note for Story 105.3** (AC11) is the spec for which DOM invariants this suite must encode and which selectors / helpers to reuse
- [101-3-scrolling-regression-suite.md](./101-3-scrolling-regression-suite.md) — Round-7 persistent suite (the structural pattern this story mirrors and extends with the context-change trigger)
- [101-2-root-cause-and-fix-scrolling.md](./101-2-root-cause-and-fix-scrolling.md) — Round-7 fix (the structural constraint Round 8 must not silently re-introduce)
- [87-3-scrolling-regression-prevention-suite.md](./87-3-scrolling-regression-prevention-suite.md) — Established naming convention + seed-helper minimums
- [apps/dms-material-e2e/src/scrolling-regression-101.spec.ts](../../apps/dms-material-e2e/src/scrolling-regression-101.spec.ts) — Round-7 persistent suite (must remain green per AC6)
- [apps/dms-material-e2e/src/helpers/login.helper.ts](../../apps/dms-material-e2e/src/helpers/login.helper.ts) — Login helper used by every E2E spec
- [apps/dms-material/src/app/account-panel/account-selection-integration.spec.ts](../../apps/dms-material/src/app/account-panel/account-selection-integration.spec.ts) — Account-change signal reference (read-only)
- [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.ts) — SCROLLING REGRESSION HISTORY block (read-only here; was updated by 105.2)
- [_bmad-output/project-context.md](../project-context.md) — Project-wide rules
- This story closes Epic 105 by ensuring Round 9 of the scrolling epic never starts.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

See VSCODE_TARGET_SESSION_LOG for full transcript.

### Completion Notes List

- Tasks 1–8 complete. `context-change.helper.ts` created with four named exports: `swapUniverseAccount`, `swapActiveAccountViaNavigation`, `applyAndClearColumnFilter`, `applyAndClearGlobalFilter`.
- `scrolling-regression-105.spec.ts` graduated: eslint-disable removed, JSDoc updated, all `(Story 105.1)` suffixes removed from describe names, all `Fix in Story 105.2.` removed from error messages, all inline context-change code replaced with helper calls, all `page.waitForTimeout()` calls replaced with `expect(...).toBeVisible()` / `toContainText()`.
- Task 8: 105.1 matrix lists exactly 5 screens (Universe, Open Positions, Sold Positions, Dividend Deposits, Screener) — all covered by Tasks 5–7. No additional screens.
- AC4 grep check: `grep -rE "test\.skip|test\.fixme|describe\.skip|describe\.fixme|test\.fail" apps/dms-material-e2e/src/ | grep -E "scrolling-regression-105|105-3"` returns zero results.
- Tasks 9–11 (cross-browser verification, revert-fix verification, pnpm all) pending execution.

### File List

- `_bmad-output/implementation-artifacts/105-3-regression-suite-scrolling-after-account-filter-change.md` (this file)
- `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts` (graduated: eslint-disable removed, JSDoc updated, describe names cleaned, inline code replaced with helpers)
- `apps/dms-material-e2e/src/helpers/context-change.helper.ts` (NEW)
