# Story 8.5: Update CI Pipeline to Include Storybook Build and Visual Tests

Status: ready-for-dev

## Story

As a developer,
I want the CI pipeline updated to build Storybook and run visual regression tests on every PR,
so that visual regressions are caught before code reaches `main`.

## Acceptance Criteria

1. **Given** the CI configuration (GitHub Actions workflow),
   **When** a PR is opened or updated,
   **Then** the pipeline includes: Storybook build step, visual regression test step, and failure annotations pointing to the changed component story.

2. **And** all existing pipeline steps (lint, build, unit tests, E2E) continue to pass.

## Tasks / Subtasks

- [ ] Update GitHub Actions workflow (AC: 1)
  - [ ] Add Storybook build step: `pnpm storybook:build`
  - [ ] Add static serve step: serve `dist/storybook/` on a local port
  - [ ] Add visual regression test step: `pnpm e2e:storybook`
  - [ ] Add cleanup step: kill serve process
  - [ ] Add failure annotation for visual diff failures
- [ ] Implement source hash caching (AC: 1)
  - [ ] Cache Storybook build by source hash of `apps/dms-material/src/**`
  - [ ] Skip Storybook rebuild if source hash hasn't changed
  - [ ] Avoid pipeline slowdown from unnecessary rebuilds
- [ ] Configure artifact storage (AC: 1)
  - [ ] Store visual regression diff images as CI artifacts on failure
  - [ ] Include actual, expected, and diff screenshots
  - [ ] Make artifacts downloadable from PR checks
- [ ] Verify existing pipeline steps (AC: 2)
  - [ ] `pnpm all` (lint + build + unit tests) still passes
  - [ ] `pnpm e2e:dms-material:chromium` still passes
  - [ ] `pnpm e2e:dms-material:firefox` still passes
  - [ ] `pnpm dupcheck` still passes
  - [ ] `pnpm format` still passes
  - [ ] New Storybook steps do not break any existing steps
- [ ] Test the full pipeline (AC: 1, 2)
  - [ ] Create a test PR to trigger the pipeline
  - [ ] Verify all steps run in the correct order
  - [ ] Verify Storybook build and visual tests execute correctly
  - [ ] Verify failure annotations appear when a visual diff is detected

## Dev Notes

### Architecture Constraints (ADR-001)

- CI strategy: Step 1 = `pnpm storybook:build`, Step 2 = `serve dist/storybook &`, Step 3 = `pnpm e2e:storybook`
- Never run visual tests against a live dev server
- Storybook build should be CI-cached by source hash to avoid pipeline slowdown
- Visual regression baselines were captured inside CI (Story 8.4)

### Pipeline Step Ordering

Existing steps (must not break):

1. Lint
2. Build
3. Unit tests
4. E2E Chromium
5. E2E Firefox
6. Duplicate check
7. Format check

New steps to add: 8. Storybook build (cacheable) 9. Storybook visual regression tests

### GitHub Actions Caching

```yaml
- name: Cache Storybook build
  uses: actions/cache@v4
  with:
    path: dist/storybook
    key: storybook-${{ hashFiles('apps/dms-material/src/**') }}
```

### Artifact Upload on Failure

```yaml
- name: Upload visual regression diffs
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: visual-regression-diffs
    path: test-results/storybook-visual/
```

### Previous Story Intelligence

- Story 8.1: Installed Storybook with `pnpm storybook:build` script
- Story 8.2: Created display component stories
- Story 8.3: Created page stories with mocked data
- Story 8.4: Implemented Playwright visual regression tests with `pnpm e2e:storybook`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8, Story 8.5]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-001, Infrastructure & Deployment]
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns — CI pipeline integrity]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
