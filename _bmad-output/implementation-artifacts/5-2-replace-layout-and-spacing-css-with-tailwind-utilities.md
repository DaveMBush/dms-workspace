# Story 5.2: Replace Layout and Spacing CSS with Tailwind Utilities

Status: ready-for-dev

## Story

As a developer,
I want all `margin`, `padding`, `display`, `flex`, `grid`, `width`, `height`, and positioning styles moved from component stylesheets into Tailwind classes on the template elements,
so that component stylesheets become empty or minimal.

## Acceptance Criteria

1. **Given** each layout/spacing rule identified in the audit,
   **When** I replace it with the equivalent Tailwind class in the template and remove it from the stylesheet,
   **Then** the component renders identically in both light and dark mode.

2. **And** `pnpm all` passes with no regressions.

3. **And** Playwright E2E tests pass on Chromium and Firefox.

## Tasks / Subtasks

- [ ] Load audit document from Story 5.1 (AC: 1)
  - [ ] Read `_bmad-output/implementation-artifacts/css-audit.md`
  - [ ] Filter for entries with type `layout` or `spacing`
- [ ] Migrate one component at a time (AC: 1, 2)
  - [ ] For each component in the audit:
    - [ ] Add Tailwind utility classes to the template elements
    - [ ] Remove the corresponding CSS rule from the stylesheet
    - [ ] Verify the component renders correctly in both light and dark mode
    - [ ] Commit individually: `style(tailwind): migrate {ComponentName} to utility classes`
- [ ] Run quality checks after each component (AC: 2, 3)
  - [ ] `pnpm all` passes after each migration
  - [ ] Spot-check visual rendering in dev server
- [ ] Run full E2E suite after all migrations (AC: 3)
  - [ ] `pnpm e2e:dms-material:chromium` passes
  - [ ] `pnpm e2e:dms-material:firefox` passes

## Dev Notes

### Architecture Constraints

- **One component per commit** during E5 migration per architecture Process Patterns
- Commit message format: `style(tailwind): migrate {ComponentName} to utility classes`
- CSS audit document must be committed before any migration begins
- Do NOT migrate color rules — leave those to Angular Material theme tokens
- Tailwind classes must use v3 names (v4 upgrade is Epic 6)

### CSS Layer Order (ADR-002)

The `styles.scss` layer ordering must not be changed:
```scss
@layer tailwind-base, material, tailwind-utilities;
```
Tailwind utility classes applied in templates will land in the `tailwind-utilities` layer, which has highest priority.

### View Encapsulation Consideration

Architecture Failure Mode Register warns: Tailwind classes on Material host elements may be blocked by view encapsulation. Test in real app with CDK harness tests, not Storybook only.

### Dark Mode Verification

- Dark mode: `.dark-theme` class on `document.body`
- Tailwind dark mode config: `darkMode: ['class', '.dark-theme']`
- Verify both themes after each component migration

### Previous Story Intelligence

Story 5.1 produces the audit document with all migration candidates classified by type.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5, Story 5.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-002, Process Patterns]
- [Source: _bmad-output/project-context.md#Styling & Theming]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
