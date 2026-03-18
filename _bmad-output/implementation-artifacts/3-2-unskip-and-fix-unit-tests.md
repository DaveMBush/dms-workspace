# Story 3.2: Unskip and Fix Unit Tests

Status: Approved

## Story

As a developer,
I want each unit test marked `unskip-trivial` or `unskip-needs-fix` to be enabled and passing,
so that the unit test suite is complete and reliable.

## Acceptance Criteria

1. All unit tests classified `unskip-trivial` in the Story 3.1 inventory are enabled and pass with no code changes.
2. All unit tests classified `unskip-needs-fix` are enabled and pass after the underlying bug is fixed.
3. `pnpm all` (lint + build + unit tests) passes after all unskips are applied.
4. No unit test remains in a skipped state (excluding `// @atdd` files) after this story.
5. Each unskip (and any associated bug fix) is committed individually with a clear commit message.

## Tasks / Subtasks

- [ ] Read `_bmad-output/implementation-artifacts/skipped-tests-inventory.md` — obtain unit test unskip list (AC: 1, 2)
- [ ] For each `unskip-trivial` unit test: (AC: 1, 5)
  - [ ] Remove the skip modifier (`it.skip` → `it`, `xit` → `it`, etc.)
  - [ ] Run `pnpm all`
  - [ ] If `pnpm all` passes → commit: `test(unskip): re-enable <test name>`
  - [ ] If `pnpm all` fails → reclassify as `unskip-needs-fix` and update inventory
- [ ] For each `unskip-needs-fix` unit test: (AC: 2, 5)
  - [ ] Investigate the failing assertion — identify root cause
  - [ ] Implement the minimal fix required to make the test pass
  - [ ] Remove the skip modifier
  - [ ] Run `pnpm all`
  - [ ] If `pnpm all` passes → commit: `fix: <description of bug fixed> (unskips <test name>)`
  - [ ] If fix is too complex to complete in this story → document as a separate bug story and skip deletion for now (do NOT delete)
- [ ] After all unskips, run `pnpm all` one final time to confirm green build (AC: 3)
- [ ] Verify no non-`@atdd` unit skips remain: (AC: 4)
  ```bash
  grep -r "it\.skip\|test\.skip\|xit\b\|xtest\b\|describe\.skip\|xdescribe\b" \
    apps/ --include="*.spec.ts" -n
  ```

## Dev Notes

### What Counts as a Unit Test

Any `*.spec.ts` file in:
- `apps/dms-material/src/**/*.spec.ts`
- `apps/server/src/**/*.spec.ts`

Playwright E2E files (`apps/dms-material-e2e/`) are handled in Story 3.3.

### Commit Message Formats

```
test(unskip): re-enable "should display account summary"
fix: correct null guard in AccountService.getAccount() (unskips account service spec)
```

### When a Bug Is Too Large to Fix Here

If a `unskip-needs-fix` test exposes a defect that requires significant refactoring or a new story to resolve:
1. Leave the skip in place (do not delete it)
2. Add `// TODO(E3): blocked — see bug story X` above the skip
3. Document it in the inventory as deferred
4. The test does NOT count as blocking completion of this story; Story 3.1 already flagged it as a candidate

### @atdd Exemption Reminder

Do NOT touch tests in files containing `// @atdd`. These are intentional skips that must remain per the project's TDD workflow convention.

### Quality Gate

Before marking this story done, the following must all be true:
- `pnpm all` exits 0
- `grep -r "it\.skip\|xit\b\|xtest\b\|describe\.skip\|xdescribe\b" apps/ --include="*.spec.ts"` returns only `@atdd` file matches (or zero matches)
