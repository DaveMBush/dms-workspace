# Story 113.3: Tests for Universe Sort State Persistence

Status: Approved

**Story Key:** `113-3-tests-universe-sort-persistence`
**Epic:** 113 — Fix Universe Sticky Sort State Loss
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-27.md](../planning-artifacts/epics-2026-05-27.md) (Story 113.3)
**Type:** Testing / Regression suite
**Depends on:** Story 113.2
**Enables:** nothing (final story in Epic 113)
**Requirements covered:** R5, R6

## Story

As a developer,
I want E2E tests that apply a sort to the Universe screen, perform each of the six state-threatening interactions, and assert the sort state survived,
So that any future change that reintroduces the sort state loss fails CI immediately.

## Epic Context

Story 113.2 fixed the sort state persistence. This story locks in that fix by adding a Playwright E2E regression suite that exercises all six state-threatening interactions and asserts the sort indicators after each, running on both Chromium and Firefox as part of `pnpm all`.

## Acceptance Criteria

1. **AC1 — E2E test covers all six interactions with sort indicator assertions.** (R5, R6)
   **Given** a Playwright E2E test that applies a multi-column sort to the Universe screen,
   **When** the test performs (a) row edit, (b) row add, (c) row delete, (d) account filter change, (e) navigate away and back, (f) page reload in sequence,
   **Then** after each interaction the test asserts the sort indicators in the column headers still reflect the prior sort state.

2. **AC2 — Chromium and Firefox.**
   **Given** the tests run on both Chromium and Firefox,
   **When** the suite executes,
   **Then** all assertions pass on both browsers.

3. **AC3 — Suite in `pnpm all`, not skipped.**
   **Given** the suite is committed,
   **When** CI runs,
   **Then** the suite is part of `pnpm all` and contains no `.skip` or `.only` annotations.

## Tasks / Subtasks

- [ ] **Task 1 — Create the regression test file** (AC: #1)
  - [ ] Create a new Playwright spec file in
        `apps/dms-material-e2e/src/` following existing naming conventions (e.g.
        `universe-sort-persistence.spec.ts`).
  - [ ] Add a `beforeEach` that logs in (if needed), navigates to the Universe screen, and applies a known multi-column sort (e.g. primary sort Symbol ascending, secondary sort Last Price descending). Record the expected sort-indicator state.

- [ ] **Task 2 — Test (a): sort survives row edit** (AC: #1)
  - [ ] Edit a cell value on an existing row (e.g. change the Risk Group).
  - [ ] Assert the sort indicator(s) on the column header(s) match the pre-edit sort state.

- [ ] **Task 3 — Test (b): sort survives row add** (AC: #1)
  - [ ] Add a new symbol row via the Universe add flow.
  - [ ] Assert sort indicators are unchanged.

- [ ] **Task 4 — Test (c): sort survives row delete** (AC: #1)
  - [ ] Delete a row.
  - [ ] Assert sort indicators are unchanged.

- [ ] **Task 5 — Test (d): sort survives account filter change** (AC: #1)
  - [ ] Change the account filter (e.g. select a specific account, then switch back to All Accounts).
  - [ ] Assert sort indicators are unchanged after each filter switch.

- [ ] **Task 6 — Test (e): sort survives navigate away and back** (AC: #1)
  - [ ] Navigate to another screen (e.g. Open Positions).
  - [ ] Navigate back to the Universe screen.
  - [ ] Assert sort indicators match the pre-navigation sort state.

- [ ] **Task 7 — Test (f): sort survives page reload** (AC: #1)
  - [ ] Reload the page.
  - [ ] Assert sort indicators are restored from persistent storage to the pre-reload sort state.

- [ ] **Task 8 — Run on both browsers** (AC: #2)
  - [ ] Run `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox` targeting the new spec file. Fix any failures before proceeding.

- [ ] **Task 9 — Quality gate** (AC: #3)
  - [ ] Confirm the new spec contains no `.skip` or `.only` annotations.
  - [ ] Run `pnpm all` and confirm all tests pass.
