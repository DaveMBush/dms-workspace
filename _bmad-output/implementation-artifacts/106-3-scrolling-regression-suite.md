# Story 106.3: Regression Suite — Scrolling Clean After Account/Filter Change

Status: Approved

**Story Key:** `106-3-scrolling-regression-suite`
**Epic:** 106 — Janky Scrolling After Account/Filter Change (Round 9)
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-19.md](../planning-artifacts/epics-2026-05-19.md) (Story 106.3)
**Type:** E2E regression suite (additive — no production code changes)
**Depends on:** Story 106.1 (reproduction matrix — must be `Done`) and Story 106.2 (root-cause + fix — must be `Done` with the "Hand-off Note for Story 106.3" filled in)
**Enables:** Round 10 of this epic NEVER starts.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a focused E2E regression suite that, on every virtual-scrolled screen, performs a
context change (account swap and/or filter apply-clear) and then drives slow scrolling and
asserts the same header invariants as Epic 101 / Epic 105's suites,
So that any future change that breaks the Round-9 fix fails CI immediately and Round 10 of
this epic never starts.

## Epic Context

**Epic 106 Goal:** Epic 101 (Round 7) eliminated header-under-header, flicker, and
header-with-content drag on **freshly loaded** screens — and Story 101.3 hardened that
guarantee with a persistent regression suite. Epic 105 (Round 8) extended that guarantee
to the **context-change** scenario (account swap, filter apply/clear) — and Story 105.3
hardened it with a persistent regression suite for that scenario. Round 9 (Epic 106)
exists because the context-change guarantees **still** evaporate on some screen × trigger
combinations that Round 8 did not fully cover, or because some new screen / new trigger
flavour has emerged since Round 8. Story 106.1 inventoried the failing cells; Story 106.2
identified the root cause and shipped the fix. **This story (106.3)** is the equivalent
of Story 105.3 for Round 9: a persistent E2E suite that drives the context-change
trigger (account swap and/or filter apply/clear) **before** the slow scroll and asserts
the header invariants on every frame, so that a future regression of the 106.2 fix fails
CI immediately.

This story exists because — like every prior round — the only reliable defence against
regression is a per-frame, in-`pnpm all`, no-`skip` test that runs on both browsers.
Round 9 exists precisely because a gap remained that prior suites did not cover.

**Hard rules:**

- **No production code changes** in this story. The suite is purely additive E2E
  coverage.
- **Tests are authoritative (NFR5):** if an assertion proves flaky, stabilise via
  step size / `expect.poll`, never by weakening the invariant. The Round-9 invariant
  Story 106.2 enforces must be the same tight invariant Epic 101 / 105 chose; 106.3
  must encode it with the same rigour.
- The suite **must run as part of `pnpm all`** in both Chromium and Firefox — no
  `test.skip`, no `describe.skip`, no Playwright project gating that excludes it from
  the default run.

## Acceptance Criteria

1. **AC1 — Per-screen context-change spec exists for every screen in 106.1's matrix.**
   **Given** every screen identified in the Story 106.1 reproduction matrix
   ([106-1-reproduce-scrolling-all-screens.md](./106-1-reproduce-scrolling-all-screens.md)),
   **When** the regression suite is built,
   **Then** each such screen has at least one regression test that (a) loads the screen,
   (b) confirms a clean Epic-101 / Epic-105 baseline scroll, (c) performs the **context
   change** — account swap on screens whose 106.1 cells failed under `account-change`,
   **and / or** apply-then-clear of a column / global filter on screens whose 106.1
   cells failed under `filter-change` — (d) slow-scrolls the resulting virtual list
   (4px / 16ms, same cadence as `scrolling-regression-101.spec.ts` and
   `scrolling-regression-105.spec.ts`), and (e) asserts the header element remains at
   the top of its scroll container and does not visually overlap the parent header at
   any frame. Both triggers are exercised on screens whose 106.1 matrix shows failures
   under both.

