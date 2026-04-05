# Story 22.2: Achieve 100% Branch Coverage Across All Tested Files

Status: Approved

## Story

As a developer,
I want all tested source files to have 100% branch coverage,
So that the threshold set in Story 22.1 passes without suppression.

## Acceptance Criteria

1. **Given** the coverage report produced after Story 22.1's threshold change
   **When** I run `pnpm vitest run --coverage`
   **Then** all branch coverage gaps are identified from the report.

2. **Given** identified coverage gaps
   **When** I add or update unit tests to cover each uncovered branch
   **Then** all files meet the 100% branch threshold.

3. **Given** the coverage is achieved
   **When** I check the source files
   **Then** no source files use `/* istanbul ignore */` or `/* v8 ignore */` comments to suppress coverage (except genuinely unreachable defensive code paths, each with an explanatory comment).

4. **Given** all gaps are filled
   **When** I run `pnpm all`
   **Then** lint, build, and tests all pass with `--coverage` enabled.

## Definition of Done

- [ ] `pnpm vitest run --coverage` passes with 100% branch coverage
- [ ] No `/* istanbul ignore */` or `/* v8 ignore */` suppression comments added (except documented unreachable paths)
- [ ] `pnpm all` passes fully (lint + build + test + coverage)
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Run initial coverage report to identify gaps (AC: 1)
  - [ ] Run `pnpm vitest run --coverage`
  - [ ] Identify all files with branch coverage below 100%
  - [ ] Document gaps in a checklist
- [ ] Fix coverage gaps systematically per file (AC: 2, 3)
  - [ ] For each file with uncovered branches:
    - [ ] Read the source file to understand the uncovered branch (e.g., null guards, default cases, error paths)
    - [ ] Add a test case that triggers the uncovered branch
    - [ ] Re-run coverage to confirm fix
  - [ ] Do NOT add `/* v8 ignore */` unless the code is provably unreachable (e.g., an `exhaustive switch` default that TypeScript prevents reaching)
  - [ ] If a branch is unreachable, add `/* v8 ignore next -- unreachable: [reason] */` with explanation
- [ ] Final validation (AC: 4)
  - [ ] Run `pnpm all` — must pass with coverage
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`

## Dev Notes

### Prerequisite

Story 22.1 must be complete before starting this story. The threshold must be set to 100 before this story begins.

### Testing Framework

- Vitest 4.0.9 with `@vitest/coverage-v8` 4.0.9 [Source: package.json#L118]
- Angular components use `@analogjs/vitest-angular` [Source: package.json#L67]
- Test files follow pattern: `**/*.{spec,test}.ts`

### Common Branch Coverage Gaps to Watch For

- Optional chaining `?.` where null path is never tested
- Ternary expressions where one arm is never exercised
- `if/else` where the else block has no test
- `switch` default cases
- Short-circuit expressions (`a && b`, `a || b`) where the short-circuit path is untested
- Error handler branches (`.catch()`, `error` callbacks) that are never triggered in tests

### Signal-First Pattern (Angular Components)

When adding tests for Angular components (using `@analogjs/vitest-angular`):

- Use `TestBed.configureTestingModule()` with `provideZonelessChangeDetection()`
- Use `fixture.componentRef.setInput()` to set signal inputs
- Use `fixture.detectChanges()` for `OnPush` components
- Do NOT use `.toBeObservable()` — use Vitest `expect()` directly

### Architecture Constraint (ADR-004)

Per ADR-004, any changes to Vitest configuration files must follow the 5-step lint adoption sequence equivalent: document, configure, fix, promote, commit. For coverage: the threshold was already set in Story 22.1 — this story completes the "fix all violations" step before the gate is considered enforced.

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-03-27.md#FR22] FR22
- [Source: vitest.config.ts] Coverage configuration
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-004] ADR-004 ESLint/config discipline

## Dev Agent Record

### Agent Model Used

_to be filled on implementation_

### Debug Log References

### Completion Notes List

### File List
