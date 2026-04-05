# Story 32.2: Refactor All Copy-Paste Violations to Pass Zero-Threshold Check

Status: Approved

## Story

As a developer maintaining code quality,
I want all code duplications identified by jscpd at threshold 0 to be eliminated by refactoring,
so that `pnpm dupcheck` passes with zero violations and the codebase has zero tolerance for copy-paste code.

## Acceptance Criteria

1. **Given** the violations documented in `_bmad-output/implementation-artifacts/jscpd-violations.md` (from Story 32.1), **When** each violation is resolved, **Then** the duplicated logic is extracted into a shared utility, service, or base abstraction — no suppression entries are added to `.jscpd.json`.
2. **Given** each piece of extracted shared code, **When** the extraction is applied, **Then** it is placed in the appropriate shared location following the `@smarttools/one-exported-item-per-file` rule (one export per file).
3. **Given** each extracted shared file containing non-trivial logic, **When** it is created, **Then** a corresponding spec file is created alongside it with at least one passing test.
4. **Given** all refactoring applied, **When** `pnpm dupcheck` runs, **Then** it reports zero violations.
5. **Given** all changes, **When** `pnpm all` runs, **Then** it passes (lint, build, test, dupcheck, format all green).

## Definition of Done

- [ ] All violations from `jscpd-violations.md` resolved by refactoring
- [ ] No new entries added to `.jscpd.json` `ignore` array
- [ ] `pnpm dupcheck` passes (0 violations)
- [ ] `pnpm all` passes
- [ ] Run `pnpm format`
- [ ] Repeat all if any fail

## Tasks / Subtasks

- [ ] Read `_bmad-output/implementation-artifacts/jscpd-violations.md` (AC: #1)
  - [ ] If this file does not exist: run `pnpm dupcheck` to regenerate the violation list
  - [ ] Review each violation: identify the duplicated code blocks and their locations
- [ ] For each violation, refactor the duplication (AC: #1, #2, #3)
  - [ ] Identify what the duplicate code does (utility function, service method, component helper, etc.)
  - [ ] Determine the appropriate shared location:
    - Pure utility functions → `apps/dms-material/src/app/shared/utils/` (frontend)
    - Server utility functions → `apps/server/src/app/utils/` (backend)
    - Angular services → `apps/dms-material/src/app/shared/services/`
    - Constants → `apps/dms-material/src/app/shared/constants/`
  - [ ] Create the shared file with ONE named export (per `@smarttools/one-exported-item-per-file`)
  - [ ] Replace both duplicate usages with imports of the shared utility
  - [ ] If the shared logic is non-trivial: create a spec file with at least one test
- [ ] Run `pnpm dupcheck` after each violation fix (AC: #4)
  - [ ] Confirm the fixed violation no longer appears in output
  - [ ] Run after all violations are fixed to confirm zero violations
- [ ] Run `pnpm all` (AC: #5)

## Dev Notes

### PREREQUISITE: Read Story 32.1 Output

Read `_bmad-output/implementation-artifacts/jscpd-violations.md` before starting. If it does not exist, Story 32.1 has not been completed — stop and ensure 32.1 is done first.

If the file states "no violations found", this story is a no-op (already complete).

### One-Exported-Item-Per-File Rule

The project enforces `@smarttools/one-exported-item-per-file` via ESLint. This means:

```typescript
// ✅ CORRECT — one export per file
// file: shared/utils/format-currency.ts
export function formatCurrency(value: number): string { ... }

// ❌ WRONG — multiple exports
// file: shared/utils/helpers.ts
export function formatCurrency(...) {}
export function formatDate(...) {}
```

Each extracted utility or helper MUST be in its own file.

### Shared File Locations

**Angular frontend:**

- Utils: `apps/dms-material/src/app/shared/utils/{function-name}.ts`
- Services: `apps/dms-material/src/app/shared/services/{service-name}.service.ts`
- Constants: `apps/dms-material/src/app/shared/constants/{name}.ts`

**Server (Fastify/Node):**

- Utils: `apps/server/src/app/utils/{function-name}.ts`

### Spec File Requirement

If a new file contains non-trivial logic (branching, calculations, transformations), a spec file is required:

```
apps/dms-material/src/app/shared/utils/format-currency.ts       ← utility
apps/dms-material/src/app/shared/utils/format-currency.spec.ts  ← spec
```

Trivial wrappers (single-line pass-through re-exports, constants, type aliases) do not require a spec file.

### What NOT to Do

- ❌ Do NOT add entries to `.jscpd.json`'s `ignore` array
- ❌ Do NOT add `// jscpd:ignore-start / ignore-end` comments
- ❌ Do NOT create "barrel" files that export multiple items
- ❌ Do NOT collapse two similar functions into one mega-function with flags

### Architecture Rules

From `architecture.md` (jscpd section):

> "Duplication violations must be resolved by refactoring duplicated code into shared utilities, services, or base abstractions — never by adding new suppression entries to the `ignore` array."
> "The `ignore` array may only contain infrastructure/config patterns... Application source code paths must not be suppressed."

### References

[Source: _bmad-output/implementation-artifacts/jscpd-violations.md — violation list from Story 32.1]
[Source: .jscpd.json — do NOT modify ignore array]
[Source: _bmad-output/planning-artifacts/architecture.md#jscpd (Code Duplication)]
[Source: _bmad-output/planning-artifacts/epics-2026-03-30.md — Epic 32]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
