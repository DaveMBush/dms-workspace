# Story 109.3: Tests for Universe Expired-No-Open Filter

Status: Approved

**Story Key:** `109-3-tests-universe-expired-filter`
**Epic:** 109 — Filter Expired Symbols With No Open Positions from Universe Screen
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-23.md](../planning-artifacts/epics-2026-05-23.md) (Story 109.3)
**Type:** Test
**Depends on:** Story 109.2 (the filter implementation must be in place)
**Enables:** none
**Requirements covered:** R1, R2, R3

## Story

As a developer,
I want server-level tests for the Universe endpoint's expired-no-open filter and an E2E test that confirms the rendered Universe screen excludes the right rows,
So that any future change that breaks this filter is caught before it ships.

## Epic Context

**Epic 109 Goal:** Server-side filter drops expired-no-open symbols. Stories 109.1
(diagnose) and 109.2 (implement) close the user-facing change. **This story (109.3)
locks in regression coverage** with both unit-level server tests and a
cross-browser Playwright E2E test.

Hard constraints inherited from the epic:

- Tests must not be `.skip` / `xit`. `scripts/check-no-skipped-tests.sh` runs as
  part of `pnpm all` and will fail the gate.
- Tests must pass on both Chromium and Firefox.

## Acceptance Criteria

1. **AC1 — Server-level test covers the four seed permutations.**
   **Given** the server-level test for the Universe `get-all-universes` route,
   **When** the test seeds (a) an expired symbol with no open trades, (b) an
   expired symbol with one open trade, (c) a non-expired symbol with no open trades,
   (d) a non-expired symbol with one open trade,
   **Then** the test asserts the response contains exactly (b), (c), and (d) — and
   not (a).

2. **AC2 — E2E test asserts rendered rows match server expectation.**
   **Given** the Playwright E2E test for the Universe screen,
   **When** the test seeds the same four conditions and loads the Universe screen,
   **Then** the test asserts the visible row set matches the server-level
   expectation: rows (b), (c), (d) visible, row (a) absent.

3. **AC3 — Tests pass on both browsers.**
   **Given** the new tests are committed,
   **When** `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox`
   run,
   **Then** both pass.

4. **AC4 — Tests are not skipped and are part of `pnpm all`.**
   **Given** `pnpm all` runs,
   **Then** the new tests pass and are not skipped (no `.skip`, `xit`, or
   `test.skip(<unconditional-true>, …)` literals).

## Tasks / Subtasks

