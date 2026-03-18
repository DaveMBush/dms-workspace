# Story 3.1: Inventory All Skipped Tests

Status: Approved

## Story

As a developer,
I want a complete list of every skipped test in the monorepo,
so that I know the full scope of work for Epic 3.

## Acceptance Criteria

1. Every skipped test across all unit and E2E test files is identified.
2. Each entry in the inventory includes: file path, test name, reason (if a comment exists), and a preliminary classification.
3. Classification uses three categories: `unskip-trivial` (straightforward to re-enable), `unskip-needs-fix` (requires a bug fix), or `delete` (no longer relevant or duplicate).
4. Tests marked with `// @atdd` are excluded — these are intentionally skipped ATDD scaffolding tests.
5. Output is documented in `_bmad-output/implementation-artifacts/skipped-tests-inventory.md`.
6. Any `unskip-needs-fix` items are noted as candidates for separate bug fix stories.

## Tasks / Subtasks

- [ ] Search all unit spec files for skip patterns (AC: 1, 4)
  - [ ] Search for `it.skip`, `test.skip`, `xit`, `xtest`, `describe.skip`, `xdescribe` in `**/*.spec.ts`
  - [ ] Exclude any matches in files containing `// @atdd`
- [ ] Search all Playwright E2E files for skip patterns (AC: 1)
  - [ ] Search for `test.skip`, `test.fixme` in `apps/dms-material-e2e/`
- [ ] For each match, record: (AC: 2)
  - [ ] Full file path (relative to workspace root)
  - [ ] Test describe block(s) and test name
  - [ ] Any comment on the same or preceding line explaining why it is skipped
- [ ] Classify each skipped test as `unskip-trivial`, `unskip-needs-fix`, or `delete` (AC: 3)
  - [ ] `unskip-trivial`: no code changes needed, should pass immediately on unskip
  - [ ] `unskip-needs-fix`: test exposes a real bug or broken dependency
  - [ ] `delete`: test is obsolete, duplicate, or no longer reflects any real requirement
- [ ] Note all `unskip-needs-fix` items separately as potential bug fix story candidates (AC: 6)
- [ ] Write `_bmad-output/implementation-artifacts/skipped-tests-inventory.md` (AC: 5)
  - [ ] Section 1: Unit tests — table with columns: File | Test Name | Reason | Classification
  - [ ] Section 2: E2E tests — same table structure
  - [ ] Section 3: Needs-fix candidates — list of items requiring bug stories

## Dev Notes

### Search Commands

```bash
# Unit test skips (exclude @atdd files)
grep -r "it\.skip\|test\.skip\|xit\b\|xtest\b\|describe\.skip\|xdescribe\b" \
  apps/ --include="*.spec.ts" -n

# E2E skips
grep -r "test\.skip\|test\.fixme" \
  apps/dms-material-e2e/ --include="*.ts" -n

# Check a file for @atdd exemption
grep -l "@atdd" apps/ --include="*.spec.ts" -r
```

### @atdd Convention

Files containing `// @atdd` (anywhere in the file) are intentionally-skipped ATDD scaffolding tests per ADR-004. ESLint is configured to allow `it.skip`/`xit` in these files. Do NOT include `@atdd` tests in the inventory — they are part of the Epic implementation workflow, not defects.

### Classification Guidance

| Classification      | When to use                                                                 |
| ------------------- | --------------------------------------------------------------------------- |
| `unskip-trivial`    | Test was skipped to unblock a sprint; underlying code now works correctly   |
| `unskip-needs-fix`  | Test reveals a real broken assertion or missing behaviour                   |
| `delete`            | Test duplicates another, tests a removed feature, or has a TODO with no owner |

### Output Document Format

```markdown
# Skipped Tests Inventory

## Unit Tests

| File | Test Name | Reason | Classification |
|------|-----------|--------|----------------|
| apps/dms-material/src/app/... | describe > it name | "broken after refactor" | unskip-trivial |

## E2E Tests

| File | Test Name | Reason | Classification |
|------|-----------|--------|----------------|

## Needs-Fix Candidates (Potential Bug Stories)

- `path/to/spec.ts` > "test name" — bug: description of broken behaviour
```

### Scope

- Unit specs: `apps/dms-material/src/**/*.spec.ts`, `apps/server/src/**/*.spec.ts`
- E2E specs: `apps/dms-material-e2e/src/**/*.ts`
- Do NOT include `node_modules/` or generated files
