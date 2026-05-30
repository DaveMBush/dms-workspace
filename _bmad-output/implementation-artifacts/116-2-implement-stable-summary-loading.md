# Story 116.2: Implement Stable Summary Loading and Remove Continuous Reload Loop

Status: Approved

**Story Key:** `116-2-implement-stable-summary-loading`
**Epic:** 116 — Stop Continuous Reloading on Account Summary Screens
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-30.md](../planning-artifacts/epics-2026-05-30.md) (Epic 116 / Story 116.2)
**Story Meta:** [_bmad-output/planning-artifacts/story-meta/2026-05-30/116-2-implement-stable-summary-loading.yaml](../planning-artifacts/story-meta/2026-05-30/116-2-implement-stable-summary-loading.yaml)
**Source Story Title in Epic File:** `Implement Stable One-Time Loading for Account Summary Screens`
**Authoritative Title for This Artifact:** `Implement Stable Summary Loading and Remove Continuous Reload Loop`
**Type:** Implementation
**Depends on:** Story 116.1
**Enables:** Story 116.3
**Requirements covered:** R7, R8

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Dave,
I want the Account Summary screen to load once when I open it and stay stable,
So that the screen stops flickering and repainting unnecessarily.

## Epic Context

Story 116.1 narrowed the defect to the summary screen's client-side reactive orchestration,
not stale-response handling in the backend. In account mode, `SummaryViewComponent`
starts an `effect()` watcher in `setupAccountWatcher()` and immediately runs
`fetchAccountData()` whenever `selectCurrentAccountId()` emits a non-empty ID.
`fetchAccountData()` resets both selectors and issues four startup requests:
`fetchSummary()`, `fetchGraph()`, `fetchMonths()`, and `fetchYears()`.

`SummaryViewBase` also auto-selects month and year values when option signals load. That is
useful behavior, but it creates a second reactive edge during bootstrap. If the same visible
account is processed more than once or if bootstrap selector writes are treated like user
changes, the summary view can issue extra startup requests and re-enter a fetch/repaint loop.

This story must make startup deterministic: one account-resolution path, one settled initial
summary load, and only bounded follow-up requests for legitimate account, month, or year
changes. The primary defect surface is account mode. Global mode is a preservation surface and
must not regress if shared summary-view/base logic changes.

## Acceptance Criteria

1. **AC1 — Account Summary initial load settles after one bootstrap sequence.** (R7)
   **Given** the Account Summary screen opens,
   **When** the account ID resolves and the initial data load completes,
   **Then** the screen does not continue issuing repeated `/api/summary`,
   `/api/summary/graph`, `/api/summary/months`, or `/api/summary/years` requests while idle,
   and the UI stops flickering or repainting continuously.

2. **AC2 — Legitimate refresh paths still work exactly once per change.** (R8)
   **Given** a legitimate state change such as account, month, or year selection,
   **When** Dave changes one selector or navigates to a different account,
   **Then** only the intended follow-up summary/graph/month requests run once for that change
   and the screen updates correctly.

3. **AC3 — Shared summary behavior and UX are preserved.**
   **Given** shared `summary-view` and `summary-view.base` logic is updated,
   **When** the Account Summary or Global Summary screens render,
   **Then** selector enable/disable behavior, loading/error UX, chart rendering, and current
   route-mode split continue to work.

4. **AC4 — Live UI verification proves the loop is gone.**
   **Given** the fix is applied,
   **When** the screen is exercised via the Playwright MCP server,
   **Then** the UI remains stable after initial load and still responds correctly to valid
   month and year changes.

