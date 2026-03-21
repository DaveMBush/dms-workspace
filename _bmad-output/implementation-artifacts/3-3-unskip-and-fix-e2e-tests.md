# Story 3.3: Unskip and Fix E2E Tests

Status: Approved

## Story

As a developer,
I want each skipped Playwright E2E test that is still relevant to be enabled and passing on both Chromium and Firefox,
so that E2E coverage is complete and reliable.

## Acceptance Criteria

1. All E2E tests classified `unskip-trivial` in the Story 3.1 inventory are enabled and pass on both browsers with no code changes.
2. All E2E tests classified `unskip-needs-fix` are enabled and pass on both browsers after the underlying issue is fixed.
3. `pnpm e2e:dms-material:chromium` passes after all unskips are applied.
4. `pnpm e2e:dms-material:firefox` passes after all unskips are applied.
5. No E2E test remains in a skipped state after this story.
6. Each unskip (and any associated fix) is committed individually.

## Tasks / Subtasks

- [ ] Read `_bmad-output/implementation-artifacts/skipped-tests-inventory.md` — obtain E2E unskip list (AC: 1, 2)
- [ ] Ensure the local dev server is running before executing E2E tests (AC: 3, 4)
  - [ ] Start the server: `./scripts/start-server-for-e2e.sh` (or equivalent)
- [ ] For each `unskip-trivial` E2E test: (AC: 1, 6)
  - [ ] Remove the skip/fixme modifier (`test.skip(...)` → `test(...)`, `test.fixme` removed)
  - [ ] Run `pnpm e2e:dms-material:chromium` targeting that specific test file
  - [ ] Run `pnpm e2e:dms-material:firefox` targeting that specific test file
  - [ ] If both pass → commit: `test(e2e-unskip): re-enable "<test name>"`
  - [ ] If either fails → reclassify as `unskip-needs-fix` and update inventory
- [ ] For each `unskip-needs-fix` E2E test: (AC: 2, 6)
  - [ ] Investigate the failure — identify root cause (selector change, timing, missing data, etc.)
  - [ ] Implement the minimal fix required
  - [ ] Remove the skip/fixme modifier
  - [ ] Run both browser suites
  - [ ] If both pass → commit: `fix: <description> (unskips E2E "<test name>")`
  - [ ] If fix is too complex → document as deferred per Dev Notes guidance
- [ ] Run the full E2E suite on both browsers after all unskips (AC: 3, 4)
  - [ ] `pnpm e2e:dms-material:chromium`
  - [ ] `pnpm e2e:dms-material:firefox`
- [ ] Verify no E2E skips remain: (AC: 5)
  ```bash
  grep -r "test\.skip\|test\.fixme" apps/dms-material-e2e/ --include="*.ts" -n
  ```

## Dev Notes

### E2E Test Scope

All Playwright tests under:

- `apps/dms-material-e2e/src/**/*.ts`

Unit spec files (`*.spec.ts`) are handled in Story 3.2.

### Targeted E2E Run (Single File)

To run a single Playwright spec file to validate a fix without running the entire suite:

```bash
# Chromium only, one file
pnpm exec playwright test apps/dms-material-e2e/src/path/to/test.spec.ts --project=chromium

# Firefox only, one file
pnpm exec playwright test apps/dms-material-e2e/src/path/to/test.spec.ts --project=firefox
```

### Common E2E Skip Causes

| Root Cause            | Fix Approach                                                |
| --------------------- | ----------------------------------------------------------- |
| Selector changed      | Update the Playwright locator to match the current DOM      |
| Timing/race condition | Add `await page.waitFor...` or use a more resilient locator |
| Feature removed       | Reclassify as `delete` and handle in Story 3.4              |
| Backend not seeded    | Verify test database fixture contains the required data     |
| Feature not yet built | Mark as deferred; do not delete                             |

### Commit Message Formats

```
test(e2e-unskip): re-enable "should navigate to accounts page"
fix: update CUSIP cache page locator for dark mode (unskips E2E "dark mode cache test")
```

### When an E2E Fix Is Too Complex

If an E2E fix requires new feature work or significant architectural change:

1. Leave the skip in place — do not delete
2. Add `// TODO(E3): blocked — see deferred list` above the `test.skip` call
3. Document in the inventory as deferred with the reason
4. Does NOT block completion of this story

### Quality Gate

Before marking this story done:

- `pnpm e2e:dms-material:chromium` exits 0
- `pnpm e2e:dms-material:firefox` exits 0
- `grep -r "test\.skip\|test\.fixme" apps/dms-material-e2e/ --include="*.ts"` returns only deferred/blocked items with `// TODO(E3)` comments (or zero matches)
