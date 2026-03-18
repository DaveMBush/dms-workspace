# Story 3.4: Delete Irrelevant Skipped Tests

Status: Approved

## Story

As a developer,
I want to delete all tests classified as `delete` in the skipped tests inventory,
so that the test suite does not contain misleading dead weight.

## Acceptance Criteria

1. All tests classified `delete` in the Story 3.1 inventory are removed from the codebase.
2. `pnpm all` (lint + build + unit tests) passes after all deletions.
3. `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox` pass after all deletions.
4. The deletion rationale for each removed test is noted in the inventory document.
5. No orphaned empty `describe` blocks remain after removal of their inner `it` blocks.
6. Each deletion is committed individually with a clear commit message.

## Tasks / Subtasks

- [ ] Read `_bmad-output/implementation-artifacts/skipped-tests-inventory.md` — obtain `delete` list (AC: 1)
- [ ] For each test classified `delete`: (AC: 1, 4, 6)
  - [ ] Confirm classification is still valid — test is truly obsolete or duplicate
  - [ ] Remove the `it.skip` / `test.skip` / `xit` / `xtest` block (not just the skip modifier)
  - [ ] If removal empties the parent `describe` block, remove the `describe` block too (AC: 5)
  - [ ] If removal empties the entire spec file, delete the spec file entirely
  - [ ] Update `_bmad-output/implementation-artifacts/skipped-tests-inventory.md` with deletion rationale
  - [ ] Run `pnpm all`
  - [ ] If `pnpm all` fails → restore deleted block, investigate — do not delete if it breaks the build
  - [ ] If `pnpm all` passes → run `pnpm e2e:dms-material:chromium`
  - [ ] If E2E fails → restore deleted block, reclassify as `unskip-needs-fix`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] All checks pass → commit: `test(cleanup): delete obsolete skipped test "<test name>"`
- [ ] Verify no skipped tests remain (excluding `@atdd`) in unit specs: (AC: 2)
  ```bash
  grep -r "it\.skip\|test\.skip\|xit\b\|xtest\b\|describe\.skip\|xdescribe\b" \
    apps/ --include="*.spec.ts" -n
  ```
- [ ] Verify no skipped tests remain in E2E specs: (AC: 3)
  ```bash
  grep -r "test\.skip\|test\.fixme" apps/dms-material-e2e/ --include="*.ts" -n
  ```
- [ ] Run full quality gate as final validation (AC: 2, 3)
  - [ ] `pnpm all`
  - [ ] `pnpm e2e:dms-material:chromium`
  - [ ] `pnpm e2e:dms-material:firefox`

## Dev Notes

### What to Delete vs. What to Keep

| Scenario                                 | Action                                      |
| ---------------------------------------- | ------------------------------------------- |
| Test for a removed feature               | Delete the entire `it` block                |
| Test that duplicates an existing passing test | Delete the duplicate                   |
| Test with a TODO that has no owner/issue | Delete if the feature is not in the PRD     |
| Test for future planned work             | Keep if there is a story for it; mark `// @atdd` |

### Handling Empty Describe Blocks

After removing an `it.skip` block, check if the parent `describe` has any remaining `it` / `test` calls. If the `describe` block is now empty, remove it. Example:

```typescript
// BEFORE — after removing the inner it.skip
describe('MyComponent', () => {
  // nothing here
});

// AFTER — remove the empty describe too
// (entire block deleted)
```

### Commit Message Format

```
test(cleanup): delete obsolete skipped test "should display legacy widget"
test(cleanup): delete empty describe block in legacy-widget.spec.ts
```

### Final Epic 3 Completion Check

Story 3.4 is the last story in Epic 3. After this story is done:
- Zero non-`@atdd` skipped tests exist in the codebase
- `pnpm all` + both E2E suites are green
- The inventory document is fully updated with dispositions for every original entry

At that point, the SM can mark `epic-3: done` in `sprint-status.yaml`.
