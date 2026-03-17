---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - .github/instructions/epics-2026-03-17.md
  - _bmad-output/project-context.md
---

# DMS Workspace — Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for **dms-workspace**, decomposing the requirements from the PRD and the new epics requested on 2026-03-17 into implementable stories. These epics focus on code quality, tooling improvements, and UI refinements that bring the project to a higher standard of maintainability, reliability, and visual polish.

---

## Requirements Inventory

### Functional Requirements (from PRD — already implemented)

- FR1–FR42 are fulfilled by the current MVP. These epics do not add new functional behaviour; they improve quality, tooling, and maintainability of the existing feature set.

### NFR Coverage for this Epic Set

- NFR-Maintainability: Remove dead code, strengthen lint rules, migrate IDs to Tailwind
- NFR-Reliability: Enable skipped tests, fix CUSIP lookup failures
- NFR-Performance: Tailwind v4 upgrade reduces bundle-size overhead
- NFR-Accessibility: Dark-mode cosmetic fixes on CUSIP cache page
- NFR-Testability: Storybook + visual regression pipeline

### FR Coverage Map

| Epic                                   | Primary FR / NFR Coverage                     |
| -------------------------------------- | --------------------------------------------- |
| Epic 1 — Remove Unused Code            | NFR-Maintainability: reduce dead-code surface |
| Epic 2 — Fix CUSIP Lookup              | FR26, FR27, FR28, FR39                        |
| Epic 3 — Enable Skipped Tests          | NFR-Reliability: test health ≥ 88%            |
| Epic 4 — Improve Lint Rules            | NFR-Maintainability: stricter static analysis |
| Epic 5 — CSS → Tailwind/Theme          | NFR-Maintainability, NFR-Accessibility        |
| Epic 6 — Upgrade Tailwind v4           | NFR-Performance, NFR-Maintainability          |
| Epic 7 — CUSIP Page Cosmetics          | NFR-Accessibility: dark-mode correctness      |
| Epic 8 — Storybook + Visual Regression | NFR-Maintainability, NFR-Accessibility        |

---

## Epic List

