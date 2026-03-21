# Story 6.1: Analyse Breaking Changes and Branch State

Status: ready-for-dev

## Story

As a developer,
I want to understand exactly what broke in PR #501 when Tailwind v4 was applied,
so that I know what migration steps are required beyond a simple dependency bump.

## Acceptance Criteria

1. **Given** the PR #501 diff and CI failure logs,
   **When** I review the breaking changes documented at tailwindcss.com/docs/upgrade-guide,
   **Then** I have a documented migration checklist in `_bmad-output/implementation-artifacts/tailwind-v4-migration.md` covering: config file format changes, removed utilities, changed class names, and PostCSS plugin updates.

## Tasks / Subtasks

- [ ] Review PR #501 (AC: 1)
  - [ ] Examine the `dependabot/npm_and_yarn/tailwindcss-4.2.1` branch diff
  - [ ] Identify CI failure logs and what specifically broke
  - [ ] Document affected files and error messages
- [ ] Review Tailwind v4 upgrade guide (AC: 1)
  - [ ] Read https://tailwindcss.com/docs/upgrade-guide for v3→v4 breaking changes
  - [ ] Catalogue: removed utilities, renamed classes, config format changes
  - [ ] Identify PostCSS plugin changes (`tailwindcss` → `@tailwindcss/postcss`)
  - [ ] Note `@import` changes and new CSS-first config approach
- [ ] Analyse project-specific impacts (AC: 1)
  - [ ] Check current `tailwind.config.js` for features that changed in v4
  - [ ] Check `postcss.config.js` for required plugin updates
  - [ ] Check `styles.scss` for `@layer` compatibility with v4
  - [ ] Check all templates for deprecated Tailwind class usage
  - [ ] Check `@analogjs/vite-plugin-angular` compatibility with Tailwind v4
- [ ] Create migration checklist document (AC: 1)
  - [ ] Create `_bmad-output/implementation-artifacts/tailwind-v4-migration.md`
  - [ ] Section: Config file format changes
  - [ ] Section: Removed/renamed utilities with replacements
  - [ ] Section: PostCSS plugin updates
  - [ ] Section: `@import` and `@layer` changes
  - [ ] Section: `content` path changes (auto-detection vs explicit)
  - [ ] Section: Risks and mitigation strategies

## Dev Notes

### Architecture Constraints (ADR-002)

- CSS layer order `@layer tailwind-base, material, tailwind-utilities` MUST survive the v4 migration
- Migration path: use THREE individual imports (`@import "tailwindcss/base"`, `@import "tailwindcss/components"`, `@import "tailwindcss/utilities"`) — NOT `@import "tailwindcss"` monolith
- Keep JS config (`tailwind.config.js`) for now — `@theme {}` CSS-first migration deferred
- Use `@tailwindcss/postcss` in `postcss.config.js` (not the Vite plugin) to avoid plugin-ordering conflicts with `@analogjs/vite-plugin-angular`
- `content` array must explicitly include `./apps/dms-material/src/**/*.ts` and `./apps/dms-material/src/**/*.html` — monorepo defeats v4 auto-detection

### Current Configuration Files

| File                 | Location                            | Purpose                                     |
| -------------------- | ----------------------------------- | ------------------------------------------- |
| `tailwind.config.js` | workspace root                      | Tailwind v3 config with custom theme tokens |
| `postcss.config.js`  | workspace root                      | Current PostCSS config                      |
| `styles.scss`        | `apps/dms-material/src/styles.scss` | Global styles with `@layer` rules           |

### Production Bundle Verification (Story 6.2)

Architecture mandates: inspect the emitted production CSS bundle and verify it contains Tailwind utility class definitions from inline Angular component templates. If absent, switch to `@tailwindcss/vite` and re-validate.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 6, Story 6.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-002]
- [Source: _bmad-output/project-context.md#Styling & Theming — CSS Layer Order]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
