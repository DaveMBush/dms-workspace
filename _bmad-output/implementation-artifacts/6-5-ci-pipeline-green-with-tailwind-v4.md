# Story 6.5: CI Pipeline Green with Tailwind v4

Status: ready-for-dev

## Story

As a developer,
I want the full CI pipeline to pass with Tailwind v4 installed,
so that the upgrade can be merged to `main` with confidence.

## Acceptance Criteria

1. **Given** the Tailwind v4 upgrade commits on a feature branch,
   **When** the CI pipeline runs (lint, build, unit tests, E2E Chromium, E2E Firefox, duplicate-check, format),
   **Then** all pipeline steps pass with zero errors.

## Tasks / Subtasks

- [ ] Run the full local quality gate (AC: 1)
  - [ ] `pnpm all` (lint + build + unit tests) passes
  - [ ] `pnpm e2e:dms-material:chromium` passes
  - [ ] `pnpm e2e:dms-material:firefox` passes
  - [ ] `pnpm dupcheck` passes (jscpd duplicate check)
  - [ ] `pnpm format` produces no changes (already formatted)
- [ ] Fix any remaining failures (AC: 1)
  - [ ] Investigate and resolve any CI-specific failures
  - [ ] Document any environment-specific quirks
- [ ] Verify production build (AC: 1)
  - [ ] Run production build and verify bundle sizes are reasonable
  - [ ] Confirm Tailwind utility classes present in production CSS output
  - [ ] Compare bundle size with pre-upgrade baseline if available
- [ ] Final visual verification (AC: 1)
  - [ ] Start the app and navigate all major routes
  - [ ] Verify light mode renders correctly
  - [ ] Verify dark mode renders correctly
  - [ ] No visual regressions compared to pre-upgrade state

## Dev Notes

### Full Quality Gate Commands

```bash
pnpm all                           # lint + build + unit tests
pnpm e2e:dms-material:chromium     # E2E Chromium
pnpm e2e:dms-material:firefox      # E2E Firefox
pnpm dupcheck                      # Duplicate code check
pnpm format                        # Format check
```

### Architecture Constraint

- E6 upgrade is a single logical commit after all stories complete: `chore(tailwind): upgrade to v4`
- CSS layer order `@layer tailwind-base, material, tailwind-utilities` must be preserved in production output

### Previous Story Intelligence

- Story 6.1: Documented breaking changes and migration checklist
- Story 6.2: Updated dependencies, PostCSS config, verified production bundle
- Story 6.3: Migrated `tailwind.config.js` to v4-compatible format
- Story 6.4: Fixed all deprecated/renamed utility classes in templates

### Post-Merge Considerations

After this story completes and is merged:
- Epic 7 (CUSIP cosmetics) can proceed — it depends on E5+E6 being complete
- Revisit the three-import compatibility path if Tailwind publishes a deprecation notice

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 6, Story 6.5]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-002, Decision Impact Analysis]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
