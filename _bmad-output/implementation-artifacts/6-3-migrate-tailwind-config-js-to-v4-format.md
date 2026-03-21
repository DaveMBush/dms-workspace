# Story 6.3: Migrate tailwind.config.js to v4 Format

Status: ready-for-dev

## Story

As a developer,
I want the `tailwind.config.js` updated to the v4 configuration API (CSS-first config with `@theme` if applicable),
so that all existing custom theme tokens and content paths are preserved.

## Acceptance Criteria

1. **Given** the existing `tailwind.config.js`,
   **When** I convert it to the v4 configuration format,
   **Then** all custom colors, spacing, and breakpoints remain available as utility classes.

2. **And** the `content` paths correctly pick up all Angular component templates.

## Tasks / Subtasks

- [ ] Review current tailwind.config.js (AC: 1)
  - [ ] Document all custom theme tokens (colors, spacing, breakpoints)
  - [ ] Document `content` paths currently configured
  - [ ] Document `darkMode` configuration
  - [ ] Document any plugins in use
- [ ] Update configuration for v4 compatibility (AC: 1, 2)
  - [ ] Keep JS config format (CSS-first `@theme {}` migration is deferred per architecture)
  - [ ] Update any deprecated v3 config options to v4 equivalents
  - [ ] Ensure `darkMode: ['class', '.dark-theme']` is preserved or migrated to v4 equivalent
- [ ] Verify content paths (AC: 2)
  - [ ] Ensure `content` explicitly includes:
    - `./apps/dms-material/src/**/*.ts`
    - `./apps/dms-material/src/**/*.html`
  - [ ] Monorepo structure defeats Tailwind v4 auto-detection heuristics — explicit paths required
- [ ] Verify all custom utilities work (AC: 1)
  - [ ] Build the project and verify custom theme tokens produce utility classes
  - [ ] Run `pnpm all` to catch any issues
  - [ ] Test in dev server that custom classes still apply correctly

## Dev Notes

### Architecture Constraints (ADR-002)

- Keep JS config (`tailwind.config.js`) — CSS-first `@theme {}` token migration deferred to a future epic
- `content` array must explicitly include `./apps/dms-material/src/**/*.ts` and `./apps/dms-material/src/**/*.html`
- Monorepo structure defeats Tailwind v4 auto-detection heuristics
- Revisit the three-import compatibility path when Tailwind publishes a deprecation notice

### Dark Mode Configuration

Current: `darkMode: ['class', '.dark-theme']`

- Dark mode toggled by `.dark-theme` class on `document.body`
- Verify v4 still supports the class-based dark mode with custom class selector

### Previous Story Intelligence

- Story 6.1: Documented all breaking changes and migration checklist
- Story 6.2: Updated dependencies and PostCSS configuration, verified production bundle

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 6, Story 6.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-002]
- [Source: tailwind.config.js — workspace root]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