- [ ] **Task 1 — Add server-level test for the four permutations** (AC: #1)
  - [ ] Add a Vitest spec under
        [apps/server/src/app/routes/universe/get-all-universes/](../../apps/server/src/app/routes/universe/get-all-universes/)
        (e.g. `index.spec.ts` if it does not already exist, otherwise extend the
        existing
        [apps/server/src/app/routes/universe/index.spec.ts](../../apps/server/src/app/routes/universe/index.spec.ts)).
  - [ ] Seed the test database with four `universe` rows. For each row create the
        associated `trades` rows: zero trades, or one open trade
        (`sell_date: null`).
  - [ ] Call the route handler (Fastify `inject` or direct handler call — match
        the pattern used in nearby specs).
  - [ ] Assert the response body contains the three expected rows by `symbol` and
        excludes the expired-no-open row.

- [ ] **Task 2 — Add E2E test for the rendered Universe screen** (AC: #2, #3)
  - [ ] Add a Playwright spec under
        [apps/dms-material-e2e/src/](../../apps/dms-material-e2e/src/) (follow the
        naming convention used by existing specs there).
  - [ ] Use the existing test-database seeding mechanism (look at how peer specs
        seed deterministic data — typically a helper in the e2e app's `support/`
        or a pre-test fixture).
  - [ ] Seed the same four conditions used in Task 1.
  - [ ] Navigate to the Universe screen, wait for the row data to render, and
        assert by `[data-testid]` selector (the Universe rows already expose
        `data-testid="delete-symbol-${i}"` for the delete buttons — use a similar
        per-row identifier; if none exists, assert by visible cell text on
        `symbol`).
  - [ ] Run on both `chromium` and `firefox` projects (Playwright's project
        matrix). Confirm both pass.

- [ ] **Task 3 — Confirm tests are not skipped** (AC: #4)
  - [ ] Run `bash scripts/check-no-skipped-tests.sh` and confirm green.
  - [ ] Inspect the new specs for any `.skip` / `xit` / unconditional
        `test.skip(true, …)` — none allowed.

- [ ] **Task 4 — Quality gate** (AC: #3, #4)
  - [ ] Run `pnpm e2e:dms-material:chromium`. Record result.
  - [ ] Run `pnpm e2e:dms-material:firefox`. Record result.
  - [ ] Run `pnpm all` and confirm green. Record result.

## Dev Notes

### Architecture & Code Pointers

- **Server test file location:**
  [apps/server/src/app/routes/universe/get-all-universes/](../../apps/server/src/app/routes/universe/get-all-universes/)
  and [apps/server/src/app/routes/universe/index.spec.ts](../../apps/server/src/app/routes/universe/index.spec.ts).
  Follow the pattern of the existing peer specs (sibling files ending in
  `.spec.ts`).
- **E2E test location:** [apps/dms-material-e2e/src/](../../apps/dms-material-e2e/src/).
- **Universe row DTO:** [apps/server/src/app/routes/universe/universe.interface.ts](../../apps/server/src/app/routes/universe/universe.interface.ts).
- **Seed primitives:** check existing `prisma`/test-setup helpers used by peer
  specs in the server app (do not invent a new seeding mechanism — reuse the
  existing one).

### Test Data Design

The four canonical permutations:

| Case | Symbol  | `expired` | open trades count | Expected on Universe |
|------|---------|-----------|--------------------|----------------------|
| (a)  | EXPIRED_NO_OPEN | `true`  | 0 | **Absent** |
| (b)  | EXPIRED_WITH_OPEN | `true`  | 1 | Present |
| (c)  | ACTIVE_NO_OPEN | `false` | 0 | Present |
| (d)  | ACTIVE_WITH_OPEN | `false` | 1 | Present |

Use distinct symbol strings so assertions are unambiguous.

### Testing Standards

- Tests **must not** be `.skip` or use `test.skip(true, …)`. Conditional
  `test.skip(condition, reason)` is allowed only when the condition is
  legitimately environmental (not the case here).
- E2E tests must pass on both Chromium and Firefox (`projects` matrix in
  Playwright config).
- Vitest + Angular unit + Playwright all run under `pnpm all`. No green CI ⇒ no
  merge.
- Do not weaken assertions (NFR5).

### Project Structure Notes

- Repo memory: [/memories/repo/e2e-timing.md](../../../memories/repo/e2e-timing.md)
  for any cross-browser timing gotchas.
- Project conventions per [_bmad-output/project-context.md](../project-context.md).

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-23.md](../planning-artifacts/epics-2026-05-23.md) — Story 109.3 section
- Story 109.2 implementation: [109-2-implement-universe-expired-filter.md](./109-2-implement-universe-expired-filter.md)
- Server route: [apps/server/src/app/routes/universe/get-all-universes/index.ts](../../apps/server/src/app/routes/universe/get-all-universes/index.ts)
- Existing server spec: [apps/server/src/app/routes/universe/index.spec.ts](../../apps/server/src/app/routes/universe/index.spec.ts)
- E2E app: [apps/dms-material-e2e/](../../apps/dms-material-e2e/)
- Skipped-test guard: [scripts/check-no-skipped-tests.sh](../../scripts/check-no-skipped-tests.sh)

## Definition of Done

- [ ] Server-level test covers all four seed permutations
- [ ] E2E test asserts rendered rows match expected
- [ ] Tests pass on both Chromium and Firefox
- [ ] Tests not skipped; included in `pnpm all`
- [ ] `pnpm all` passes

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent._

### Debug Log References

_To be filled by dev agent._

### Completion Notes List

_To be filled by dev agent._

### File List

_To be filled by dev agent._