1. [Epic 1: Remove Unused Code](#epic-1-remove-unused-code)
2. [Epic 2: Fix CUSIP Lookup — Switch to massive.com API](#epic-2-fix-cusip-lookup--switch-to-massivecom-api)
3. [Epic 3: Enable Skipped Unit and E2E Tests](#epic-3-enable-skipped-unit-and-e2e-tests)
4. [Epic 4: Improve Lint Rules](#epic-4-improve-lint-rules)
5. [Epic 5: Migrate CSS to Tailwind / Theme](#epic-5-migrate-css-to-tailwind--theme)
6. [Epic 6: Upgrade Tailwind CSS to Version 4](#epic-6-upgrade-tailwind-css-to-version-4)
7. [Epic 7: CUSIP Cache Page Cosmetics](#epic-7-cusip-cache-page-cosmetics)
8. [Epic 8: Storybook for Display-Only Components](#epic-8-storybook-for-display-only-components)

---

## Epic 1: Remove Unused Code

**Goal:** Identify and remove all dead code across the monorepo — particularly in `dms-material` — so that the codebase contains only components, services, modules, and utilities that are actively referenced. This will reduce maintenance surface, improve readability, and eliminate confusion from duplicate screen implementations.

**Approach:** Remove code candidate → run `pnpm all` and E2E quality checks (as defined in `quality-validation.prompt.md`). If checks pass, the code was dead and deletion stands. If checks fail, restore the file and annotate it as "verified active."

---

### Story 1.1: Audit Components for Unused Declarations

As a developer,
I want an inventory of all Angular components that are not referenced by any route, template, or test,
So that I have a clear list of removal candidates.

**Acceptance Criteria:**

**Given** the `dms-material` project source tree,
**When** I run a static reference scan (search for each component selector, class name, and route reference),
**Then** every component with zero references to its selector, class, or route path is listed as a candidate for removal.

**And** the candidate list is documented as a checklist in `_bmad-output/implementation-artifacts/unused-code-audit.md`.

---

### Story 1.2: Remove Unused Components (Batch)

As a developer,
I want to remove each unused component candidate and validate that all quality checks still pass,
So that dead code is deleted without breaking any active functionality.

**Acceptance Criteria:**

**Given** the candidate list from Story 1.1,
**When** I delete a component (template, class, spec, and style files),
**Then** `pnpm all` (lint + build + unit tests) passes.

**And** `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox` both pass.

**And** if any check fails, the component files are restored and marked as "verified active" in the audit document.

---

### Story 1.3: Audit Services for Unused Registrations

As a developer,
I want to identify services that are registered (providedIn: 'root' or in a providers array) but never injected anywhere active,
So that I can remove them safely.

**Acceptance Criteria:**

**Given** all service classes with `@Injectable` in `dms-material`,
**When** I search for their class names in all providers arrays, `inject()` calls, and constructor parameter lists,
**Then** any service with zero active injection sites is added to the removal candidates list.

**And** removal is validated with the same quality-check loop as Story 1.2.

---

### Story 1.4: Audit and Remove Unused Utilities and Pipes

As a developer,
I want to find and remove any standalone pipes, utility functions, or helper modules that are never imported or called,
So that the shared utilities are lean and directly purposeful.

**Acceptance Criteria:**

**Given** all pipes, pure functions, and shared utilities in the monorepo,
**When** I search for their export names in all import statements and template usage,
**Then** any utility with zero usages outside its own spec file is a removal candidate.

**And** removal is validated with the full quality-check loop.

---

### Story 1.5: Update Project Context Documentation

As a developer,
I want the project-context.md to reflect the cleaned codebase,
So that future AI agents and developers have an accurate picture of what is active.

**Acceptance Criteria:**

**Given** completion of Stories 1.1–1.4,
**When** I review `_bmad-output/project-context.md`,
**Then** any references to removed components, services, or utilities are removed or updated.

**And** the document accurately describes the current set of active screens and navigation routes.

---

## Epic 2: Fix CUSIP Lookup — Switch to massive.com API

**Goal:** Replace or supplement the OpenFIGI CUSIP-to-ticker resolution with the massive.com API to resolve the three known failing CUSIPs (`691543102`, `88636J527`, `88634T493`). Preserve all existing behaviour: caching, UI, error handling, and fallback chain.

---

### Story 2.1: Verify massive.com API Returns Results for Failing CUSIPs

As a developer,
I want to make test API calls to massive.com for the three failing CUSIPs before committing to the integration,
So that I can confirm the alternative API actually resolves what OpenFIGI cannot.

**Acceptance Criteria:**

**Given** the three failing CUSIPs: `691543102`, `88636J527`, `88634T493`,
**When** I call the massive.com API (free tier) with each CUSIP,
**Then** each call returns a valid ticker symbol (or a clear indication that the symbol is unresolvable).

**And** the results are documented in `_bmad-output/implementation-artifacts/cusip-api-comparison.md` comparing OpenFIGI vs massive.com responses.

---

### Story 2.2: Implement massive.com CUSIP Resolution Service

As a developer,
I want a server-side service that wraps the massive.com API and resolves a CUSIP to a ticker symbol,
So that the resolution logic is encapsulated and testable independently of the existing OpenFIGI service.

**Acceptance Criteria:**

**Given** a valid CUSIP string,
**When** the massive.com service is called,
**Then** it returns the resolved ticker symbol if found, or `null` if not found.

**And** the service respects the 5 API calls/minute rate limit by queuing or throttling requests.

**And** the service has unit tests covering: successful resolution, null response, rate-limit handling, and network error.

---

### Story 2.3: Integrate massive.com as Fallback in CUSIP Resolution Chain

As a developer,
I want the CUSIP resolution chain to try OpenFIGI first, then massive.com, then Yahoo Finance,
So that the maximum number of CUSIPs are resolved without changing the cache or UI layers.

**Acceptance Criteria:**

**Given** a CUSIP not resolvable by OpenFIGI,
**When** massive.com resolves it successfully,
**Then** the resolved ticker is cached and returned exactly as it would have been from OpenFIGI.

**And** the fallback chain is: OpenFIGI → massive.com → Yahoo Finance.

**And** existing behaviour for CUSIPs resolvable by OpenFIGI is unchanged.

**And** the CUSIP cache table (FR39) and audit log continue to record resolution source.

---

### Story 2.4: Validate Resolution of Previously Failing CUSIPs

As a developer,
I want to confirm that all three previously failing CUSIPs now resolve successfully end-to-end,
So that I can close this epic with confidence.

**Acceptance Criteria:**

**Given** the updated resolution chain is deployed locally,
**When** a CSV import containing `691543102`, `88636J527`, or `88634T493` is processed,
**Then** each CUSIP resolves to the correct ticker symbol.

**And** all existing unit and E2E tests pass (`pnpm all` + E2E checks).

**And** the three CUSIPs are added to a regression test that asserts their resolution does not regress.

---

## Epic 3: Enable Skipped Unit and E2E Tests

**Goal:** Review every skipped/pending test across the monorepo, determine whether each is still relevant, and either unskip it (making it pass) or delete it. No test should remain in a skipped state at the conclusion of this epic.

---

### Story 3.1: Inventory All Skipped Tests

As a developer,
I want a complete list of every skipped test (`it.skip`, `xit`, `xdescribe`, `describe.skip`, `test.skip`, Playwright `test.skip()`) in the monorepo,
So that I know the full scope of work.

**Acceptance Criteria:**

**Given** the full monorepo source,
**When** I search for `\.skip`, `xit`, `xdescribe`, `xtest`, `test.fixme`, and `test.skip`,
**Then** every match is listed in `_bmad-output/implementation-artifacts/skipped-tests-inventory.md` with: file path, test name, reason (if a comment exists), and a preliminary status of `unskip` or `delete`.

---

### Story 3.2: Unskip and Fix Unit Tests

As a developer,
I want each unit test marked for unskipping to be enabled and passing,
So that our unit test suite is complete and reliable.

**Acceptance Criteria:**

**Given** the skipped unit tests marked `unskip` in the inventory,
**When** I remove the skip modifier and run `pnpm all`,
**Then** each unskipped test passes.

**And** if a test reveals a real bug, the bug is fixed before the test is committed as enabled.

**And** no tests are left in a skipped state after this story.

---

### Story 3.3: Unskip and Fix E2E Tests

As a developer,
I want each skipped Playwright E2E test that is still relevant to be enabled and passing on both Chromium and Firefox,
So that our E2E coverage is complete.

**Acceptance Criteria:**

**Given** the skipped E2E tests marked `unskip` in the inventory,
**When** I remove the skip modifier and run `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox`,
**Then** each unskipped E2E test passes on both browsers.

**And** no E2E tests are left in a skipped state after this story.

---

### Story 3.4: Delete Irrelevant Skipped Tests

As a developer,
I want to delete all tests that are no longer relevant or already covered elsewhere,
So that the test suite does not contain misleading dead weight.

**Acceptance Criteria:**

**Given** the skipped tests marked `delete` in the inventory,
**When** I remove those test blocks (or entire spec files if appropriate),
**Then** `pnpm all` and the E2E suite still pass with no regressions.

**And** the deletion rationale is noted in the inventory document.

---

## Epic 4: Improve Lint Rules

**Goal:** Adopt the stronger ESLint rule set from `DaveMBush/SmartNgRX` (branch `v-next`) — skipping Jest-specific rules that don't apply — and add equivalent Vitest rules where appropriate. All existing code must pass the new rules (auto-fix where possible; manual fix otherwise).

---

### Story 4.1: Diff Lint Configurations

As a developer,
I want to compare the SmartNgRX `eslint.config.js` against our current `eslint.config.mjs`,
So that I know exactly which rules are new, missing, or replaced.

**Acceptance Criteria:**

**Given** both configuration files,
**When** I produce a diff of rule sets,
**Then** I have a documented list of: rules to add, rules to skip (e.g., jest-specific), and vitest equivalents to substitute.

**And** the diff is documented in `_bmad-output/implementation-artifacts/lint-rules-diff.md`.

---

### Story 4.2: Add New Lint Rules (Zero-Warning Phase)

As a developer,
I want the new lint rules applied to the codebase with all violations auto-fixed or manually corrected,
So that `pnpm all` passes with the stricter rule set in place.

**Acceptance Criteria:**

**Given** the list from Story 4.1,
**When** I add the new rules to `eslint.config.mjs` and run `pnpm lint --fix`,
**Then** all auto-fixable violations are corrected automatically.

**And** any remaining violations are fixed manually.

**And** `pnpm all` passes with zero lint errors and zero lint warnings.

---

### Story 4.3: Add Vitest-Equivalent Rules

As a developer,
I want the Jest-specific rules from SmartNgRX replaced with equivalent vitest/eslint-plugin-vitest rules,
So that our test code is held to the same quality bar as the source code.

**Acceptance Criteria:**

**Given** the jest rules identified in Story 4.1 as "skip — add vitest equivalent",
**When** I add `eslint-plugin-vitest` (or the appropriate package) and configure the vitest rule equivalents,
**Then** `pnpm all` passes with zero lint errors.

**And** the new test lint rules are documented with a brief rationale comment in `eslint.config.mjs`.

---

## Epic 5: Migrate CSS to Tailwind / Theme

**Goal:** Replace all component-level custom CSS with Tailwind utility classes or `--dms-*` / Angular Material theme CSS variables. No component should carry a `.css` or `.scss` block that duplicates layout or spacing behaviour Tailwind already provides. Also update `project-context.md` to document this policy.

---

### Story 5.1: Audit Component-Level CSS

As a developer,
I want a full list of all `.css`/`.scss` files in `dms-material` that contain non-trivial custom styles,
So that I know what needs to be migrated.

**Acceptance Criteria:**

**Given** all component stylesheets in `apps/dms-material/src`,
**When** I review each file for styles that are expressible as Tailwind utilities or theme variables,
**Then** every such occurrence is listed in `_bmad-output/implementation-artifacts/css-audit.md` with a proposed Tailwind replacement.

---

### Story 5.2: Replace Layout and Spacing CSS with Tailwind Utilities

As a developer,
I want all `margin`, `padding`, `display`, `flex`, `grid`, `width`, `height`, and positioning styles moved from component stylesheets into Tailwind classes on the template elements,
So that component stylesheets become empty or minimal.

**Acceptance Criteria:**

**Given** each layout/spacing rule identified in the audit,
**When** I replace it with the equivalent Tailwind class in the template and remove it from the stylesheet,
**Then** the component renders identically in both light and dark mode.

**And** `pnpm all` passes with no regressions.

**And** Playwright E2E tests pass on Chromium and Firefox.

---

### Story 5.3: Replace Hardcoded Colors with Theme Variables

As a developer,
I want all hardcoded color values replaced with `--dms-*` CSS variables or Angular Material theme tokens,
So that the app theme switch (light ↔ dark) correctly recolors every element.

**Acceptance Criteria:**

**Given** all hardcoded `color:`, `background:`, `border-color:` declarations in component stylesheets,
**When** I replace each with the appropriate `--dms-*` variable or Tailwind theme class,
**Then** no element displays an incorrect color in dark mode.

**And** the full dark-mode visual inspection (Playwright screenshot) shows no white-on-white or black-on-black text issues.

---

### Story 5.4: Update Project Context to Enforce CSS Policy

As a developer,
I want `_bmad-output/project-context.md` to explicitly state that Tailwind CSS and theme CSS variables take priority over component-level CSS,
So that future development (by humans and AI agents) follows the convention.

**Acceptance Criteria:**

**Given** the current `project-context.md`,
**When** I add a "CSS Policy" section,
**Then** the document states: "Prefer Tailwind utility classes for layout, spacing, and color. Use `--dms-*` / Angular Material theme tokens for brand colors. Component-level CSS is a last resort for truly component-specific styles that cannot be expressed otherwise."

---

## Epic 6: Upgrade Tailwind CSS to Version 4

**Goal:** Upgrade Tailwind CSS from v3 to v4 in the monorepo. The upgrade must not break the existing CSS, the CI pipeline, or the E2E tests. The PR #501 (`dependabot/npm_and_yarn/tailwindcss-4.2.1`) is a reference starting point, but we may work from scratch if cleaner.

---

### Story 6.1: Analyse Breaking Changes and Branch State

As a developer,
I want to understand exactly what broke in PR #501 when Tailwind v4 was applied,
So that I know what migration steps are required beyond a simple dependency bump.

**Acceptance Criteria:**

**Given** the PR #501 diff and CI failure logs,
**When** I review the breaking changes documented at tailwindcss.com/docs/upgrade-guide,
**Then** I have a documented migration checklist in `_bmad-output/implementation-artifacts/tailwind-v4-migration.md` covering: config file format changes, removed utilities, changed class names, and PostCSS plugin updates.

---

### Story 6.2: Update Dependencies and Configuration

As a developer,
I want the `tailwindcss` package and all related packages (`@tailwindcss/postcss`, etc.) upgraded to v4 in `package.json`,
So that the application builds with Tailwind v4.

**Acceptance Criteria:**

**Given** the current `package.json` and `postcss.config.js`,
**When** I update the Tailwind packages to v4 and adjust the PostCSS/Vite configuration as required by the migration guide,
**Then** `pnpm install` succeeds and `pnpm build` produces the frontend bundle without errors.

---

### Story 6.3: Migrate tailwind.config.js to v4 Format

As a developer,
I want the `tailwind.config.js` updated to the v4 configuration API (CSS-first config with `@theme` if applicable),
So that all existing custom theme tokens and content paths are preserved.

**Acceptance Criteria:**

**Given** the existing `tailwind.config.js`,
**When** I convert it to the v4 configuration format,
**Then** all custom colors, spacing, and breakpoints remain available as utility classes.

**And** the `content` paths correctly pick up all Angular component templates.

---

### Story 6.4: Fix All v4 Utility Class Breakages

As a developer,
I want any deprecated or renamed Tailwind utilities in templates to be updated to their v4 equivalents,
So that all templates compile and render correctly.

**Acceptance Criteria:**

**Given** the deprecated class list from the Tailwind v4 upgrade guide,
**When** I search for and replace all deprecated classes in the monorepo templates,
**Then** `pnpm all` (lint + build + unit tests) passes.

**And** `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox` both pass.

---

### Story 6.5: CI Pipeline Green with Tailwind v4

As a developer,
I want the full CI pipeline to pass with Tailwind v4 installed,
So that the upgrade can be merged to `main` with confidence.

**Acceptance Criteria:**

**Given** the Tailwind v4 upgrade commits on a feature branch,
**When** the CI pipeline runs (lint, build, unit tests, E2E Chromium, E2E Firefox, duplicate-check, format),
**Then** all pipeline steps pass with zero errors.

---

## Epic 7: CUSIP Cache Page Cosmetics

**Goal:** Fix visual issues on the CUSIP Cache page, with an emphasis on dark-mode correctness. If Epic 5 (CSS migration) has been completed, verify whether issues are already resolved before making new changes.

---

### Story 7.1: Inspect CUSIP Cache Page in Dark Mode

As a developer,
I want to load the application in dark mode and visually inspect the CUSIP Cache page,
So that I have a concrete list of cosmetic defects to fix.

**Acceptance Criteria:**

**Given** the application running locally with dark mode enabled,
**When** I navigate to the CUSIP Cache page,
**Then** I capture a screenshot and document each visible cosmetic defect (white-on-white, invisible text, incorrect background, layout misalignment) in `_bmad-output/implementation-artifacts/cusip-cosmetics-audit.md`.

**And** if Epic 5 has been completed, I confirm which defects (if any) are still present.

---

### Story 7.2: Fix White-on-White Text in Recently Added Section

As a developer,
I want the "Recently Added" section of the CUSIP Cache page to display correctly in dark mode,
So that users can read all text regardless of the active theme.

**Acceptance Criteria:**

**Given** the CUSIP Cache page in dark mode,
**When** I view the "Recently Added" section,
**Then** all text is legible (sufficient contrast ratio ≥ 4.5:1 against its background).

**And** the fix uses `--dms-*` theme variables or Angular Material color tokens — no hardcoded hex or RGB values.

**And** the fix also renders correctly in light mode (no regression).

---

### Story 7.3: Fix Any Remaining Dark-Mode Cosmetic Issues

As a developer,
I want all other cosmetic defects identified in Story 7.1 to be resolved,
So that the CUSIP Cache page looks polished in both themes.

**Acceptance Criteria:**

**Given** the audit list from Story 7.1 (excluding items resolved by Epic 5),
**When** I apply fixes for each remaining defect,
**Then** a fresh Playwright screenshot of the page in dark mode shows no remaining contrast or layout issues.

**And** `pnpm all` and E2E tests pass with no regressions.

---

## Epic 8: Storybook for Display-Only Components

**Goal:** Add Storybook to the `dms-material` project, create stories for all display-only components and pages (with mocked data), and integrate Playwright visual regression tests against those stories into the CI pipeline.

---

### Story 8.1: Install and Configure Storybook

As a developer,
I want Storybook installed and configured for the Angular `dms-material` project,
So that stories can be created and the Storybook dev server starts without errors.

**Acceptance Criteria:**

**Given** the current Angular 21 + Vite setup in `dms-material`,
**When** I install `@storybook/angular` (or the appropriate Storybook 8 Angular package) and run `pnpm storybook`,
**Then** the Storybook server starts on a local port and displays the default welcome story.

**And** the Storybook configuration is committed (`.storybook/` folder, `package.json` script updates).

**And** Storybook does not interfere with the existing `pnpm all` or E2E test commands.

---

### Story 8.2: Create Stories for Display-Only Components

As a developer,
I want a Storybook story for every display-only (presentational) component in `dms-material`,
So that components can be developed, reviewed, and tested in isolation.

**Acceptance Criteria:**

**Given** each component identified as display-only (no route, no service injection, input/output or signal based),
**When** I create a `*.stories.ts` file for each component,
**Then** the story renders the component with representative data in all significant visual states (default, empty, loading, error where applicable).

**And** every story compiles without TypeScript errors.

**And** `pnpm storybook:build` produces a static Storybook bundle without errors.

---

### Story 8.3: Create Stories for Full Pages with Mocked Data

As a developer,
I want a Storybook story for each full page component with its data dependencies mocked,
So that pages can be visually tested without a running backend.

**Acceptance Criteria:**

**Given** each routed page component in `dms-material`,
**When** I create a story that provides mocked SmartNgRX store data and/or Angular service stubs,
**Then** the page renders fully (no blank screens, no unhandled injection errors) in Storybook.

**And** both light-mode and dark-mode variants are included in each page story.

---

### Story 8.4: Implement Playwright Visual Regression Tests Against Storybook

As a developer,
I want Playwright to run visual regression tests against the Storybook stories as part of the CI pipeline,
So that any unintended visual change in a component or page is caught automatically.

**Acceptance Criteria:**

**Given** Storybook built as a static site,
**When** the Playwright visual regression suite runs against it (`pnpm e2e:storybook`),
**Then** baseline screenshots are captured for every story on first run.

**And** subsequent runs compare against the baseline and fail if a visual diff exceeds the configured threshold.

**And** failure output includes a side-by-side diff image.

**And** the Playwright storybook test suite is added to the CI pipeline (`pnpm e2e:dms-material:chromium` or a dedicated step).

---

### Story 8.5: Update CI Pipeline to Include Storybook Build and Visual Tests

As a developer,
I want the CI pipeline updated to build Storybook and run visual regression tests on every PR,
So that visual regressions are caught before code reaches `main`.

**Acceptance Criteria:**

**Given** the CI configuration (GitHub Actions workflow),
**When** a PR is opened or updated,
**Then** the pipeline includes: Storybook build step, visual regression test step, and failure annotations pointing to the changed component story.

**And** all existing pipeline steps (lint, build, unit tests, E2E) continue to pass.
