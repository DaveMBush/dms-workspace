# Story 116.1: Investigate Summary Reload Loop Root Cause and Define Fix Strategy

Status: In Progress

**Story Key:** `116-1-investigate-summary-reload-loop`
**Epic:** 116 - Stop Continuous Reloading on Account Summary Screens
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-30.md](../planning-artifacts/epics-2026-05-30.md) (Epic 116 / Story 116.1)
**Story Meta:** [_bmad-output/planning-artifacts/story-meta/2026-05-30/116-1-investigate-summary-reload-loop.yaml](../planning-artifacts/story-meta/2026-05-30/116-1-investigate-summary-reload-loop.yaml)
**Source Story Title in Epic File:** `Reproduce the Summary Reload Loop and Identify the Trigger`
**Authoritative Title for This Artifact:** `Investigate Summary Reload Loop Root Cause and Define Fix Strategy`
**GitHub Issue:** `#1333`
**Type:** investigation / design handoff only - no production code changes
**Depends on:** none
**Enables:** Story 116.2 and Story 116.3

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want to trace why the Account Summary screens continuously reload,
So that the fix targets the exact reactive loop instead of masking the symptom.

## Epic Context

Epic 116 exists because the summary screens can enter a repeated fetch and repaint cycle
instead of stabilizing after the initial load. The implementation story must preserve the
intended refresh behavior for legitimate state changes while eliminating uncontrolled reload
churn. This story is investigation-only. It must isolate the exact trigger, document the
allowed refresh rules, and hand off the smallest credible fix seam for Story 116.2.

## Acceptance Criteria

1. **Given** the Account Summary screen,
   **When** the developer opens it and observes render/network activity,
   **Then** Dev Notes record the reproduction pattern and which fetch methods repeat
   unexpectedly.

2. **Given** the current summary-view implementation and related reactive wiring,
   **When** the developer traces effects, selectors, and value-change subscriptions,
   **Then** Dev Notes identify the exact signal, effect, subscription, or state transition
   that causes the repeated reload loop.

3. **Given** the intended summary-screen behavior,
   **When** the developer documents the fix design,
   **Then** Dev Notes specify how initial load, account change, month change, and year
   change should each trigger fetches exactly once.

4. **Given** the investigation is complete,
   **When** `pnpm all` runs,
   **Then** all tests pass and no production code is modified.

## Tasks / Subtasks

- [x] **Task 1 - Read the current reactive path end-to-end before changing anything**
      (AC: 1, 2, 3)
  - [x] Read `apps/dms-material/src/app/shared/components/summary-view/summary-view.ts`
        completely and record the route-mode split, `setupAccountWatcher()`,
        `initGlobalMode()`, `refreshData()`, and the current `lastFetchedMonth` /
        `lastFetchedYear` guards.
  - [x] Read `apps/dms-material/src/app/shared/components/summary-view/summary-view.base.ts`
        completely and record the month/year auto-select effects, selector enable/disable
        flow, and the inline comment that already documents one historical infinite-loop
        path.
  - [x] Read `apps/dms-material/src/app/global/services/summary.service.ts`
        completely and document the side effects of `fetchSummary()`, `fetchGraph()`,
        `fetchMonths()`, and `fetchYears()`, including `summaryRequestSeq`, loading/error
        signals, cache behavior, account-vs-global month handling, and `onComplete`
        callback sequencing.
  - [x] Read `apps/dms-material/src/app/store/current-account/current-account.signal-store.ts`
        completely and document how `selectCurrentAccountId()` is computed and whether the
        store can re-emit the same visible account ID.
  - [x] Read `apps/dms-material/src/app/app.routes.ts` and confirm both route entry points:
        `/global/summary` with `mode: 'global'` and the default account summary child route
        with `mode: 'account'`.
  - [x] Read `apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts`,
        `apps/dms-material/src/app/global/global-summary.spec.ts`, and
        `apps/dms-material/src/app/global/services/summary.service.spec.ts` to document
        what unit/integration coverage already exists and what coverage is missing around
        "load once" behavior.
  - [x] Read `apps/dms-material-e2e/src/account-summary.spec.ts` and
        `apps/dms-material-e2e/src/global-summary.spec.ts` to document the current user
        flows and the lack of an assertion that idle screens stop issuing requests.

- [x] **Task 2 - Reproduce the reload loop and capture the exact request pattern**
      (AC: 1)
  - [x] Use the Playwright MCP server to open `/global/summary` and at least one real
        `/account/:accountId` summary screen.
  - [x] Observe network activity after the screen becomes visible and record which
        endpoints repeat unexpectedly: `/api/summary`, `/api/summary/graph`,
        `/api/summary/months`, and/or `/api/summary/years`.
  - [x] Record whether the repeat happens in global mode, account mode, or both.
  - [x] Record whether the repeat begins immediately on initial load, only after selectors
        enable, only after months/years resolve, or only after account resolution.

