# Story 1.1: Audit Components for Unused Declarations

Status: Approved

## Story

As a developer,
I want an inventory of all Angular components that are not referenced by any route, template, or test,
so that I have a clear list of removal candidates for Epic 1.

## Acceptance Criteria

1. Every component in `dms-material` scanned against all 5 classification criteria.
2. Any component with zero references is listed as a removal candidate.
3. Candidate list documented as a checklist in `_bmad-output/implementation-artifacts/unused-code-audit.md`.

## Tasks / Subtasks

- [ ] Enumerate all component class files under `apps/dms-material/src/app/` (AC: 1)
  - [ ] Collect every `.ts` file with `@Component` decorator
  - [ ] Record file path, class name, and selector for each
- [ ] Apply the 5-criterion dead component classification rule to each component (AC: 1, 2)
  - [ ] Criterion 1: Zero `import` references in any `*.ts` file
  - [ ] Criterion 2: Not declared in any NgModule (confirm N/A for standalone — check anyway)
  - [ ] Criterion 3: Not registered in any router `loadComponent` or `loadChildren`
  - [ ] Criterion 4: Not referenced in any `*.html` template
  - [ ] Criterion 5: Not referenced in any `*.stories.ts` file (none exist yet, so auto-satisfied)
- [ ] Mark any component that fails even ONE criterion as "verified active" — exclude from list (AC: 2)
- [ ] Produce `unused-code-audit.md` with checklist format (AC: 3)
  - [ ] Two sections: "Removal Candidates" (checkboxes) and "Verified Active" (for reference)

## Dev Notes

### Dead Component Classification — Mandatory 5-Criterion Rule

**A component is only a removal candidate when ALL five conditions are true.** If any one is false, exclude it.

```
1. Zero `import` references in any *.ts file
2. Not declared in any NgModule (N/A for standalone — still check *.module.ts files)
3. Not registered in any router loadComponent or loadChildren
4. Not referenced in any *.html template (check both selector and class attribute)
5. Not referenced in any *.stories.ts file
```

This rule is defined in architecture.md §Implementation Patterns — Structure Patterns.

### Search Strategy

Use grep/ripgrep across the full monorepo (not just `dms-material`) since shared components in `global/` or `shell/` may be referenced from `server` types or E2E test helpers:

```bash
# Find all component class names and selectors
grep -r "@Component" apps/dms-material/src --include="*.ts" -l

# Check for references to a specific class/selector
grep -r "MyComponent\|my-selector" apps/ --include="*.ts" --include="*.html"
```

### Output Document Format

`_bmad-output/implementation-artifacts/unused-code-audit.md` should follow this structure:

```markdown
## Removal Candidates

- [ ] `apps/dms-material/src/app/demo/demo.ts` — class `DemoComponent`, selector `dms-demo`
  - Criteria met: no imports, no route, no template ref, no stories

## Verified Active

- `apps/dms-material/src/app/accounts/account.ts` — referenced by route loadComponent
```

### Known Scope Boundaries

- Scan target: `apps/dms-material/src/app/**` (all feature directories)
- Do NOT scan `apps/server/` — this epic is frontend-only
- Do NOT scan `apps/dms-material-e2e/` for existence checks (E2E tests are not "active usage" for components)
- Check spec files (`*.spec.ts`) — a component used only in its own spec is still a removal candidate (story 1.2 validates with build+tests)

### Key Directories to Scan

Based on the project structure, focus attention on these directories (most likely to contain dead code from earlier development):

| Directory                              | Risk Level | Notes                            |
| -------------------------------------- | ---------- | -------------------------------- |
| `apps/dms-material/src/app/demo/`      | High       | Demo/prototype code              |
| `apps/dms-material/src/app/dashboard/` | Medium     | May have unused sub-components   |
| `apps/dms-material/src/app/global/`    | Medium     | Several sub-features             |
| `apps/dms-material/src/app/shared/`    | Low        | Likely all active, but verify    |
| `apps/dms-material/src/app/auth/`      | Low        | Auth guards typically referenced |

### This Story Does NOT Delete Anything

Story 1.1 is audit-only. No files are deleted here. Deletion happens in Story 1.2 (components), 1.3 (services), and 1.4 (utilities/pipes), each with their own validation loop.

### Project Structure Notes

- Output file path: `_bmad-output/implementation-artifacts/unused-code-audit.md`
- No source files are modified by this story
- All component files follow kebab-case naming: `feature-name.ts` (newer) or `feature-name.component.ts` (legacy)
- Standalone components (no NgModule) — Angular 21 default; `standalone: true` not required in decorator

### References

- [Architecture §Implementation Patterns — Structure Patterns](..//planning-artifacts/architecture.md) — 5-criterion dead component classification rule
- [Architecture §Requirements to Structure Mapping — E1](..//planning-artifacts/architecture.md) — E1 FS locations
- [Project Context §Project Structure](../project-context.md) — directory layout
- [Epics §Epic 1 Story 1.1](..//planning-artifacts/epics.md)

## Dev Agent Record

### Agent Model Used

_to be filled by implementing agent_

### Debug Log References

### Completion Notes List

### File List

- `_bmad-output/implementation-artifacts/unused-code-audit.md` (created)
