# Story 116.3: Add Regression Tests for Stable Summary Loading

Status: Approved

**Story Key:** `116-3-summary-load-stability-regression-tests`
**Epic:** 116 - Stop Continuous Reloading on Account Summary Screens
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-30.md](../planning-artifacts/epics-2026-05-30.md) (Epic 116 / Story 116.3)
**Story Meta:** [_bmad-output/planning-artifacts/story-meta/2026-05-30/116-3-summary-load-stability-regression-tests.yaml](../planning-artifacts/story-meta/2026-05-30/116-3-summary-load-stability-regression-tests.yaml)
**Source Story Title in Epic File:** `Regression Coverage for Summary Load Stability and Legitimate Refreshes`
**Authoritative Title for This Artifact:** `Add Regression Tests for Stable Summary Loading`
**Type:** Testing / Regression suite
**Depends on:** Story 116.2
**Enables:** nothing (final story in Epic 116)
**Requirements covered:** R7, R8

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want automated regression coverage for stable summary loading and legitimate refreshes,
So that future reactive changes cannot reintroduce the reload loop.

## Epic Context

Story 116.1 isolated the likely reload-loop boundaries to the account-mode watcher and the
selector-hydration path in the shared summary view. Story 116.2 is the implementation handoff
that should make startup deterministic and keep selector-driven refreshes bounded. Story 116.3
must lock that behavior in with regression coverage that proves both the request choreography and
the visible UI stability.

The primary defect surface remains account mode. Global summary is a preservation surface and
should only gain new regression assertions where shared `summary-view` or `summary-view.base`
behavior makes that necessary. Existing unit and E2E summary tests already cover rendering,
selector visibility, and basic interaction flows, but they do not yet enforce an idle "load once
then settle" contract or cross-browser proof that legitimate follow-up requests remain bounded.

## Acceptance Criteria

1. **AC1 - Account summary startup settles after one bounded bootstrap sequence.** (R7)
   **Given** automated regression coverage for the account summary screen,
   **When** the screen opens for a resolved account,
   **Then** the tests assert one bounded bootstrap request sequence and prove the screen does not
   continue issuing repeated `/api/summary`, `/api/summary/graph`, `/api/summary/months`, or
   `/api/summary/years` requests while idle.

2. **AC2 - Legitimate refresh paths remain bounded and correct.** (R8)
   **Given** a legitimate state change such as a month change, year change, or a repeated
   same-account emission,
   **When** the automated tests exercise that path,
   **Then** only the intended follow-up requests run and the screen remains stable.

3. **AC3 - Browser-level regression coverage proves the loop stays gone.** (R7, R8)
   **Given** browser-level regression coverage for summary loading,
   **When** Chromium and Firefox runs execute,
   **Then** the account summary screen stays visually stable after initial load and after one
   valid month/year refresh path, with no continuous repaint/reload behavior.

4. **AC4 - Coverage is part of the normal quality gate.**
   **Given** the regression suite is committed,
   **When** `pnpm all`, `pnpm e2e:dms-material:chromium`, and `pnpm e2e:dms-material:firefox`
   run,
   **Then** the new coverage is included, not skipped, and passes.

## Tasks / Subtasks