- [x] **Task 3 - Identify the exact reactive trigger instead of guessing** (AC: 2)
  - [x] Prove or eliminate the `SummaryViewBase` month auto-select effect as the trigger.
        The inline code comment already documents a historical path:
        `fetchMonths -> setValue -> valueChanges -> fetchSummary -> enableSelectors -> ...`.
  - [x] Prove or eliminate `setupAccountWatcher()` as the trigger, including any repeated
        `fetchAccountData()` calls caused by `currentAccountSignalStore.selectCurrentAccountId()`
        recomputation.
  - [x] Prove or eliminate selector `valueChanges` feedback caused by `setValue()`,
        `disable()`, `enableSelectors()`, or Angular Material revalidation.
  - [x] If the loop comes from another boundary, document the precise signal/effect/
        subscription chain with enough detail that Story 116.2 can change one seam
        instead of refactoring blindly.

- [x] **Task 4 - Define the fix strategy and legitimate refresh rules** (AC: 3)
  - [x] Document the allowed one-time load behavior for initial screen open in global and
        account modes.
  - [x] Document the allowed refresh behavior for explicit account change, month change,
        year change, and manual refresh.
  - [x] State which requests are intentionally coupled and which are not. Example: year
        change may legitimately re-fetch months and graph without implying an immediate
        summary re-fetch unless the selected month changes.
  - [x] Name the smallest likely code seam for Story 116.2 to change, using exact methods
        and guards rather than a vague "refactor summary view" direction.

- [x] **Task 5 - Hand off concrete validation surfaces for Stories 116.2 and 116.3**
      (AC: 3)
  - [x] List the likely implementation files for Story 116.2:
        `summary-view.ts`, `summary-view.base.ts`, and `summary.service.ts` only if the
        proven trigger is service-level.
  - [x] List the likely unit/regression files for Story 116.3:
        `summary-view-account.spec.ts`, `global-summary.spec.ts`, and
        `summary.service.spec.ts` if the root cause sits in service orchestration.
  - [x] List the likely E2E regression surfaces:
        `apps/dms-material-e2e/src/account-summary.spec.ts`,
        `apps/dms-material-e2e/src/global-summary.spec.ts`, or a dedicated new summary-load
        stability spec if that is clearer.
  - [x] Record what must be preserved: initial data render, chart rendering, selector
        usability, route-mode split, legitimate account/month/year refreshes, and current
        loading/error UX.

- [ ] **Task 6 - Prove the story stayed investigation-only and quality-clean**
      (AC: 4)
  - [ ] Verify that no production source file was modified.
  - [ ] Run `pnpm all`.
  - [ ] Record the validation result and the final root-cause writeup in Dev Notes.

## Dev Notes

### Current Code Findings

- `SummaryViewComponent` has two mode-specific entry points. Account mode starts in the
  constructor via `setupAccountWatcher()`. Global mode starts in `ngOnInit()` via
  `initGlobalMode()`.

- Account mode currently issues a burst of startup requests via `fetchAccountData()`:
  `fetchSummary(currentMonth, enableSelectors, accountId)`,
  `fetchGraph(undefined, accountId, currentMonth)`, `fetchMonths(accountId)`, and
  `fetchYears()`.

- Account mode month changes currently trigger both summary and graph requests. Year
  changes trigger months and graph requests. The `lastFetchedMonth` and
  `lastFetchedYear` guards only prevent obvious same-value repeats after those values are
  updated.

- `SummaryViewBase` owns two effects that mutate FormControls when the months and years
  signals update. The month effect already contains an inline comment describing a prior
  infinite-loop pattern and guards against `setValue()` when the first available month is
  already selected.

- `SummaryService` sets `loadingSignal` during summary/month fetches, clears errors on
  each request, caches global months and years, and ignores stale summary responses via
  `summaryRequestSeq`. This prevents stale writes but does not itself prevent repeated
  request issuance.

- `currentAccountSignalStore.selectCurrentAccountId()` returns explicit `id()` when set,
  otherwise it falls back to the first available account from `selectAccounts()`. The
  investigation must confirm whether that computed can re-trigger the account watcher even
  when the visible account did not logically change.

- Current tests cover rendering and selector-driven updates, but they do not assert that
  the screen settles after initial load and stops making idle repeat requests. That test
  gap is part of why this regression can exist unnoticed.

- Existing E2E coverage verifies that account and global summary screens render and that
  selectors can be used, but it does not currently measure or cap request count during a
  steady-state idle period.

### Working Hypothesis To Prove or Disprove

The most plausible loop is a feedback path between summary/month loading and form-control
updates rather than a server-side problem. There are two concrete candidates to validate:

1. `fetchMonths()` updates the month options, `SummaryViewBase` auto-selects a month,
   `valueChanges` triggers another fetch, selector enable/disable or Angular Material
   control revalidation causes the cycle to repeat.
2. `currentAccountSignalStore.selectCurrentAccountId()` recomputes and re-triggers
   `setupAccountWatcher()` so `fetchAccountData()` runs again even though the visible
   account did not truly change.

Do not assume either path is the root cause until the request sequence and triggering
reactive edge are proved from live reproduction plus code trace.