2. **AC2 — Frame-level header-invariant assertions, not resting-state assertions.**
   **Given** the suite is built,
   **When** the slow scroll runs after the context change,
   **Then** every test samples the sticky header `boundingClientRect` and the parent
   header `boundingClientRect` on every animation frame (via `requestAnimationFrame` /
   `page.evaluate`, same pattern as Stories 101.3 and 105.3) and asserts on every
   sampled frame:
   - `header.top >= parentHeader.bottom - 1` (no header-under-header; 1px subpixel
     tolerance)
   - `abs(header.top − viewport.top) <= 1` (no header-with-content drift)
   - No two consecutive frames show the same logical row's `top` differing by more than
     `rowHeight` (no flicker)
   Resting-state-only assertions are **insufficient** and explicitly disallowed (Round 9
   reproduces *during* the scroll, not at the resting position — the same lesson Epics
   101 and 105 already paid for).

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
   `grep -rE "test\.skip|test\.fixme|describe\.skip|describe\.fixme|test\.fail" apps/dms-material-e2e/src/ | grep -E "scrolling-regression-106|106-3"`
   returns **zero** results for the new specs added by this story. Any
   `test.fail()`-annotated tests in `apps/dms-material-e2e/src/scrolling-regression-106.spec.ts`
   left over from Story 106.1 must be removed (or the spec replaced by the persistent
   suite in this story).

5. **AC5 — Manually verified to fail when the Story 106.2 fix is reverted.**
   **Given** the Story 106.2 fix is locally reverted on a throw-away branch
   (do NOT commit the revert),
   **When** the suite is run,
   **Then** at least one assertion fails on at least one `screen × browser × trigger`
   pair — confirming the suite would actually catch a Round-9 regression for the
   **context-change** scenario specifically. After confirming the failure, the revert
   is restored and the suite is re-run green. Dev Notes record: which test failed,
   which assertion, which browser, which trigger, and a screenshot from the failing
   run (Playwright MCP per NFR3 if practical).

6. **AC6 — Epic 101 and Epic 105 suites still green (no Round-7 / Round-8 regression introduced by helpers).**
   **Given** the existing Round-7 suite
   `apps/dms-material-e2e/src/scrolling-regression-101.spec.ts`, the Round-8 suite
   `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts`, and any helpers they use,
   **When** the new helpers in this story are introduced (or existing helpers extended),
   **Then** Epic 101's and Epic 105's suites continue to pass unchanged in both browsers.
   Specifically: the assert-sticky-header-invariant helper
   (`assert-sticky-header-invariant.helper.ts`) is **extended**, not replaced;
   the slow-scroll helper (`slow-scroll.helper.ts`) is reused, not duplicated;
   the context-change helper (`context-change.helper.ts`) is reused (or extended only
   additively), not replaced.

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
   - optional removal of any leftover `test.fail()` from the 106.1 reproduction spec
     (per AC4) — the spec itself may be deleted if the persistent suite supersedes it,
     or kept un-`fail`-ed if it remains useful as targeted reproduction
   No production code under `apps/dms-material/src/` is modified. No architecture-doc
   edits.

## Tasks / Subtasks

