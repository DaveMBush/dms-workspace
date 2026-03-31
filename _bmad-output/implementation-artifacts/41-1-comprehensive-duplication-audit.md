# Story 41.1: Comprehensive Duplication Audit (Code + Functionality)

Status: Approved

## Story

As a developer,
I want a comprehensive audit of both copy-paste code duplication and functional duplication in the DMS codebase,
so that refactoring targets are clearly identified before any code changes are made.

## Acceptance Criteria

1. **Given** the full codebase, **When** Story 41.1 is complete, **Then** `_bmad-output/implementation-artifacts/duplication-audit.md` is produced containing: results of running `pnpm dupcheck` (recording all jscpd violations by file and line range); a manual review finding section listing functionally duplicated patterns (components, services, utility functions doing the same thing in different locations); a specific analysis of Global Summary vs Account Summary screens (are they sufficiently similar to merge?); a prioritised list of refactor candidates with a difficulty/impact assessment for each; a recommended implementation sequence for Stories 41.2–41.4.
2. **Given** the audit document, **When** it is reviewed, **Then** the list of duplicates is supported by file paths, line numbers, or component names — no vague descriptions.

## Definition of Done

- [ ] `duplication-audit.md` created
- [ ] `pnpm dupcheck` run and results recorded
- [ ] Manual functional review section complete
- [ ] Global Summary vs Account Summary analysis section complete
- [ ] Prioritised refactor candidate list present
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Run `pnpm dupcheck` and capture all output (AC: #1)
  - [ ] Record each violation: file paths, line ranges, duplicate block size
- [ ] Conduct a manual review of the codebase for functional duplication (AC: #1)
  - [ ] Check: utility functions doing the same thing in different files
  - [ ] Check: Angular services with overlapping responsibilities
  - [ ] Check: component templates with near-identical structure
- [ ] Analyse Global Summary vs Account Summary screens in detail (AC: #1)
  - [ ] Compare component files, templates, services used
  - [ ] Assess feasibility of merging into a parameterised shared component
  - [ ] Estimate effort and risk of a merge
- [ ] Build prioritised refactor candidate list with difficulty/impact ratings (AC: #1)
- [ ] Document recommended implementation sequence for Stories 41.2–41.4 (AC: #1)
- [ ] Produce `duplication-audit.md` with all findings (AC: #2)
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- `apps/dms-material/src/app/global/global-summary/` — Global Summary screen
- `apps/dms-material/src/app/accounts/account-summary/` — Account Summary screen
- `apps/dms-material/src/app/shared/` — shared utilities and services to inspect for duplication
- `apps/server/src/app/routes/common/` — server utilities that may have functional duplicates

### Approach

This is a research/documentation story. Run `pnpm dupcheck` first and capture the raw output. Then do a manual code walk, focusing on: (1) utility functions that appear in multiple files, (2) Angular components that are structurally very similar, (3) the Global Summary / Account Summary pair specifically. The output document is the specification for Stories 41.2, 41.3, and 41.4 — it must be thorough and precise.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