- [ ] **Task 1 - Re-read the implementation handoff and current regression surfaces before editing tests** (AC: #1, #2, #3)
  - [ ] Read [_bmad-output/implementation-artifacts/116-2-implement-stable-summary-loading.md](./116-2-implement-stable-summary-loading.md) completely before editing test code.
  - [ ] Read [apps/dms-material/src/app/shared/components/summary-view/summary-view.ts](../../apps/dms-material/src/app/shared/components/summary-view/summary-view.ts), [apps/dms-material/src/app/shared/components/summary-view/summary-view.base.ts](../../apps/dms-material/src/app/shared/components/summary-view/summary-view.base.ts), and [apps/dms-material/src/app/global/services/summary.service.ts](../../apps/dms-material/src/app/global/services/summary.service.ts) in full so the regression assertions match the real request choreography.
  - [ ] Read [apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts](../../apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts), [apps/dms-material/src/app/global/global-summary.spec.ts](../../apps/dms-material/src/app/global/global-summary.spec.ts), [apps/dms-material/src/app/global/services/summary.service.spec.ts](../../apps/dms-material/src/app/global/services/summary.service.spec.ts), [apps/dms-material-e2e/src/account-summary.spec.ts](../../apps/dms-material-e2e/src/account-summary.spec.ts), and [apps/dms-material-e2e/src/global-summary.spec.ts](../../apps/dms-material-e2e/src/global-summary.spec.ts) in full.
  - [ ] Document which assertions already cover Story 116.3 and which gaps remain around idle stabilization, same-account re-emission, and bounded month/year refreshes.

- [ ] **Task 2 - Extend focused component/integration coverage for bounded summary behavior** (AC: #1, #2)
  - [ ] Extend [apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts](../../apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts) to assert the initial account-summary bootstrap sequence stays bounded after the screen opens.
  - [ ] Add a focused regression that repeated same-account emissions do not retrigger the full bootstrap request burst.
  - [ ] Add focused request-count assertions for one month change and one year change so the expected summary, graph, month, and year requests fire exactly once per legitimate interaction.
  - [ ] If shared summary-view logic makes global mode part of the regression surface, extend [apps/dms-material/src/app/global/global-summary.spec.ts](../../apps/dms-material/src/app/global/global-summary.spec.ts) with a narrow preservation test that global summary still loads and responds to one valid month/year change without looping.
  - [ ] Extend [apps/dms-material/src/app/global/services/summary.service.spec.ts](../../apps/dms-material/src/app/global/services/summary.service.spec.ts) only if Story 116.2 changes service-level orchestration that must be guarded separately from the component seam.

- [ ] **Task 3 - Add browser-level regression coverage for idle stability and legitimate refreshes** (AC: #1, #2, #3)
  - [ ] Prefer a dedicated Playwright spec such as `apps/dms-material-e2e/src/summary-load-stability-regression.spec.ts` so request-count instrumentation stays isolated from the broad smoke coverage already in the account/global summary specs.
  - [ ] Reuse [apps/dms-material-e2e/src/helpers/login.helper.ts](../../apps/dms-material-e2e/src/helpers/login.helper.ts) and add a named helper under `apps/dms-material-e2e/src/helpers/` if request counting or idle-settle polling must be shared across scenarios.
  - [ ] In the account-summary scenario, assert that initial open reaches a settled state and does not continue issuing repeated summary requests during an explicit observation window after the UI is already visible.
  - [ ] Trigger one month change and one year change and assert only the expected follow-up requests occur while the screen remains usable and visually stable.
  - [ ] Add a narrow global-summary preservation scenario only if the shared implementation from Story 116.2 or the shared E2E helper makes global mode part of the same regression risk.

- [ ] **Task 4 - Preserve test reliability and skip governance** (AC: #3, #4)
  - [ ] Do not add `.skip`, `.only`, or unconditional `test.skip(...)` / `describe.skip(...)` for the new regression coverage.
  - [ ] Do not use `waitForLoadState('networkidle')` for the new load-stability assertions; use explicit request counters, named helpers, and `expect.poll()` or equivalent deterministic waits instead.
  - [ ] Use `route.fulfill(...)` for controlled server responses rather than `route.abort('failed')`.
  - [ ] Avoid changing production summary code or adding new production selectors unless the regression truly cannot be expressed with the current test surfaces.

- [ ] **Task 5 - Run the full quality gate** (AC: #4)
  - [ ] Run `pnpm all`.
  - [ ] Run `pnpm e2e:dms-material:chromium`.
  - [ ] Run `pnpm e2e:dms-material:firefox`.

## Dev Notes

### Current Regression Surface

- [apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts](../../apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts) already covers rendering, selector enable/disable behavior, graph/month/year fetches, and error recovery, but it does not yet lock in the full "open once, settle once" contract or same-account re-emission protection.
- [apps/dms-material-e2e/src/account-summary.spec.ts](../../apps/dms-material-e2e/src/account-summary.spec.ts) and [apps/dms-material-e2e/src/global-summary.spec.ts](../../apps/dms-material-e2e/src/global-summary.spec.ts) cover navigation, visible rendering, and selector interactions, but they do not currently count repeated summary requests during an idle post-load window.
- [apps/dms-material/src/app/global/services/summary.service.spec.ts](../../apps/dms-material/src/app/global/services/summary.service.spec.ts) already covers stale-response suppression via `summaryRequestSeq`; that protects against stale writes, not duplicate request issuance.

### Expected Stable Request Choreography

- Account-summary open should perform one bounded bootstrap sequence: one summary request, one graph request, one account-months request, and one years request, then settle with no repeated summary-related requests while idle.
- A repeated emission of the same visible account ID should not trigger a second bootstrap burst.
- A month change should trigger one summary refresh and one graph refresh.
- A year change should trigger one account-months refresh and one graph refresh, with a downstream summary refresh only if the selected month truly changes.
- Global summary is a preservation surface. If shared logic changes affect it, add a narrow regression that proves it still loads once and responds correctly to legitimate month/year changes.

### Recommended Test Shape

- Keep the component-level request-count assertions in [apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts](../../apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts), where `HttpTestingController.match()` can prove bounded request counts deterministically.
- Prefer a dedicated Playwright regression spec for summary-load stability instead of burying request-count instrumentation inside the existing broad smoke suites.
- If browser-side request instrumentation needs reuse across account and global scenarios, extract a named helper under `apps/dms-material-e2e/src/helpers/` rather than copying `page.route(...)` counters or polling logic.

### Non-Negotiable Guardrails

- Tests are authoritative in this repo. Do not weaken assertions just to get green runs.
- Avoid production changes for this story unless the regression cannot be expressed with the current selectors and request surfaces.
- New E2E regression code should avoid `waitForLoadState('networkidle')` for the stability assertions; it is explicitly discouraged in project context.
- Use `route.fulfill(...)` for deterministic server control and `expect.poll()` or explicit polling for idle stabilization checks.

### Validation and Runtime Notes

- Use `http://localhost:4301`, not `http://127.0.0.1:4301`, for manual or MCP verification.
- Full browser runs are long in this repo: Chromium is roughly 22 minutes, and Firefox can run beyond 30 minutes.
- If Prisma-generated types are missing in a worktree, run `npx prisma generate` before lint or E2E.
- If Nx cache behavior becomes suspect after a failure, `pnpm nx reset` is the recovery path before retrying the long E2E runs.

### Likely File Touch List

- **Primary unit UPDATE target:** [apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts](../../apps/dms-material/src/app/shared/components/summary-view/summary-view-account.spec.ts)
- **Primary E2E ADD target:** `apps/dms-material-e2e/src/summary-load-stability-regression.spec.ts`
- **Supporting conditional UPDATE targets:** [apps/dms-material/src/app/global/global-summary.spec.ts](../../apps/dms-material/src/app/global/global-summary.spec.ts), [apps/dms-material/src/app/global/services/summary.service.spec.ts](../../apps/dms-material/src/app/global/services/summary.service.spec.ts), and a helper under `apps/dms-material-e2e/src/helpers/`
- **Read-first preservation surfaces:** [apps/dms-material/src/app/shared/components/summary-view/summary-view.ts](../../apps/dms-material/src/app/shared/components/summary-view/summary-view.ts), [apps/dms-material/src/app/shared/components/summary-view/summary-view.base.ts](../../apps/dms-material/src/app/shared/components/summary-view/summary-view.base.ts), [apps/dms-material/src/app/global/services/summary.service.ts](../../apps/dms-material/src/app/global/services/summary.service.ts), [apps/dms-material/src/app/store/current-account/current-account.signal-store.ts](../../apps/dms-material/src/app/store/current-account/current-account.signal-store.ts), and [apps/dms-material/src/app/app.routes.ts](../../apps/dms-material/src/app/app.routes.ts)

### Project Structure Notes

- Keep the primary implementation seam in the existing account-summary unit spec rather than scattering request-count unit coverage across multiple spec files.
- Keep Playwright regression coverage under `apps/dms-material-e2e/src/`; any extracted shared utilities belong under `apps/dms-material-e2e/src/helpers/`.
- Preserve the current route-mode split between `/global/summary` and account-summary routes when naming or scoping the regression scenarios.

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-30.md](../planning-artifacts/epics-2026-05-30.md)
- Story metadata: [_bmad-output/planning-artifacts/story-meta/2026-05-30/116-3-summary-load-stability-regression-tests.yaml](../planning-artifacts/story-meta/2026-05-30/116-3-summary-load-stability-regression-tests.yaml)
- Previous story: [_bmad-output/implementation-artifacts/116-2-implement-stable-summary-loading.md](./116-2-implement-stable-summary-loading.md)
- Investigation handoff: [_bmad-output/implementation-artifacts/116-1-investigate-summary-reload-loop.md](./116-1-investigate-summary-reload-loop.md)
- Project context: [_bmad-output/project-context.md](../project-context.md)
- Architecture guardrails: [_bmad-output/planning-artifacts/architecture.md](../planning-artifacts/architecture.md)
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

- [ ] Account-summary startup regression coverage proves the screen settles after one bounded bootstrap sequence
- [ ] Legitimate month/year refresh paths are covered and remain bounded
- [ ] Chromium and Firefox browser runs include the summary-load stability assertions and pass
- [ ] New coverage is not skipped and remains part of the normal validation flow
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
