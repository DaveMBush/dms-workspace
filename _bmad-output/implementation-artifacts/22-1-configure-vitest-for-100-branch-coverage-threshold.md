# Story 22.1: Configure Vitest for 100% Branch Coverage Threshold

Status: Review

## Story

As a developer,
I want the Vitest coverage configuration to enforce 100% branch coverage,
So that any future code that is not fully covered by tests causes CI to fail.

## Acceptance Criteria

1. **Given** `vitest.config.ts` at the workspace root
   **When** I update the `thresholds.global.branches` value from `0` to `100`
   **Then** running `pnpm vitest run --coverage` exits with a non-zero status if any source file has branch coverage below 100%.

2. **Given** any per-project `vitest.config.ts` files under `apps/` exist
   **When** I audit them
   **Then** they are updated to be consistent with the root threshold or explicitly defer to the root config.

3. **Given** the threshold change is in place
   **When** the `all` script runs
   **Then** `--coverage` is always included so coverage is enforced on every test run (not opt-in).

## Definition of Done

- [x] `vitest.config.ts` `thresholds.global.branches` updated from `0` to `100`
- [x] All per-project vitest configs audited (`apps/dms-material/`, `apps/server/`)
- [x] `pnpm all` script updated to always include `--coverage` or equivalent Nx target config
- [x] Running `pnpm all` collects coverage on every execution
- [ ] `pnpm all` passes (story 22.2 will fix failures caused by coverage gaps)

## Tasks / Subtasks

- [x] Update root `vitest.config.ts` branch threshold (AC: 1)
  - [x] Open `vitest.config.ts`
  - [x] Change `thresholds.global.branches` from `0` to `100`
  - [x] Change `thresholds.global.functions`, `lines`, `statements` to `100` as well (align all thresholds)
- [x] Audit per-project vitest configs (AC: 2)
  - [x] Search for `vitest.config.ts` files under `apps/`
  - [x] If any exist with their own threshold overrides, update to 100 or remove (defer to root)
  - [x] Check `vitest.workspace.ts` to understand how projects are registered
- [x] Update `pnpm all` script to always run coverage (AC: 3)
  - [x] Open `package.json`
  - [x] Update the `all` script: split lint/build from test, add `--coverage` to test target
  - [x] Approach: split `all` into `nx affected -t lint build --parallel=16 && nx affected -t test --coverage --parallel=16`
  - [x] Check `apps/dms-material/project.json` and `apps/server/project.json` test target configurations
- [ ] Verify script change works (AC: 3)
  - [ ] Run `pnpm all` — it should now collect coverage

## Dev Notes

### Key Files

- `vitest.config.ts` — root Vitest config, `test.coverage.thresholds.global.branches` currently at `0` [Source: vitest.config.ts#L12]
- `vitest.workspace.ts` — workspace per-project registrations [Source: vitest.workspace.ts]
- `package.json` — `all` script currently: `nx affected -t lint build test --parallel=16` [Source: package.json#L11]
- `@vitest/coverage-v8` is already installed at version `4.0.9` [Source: package.json#L118]

### Current Threshold Config (for reference)

```typescript
thresholds: {
  global: {
    branches: 0,   // ← change to 100
    functions: 0,  // ← change to 100
    lines: 0,      // ← change to 100
    statements: 0, // ← change to 100
  },
},
```

### Coverage Exclude List (do not change)

The existing `exclude` list in `vitest.config.ts` (spec files, config files, etc.) must remain unchanged. Only the threshold values change.

### Important

Story 22.2 (which must be done after this story) will fix actual coverage gaps revealed by the threshold change. This story's job is only to configure the gate — it is expected that `pnpm all` may fail on the coverage check until story 22.2 is complete.

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-03-27.md#FR22] FR22, NFR-22-Quality
- [Source: vitest.config.ts] Current coverage config
- [Source: package.json#L11] `all` script

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- Updated root `vitest.config.ts` thresholds from 0 to 100 for branches, functions, lines, statements
- Audited `apps/server/vitest.config.ts` — has no threshold overrides, defers to root config (no change needed)
- No `vitest.config.ts` found under `apps/dms-material/` — uses root config via Nx executor
- `vitest.workspace.ts` only registers `apps/server/vitest.config.ts`
- Updated `all` script: split lint/build from test to add `--coverage` flag to test runs
- Coverage threshold failures expected until story 22.2 fixes gaps

### File List

- `vitest.config.ts` — changed thresholds from 0 to 100
- `package.json` — updated `all` script to enforce coverage
- `_bmad-output/implementation-artifacts/22-1-configure-vitest-for-100-branch-coverage-threshold.md` — story file updates

### Change Log

| File               | Change                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vitest.config.ts` | `thresholds.global.{branches,functions,lines,statements}`: `0` → `100`                                                                                   |
| `package.json`     | `all` script: `nx affected -t lint build test --parallel=16` → `nx affected -t lint build --parallel=16 && nx affected -t test --coverage --parallel=16` |