### Likely Files For Story 116.2 / 116.3

- `apps/dms-material/src/app/shared/components/summary-view/summary-view.ts`
- `apps/dms-material/src/app/shared/components/summary-view/summary-view.base.ts`
- `apps/dms-material/src/app/global/services/summary.service.ts` if the proven trigger is
  service-level or cache-related rather than form-control orchestration
- `apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts`
- `apps/dms-material/src/app/global/global-summary.spec.ts`
- `apps/dms-material/src/app/global/services/summary.service.spec.ts`
- `apps/dms-material-e2e/src/account-summary.spec.ts`
- `apps/dms-material-e2e/src/global-summary.spec.ts`

### What Must Be Preserved

- Route-mode behavior split between `/global/summary` and account summary routes
- Initial summary/stat rendering and chart rendering in both modes
- Legitimate refreshes when account, month, or year changes
- Current selector usability and loading/error behavior
- Existing summary API contracts and Fastify route behavior
- Investigation-only scope for this story: no production code changes

### References

- [Epic 116 / Story 116.1](../planning-artifacts/epics-2026-05-30.md)
- [Story meta](../planning-artifacts/story-meta/2026-05-30/116-1-investigate-summary-reload-loop.yaml)
- [Project context](../project-context.md)
- `apps/dms-material/src/app/shared/components/summary-view/summary-view.ts`
- `apps/dms-material/src/app/shared/components/summary-view/summary-view.base.ts`
- `apps/dms-material/src/app/global/services/summary.service.ts`
- `apps/dms-material/src/app/store/current-account/current-account.signal-store.ts`
- `apps/dms-material/src/app/global/global-summary.spec.ts`
- `apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts`
- `apps/dms-material/src/app/global/services/summary.service.spec.ts`
- `apps/dms-material-e2e/src/account-summary.spec.ts`
- `apps/dms-material-e2e/src/global-summary.spec.ts`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Playwright MCP reproduction against `http://localhost:4520/global/summary` and
      `http://localhost:4520/account/1677e04f-ef9b-4372-adb3-b740443088dc`
- Local investigation runtime launched from worktree with `pnpm prisma generate`,
      `node tools/create-test-db.js test-database.db`, backend on port `3220`, and app on
      port `4520`
- Validation commands: `pnpm all`, `pnpm test`, `pnpm lint`

### Completion Notes List

- Reproduced mode split in browser. Global summary stabilizes after initial load and a
      one-time correction from current month/year to first available `2025-12` / `2025`.
      It does not continue looping after `networkidle`.
- Reproduced account summary continuous reloads. After initial load and the same one-time
      correction to available month/year, the visible account summary re-enters loading every
      ~3 seconds and reissues `/api/summary`, `/api/summary/graph`, and
      `/api/summary/months` for the same account.
- Live component instrumentation on the real page proved the steady-state trigger is the
      `setupAccountWatcher()` effect in `summary-view.ts`. The same component instance calls
      `selectCurrentAccountId()` and then `fetchAccountData()` twice per cycle, even though the
      returned account ID stays unchanged at
      `1677e04f-ef9b-4372-adb3-b740443088dc`.
- Eliminated `SummaryViewBase` month auto-select and selector `valueChanges` as the
      steady-state trigger. They explain the one-time correction from current calendar month
      to the first available month/year, but they do not explain the continuing 3-second idle
      bursts.
- Smallest likely fix seam for Story 116.2 is `setupAccountWatcher()` in
      `apps/dms-material/src/app/shared/components/summary-view/summary-view.ts`. That effect
      needs a same-account guard before `fetchAccountData()` so repeated recomputation of
      `selectCurrentAccountId()` cannot replay the startup burst for an unchanged account.
- Legitimate refresh rules for Story 116.2: global initial load should fetch months,
      years, graph, and summary once, with at most one corrective summary/graph fetch if the
      first available month/year differs from the current calendar defaults. Account initial
      load should fetch summary, graph, months, and years once for the resolved account, with
      at most one corrective month/year follow-up. Explicit month change should fetch summary
      and graph once. Explicit year change should fetch months and graph once, and summary
      only if the selected month actually changes. Manual refresh should re-fetch summary once.
- Coverage gaps remain. Current unit specs cover rendering and selector-driven updates,
      but do not assert that account/global summary screens settle and stop issuing idle
      requests. Current E2E specs verify render and selector usability only; they do not cap
      steady-state request counts.
- Investigation stayed source-clean. No production source files were modified. `pnpm all`
      succeeded but ran no affected tasks. `pnpm test` and `pnpm lint` failed because root
      workspace scripts are not defined in `package.json`, so Task 6 and Acceptance Criterion 4
      remain incomplete.

### File List

- `_bmad-output/implementation-artifacts/116-1-investigate-summary-reload-loop.md`

## Change Log

- 2026-06-02: Investigated summary reload loop, captured live reproduction evidence,
      documented root-cause handoff notes in Dev Agent Record, and left story in progress
      because `pnpm test` / `pnpm lint` do not pass in this worktree.
