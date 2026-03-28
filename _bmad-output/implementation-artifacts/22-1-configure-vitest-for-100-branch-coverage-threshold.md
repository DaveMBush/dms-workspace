# Story 22.1: Configure Vitest for 100% Branch Coverage Threshold

Status: Approved

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

- [ ] `vitest.config.ts` `thresholds.global.branches` updated from `0` to `100`
- [ ] All per-project vitest configs audited (`apps/dms-material/`, `apps/server/`)
- [ ] `pnpm all` script updated to always include `--coverage` or equivalent Nx target config
- [ ] Running `pnpm all` collects coverage on every execution
- [ ] `pnpm all` passes (story 22.2 will fix failures caused by coverage gaps)

## Tasks / Subtasks

- [ ] Update root `vitest.config.ts` branch threshold (AC: 1)
  - [ ] Open `vitest.config.ts`
  - [ ] Change `thresholds.global.branches` from `0` to `100`
  - [ ] Change `thresholds.global.functions`, `lines`, `statements` to `100` as well (align all thresholds)
- [ ] Audit per-project vitest configs (AC: 2)
  - [ ] Search for `vitest.config.ts` files under `apps/`
  - [ ] If any exist with their own threshold overrides, update to 100 or remove (defer to root)
  - [ ] Check `vitest.workspace.ts` to understand how projects are registered
- [ ] Update `pnpm all` script to always run coverage (AC: 3)
  - [ ] Open `package.json`
  - [ ] Update the `all` script: `nx affected -t lint build test --parallel=16` → ensure the `test` target in each `project.json` includes `--coverage` flag OR add a separate `coverage` target to the `all` chain
  - [ ] Preferred approach: add `"coverage": "nx affected -t test --coverage --parallel=16"` and update `all` to run it, OR set `--coverage` in each project's test target in `project.json`
  - [ ] Check `apps/dms-material/project.json` and `apps/server/project.json` test target configurations to understand the right place to add `--coverage`
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

_to be filled on implementation_

### Debug Log References

### Completion Notes List

### File List