- [ ] **Task 1 — Read 106.1 matrix and 106.2 hand-off note as the specification**
      (AC: #1, #5)
  - [ ] Open
        [`106-1-reproduce-scrolling-all-screens.md`](./106-1-reproduce-scrolling-all-screens.md)
        and read the full reproduction matrix and Live Root-Cause Candidates list.
        Confirm 106.1 status is `Done`. **HALT** if not — this story cannot start
        without the matrix.
  - [ ] Open
        [`106-2-root-cause-and-fix-scrolling.md`](./106-2-root-cause-and-fix-scrolling.md)
        and read the **Hand-off Note for Story 106.3** subsection.
        Confirm 106.2 status is `Done` and the hand-off note is filled in. **HALT** if
        either condition fails — the hand-off note is the spec for which DOM invariants
        the suite must encode, which seed-helpers to reuse, which UI-control selector
        per screen drives the context change, and which structural constraints the
        suite must guard against silently re-introducing.
  - [ ] In Dev Notes "Target Inventory (from 106.1)", record the explicit list of
        cells (`screen × browser × trigger`) the suite must cover. Each cell becomes one
        test (or one assertion within a per-screen combined test).
  - [ ] In Dev Notes "Hand-off Inputs (from 106.2)", record verbatim:
        - The DOM invariant(s) to encode.
        - The seed-helper composition (must include
          `seed-scroll-fetch-universe-ids.helper.ts` per 105.1 / 105.2 / 106.x — for
          multi-account seeding so an account swap actually changes the dataset).
        - The per-screen UI-control selector for the context-change trigger.
        - The structural constraint(s) the suite must guard against re-introducing.

- [ ] **Task 2 — Reuse / extend the sticky-header invariant helper** (AC: #2, #6)
  - [ ] Confirm
        `apps/dms-material-e2e/src/helpers/assert-sticky-header-invariant.helper.ts`
        exists (Stories 101.3 / 105.3 created and extended it).
  - [ ] Extend it only as needed to support any new Round-9 invariants. Do not
        change the existing signature in a way that would break
        `scrolling-regression-101.spec.ts` or `scrolling-regression-105.spec.ts` (AC6).
        Prefer adding optional parameters or a new exported function alongside the
        existing ones.
  - [ ] Per-frame assertions (named functions per `@smarttools/no-anonymous-functions`):
        - `header.top >= parentHeader.bottom - 1` (subpixel tolerance only)
        - `abs(header.top − viewportTop) <= 1`
        - No two consecutive frames where the same logical row's `top` differs by more
          than `rowHeight` (flicker check)
  - [ ] Use `expect.poll` for any async settling. **No** `waitForTimeout`. **No**
        `waitForLoadState('networkidle')`.

- [ ] **Task 3 — Reuse the slow-scroll helper** (AC: #1)
  - [ ] Confirm
        `apps/dms-material-e2e/src/helpers/slow-scroll.helper.ts` exists (Stories 101.3
        / 105.3). Reuse it for the post-context-change scroll. Default cadence:
        4px / 16ms (matching `scrolling-regression-101.spec.ts` and
        `scrolling-regression-105.spec.ts`); make any new parameters configurable
        without breaking existing call sites.

- [ ] **Task 4 — Reuse / extend the per-screen context-change driver helper** (AC: #1, #3)
  - [ ] Confirm
        `apps/dms-material-e2e/src/helpers/context-change.helper.ts` exists (Story
        105.3 Task 4 created it).
  - [ ] Reuse the existing exported functions where they apply:
        - `swapActiveAccount(page, { fromAccountId, toAccountId })` — drives the swap
          via the **UI control** Dave actually uses (sidebar / toolbar account
          dropdown). Per 105.2 / 106.2: do NOT call
          `currentAccountSignalStore.setCurrentAccountId` directly — the bug is in the
          rendered consequence of the user-facing path.
        - `applyAndClearColumnFilter(page, { columnSelector, filterValue })` — opens
          the column filter UI hosted by `base-table.component`, applies the filter,
          waits for the table to reflect the filtered set (via `expect.poll` /
          `toBeVisible`), then clears it and waits for the unfiltered set.
        - `applyAndClearGlobalFilter(page, ...)` for screens whose 106.1 matrix shows
          a global-filter cell.
  - [ ] Extend only additively if 106.1 surfaces a new context-change trigger flavour
        not covered by 105.3 (e.g. multi-filter compound apply, a new screen-specific
        toolbar control). Selectors come from the 106.2 hand-off note (Task 1).
  - [ ] All callbacks (`page.evaluate`, `subscribe`, `requestAnimationFrame`) use named
        functions per `@smarttools/no-anonymous-functions`.

- [ ] **Task 5 — Per-screen regression spec: Universe** (AC: #1, #2, #3, #4)
  - [ ] Create `apps/dms-material-e2e/src/scrolling-regression-106.spec.ts` (new file —
        the persistent Round-9 suite). If a `test.fail()`-annotated reproduction spec
        of the same name was committed by Story 106.1, **replace** it with this
        persistent suite (or delete the old file and create the new one). Either way:
        no `test.fail()`, no `describe.skip()` after this task.
  - [ ] Add a `describe('Universe — context-change scrolling regression (Round 9)', ...)`
        block.
  - [ ] **Account-change test** (if 106.1 cells under Universe × `account-change`
        failed): seed two accounts via the per-screen seed helper +
        `seed-scroll-fetch-universe-ids.helper.ts`; load Universe; baseline
        slow-scroll → confirm clean (Epic-101 / Epic-105 baseline holds); reset; swap
        accounts via `swapActiveAccount`; wait for new dataset; slow-scroll; assert
        the Task 2 invariants on every captured frame.
  - [ ] **Filter-change test** (if 106.1 cells under Universe × `filter-change`
        failed): seed; load Universe; baseline scroll; reset; apply-and-clear filter via
        `applyAndClearColumnFilter` (or `applyAndClearGlobalFilter` if the failing cell
        was the global filter); slow-scroll; assert invariants.
  - [ ] Use `seed-scroll-universe-data.helper.ts` (≥ 60 rows — established in Stories
        87.3 / 101.3 / 105.3); for the multi-account variant, combine with
        `seed-scroll-fetch-universe-ids.helper.ts` so both accounts have enough rows.

- [ ] **Task 6 — Per-screen regression spec: Open Positions, Sold Positions, Dividend
      Deposits** (AC: #1, #2, #3, #4)
  - [ ] Add `describe(...)` blocks to `scrolling-regression-106.spec.ts` for each of
        the three account-panel screens (Open Positions, Sold Positions, Dividend
        Deposits). Same structure as Task 5 but per-screen seed helpers:
        - Open Positions: `seed-scroll-open-positions-data.helper.ts` (≥ 40 rows in
          same account)
        - Sold Positions: `seed-scroll-sold-positions-data.helper.ts` (≥ 40 rows)
        - Dividend Deposits: `seed-scroll-div-deposits-with-symbols-data.helper.ts`
          (≥ 60 rows)
        For the account-change variant, seed two accounts with the same helper invoked
        per account.
  - [ ] Only add tests for the cells 106.1's matrix flagged FAIL — do NOT spuriously
        add filter-change tests for screens that didn't fail under filter-change. (If
        106.1's matrix shows a screen failing under both triggers, both tests exist.)

- [ ] **Task 7 — Per-screen regression spec: Screener** (AC: #1, #2, #3, #4)
  - [ ] Add a `describe('Screener — context-change scrolling regression (Round 9)', ...)`
        block. Screener typically lacks an in-place "active account" concept — exercise
        only the trigger(s) flagged by 106.1's matrix (likely `filter-change`, both
        per-column and global if 106.1 catalogued both).
  - [ ] Use `seed-scroll-screener-data.helper.ts`.

- [ ] **Task 8 — Any other virtual-scrolled screen flagged by 106.1** (AC: #1)
  - [ ] If Story 106.1's matrix lists any virtual-scrolled screen NOT covered by Tasks
        5–7 (e.g. a screen added since Epic 105), add a `describe(...)` block for it
        following the same pattern.
  - [ ] If 106.1 lists no additional screens, document that fact in Dev Notes
        "Completion Notes" — this task is then complete.

- [ ] **Task 9 — Cross-browser verification** (AC: #3)
  - [ ] Run `pnpm e2e:dms-material:chromium` — every new spec must pass.
  - [ ] Run `pnpm e2e:dms-material:firefox` — every new spec must pass.
  - [ ] No browser-specific flakiness permitted. No skip/fixme/conditional-browser
        annotations added.

- [ ] **Task 10 — Manual revert-fix verification** (AC: #5)
  - [ ] Note the production files Story 106.2 modified (its "File List" / fix diff).
  - [ ] On a throw-away branch, revert each one
        (`git checkout main -- <file>` per file, or `git revert -n <106.2-merge-commit>`
        if 106.2 has a single squashed commit).
  - [ ] Run `pnpm e2e:dms-material:chromium` against the new suite. Confirm at least
        one assertion fails with the expected artifact (header overlap, drift, or
        flicker).
  - [ ] Restore the 106.2 fix; rerun; confirm green.
  - [ ] Capture a screenshot from the failing run (Playwright MCP per NFR3) if practical.
  - [ ] **DO NOT** commit the revert. Confirm `git status` is clean before continuing.
  - [ ] Record in Dev Notes: which test failed, which assertion, which browser, which
        trigger.

- [ ] **Task 11 — Confirm no skips, no `test.fail()`, and `pnpm all` green**
      (AC: #4, #7, #8)
  - [ ] `grep` for skip/fixme/fail in scrolling-regression-106.spec.ts → must be 0.
  - [ ] `CI=1 pnpm all` → must pass.
  - [ ] `pnpm format` → must report no files changed.
  - [ ] Scope-cleanliness: only e2e spec files, new/extended helper(s), and this story
        file modified. No files under `apps/dms-material/src/` modified.

## Dev Notes

### What This Story Is (And Isn't)

**Is:** the Round-9 equivalent of Stories 101.3 and 105.3 — a persistent E2E regression
suite that locks in the Story 106.2 fix for the **context-change** scenario (account
swap and / or filter apply/clear) so that Round 10 of this epic never starts. Same
methodology as 101.3 / 105.3 (frame-by-frame `requestAnimationFrame` sampling;
named-function callbacks; both browsers; part of `pnpm all`); new dimension is whatever
additional context-change surface area 106.1 / 106.2 exposed beyond Round 8.

**Isn't:**

- A reproduction story (that was 106.1).
- A root-cause / fix story (that was 106.2).
- An architecture-doc / SCROLLING REGRESSION HISTORY appendix update — the in-source
  history block in `base-table.component.ts` was updated by 106.2. Any architecture-doc
  updates from Round 9 are out of scope here unless 106.2's hand-off note explicitly
  delegated one to this story (then add it to Task 11 / Dev Notes).
- A production-code change story.

### Read 106.1 and 106.2 First (Non-negotiable)

This story MUST NOT begin without:

1. The full Dev Notes from
   [106-1-reproduce-scrolling-all-screens.md](./106-1-reproduce-scrolling-all-screens.md)
   — specifically the reproduction matrix and Live Root-Cause Candidates list.
2. The full Dev Notes from
   [106-2-root-cause-and-fix-scrolling.md](./106-2-root-cause-and-fix-scrolling.md)
   — specifically the **"Hand-off Note for Story 106.3"** subsection which dictates:
   which DOM invariant(s) to encode, which seed-helpers to compose, which UI control
   to drive per screen, and which structural constraint(s) to guard.

If either is incomplete or missing, **HALT** and surface it (do not improvise an
invariant — that's how Round 10 starts).

### Why Frame-by-Frame Sampling (carry-over from 101.3 / 105.3)

Round 9 — like Rounds 1–8 before it — reproduces *during* the scroll, not at the resting
position. Every prior epic that asserted only the post-scroll resting state shipped a
test that passed while users still saw the artifact. Stories 101.3 / 105.3 fixed this by
sampling header/parent rects on every `requestAnimationFrame` and asserting per frame;
Story 106.3 reuses that helper for the same reason. Resting-state-only assertions are
explicitly disallowed by AC2.

### Context-Change Trigger Sequence

The trigger sequence per test (same shape as 105.3):

1. Seed data (per-screen helper; for account-change variant, seed two accounts via
   `seed-scroll-fetch-universe-ids.helper.ts` + per-screen helper invoked per account).
2. Login as Dave (use `apps/dms-material-e2e/src/helpers/login.helper.ts`).
3. Navigate to the screen.
4. **Baseline slow scroll** (Epic-101 / Epic-105 baseline) — confirm clean using the
   Task 2 invariant helper. If baseline is dirty, that is a Round-7 / Round-8
   regression, not a Round-9 finding — record and stop (do NOT bury it in this suite's
   diff).
5. Reset scroll to top.
6. **Trigger the context change:**
   - Account swap → `swapActiveAccount(page, { fromAccountId, toAccountId })` (Task 4).
     Drive via the UI control Dave uses (sidebar / toolbar dropdown). Do NOT call
     `currentAccountSignalStore.setCurrentAccountId` directly — the bug is in the
     rendered consequence of the user-facing path.
   - **OR** filter apply / clear →
     `applyAndClearColumnFilter(page, ...)` /
     `applyAndClearGlobalFilter(page, ...)` (Task 4). Selectors come from the 106.2
     hand-off note.
7. Wait for the new dataset / filtered set to render (via `expect.poll` /
   `toBeVisible` — never `waitForLoadState('networkidle')`, never `page.waitForTimeout`).
8. **Asserted slow scroll** — invariants per Task 2 / AC2 must hold on every captured
   frame.

### Reproduction Matrix → Test Coverage Map (fill in during Task 1)

> Fill from 106.1's matrix in Task 1. Only add a test for a cell flagged FAIL by 106.1
> — do NOT spuriously add filter-change tests for screens that did not fail under
> filter-change. Both triggers exist for screens whose 106.1 matrix shows failures
> under both.

| Screen            | account-change test? | filter-change test? | Combined or split? | Notes (selectors / seed) |
| ----------------- | -------------------- | ------------------- | ------------------ | ------------------------ |
| Universe          | (from 106.1 matrix)  | (from 106.1 matrix) |                    | toolbar `.account-select mat-select` (per 105.2) |
| Open Positions    | (from 106.1 matrix)  | (from 106.1 matrix) |                    | route nav + `[data-testid="symbol-search-input"]` (per 105.2) |
| Sold Positions    | (from 106.1 matrix)  | (from 106.1 matrix) |                    | route nav + `thead input[placeholder="Search Symbol"]` (per 105.2) |
| Dividend Deposits | (from 106.1 matrix)  | (from 106.1 matrix) |                    | route nav; verify with 106.1 whether a filter UI now exists |
| Screener          | n/a (no in-place account swap) | (from 106.1 matrix) |          | `[data-testid="risk-group-filter"]` (per 105.2) |
| (other if 106.1 found one) |              |                     |                    |                          |

### Hand-off Inputs (from 106.2 — fill in during Task 1)

- **DOM invariant to encode:** (verbatim from 106.2 hand-off note).
- **Root cause (106.2):** (summary from 106.2 hand-off note — for dev orientation only,
  do not test against the fix's internals).
- **Seed-helper composition:** (verbatim from 106.2 hand-off note; reuse existing
  per-screen seed helpers; combine with `seed-scroll-fetch-universe-ids.helper.ts` for
  account-change variants).
- **Per-screen UI-control selectors:** (verbatim from 106.2 hand-off note; if 106.2
  introduces new selectors beyond 105.2's set, list them here).
- **Structural constraint:** (verbatim from 106.2 hand-off note — typically: do NOT
  call store mutators directly; drive via the user-facing UI path).
- **Header selector (CRITICAL — established by 105.3, re-confirm in 106.2):** use
  `th.mat-mdc-header-cell` (NOT `tr.mat-mdc-header-row`). Chrome returns natural-flow
  bounding box for `tr`, not the sticky position. `th` returns the actual on-screen
  sticky position.

### Application URLs (Round-7 / Round-8 set; confirm via 106.1 in Task 1)

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
  assertion fails, the production code (or the 106.2 fix) is wrong, not the test (NFR5)

### Frame-Sampling Pattern (sketch — same shape as Stories 101.3 / 105.3)

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
or column / global filter input). All four come from the 106.2 hand-off note (Task 1) /
the 106.1 matrix (Task 1) — do not guess. If a screen's template uses a wrapping element
between the parent header and the scroll viewport, the selectors must reflect that.

### Data Volume Requirements

CDK virtual scroll activates only when there are more rows than fit in the viewport.
Use these established minimums (from Stories 87.3 / 101.3 / 105.3, do not weaken):

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
| `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts`                        | Read-only. Must remain green (AC6). |
| `apps/dms-material-e2e/src/scrolling-regression-87.spec.ts`                         | Read-only. Must remain green. |
| `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts`                   | Read-only. Must remain green. |
| `apps/dms-material-e2e/src/universe-smooth-scroll.spec.ts`                          | Read-only. Must remain green. |
| `apps/dms-material-e2e/src/open-positions-smooth-scroll.spec.ts`                    | Read-only. |
| `apps/dms-material-e2e/src/open-positions-scrolling-regression.spec.ts`             | Read-only. |
| `apps/dms-material-e2e/src/sold-positions-scrolling-regression.spec.ts`             | Read-only. |
| `apps/dms-material-e2e/src/div-deposits-smooth-scroll.spec.ts`                      | Read-only. |
| `apps/dms-material-e2e/src/div-deposits-scrolling-regression.spec.ts`               | Read-only. |
| `apps/dms-material-e2e/src/screener-smooth-scroll.spec.ts`                          | Read-only. |
| `apps/dms-material-e2e/src/scrolling-regression-106.spec.ts` (if 106.1 committed it) | **Replace** with the persistent suite from Tasks 5–8 (or delete + recreate). No `test.fail()` after this story. |
| `apps/dms-material-e2e/src/helpers/assert-sticky-header-invariant.helper.ts`        | **Extend** only additively; do not break 101.3 / 105.3 call sites. |
| `apps/dms-material-e2e/src/helpers/slow-scroll.helper.ts`                           | **Reuse**; do not duplicate. |
| `apps/dms-material-e2e/src/helpers/context-change.helper.ts`                        | **Reuse** (extend only additively if 106.1 surfaces a new trigger flavour). |

The new context-change suite from Tasks 5–8 is **additive** to the file inventory
above. It does not replace any existing spec.

### Test Naming Convention

Follow the project pattern (per 87.3 / 101.3 / 105.3):

- `'<screen> — slow scroll keeps header anchored under parent header after account change'`
- `'<screen> — slow scroll keeps header anchored under parent header after filter apply/clear'`
- `'<screen> — no header drift with content during slow scroll after context change'`
- `'<screen> — no header flicker during slow scroll after context change'`

Prefer the **combined-invariant per `screen × trigger`** form (one `test()` that
captures one frame array and asserts all three invariants on it) to keep `pnpm all`
runtime down. Split tests are acceptable when needed for clarity.

### Round-9 Failure Modes (what we're hunting — same artifact set as 101.3 / 105.3)

A cell is `FAIL` only if the artifact does NOT appear on the freshly-loaded baseline
(step 4 of the trigger sequence) and DOES appear after the context change. A cell that
fails on both is a Round-7 / Round-8 regression and must be escalated, not catalogued
as Round 9.

1. **Header-under-header** — sticky `<thead>` slides upward behind the parent header.
2. **Flicker** — content rows jitter mid-scroll (Y delta > rowHeight then snap back).
3. **Header-scrolls-with-content** — sticky header drifts down with content rows.

### Account-Change Trigger Mechanics (per 105.1 / 105.2 / 106.x)

`apps/dms-material/src/app/account-panel/account-selection-integration.spec.ts` shows
how the account selection signal works:

- `currentAccountSignalStore.setCurrentAccountId(...)` — underlying state mutation.
- `selectCurrentAccountSignal` — consumer signal.

For 106.3 tests, drive the swap via the **UI control** Dave actually uses (sidebar /
toolbar account dropdown — confirmed in 106.1 Task 1 and re-stated in 106.2 hand-off
note). Do NOT call the store directly; the bug is in the rendered consequence of the
user-facing path.

### Filter-Change Trigger Mechanics (per 105.1 / 106.1)

Column filters are hosted by `base-table.component`. The Universe and Screener screens
may also expose global filter chips / search inputs. Only exercise the trigger flavour
that 106.1's matrix flagged FAIL for the given screen.

### Manual Revert-Fix Verification (AC #5) — How To

1. Note the production files Story 106.2 modified (its "File List" / fix diff).
2. On a throw-away branch, revert each one (`git checkout main -- <file>` per file, or
   `git revert -n <106.2-merge-commit>` if 106.2 has a single squashed commit).
3. Run `pnpm e2e:dms-material:chromium` against the new suite. Confirm at least one
   assertion fails with the expected artifact (header overlap, drift, or flicker).
4. Restore the 106.2 fix (`git restore --source=main <file>` or
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
  / helpers (project NFR; same rule as 101.3 / 105.3).
- **No production code changes** under `apps/dms-material/src/` (AC8).
- **No weakening of the Task 2 invariants** to make a test pass — if an invariant
  fails after the context change, the 106.2 fix is incomplete. Loop back to 106.2 via
  `correct-course` before lowering the bar (NFR5).
- **No anonymous callbacks** inside `subscribe`, `requestAnimationFrame`,
  `page.evaluate`, etc. — use named functions per
  `@smarttools/no-anonymous-functions`.

### Browsers

Both Chromium and Firefox must be exercised — Epic 106 explicitly calls out NFR
coverage (R3) across both. Safari/WebKit is **not** in the project's supported matrix.

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

## Change Log

| Date       | Version | Description                                                                     | Author |
| ---------- | ------- | ------------------------------------------------------------------------------- | ------ |
| 2026-05-19 | 0.1     | Initial story drafted from epics-2026-05-19.md (Story 106.3); Status: Approved. | bmad-create-story |
