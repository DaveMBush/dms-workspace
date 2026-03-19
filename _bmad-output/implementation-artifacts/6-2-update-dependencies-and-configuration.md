# Story 6.2: Update Dependencies and Configuration

Status: ready-for-dev

## Story

As a developer,
I want the `tailwindcss` package and all related packages (`@tailwindcss/postcss`, etc.) upgraded to v4 in `package.json`,
so that the application builds with Tailwind v4.

## Acceptance Criteria

1. **Given** the current `package.json` and `postcss.config.js`,
   **When** I update the Tailwind packages to v4 and adjust the PostCSS/Vite configuration as required by the migration guide,
   **Then** `pnpm install` succeeds and `pnpm build` produces the frontend bundle without errors.

## Tasks / Subtasks

- [ ] Update package.json dependencies (AC: 1)
  - [ ] Update `tailwindcss` from `3.4.1` to `^4.x`
  - [ ] Add `@tailwindcss/postcss` package
  - [ ] Remove deprecated Tailwind v3 PostCSS plugin references if any
  - [ ] Run `pnpm install` and resolve any peer dependency conflicts
- [ ] Update postcss.config.js (AC: 1)
  - [ ] Replace `tailwindcss` plugin with `@tailwindcss/postcss`
  - [ ] Ensure plugin ordering does not conflict with `@analogjs/vite-plugin-angular`
- [ ] Update styles.scss imports (AC: 1)
  - [ ] Use three individual imports (not monolith `@import "tailwindcss"`):
    - `@import "tailwindcss/base"` → in `@layer tailwind-base`
    - `@import "tailwindcss/components"` → in `@layer tailwind-utilities`
    - `@import "tailwindcss/utilities"` → in `@layer tailwind-utilities`
  - [ ] Preserve the `@layer tailwind-base, material, tailwind-utilities` ordering
- [ ] Verify Tailwind config compatibility (AC: 1)
  - [ ] Ensure `tailwind.config.js` is still loaded (v4 supports JS config as fallback)
  - [ ] Verify `content` paths explicitly include `./apps/dms-material/src/**/*.ts` and `./apps/dms-material/src/**/*.html`
- [ ] Production bundle verification gate (AC: 1)
  - [ ] Run production build: `pnpm build`
  - [ ] Inspect emitted CSS bundle for Tailwind utility class definitions from inline Angular templates
  - [ ] If Tailwind classes are absent from bundle → switch to `@tailwindcss/vite` and re-verify
- [ ] Run quality checks (AC: 1)
  - [ ] `pnpm all` passes (lint + build + unit tests)

## Dev Notes

### Architecture Constraints (ADR-002)

- Use `@tailwindcss/postcss` in `postcss.config.js` (NOT the Vite plugin) — avoids conflicts with `@analogjs/vite-plugin-angular`
- CSS layer order `@layer tailwind-base, material, tailwind-utilities` is inviolable
- Three individual imports, NOT monolith `@import "tailwindcss"`
- Keep JS config (`tailwind.config.js`) — CSS-first `@theme {}` migration deferred
- `content` array must explicitly list monorepo paths — v4 auto-detection won't work

### Production Bundle Verification (Critical)

This is a go/no-go gate: if the production CSS bundle does NOT contain Tailwind utility classes from inline Angular component templates:
1. Switch from `@tailwindcss/postcss` to `@tailwindcss/vite`
2. Re-validate the entire build pipeline
3. Document the decision change

### Fallback Path

If `@tailwindcss/postcss` does not work:
- Use `@tailwindcss/vite` instead
- Thread through Vite config alongside `@analogjs/vite-plugin-angular`
- Re-run all verification steps

### Current Technology Versions

| Package | Current | Target |
|---------|---------|--------|
| tailwindcss | 3.4.1 | ^4.x |
| postcss | (check package.json) | compatible with @tailwindcss/postcss |
| @tailwindcss/postcss | N/A | ^4.x (new) |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 6, Story 6.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-002]
- [Source: _bmad-output/implementation-artifacts/6-1-analyse-breaking-changes-and-branch-state.md]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
