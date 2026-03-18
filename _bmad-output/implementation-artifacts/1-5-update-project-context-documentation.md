# Story 1.5: Update Project Context Documentation

Status: Approved

## Story

As a developer,
I want the project-context.md to reflect the cleaned codebase after Stories 1.1–1.4,
so that future AI agents and developers have an accurate picture of what is active.

## Acceptance Criteria

1. All references to removed components, services, or utilities removed from `_bmad-output/project-context.md`.
2. The document accurately describes the current set of active screens and navigation routes.
3. No references to deleted code remain in the document.

## Tasks / Subtasks

- [ ] Read `_bmad-output/implementation-artifacts/unused-code-audit.md` — collect the complete list of everything deleted in Stories 1.2, 1.3, and 1.4 (AC: 1)
- [ ] Scan `_bmad-output/project-context.md` for references to deleted items (AC: 1, 3)
  - [ ] Search for each deleted class name, selector, file path, and service name
  - [ ] Search the "Project Structure" section for any removed directory entries
  - [ ] Search the "Anti-Patterns" section for any mentions of removed items
- [ ] Update `_bmad-output/project-context.md` to remove or correct stale references (AC: 1, 2)
  - [ ] Remove deleted items from the Project Structure directory tree
  - [ ] Update any descriptive text referencing removed features/components
  - [ ] Verify navigation route descriptions still match active routes
- [ ] Run `pnpm all` to confirm no regressions from documentation-only changes (AC: 2)
- [ ] Commit: `docs(context): update project-context to reflect dead code removal`

## Dev Notes

### Dependency on Stories 1.1–1.4

This story must be completed **after** Stories 1.2, 1.3, and 1.4 are done. The deletion list comes from `_bmad-output/implementation-artifacts/unused-code-audit.md` — specifically the checked-off candidates in all three sections (Components, Services, Utilities & Pipes).

### What to Check in project-context.md

Key sections that may contain stale references:

| Section                           | What to Check                                                     |
| --------------------------------- | ----------------------------------------------------------------- |
| `## Project Structure`            | Directory tree — remove entries for deleted feature dirs or files |
| Any feature description paragraph | References by name to deleted components/services                 |
| `## Anti-Patterns`                | Any examples using deleted class names                            |

### How to Find Stale References

For each deleted item (e.g., `DemoComponent`, `demo.ts`, `dms-demo`):

```bash
grep -n "DemoComponent\|demo\.ts\|dms-demo" _bmad-output/project-context.md
```

Run this for every deleted item name. Replace or remove any matches found.

### What NOT to Change

- Do **not** change any Angular rules, testing conventions, anti-patterns, or architectural guidance
- Do **not** add new content — this story is cleanup only
- Do **not** modify `docs/` files — those are reference docs, not AI context
- Preserve all formatting, headings, and table structure

### Scope Boundaries

- **Only file modified**: `_bmad-output/project-context.md`
- No source code is changed in this story
- The audit document `_bmad-output/implementation-artifacts/unused-code-audit.md` is read-only here

### Commit Message

```
docs(context): update project-context to reflect dead code removal
```

Single commit for all project-context.md edits. Since this is a documentation-only change, no E2E run is required — but `pnpm all` should still pass (lint may check markdown).

### Quality Validation

```bash
pnpm all    # Confirm lint + build + unit tests still pass
```

E2E run is optional for a documentation-only change but recommended if `pnpm all` passes.

### Project Structure Notes

- Target file: `_bmad-output/project-context.md` (single file, all changes here)
- Source of truth for what was deleted: `_bmad-output/implementation-artifacts/unused-code-audit.md`

### References

- [Epics §Epic 1 Story 1.5](..//planning-artifacts/epics.md)
- [Project Context](../project-context.md) — the file being updated
- [Story 1.1](./1-1-audit-components-for-unused-declarations.md) — audit document format
- [Story 1.2](./1-2-remove-unused-components-batch.md) — components deleted
- [Story 1.3](./1-3-audit-services-for-unused-registrations.md) — services deleted
- [Story 1.4](./1-4-audit-and-remove-unused-utilities-and-pipes.md) — utilities deleted

## Dev Agent Record

### Agent Model Used

_to be filled by implementing agent_

### Debug Log References

### Completion Notes List

### File List

- `_bmad-output/project-context.md` (updated)
