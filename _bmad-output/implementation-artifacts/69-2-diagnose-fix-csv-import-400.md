# Story 69.2: Diagnose and Fix the CSV Import 400 Regression

Status: Approved

## Story

As a user,
I want to import a Fidelity CSV without receiving a 400 Bad Request,
so that I can keep my transaction history up to date.

## Acceptance Criteria

1. **Given** the import handler in `apps/server/src/app/routes/import/index.ts` and the functions it calls (`fidelity-import-service.function.ts`, `fidelity-csv-parser.function.ts`), **When** the developer traces what changed between the pre-Epic-63 code and the current code, **Then** the root cause of the 400 is identified and documented in Dev Notes.

2. **Given** the identified root cause, **When** the fix is applied, **Then** the E2E test from Story 69.1 becomes green (remove `test.fail()` annotation).

3. **Given** the fix is applied, **When** the Playwright MCP server is used to import the fixture CSV via the UI, **Then** the import succeeds visually (success notification shown, no error dialog).

4. **Given** all existing import e2e tests (`fidelity-import.spec.ts`, `split-import-e2e.spec.ts`, etc.), **When** `pnpm all` runs, **Then** all previously passing tests continue to pass.

## Tasks / Subtasks

- [ ] **Task 1: Trace the import pipeline and identify the regression** (AC: #1)
  - [ ] Subtask 1.1: Read `apps/server/src/app/routes/import/index.ts` in full — understand the multipart/plain-text handling before `importFidelityTransactions` is called
  - [ ] Subtask 1.2: Read `apps/server/src/app/routes/import/fidelity-import-service.function.ts` — understand the complete processing pipeline
  - [ ] Subtask 1.3: Read `apps/server/src/app/routes/import/fidelity-csv-parser.function.ts` — check for any schema validation or column-name checks that may have changed
  - [ ] Subtask 1.4: Use `git log --oneline apps/server/src/app/routes/import/` to identify commits from Epics 63–66 that touched these files
  - [ ] Subtask 1.5: Use `git diff <pre-epic-63-sha> HEAD -- apps/server/src/app/routes/import/` to compare before/after — focus on middleware, body parsing configuration, and validation logic
  - [ ] Subtask 1.6: Document the exact file, line, and change that causes the 400 in Dev Notes

- [ ] **Task 2: Reproduce the 400 using the Playwright MCP server** (AC: #3)
  - [ ] Subtask 2.1: Use the Playwright MCP server to navigate to `/global/universe`
  - [ ] Subtask 2.2: Open the import dialog and upload `fidelity-regression-69.csv`
  - [ ] Subtask 2.3: Click upload and confirm the 400 response is observed in the network panel
  - [ ] Subtask 2.4: Note any console errors in the browser and server log output

- [ ] **Task 3: Apply the fix** (AC: #1, #2)
  - [ ] Subtask 3.1: Apply the minimum necessary change to fix the root cause (do not refactor unrelated code)
  - [ ] Subtask 3.2: Re-run the import via the Playwright MCP server and confirm the success notification appears
  - [ ] Subtask 3.3: Remove the `test.fail()` annotation from `csv-import-regression-69.spec.ts`

- [ ] **Task 4: Verify no regressions** (AC: #4)
  - [ ] Subtask 4.1: Run `pnpm all` and confirm all tests pass
  - [ ] Subtask 4.2: Specifically verify `fidelity-import.spec.ts`, `split-import-e2e.spec.ts`, `no-open-lots-split-order.spec.ts`, and `fidelity-split-multi-symbol.spec.ts` are still green

## Dev Notes

### Background

The server log shows `POST /api/import/fidelity` is received but no further log lines appear before the 400 is emitted. This symptoms profile — request arrives, handler throws synchronously — suggests the regression is likely in:

1. **Body parsing middleware** — Epics 63–66 may have added or reordered middleware in `apps/server/src/app/app.ts` or `apps/server/src/app/routes/index.ts` that now consumes or rejects the multipart body before the import handler sees it.
2. **Validation layer** — A new Zod or express-validator schema added in 63–66 may be rejecting the request body shape that the CSV upload sends.
3. **Content-type check** — A new strict content-type guard may be rejecting `multipart/form-data` or `text/csv` that the import dialog sends.

The investigation must read the current code and diff it against the pre-Epic-63 state rather than assuming the root cause.

### Key Files

| File | Purpose |
|------|---------|
| `apps/server/src/app/routes/import/index.ts` | Route handler for `POST /api/import/fidelity` |
| `apps/server/src/app/routes/import/fidelity-import-service.function.ts` | Orchestrator |
| `apps/server/src/app/routes/import/fidelity-csv-parser.function.ts` | CSV parser |
| `apps/server/src/app/app.ts` | Express app setup — check middleware order |
| `apps/server/src/app/routes/index.ts` | Route registration — check middleware applied to import route |
| `apps/dms-material-e2e/src/csv-import-regression-69.spec.ts` | Failing e2e test (Story 69.1) — remove `test.fail()` here |

### Notes on Diagnosis Approach

- The import route handler (line 158+ in `index.ts`) handles both multipart file upload and plain-text body. Check whether a new middleware in Epics 63–66 (e.g., `express.json()` applied globally before the multipart parser) is consuming the body stream before the import handler.
- Check `apps/server/src/app/routes/import/index.ts` for any new request schema validation (`z.object(...)`) that may have been added but has a mismatch with the actual request shape.
- The `importFidelityTransactions` function signature and return type may have changed — verify the call site in `index.ts` matches the current function signature.

### Project Structure Notes

- Server source: `apps/server/src/app/`
- Import route: `apps/server/src/app/routes/import/index.ts`
- `pnpm all` runs unit tests (`vitest`) + e2e tests (`playwright`) — both must pass

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-13.md - Epic 69 Story 69.2]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