5. **AC5 — Quality gate.** (NFR1)
   **Given** `pnpm all` runs,
   **When** the implementation is validated,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] **Task 1 — Reconfirm the investigation handoff and read every update surface before editing** (AC: #1, #2, #3)
  - [ ] Read [_bmad-output/implementation-artifacts/116-1-investigate-summary-reload-loop.md](./116-1-investigate-summary-reload-loop.md) completely and treat it as the implementation handoff for this story.
  - [ ] Read [apps/dms-material/src/app/shared/components/summary-view/summary-view.ts](../../apps/dms-material/src/app/shared/components/summary-view/summary-view.ts) in full, including `setupAccountWatcher()`, `initGlobalMode()`, `fetchAccountData()`, `onMonthChange()`, `onYearChange()`, and the existing `lastFetchedMonth` / `lastFetchedYear` guards.
  - [ ] Read [apps/dms-material/src/app/shared/components/summary-view/summary-view.base.ts](../../apps/dms-material/src/app/shared/components/summary-view/summary-view.base.ts) in full, especially the month/year auto-select effects and `enableSelectors()`.
  - [ ] Read [apps/dms-material/src/app/global/services/summary.service.ts](../../apps/dms-material/src/app/global/services/summary.service.ts) and confirm what it does and does not guarantee: stale-response suppression, months/years caching, loading/error state, and request orchestration responsibilities.
  - [ ] Read [apps/dms-material/src/app/store/current-account/current-account.signal-store.ts](../../apps/dms-material/src/app/store/current-account/current-account.signal-store.ts) and [apps/dms-material/src/app/app.routes.ts](../../apps/dms-material/src/app/app.routes.ts) to preserve the visible-account selection rules and the `/global/summary` versus account-summary route split.
  - [ ] Read [apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts](../../apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts), [apps/dms-material/src/app/global/global-summary.spec.ts](../../apps/dms-material/src/app/global/global-summary.spec.ts), [apps/dms-material/src/app/global/services/summary.service.spec.ts](../../apps/dms-material/src/app/global/services/summary.service.spec.ts), [apps/dms-material-e2e/src/account-summary.spec.ts](../../apps/dms-material-e2e/src/account-summary.spec.ts), and [apps/dms-material-e2e/src/global-summary.spec.ts](../../apps/dms-material-e2e/src/global-summary.spec.ts) to document what is already covered and what is still missing around bounded request counts and idle stabilization.

- [ ] **Task 2 — Make account-mode bootstrap deterministic and single-shot** (AC: #1)
  - [ ] Add an explicit guard in [apps/dms-material/src/app/shared/components/summary-view/summary-view.ts](../../apps/dms-material/src/app/shared/components/summary-view/summary-view.ts) so the same visible account ID does not rerun the full bootstrap sequence.
  - [ ] Refactor the initial account-mode load so one canonical bootstrap month/year is chosen before the summary settles. Do not treat a "current month first, first available month second" double-fetch as acceptable startup behavior.
  - [ ] Ensure bootstrap `setValue()` / selector-enable steps do not re-enter the initial load path as if they were user-triggered changes.
  - [ ] Keep the fix at the component orchestration layer unless a focused proof shows that service-level request coalescing is necessary.

- [ ] **Task 3 — Preserve legitimate refresh semantics and route-mode behavior** (AC: #2, #3)
  - [ ] Preserve the intended account-mode refresh contract: account change performs one bootstrap refresh, month change performs one summary + graph refresh, and year change refreshes months + graph with a downstream summary refresh only if the selected month truly changes.
  - [ ] Preserve the existing global-mode startup path in `initGlobalMode()` unless a shared helper change requires a surgical adjustment.
  - [ ] Keep selector enable/disable behavior, loading state, error state, chart rendering, and summary-stat rendering unchanged for valid flows.
  - [ ] Do not change API contracts or backend routes for this story.

- [ ] **Task 4 — Add focused automated coverage for bounded request behavior** (AC: #1, #2, #3, #5)
  - [ ] Extend [apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts](../../apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts) to assert that opening account summary for a settled account triggers one bounded bootstrap request sequence rather than repeated summary reloads.
  - [ ] Add focused coverage for repeated same-account emissions so they do not retrigger `fetchAccountData()` endlessly.
  - [ ] Add focused coverage for one month change and one year change so request counts remain bounded and the expected endpoints still fire.
  - [ ] If shared base logic changes affect global mode, extend [apps/dms-material/src/app/global/global-summary.spec.ts](../../apps/dms-material/src/app/global/global-summary.spec.ts) with a narrow regression proving global summary still loads and responds to valid month/year changes.
  - [ ] Extend [apps/dms-material/src/app/global/services/summary.service.spec.ts](../../apps/dms-material/src/app/global/services/summary.service.spec.ts) only if this story changes service behavior. Leave the durable cross-browser regression matrix to Story 116.3.

- [ ] **Task 5 — Verify the fix through the live UI with Playwright MCP** (AC: #4)
  - [ ] Use [apps/dms-material-e2e/src/account-summary.spec.ts](../../apps/dms-material-e2e/src/account-summary.spec.ts) as the primary reference surface for the affected flow.
  - [ ] Open an account summary screen, observe the network after the page settles, and confirm the screen no longer loops on `/api/summary`, `/api/summary/graph`, `/api/summary/months`, or `/api/summary/years` while idle.
  - [ ] Change the month once and the year once and confirm only the expected bounded follow-up requests occur.
  - [ ] If shared base logic changed, smoke-check [apps/dms-material-e2e/src/global-summary.spec.ts](../../apps/dms-material-e2e/src/global-summary.spec.ts) so global summary did not regress.

- [ ] **Task 6 — Run the quality gate and record the final request choreography** (AC: #5)
  - [ ] Run `pnpm all`.
  - [ ] Record the final request sequence and any residual risk in Completion Notes so Story 116.3 can build durable regression coverage on the proven behavior.

## Dev Notes

### Dependency Gate

- Story 116.1 is the design handoff for this implementation story. Start there. If implementation evidence disproves the current working hypothesis, document the exact trigger before broadening the change.
- The problem is currently framed as a client orchestration defect. Do not move logic into the backend or add new routes for this story.

### Current Request Choreography

- In account mode, `SummaryViewComponent` calls `setupAccountWatcher()` from the constructor. The watcher reads `selectCurrentAccountId()` and calls `fetchAccountData()` whenever the emitted value is non-empty.
- `fetchAccountData()` currently sets `lastFetchedMonth` / `lastFetchedYear`, writes both selector values with `emitEvent: false`, disables both selectors, then issues four requests: `fetchSummary()`, `fetchGraph()`, `fetchMonths()`, and `fetchYears()`.
- `SummaryViewBase` has two effects that mutate form controls when month/year option signals change. The month effect already documents a historical infinite-loop path caused by `fetchMonths -> setValue -> valueChanges -> fetchSummary`.
- In global mode, `initGlobalMode()` issues startup `fetchMonths()`, `fetchYears()`, `fetchGraph()`, and `fetchSummary()` calls, then wires month/year subscriptions. This path is not the primary defect surface and should be preserved unless shared helpers require a surgical change.

### Likely Root-Cause Boundaries

- `setupAccountWatcher()` currently has no same-account guard. If `selectCurrentAccountId()` recomputes to the same visible account, the component can rerun the full bootstrap sequence.
- The startup path currently chooses a month before account-specific month options are loaded. If the fetched month list resolves to a different first selectable month, the base auto-select effect can trigger a second summary/graph refresh during bootstrap.
- `SummaryService.summaryRequestSeq` ignores stale responses, but it does not prevent duplicate request issuance. That makes it a safety net, not the primary fix location.
- Account-specific month fetches are not cached; year changes legitimately call `fetchMonths(accountId, year)`. Preserve that behavior while preventing uncontrolled repeats.

### Recommended Implementation Shape

- Keep `SummaryViewBase` as the owner of shared form-control wiring. If bootstrap emissions need suppression, do it surgically with explicit bootstrap state or guarded writes rather than by removing the shared effects entirely.
- Separate "bootstrap account resolved" from "user changed selector" behavior in `SummaryViewComponent`. A clear, explicit bootstrap boundary is preferable to more ad hoc `lastFetched*` comparisons alone.
- Prefer a single canonical initial month path: either choose the effective initial month before fetching summary or ensure that month-option hydration cannot trigger a second bootstrap summary for the same screen-open event.
- Treat global summary as a preservation surface. Do not let account-specific guards accidentally suppress real global month/year refreshes.
- Avoid expanding `SummaryService` into a deduplication state machine unless focused tests prove the component-only fix is insufficient.

### Likely File Touch List

- **Primary UPDATE targets:**
  - `apps/dms-material/src/app/shared/components/summary-view/summary-view.ts`
  - `apps/dms-material/src/app/shared/components/summary-view/summary-view.base.ts`
  - `apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts`
- **Conditional UPDATE targets only if the chosen fix requires them:**
  - `apps/dms-material/src/app/global/services/summary.service.ts`
  - `apps/dms-material/src/app/global/services/summary.service.spec.ts`
  - `apps/dms-material/src/app/global/global-summary.spec.ts`
- **UI verification surfaces:**
  - `apps/dms-material-e2e/src/account-summary.spec.ts`
  - `apps/dms-material-e2e/src/global-summary.spec.ts`
- **Prefer not to change unless a focused proof requires it:**
  - `apps/dms-material/src/app/store/current-account/current-account.signal-store.ts`
  - `apps/dms-material/src/app/app.routes.ts`

### Testing Guidance

- Use `HttpTestingController.match()` in account-summary unit tests to assert bounded request counts instead of only checking that one request exists.
- Cover the exact boundaries that matter for this story: initial open, repeated same-account emission, one month change, and one year change.
- If the fix remains fully component-local, keep `SummaryService` tests narrowly focused on any service behavior that actually changed.
- Story 116.3 owns the durable regression suite. Story 116.2 should add only the focused automated coverage needed to prove the implementation seam is correct.

### Previous Story Intelligence

- Story 116.1 identified two concrete candidates: repeated account bootstrap via `selectCurrentAccountId()` and feedback from month auto-selection after `fetchMonths()` updates.
- Story 116.1 also confirmed that existing tests cover rendering and selector interactions, but they do not currently prove the screen settles after initial load.
- The previous story flagged the exact implementation surfaces already visible in the code: `summary-view.ts`, `summary-view.base.ts`, and only conditionally `summary.service.ts`.

### Project Context References

- [_bmad-output/project-context.md](../project-context.md) confirms Angular 21 standalone zoneless patterns, `inject()`, `ChangeDetectionStrategy.OnPush`, signal-first state, Vitest, and Playwright.
- [_bmad-output/planning-artifacts/architecture.md](../planning-artifacts/architecture.md) confirms the current Angular/Fastify/Prisma stack, the existing route architecture, and the expectation that this epic set does not introduce new backend routes or schema changes.
- [apps/dms-material/src/app/app.routes.ts](../../apps/dms-material/src/app/app.routes.ts) confirms the route-mode split between `/global/summary` and the default account summary child route with `data: { mode: 'account' }`.

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-30.md](../planning-artifacts/epics-2026-05-30.md)
- Story metadata: [_bmad-output/planning-artifacts/story-meta/2026-05-30/116-2-implement-stable-summary-loading.yaml](../planning-artifacts/story-meta/2026-05-30/116-2-implement-stable-summary-loading.yaml)
- Previous story: [_bmad-output/implementation-artifacts/116-1-investigate-summary-reload-loop.md](./116-1-investigate-summary-reload-loop.md)
- Summary view component: [apps/dms-material/src/app/shared/components/summary-view/summary-view.ts](../../apps/dms-material/src/app/shared/components/summary-view/summary-view.ts)
- Summary view base: [apps/dms-material/src/app/shared/components/summary-view/summary-view.base.ts](../../apps/dms-material/src/app/shared/components/summary-view/summary-view.base.ts)
- Summary service: [apps/dms-material/src/app/global/services/summary.service.ts](../../apps/dms-material/src/app/global/services/summary.service.ts)
- Current account store: [apps/dms-material/src/app/store/current-account/current-account.signal-store.ts](../../apps/dms-material/src/app/store/current-account/current-account.signal-store.ts)
- Routes: [apps/dms-material/src/app/app.routes.ts](../../apps/dms-material/src/app/app.routes.ts)
- Account summary unit tests: [apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts](../../apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts)
- Global summary unit tests: [apps/dms-material/src/app/global/global-summary.spec.ts](../../apps/dms-material/src/app/global/global-summary.spec.ts)
- Summary service tests: [apps/dms-material/src/app/global/services/summary.service.spec.ts](../../apps/dms-material/src/app/global/services/summary.service.spec.ts)
- Account summary E2E: [apps/dms-material-e2e/src/account-summary.spec.ts](../../apps/dms-material-e2e/src/account-summary.spec.ts)
- Global summary E2E: [apps/dms-material-e2e/src/global-summary.spec.ts](../../apps/dms-material-e2e/src/global-summary.spec.ts)

## Definition of Done

- [ ] Account Summary initial load settles after one bounded bootstrap sequence with no continuous reload loop
- [ ] Legitimate account, month, and year refresh flows still work correctly
- [ ] Focused automated coverage exists for the changed implementation seam
- [ ] Playwright MCP verification confirms the affected summary screen remains stable after open and after valid selector changes
- [ ] `pnpm all` passes

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- To be filled by dev agent during implementation.

### Completion Notes List

- To be filled by dev agent during implementation.

### File List

- To be filled by dev agent during implementation.
