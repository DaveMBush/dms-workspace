# Story 1.2: Remove Unused Components (Batch)

Status: Approved

## Story

As a developer,
I want to remove each unused component candidate and validate that all quality checks still pass,
so that dead code is deleted without breaking any active functionality.

## Acceptance Criteria

1. Each candidate from Story 1.1 checklist evaluated individually using the per-commit validation loop.
2. `pnpm all` (lint + build + unit tests) passes after each deletion.
3. `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox` both pass after each deletion.
4. Any component that fails validation is restored and marked "verified active" in the audit document.
5. Each successfully deleted component is committed individually.

## Tasks / Subtasks

- [ ] Read `_bmad-output/implementation-artifacts/unused-code-audit.md` — obtain candidate checklist (AC: 1)
- [ ] For each candidate, execute the per-commit deletion validation loop: (AC: 1, 2, 3, 4, 5)
  - [ ] Re-verify all 5 classification criteria (rule from architecture.md)
  - [ ] Delete component `.ts`, `.html`, `.scss`, and `*.spec.ts` files
  - [ ] Run `pnpm all`
  - [ ] If `pnpm all` fails → restore all deleted files, mark "verified active" in audit doc, move on
  - [ ] If `pnpm all` passes → run `pnpm e2e:dms-material:chromium`
  - [ ] If E2E fails → restore all deleted files, mark "verified active", move on
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] If E2E fails → restore all deleted files, mark "verified active", move on
  - [ ] All checks pass → commit: `chore(cleanup): remove dead ComponentName`
  - [ ] Check off candidate in `unused-code-audit.md`

## Dev Notes

### Per-Commit Deletion Validation Loop — Mandatory

Each component must be validated and committed **individually**. Never batch-delete multiple components in a single commit. This is a hard rule from architecture.md §Implementation Patterns — Process Patterns.

```
For each candidate:
  1. Re-verify all 5 criteria
  2. Delete files
  3. pnpm all → fail? restore + mark verified active
  4. pnpm e2e:dms-material:chromium → fail? restore + mark verified active
  5. pnpm e2e:dms-material:firefox → fail? restore + mark verified active
  6. All pass → commit individually
```

### Anti-Pattern Warning

**NEVER** do this:

```bash
# WRONG — batching deletions
rm -rf apps/dms-material/src/app/demo/
rm -rf apps/dms-material/src/app/old-feature/
git commit -m "chore: remove dead components"  # multiple at once
```

**CORRECT** — one component per commit with full test validation between each.

### Files to Delete Per Component

For each dead component, delete all of:

- `{component-name}.ts`
- `{component-name}.html` (if external template)
- `{component-name}.scss` (if external styles)
- `{component-name}.spec.ts` (the component's own spec)

Do **not** delete spec files for other components just because they import the dead component — those must be updated instead.

### Commit Message Format

```
chore(cleanup): remove dead DemoComponent
```

Use PascalCase class name in the commit message. Keep the message concise — one line.

### Test Count Baseline

Before starting, record the current test count:

```bash
pnpm all 2>&1 | grep -E "Tests? (passed|failed)"
```

After each deletion, the test count should either stay the same or decrease by exactly the number of tests in the deleted spec file. If the count drops more than expected, that signals an unexpected dependency — restore and investigate.

### Quality Validation Commands

```bash
pnpm all                          # lint + build + unit tests (affected)
pnpm e2e:dms-material:chromium    # Playwright E2E on Chromium
pnpm e2e:dms-material:firefox     # Playwright E2E on Firefox
```

### Dependency on Story 1.1

This story **requires** `_bmad-output/implementation-artifacts/unused-code-audit.md` to exist with at least one candidate checked. Do not proceed without the Story 1.1 audit document.

### Project Structure Notes

- Component files: `apps/dms-material/src/app/**/{name}.ts` (newer) or `{name}.component.ts` (legacy)
- All deletions within `apps/dms-material/src/app/` only — no server files touched
- Update `unused-code-audit.md` to check off each successfully removed candidate

### References

- [Architecture §Implementation Patterns — Process Patterns](..//planning-artifacts/architecture.md) — dead code per-commit deletion loop
- [Architecture §Implementation Patterns — Structure Patterns](..//planning-artifacts/architecture.md) — 5-criterion classification rule
- [Architecture §Implementation Patterns — Anti-patterns](..//planning-artifacts/architecture.md) — never batch-delete
- [Story 1.1](./1-1-audit-components-for-unused-declarations.md) — prerequisite: produces the candidate list
- [Project Context §Commands Quick Reference](../project-context.md)

## Dev Agent Record

### Agent Model Used

_to be filled by implementing agent_

### Debug Log References

### Completion Notes List

### File List

- `_bmad-output/implementation-artifacts/unused-code-audit.md` (updated — candidates checked off)
- Various deleted component files (listed here after completion)
