# Story 41.3: Refactor Functional Duplication (Non-Copy-Paste)

Status: Approved

## Story

As a developer,
I want functionally duplicate patterns identified in Story 41.1 (beyond jscpd copy-paste) to be consolidated into shared services or shared Angular components,
so that each capability has a single authoritative implementation.

## Acceptance Criteria

1. **Given** the functional duplication findings from Story 41.1, **When** each identified functional duplicate is refactored, **Then** the duplicated capability is consolidated to a single shared implementation and all former callers use the shared version.
2. **Given** the refactoring of each functional duplicate, **When** `pnpm all` runs, **Then** all tests continue to pass.
3. **Given** the scope of functional refactoring from Story 41.1 (excluding the Global Summary / Account Summary merge which is Story 41.4), **When** this story is implemented, **Then** only the items in the Story 41.1 audit's functional duplication section are addressed.

## Definition of Done

- [ ] All non-copy-paste functional duplicates from audit addressed
- [ ] Each refactored item has updated or new unit tests confirming the shared implementation works
- [ ] `pnpm all` passes
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Read `duplication-audit.md` from Story 41.1 and collect the functional duplication findings (excluding Global Summary / Account Summary merge) (AC: #3)
- [ ] For each functional duplicate identified: consolidate into a shared service, directive, or utility (AC: #1)
  - [ ] Migrate all callers to use the shared implementation
  - [ ] Delete the redundant implementations
- [ ] Add or update unit tests for the shared implementation to confirm it covers all former callers' use cases (AC: #1)
- [ ] Run `pnpm all` after each consolidation (AC: #2)
- [ ] Run `pnpm all` final check (AC: #2)
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- `_bmad-output/implementation-artifacts/duplication-audit.md` — Story 41.1 output; functional duplication section
- `apps/dms-material/src/app/shared/` — target for shared Angular components/services/directives
- `apps/server/src/app/routes/common/` — target for shared server utilities

### Approach

Functional duplication is harder to detect than jscpd violations — it requires judgment. The audit document from Story 41.1 is the spec. For each item: understand the two (or more) implementations, design a unified API that satisfies all callers, implement the shared version, migrate callers, run tests, delete the old code. Keep PRs small and focused.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
