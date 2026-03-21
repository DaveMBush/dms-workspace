# Story 6.4: Fix All v4 Utility Class Breakages

Status: ready-for-dev

## Story

As a developer,
I want any deprecated or renamed Tailwind utilities in templates to be updated to their v4 equivalents,
so that all templates compile and render correctly.

## Acceptance Criteria

1. **Given** the deprecated class list from the Tailwind v4 upgrade guide,
   **When** I search for and replace all deprecated classes in the monorepo templates,
   **Then** `pnpm all` (lint + build + unit tests) passes.

2. **And** `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox` both pass.

## Tasks / Subtasks

- [ ] Build deprecated class inventory (AC: 1)
  - [ ] Reference migration checklist from Story 6.1 (`tailwind-v4-migration.md`)
  - [ ] Compile exhaustive list of deprecated/renamed v3 → v4 class changes
  - [ ] Include: removed utilities, changed prefixes, renamed classes
- [ ] Search templates for deprecated classes (AC: 1)
  - [ ] Scan all `*.html` templates in `apps/dms-material/src/`
  - [ ] Scan all `template:` strings in `@Component` decorators
  - [ ] Scan `*.stories.ts` files if any exist yet
  - [ ] Document each occurrence: file, line, old class, new class
- [ ] Replace deprecated classes (AC: 1)
  - [ ] Apply v4 equivalent classes in each template
  - [ ] Verify each replacement renders correctly
  - [ ] Run `pnpm all` incrementally
- [ ] Run full quality checks (AC: 1, 2)
  - [ ] `pnpm all` passes with zero errors
  - [ ] `pnpm e2e:dms-material:chromium` passes
  - [ ] `pnpm e2e:dms-material:firefox` passes
  - [ ] Visual spot-check in dev server (both light and dark mode)

## Dev Notes

### Common Tailwind v3 → v4 Class Changes

Reference the Tailwind v4 upgrade guide for the full list. Common changes include:

- `bg-opacity-*` → `bg-{color}/{opacity}` (opacity modifier syntax)
- `text-opacity-*` → `text-{color}/{opacity}`
- Various renamed utilities documented in the migration guide

### Previous Story Intelligence

- Story 6.1: Created `tailwind-v4-migration.md` with breaking changes and migration checklist
- Story 6.2: Updated dependencies and configuration
- Story 6.3: Migrated `tailwind.config.js` to v4-compatible format

### Search Locations

```bash
# Templates
apps/dms-material/src/**/*.html

# Inline templates in component files
apps/dms-material/src/**/*.ts (template: strings)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 6, Story 6.4]
- [Source: _bmad-output/implementation-artifacts/tailwind-v4-migration.md]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-002]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
