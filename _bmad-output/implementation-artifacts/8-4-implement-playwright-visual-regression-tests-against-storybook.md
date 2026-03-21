# Story 8.4: Implement Playwright Visual Regression Tests Against Storybook

Status: ready-for-dev

## Story

As a developer,
I want Playwright to run visual regression tests against the Storybook stories as part of the CI pipeline,
so that any unintended visual change in a component or page is caught automatically.

## Acceptance Criteria

1. **Given** Storybook built as a static site,
   **When** the Playwright visual regression suite runs against it (`pnpm e2e:storybook`),
   **Then** baseline screenshots are captured for every story on first run.

2. **And** subsequent runs compare against the baseline and fail if a visual diff exceeds the configured threshold.

3. **And** failure output includes a side-by-side diff image.

4. **And** the Playwright storybook test suite is added to the CI pipeline (`pnpm e2e:dms-material:chromium` or a dedicated step).

## Tasks / Subtasks

- [ ] PREREQUISITE CHECK: Verify E7 is complete (AC: 1)
  - [ ] Confirm all Epic 7 stories are done — cosmetic bugs must be resolved before baseline capture
  - [ ] If E7 is not complete, STOP — baselines captured now would include cosmetic bugs as "correct"
- [ ] Create Playwright storybook test suite (AC: 1, 2, 3)
  - [ ] Create test file: `apps/dms-material-e2e/src/storybook-visual.spec.ts`
  - [ ] Configure Playwright to serve static Storybook build and test against it
  - [ ] Iterate over all stories and capture screenshots for each
  - [ ] Set visual diff threshold: ≥ 0.1% pixel difference (not 0 — avoids sub-pixel noise)
- [ ] Configure baseline capture (AC: 1)
  - [ ] Baselines must be captured inside CI, NOT on a developer machine
  - [ ] Different OS font rendering invalidates cross-machine baselines
  - [ ] First run auto-accepts baselines
- [ ] Configure diff output (AC: 3)
  - [ ] On failure, generate side-by-side diff image
  - [ ] Include actual, expected, and diff screenshots
  - [ ] Store in test-results directory for CI artifact collection
- [ ] Add `pnpm e2e:storybook` script (AC: 4)
  - [ ] Add script to `package.json`
  - [ ] Script should: serve static Storybook build → run Playwright visual tests → clean up
  - [ ] Never run against a live Storybook dev server
- [ ] Run and verify (AC: 1, 2, 3)
  - [ ] Build Storybook: `pnpm storybook:build`
  - [ ] Run visual regression: `pnpm e2e:storybook`
  - [ ] Verify baselines are captured for all stories
  - [ ] Make a trivial visual change and verify the diff fails
  - [ ] Verify diff image is generated

## Dev Notes

### Architecture Constraints (ADR-001)

- **HARD PREREQUISITE:** E7 must be fully complete before running this story — cosmetic bugs become the "correct" baseline if captured too early
- CI strategy: Step 1 = `pnpm storybook:build`, Step 2 = `serve dist/storybook &`, Step 3 = `pnpm e2e:storybook`
- Never run against a live dev server
- Visual regression diff threshold: ≥ 0.1% pixel difference (not 0) to avoid sub-pixel rendering noise
- Baselines must be captured inside CI, not developer machines

### CI Pipeline Integration

The pipeline flow for Storybook tests:

```bash
# Step 1: Build static Storybook
pnpm storybook:build

# Step 2: Serve the static build
npx serve dist/storybook -l 6006 &

# Step 3: Run Playwright visual regression
pnpm e2e:storybook

# Step 4: Kill serve process
```

### Playwright Configuration

Test file location: `apps/dms-material-e2e/src/storybook-visual.spec.ts`

```typescript
// Pattern for visual regression
await expect(page).toHaveScreenshot('story-name.png', {
  maxDiffPixelRatio: 0.001, // ≥ 0.1% threshold
});
```

### Cross-Machine Baseline Warning

Different OS font rendering invalidates cross-machine baselines. Baselines must be:

- Generated inside CI (GitHub Actions Linux runner)
- Committed as CI artifacts or stored in a consistent location
- Never generated on developer macOS/Windows machines

### Previous Story Intelligence

- Story 8.1: Installed and configured Storybook
- Story 8.2: Created stories for display-only components
- Story 8.3: Created stories for full pages with mocked data

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8, Story 8.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-001]
- [Source: _bmad-output/planning-artifacts/architecture.md#Failure Mode Register — E8]
- [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
