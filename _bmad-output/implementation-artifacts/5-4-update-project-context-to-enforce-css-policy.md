# Story 5.4: Update Project Context to Enforce CSS Policy

Status: ready-for-dev

## Story

As a developer,
I want `_bmad-output/project-context.md` to explicitly state that Tailwind CSS and theme CSS variables take priority over component-level CSS,
so that future development (by humans and AI agents) follows the convention.

## Acceptance Criteria

1. **Given** the current `project-context.md`,
   **When** I add a "CSS Policy" section,
   **Then** the document states: "Prefer Tailwind utility classes for layout, spacing, and color. Use `--dms-*` / Angular Material theme tokens for brand colors. Component-level CSS is a last resort for truly component-specific styles that cannot be expressed otherwise."

## Tasks / Subtasks

- [ ] Review current project-context.md (AC: 1)
  - [ ] Read `_bmad-output/project-context.md`
  - [ ] Identify the best location to add a "CSS Policy" section (near "Styling & Theming" section)
  - [ ] Check for any existing statements that need to be updated
- [ ] Add CSS Policy section (AC: 1)
  - [ ] Add the required policy statement
  - [ ] Include guidance on when component-level CSS is acceptable
  - [ ] Reference `--dms-*` variables and Angular Material theme tokens
  - [ ] Add to the Anti-Patterns table: creating new component CSS when Tailwind utility exists
- [ ] Verify document accuracy (AC: 1)
  - [ ] Ensure the policy matches what was implemented in Stories 5.1–5.3
  - [ ] Verify no references to removed/migrated CSS patterns remain inaccurate
- [ ] Run quality checks
  - [ ] `pnpm all` passes (no code changes, but verify formatting)

## Dev Notes

### Required Policy Statement

From the epics file, the exact policy that must be included:

> "Prefer Tailwind utility classes for layout, spacing, and color. Use `--dms-*` / Angular Material theme tokens for brand colors. Component-level CSS is a last resort for truly component-specific styles that cannot be expressed otherwise."

### Suggested Location

Add after the existing "Styling & Theming — Critical Rules" section in `_bmad-output/project-context.md`, or as a subsection within it.

### Suggested Anti-Pattern Addition

| Anti-Pattern                             | Why                            | Correct Alternative                        |
| ---------------------------------------- | ------------------------------ | ------------------------------------------ |
| Writing component CSS for layout/spacing | Tailwind utilities handle this | Use Tailwind utility classes in template   |
| Hardcoding hex/RGB color values          | Breaks dark mode               | Use `--dms-*` variables or Material tokens |

### Previous Story Intelligence

- Story 5.1: Audited all component CSS
- Story 5.2: Migrated layout/spacing to Tailwind
- Story 5.3: Replaced hardcoded colors with theme variables

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5, Story 5.4]
- [Source: _bmad-output/project-context.md#Styling & Theming]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
