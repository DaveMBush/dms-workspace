---
stepsCompleted:
  - step-01-init
  - step-02-context
  - step-03-starter
  - step-04-decisions
  - step-05-patterns
  - step-06-structure
  - step-07-validation
  - step-08-complete
lastStep: 8
status: complete
completedAt: '2026-03-17'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/project-context.md
  - docs/architecture-dms-material.md
  - docs/architecture-server.md
  - docs/data-models.md
  - docs/api-contracts.md
  - docs/component-inventory.md
  - docs/integration-architecture.md
  - docs/project-overview.md
  - docs/source-tree-analysis.md
  - docs/deployment-guide.md
  - docs/development-guide.md
workflowType: 'architecture'
project_name: 'dms-workspace'
user_name: 'Dave'
date: '2026-03-17'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
FR1–FR35 from the PRD are fully implemented in the current MVP. The 8 epics in scope add zero
new functional behaviour. All work targets NFR improvement: maintainability, reliability, performance,
accessibility, and testability of the existing feature set.

**Non-Functional Requirements driving this epic set:**

- NFR-Maintainability: Remove dead code (E1), strengthen lint rules (E4), migrate CSS to Tailwind conventions (E5), upgrade Tailwind v4 (E6)
- NFR-Reliability: Enable skipped tests to restore full test coverage ≥ 88% (E3), fix CUSIP lookup failures (E2)
- NFR-Performance: Tailwind v4 reduces CSS bundle overhead; dead code removal reduces JS bundle
- NFR-Accessibility: Dark-mode correctness on CUSIP Cache page (E7), visual regression baseline (E8)
- NFR-Testability: Storybook per-component isolation + Playwright visual regression pipeline (E8)

**Scale & Complexity:**

- Primary domain: Full-stack SPA (Angular 21 + Fastify) — brownfield improvement sprint
- Complexity level: Medium — no new data models, API routes, or authentication flows
- Estimated architectural components: 4 major subsystems affected (Angular build pipeline, ESLint config, CSS layer system, CI pipeline)

---

### Technical Constraints & Dependencies

1. **Angular 21 zoneless + SmartNgRX must not be disturbed** — all new code must follow `inject()` pattern, `OnPush`, signal-first state, and the mandatory TDD ordering: ATDD story (write failing tests, set to skip) → Implementation story (un-skip tests, implement). Sprint planning must reflect this pairing for all 33 stories.

2. **Storybook 8 + Angular 21 + Vite (@analogjs) — ADR-001:**

   - Use `@storybook/angular` with `@storybook/builder-vite`.
   - Thread `@analogjs/vite-plugin-angular` through `viteFinal` in `.storybook/main.ts` — do not re-register it independently.
   - **Display-only components (Story 8.2):** pass data directly via `input()` signal values — no store wiring needed.
   - **Page components (Story 8.3):** use mock `EffectService` via `applicationConfig`, mirroring the TestBed unit test pattern. `provideSmartFeatureSignalEntities()` cannot be used directly — it requires a live Angular Router context.
   - MSW (Mock Service Worker) deferred unless a specific page component cannot be stubbed via EffectService.
   - **CI strategy:** Step 1 = `pnpm storybook:build`, Step 2 = `serve dist/storybook &`, Step 3 = `pnpm e2e:storybook`. Never run against a live dev server.
   - **Visual regression baselines** must be captured inside CI (first run auto-accepts), not on a developer machine. Different OS font rendering invalidates cross-machine baselines.
   - Visual regression diff threshold: ≥ 0.1% pixel difference (not 0) to avoid noise from sub-pixel rendering.

3. **CSS layer order is inviolable — ADR-002:**

   - The `@layer tailwind-base, material, tailwind-utilities` order in `styles.scss` must survive the Tailwind v4 migration.
   - Migration path: use the three individual imports (`@import "tailwindcss/base"`, `@import "tailwindcss/components"`, `@import "tailwindcss/utilities"`) — NOT `@import "tailwindcss"` monolith which destroys explicit layer ordering.
   - Keep JS config (`tailwind.config.js`) for now — `@theme {}` CSS-first token migration deferred to a future epic.
   - Use `@tailwindcss/postcss` in `postcss.config.js` (not the Vite plugin) to avoid plugin-ordering conflicts with `@analogjs/vite-plugin-angular`.
   - **Production bundle verification gate (Story 6.2):** inspect the emitted production CSS bundle and verify it contains Tailwind utility class definitions from inline Angular component templates. If absent, switch to `@tailwindcss/vite` and re-validate.
   - The `content` array in `tailwind.config.js` must explicitly include `./apps/dms-material/src/**/*.ts` and `./apps/dms-material/src/**/*.html` — monorepo structure defeats Tailwind v4 auto-detection heuristics.
   - Revisit the three-import compatibility path when Tailwind publishes a deprecation notice for it.

4. **massive.com CUSIP API — ADR-003:**

   - Fallback chain after integration: OpenFIGI → massive.com → Yahoo Finance.
   - Rate limit: 5 req/min. Implement a hand-rolled interval-based throttle in `massive-cusip.service.ts` with a conservative 4.5 req/min effective rate (10% safety margin). No external queue library required.
   - **Verify before implementing (Story 2.2):** inspect `prisma/schema.prisma` and `prisma/schema.postgresql.prisma` for the `resolution_source` field on `cusip_cache`. If absent, Story 2.2 must include: add field to both schema files and create a migration. Both schemas must remain in sync.
   - Unit test must assert: OpenFIGI success short-circuits the chain (massive.com is never called when OpenFIGI resolves).
   - Add a circuit-breaker: if massive.com returns HTTP 429, fall through to Yahoo Finance immediately.
   - The three failing CUSIPs (`691543102`, `88636J527`, `88634T493`) must be added to a regression test in Story 2.4.

5. **ESLint flat config — ADR-004:**

   - Adopt new rules in staged batches: configure as `'warn'` → run `pnpm lint --fix` → commit auto-fix batch → fix remaining manually → promote to `'error'` before epic close.
   - Run `pnpm lint --fix` twice in sequence and assert idempotent output before committing (detects rule conflicts).
   - `eslint-plugin-vitest` must be pinned to a version compatible with the existing `eslint` major.
   - `vitest/no-disabled-tests` must be set to `'warn'` (not `'error'`), with a flat-config override that sets it to `'off'` for spec files containing the comment `// @atdd`. This exempts intentionally-skipped ATDD tests while surfacing accidentally-skipped tests.
   - All future ATDD stories must add `// @atdd` as the first comment in the spec file to activate this exemption.
   - Stories 4.2/4.3 (TypeScript-affecting lint rules) should be sequenced _before_ Epic 5. Any lint rules that affect template syntax should be sequenced _after_ Epic 5 completes.

6. **Epic sequencing — refined hard constraints:**

   - E1 (dead code) → E3 (enable skipped tests) → E4 TypeScript rules → E5 (CSS migration) → E4 template rules (if any) → E6 (Tailwind v4) → E7 (CUSIP cosmetics) → E8 (Storybook)
   - **E7 is a hard prerequisite for E8 Story 8.4** (visual regression baseline capture). Baselines captured before E7 cosmetic fixes are invalid — the bugs become the "correct" baseline.
   - E5 + E6 together may resolve E7 issues — Story 7.1 must verify this before adding new fixes.
   - Epic 2 (massive.com) is independent of the CSS/Storybook sequence and can run in parallel.

7. **No data integrity pattern changes** — `deletedAt`, `version` optimistic locking, and CUID PKs are out of scope for all epics.

---

### Cross-Cutting Concerns Identified

- **Test suite health:** Epics 3 and 8 both affect test infrastructure. E3 must complete (suite fully green) before E8 visual baselines are captured.
- **CSS architecture:** Epics 5, 6, and 7 overlap on component stylesheets and the global SCSS layer system. Must not run in parallel on overlapping components.
- **ESLint configuration:** Epics 1 and 4 both affect which code must pass linting. E1 first reduces E4 remediation surface. E4 TypeScript rules before E5; any template syntax rules after E5.
- **CI pipeline integrity:** Epic 8 Story 8.5 modifies GitHub Actions. Must not break: lint, build, unit tests, E2E Chromium, E2E Firefox, duplicate-check, format. Storybook build should be CI-cached by source hash to avoid pipeline slowdown.
- **ATDD-first TDD ordering:** All 33 stories follow the mandatory pattern. `// @atdd` comment convention must be followed for ESLint `vitest/no-disabled-tests` exemption to apply.
- **Inline component styles audit:** Story 5.1 must scan both `.scss` files AND `styles:` arrays inside `@Component` decorators in `.ts` files — not just standalone stylesheet files.
- **Dead code deletion safety:** Story 1.1 must include a route-reference scan (not just selector scan) to catch components loaded only via dynamic `loadComponent` strings.

---

### Failure Mode Register

| Epic | Top Risk                                                                 | Prevention                                                                                                           |
| ---- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| E1   | Deleting component used only via dynamic route string                    | Route-reference scan in Story 1.1; E2E must cover all routes                                                         |
| E2   | massive.com undocumented daily cap; `resolution_source` field absent     | Story 2.1 documents full rate-limit terms; inspect schema before Story 2.2                                           |
| E3   | Skipped test covers a real unfixed bug — unskipping swells scope         | Story 3.1 classifies: `unskip-trivial` / `unskip-needs-fix` / `delete`; `needs-fix` items spawn separate bug stories |
| E4   | `vitest/no-disabled-tests: 'error'` lands before E3 completes            | Set to `'warn'` initially; E3 must complete before promoting to `'error'`                                            |
| E5   | Tailwind classes on Material host element blocked by view encapsulation  | Test in real app with CDK harness tests, not Storybook only                                                          |
| E6   | `@analogjs` + `@tailwindcss/postcss` conflict drops CSS silently in prod | Run prod build verification gate: inspect bundle for Tailwind class definitions                                      |
| E7   | Fix uses `::ng-deep` (banned)                                            | ESLint catches it; use Material mixin or `--dms-*` variables only                                                    |
| E8   | Baselines captured before E7 fixes; cosmetic bugs become "correct"       | Hard sequencing constraint: E7 complete before E8 Story 8.4                                                          |

---

## Starter Template Evaluation

**Not applicable — brownfield project.** The full technology stack is already operational. No project initialization or starter template selection is required.

**Existing stack (confirmed from project documentation):**

| Layer              | Technology                           | Version     |
| ------------------ | ------------------------------------ | ----------- |
| Monorepo           | Nx                                   | 22.5.4      |
| Package manager    | pnpm                                 | 10.x        |
| Frontend framework | Angular (standalone, zoneless)       | 21.2.x      |
| Build (Angular)    | Vite + @analogjs/vite-plugin-angular | 7.x / 2.1.x |
| UI components      | Angular Material + Angular CDK       | 21.2.x      |
| CSS utility        | Tailwind CSS                         | 3.4.1       |
| State management   | @smarttools/smart-signals            | 3.0.0       |
| Auth               | AWS Amplify                          | 6.x         |
| Backend            | Fastify                              | 5.8.x       |
| ORM                | Prisma                               | 7.2.x       |
| Database (dev)     | better-sqlite3                       | 12.6.x      |
| Database (prod)    | PostgreSQL                           | —           |
| Unit testing       | Vitest + @analogjs/vitest-angular    | 4.0.x       |
| E2E testing        | Playwright                           | 1.55.1      |
| Language           | TypeScript                           | 5.9.3       |

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- ADR-001: Storybook + Angular 21 + Vite integration strategy
- ADR-002: Tailwind v4 CSS layer preservation + PostCSS integration
- ADR-003: massive.com CUSIP API rate-limit queue strategy
- ADR-004: ESLint flat config rule adoption sequence

**Important Decisions (Shape Architecture):**

- Epic sequencing hard constraints (E7 before E8.4, E1 before E4, E5 before E6)
- `// @atdd` comment convention for ESLint skip exemption
- Storybook CI strategy: static build → serve → Playwright (not live dev server)
- Visual regression baseline capture inside CI, not developer machines

**Deferred Decisions (Future Epics):**

- Tailwind `@theme {}` CSS-first token migration (Epic 6+ successor)
- MSW HTTP mocking in Storybook (only if EffectService mock pattern proves insufficient)
- `@tailwindcss/vite` Vite plugin (fallback in Story 6.2 only if bundle verification fails)

---

### Data Architecture

All data architecture decisions are established by the existing codebase and are not changed by
the current epic set. Reference: `docs/data-models.md`, `prisma/schema.prisma`.

- ORM: Prisma 7.2.x with better-sqlite3 adapter (dev) and PostgreSQL (prod)
- Pattern: Soft-delete (`deletedAt`), optimistic locking (`version`), CUID PKs
- Both schema files (`schema.prisma` + `schema.postgresql.prisma`) must stay in sync
- **New (Epic 2 only):** `cusip_cache.resolution_source` field must be verified and added via migration if absent before Story 2.2 implementation

---

### Authentication & Security

No changes. Existing: AWS Cognito RS256 JWT, CSRF tokens, rate limiting (100 req/15min default /
10 req/15min auth / 5 req/hr import), HTTP-only cookies, mock auth for dev.
Reference: `docs/architecture-server.md`.

---

### API & Communication Patterns

No new routes in this epic set. Existing patterns remain unchanged.

- SmartNgRX POST-by-IDs entity loading
- `x-table-state` base64 JSON header for sort/filter
- `@fastify/autoload` route auto-registration under `/api`
- **New (Epic 2 only):** massive.com service follows existing service naming convention (`massive-cusip.service.ts`) and is injected only within the CUSIP resolution chain — not exposed as a route

---

### Frontend Architecture

No new routes, components, or entities in this epic set. Existing patterns remain unchanged.
Reference: `docs/architecture-dms-material.md`, `_bmad-output/project-context.md`.

**New (Epic 8 only):**

- Storybook stories live in `apps/dms-material/src/` co-located with components as `*.stories.ts`
- Display component stories: pass data via `input()` signal values directly — no store
- Page component stories: provide mock `EffectService` via `applicationConfig({ providers: [...] })`
- Both light and dark mode variants required for every page story
- CI Storybook static bundle output: `dist/storybook/` (gitignored, CI artifact)

---

### Infrastructure & Deployment

No infrastructure changes for Epics 1–7.

**New (Epic 8):** GitHub Actions pipeline gains two new steps:

1. `pnpm storybook:build` — generate static Storybook bundle
2. `pnpm e2e:storybook` — run Playwright visual regression against served static bundle

Storybook build step should be cached in CI by source hash of `apps/dms-material/src/**` to
avoid rebuilding on unrelated changes.

---

### Decision Impact Analysis

**Implementation Sequence (enforced hard ordering):**

1. E1 (dead code removal) — reduces surface for all subsequent epics
2. E3 (enable skipped tests) — restore green test baseline
3. E4 TypeScript lint rules — before CSS migration to avoid double-remediating TS files
4. E2 (massive.com) — independent; parallelizable with E4/E5
5. E5 (CSS → Tailwind migration) — prerequisite for E6 and E7
6. E4 template lint rules (if any) — after E5
7. E6 (Tailwind v4 upgrade) — after E5 class names are normalised
8. E7 (CUSIP cosmetics) — after E5+E6 may already resolve issues; hard prerequisite for E8.4
9. E8 (Storybook + visual regression) — last; requires green suite and resolved cosmetics

**Cross-Component Dependencies:**

- E4's `vitest/no-disabled-tests: 'warn'` setting depends on E3 completing before promotion to `'error'`
- E8 Story 8.4 (baseline capture) is invalidated if E7 is incomplete — cosmetic bugs become the "correct" baseline
- E6 Story 6.2 has a go/no-go verification gate: if prod bundle lacks Tailwind classes from inline templates, switch integration approach before proceeding

---

## Implementation Patterns & Consistency Rules

_Patterns that must be applied uniformly across all 33 stories to prevent contradictions between epics._

---

### 1. Naming Patterns

**E2 — CUSIP resolution_source values**

The `resolution_source` column in `cusip_cache` uses these exact string literals only:

| Value        | Meaning                             |
| ------------ | ----------------------------------- |
| `'openfigi'` | Resolved via OpenFIGI API           |
| `'massive'`  | Resolved via massive.com            |
| `'yahoo'`    | Resolved via Yahoo Finance fallback |
| `null`       | Not yet attempted                   |

> **Verify-before-implement constraint:** Confirm `resolution_source` column exists in the current `cusip_cache` schema (Prisma schema or migration files) before writing any E2 story code. If absent, create a schema migration as E2 Story 1.

**E8 — Storybook file naming**

```
{ComponentName}.stories.ts          # co-located with component
title: '{Feature}/{ComponentName}'  # e.g. 'Holdings/HoldingsTableComponent'
story export name: PascalCase        # e.g. Default, DarkTheme, EmptyState
```

**E2 — massive.com service naming**

- File: `massive-cusip.service.ts`
- Class: `MassiveCusipService`
- All methods: named functions only (no arrow functions assigned to properties)
- Throttle helper: named `throttledFetch` (or similar explicit name — no inline anonymous)

---

### 2. Structure Patterns

**E1 — Dead component classification (5 criteria)**

A component is classified "dead" only when ALL five conditions are true:

1. Zero `import` references in any `*.ts` file
2. Not declared in any `NgModule` (N/A for standalone, but check anyway)
3. Not registered in any router `loadComponent` or `loadChildren`
4. Not referenced in any `*.html` template
5. Not referenced in any Storybook `*.stories.ts` file

If any one condition is false → the component is NOT dead; exclude from deletion list.

**E3 — ATDD spec file first-line convention**

Every ATDD acceptance-test spec file must begin with a `// @atdd` comment on line 1:

```typescript
// @atdd
import { describe, it, expect } from 'vitest';
// ...
```

This marker enables:

- ESLint override: allows `it.skip` / `xit` within `// @atdd` files (ADR-004)
- Tooling grep: `grep -r '@atdd' apps/` to enumerate all acceptance tests
- CI gate: count of `@atdd` files must not decrease between commits

**E8 — Storybook directory structure**

```
apps/dms-material/src/
  app/
    {feature}/
      {component}/
        {component}.component.ts
        {component}.component.html  (or inline template)
        {component}.stories.ts       ← co-located here
  .storybook/
    main.ts                          ← Vite builder config + Angular plugin
    preview.ts                       ← global decorators, BrowserAnimationsModule
    tsconfig.json                    ← extends root, includes stories glob
```

---

### 3. Format Patterns

**E5 — CSS audit document table format**

The audit document produced in E5 Story 1 must use this column format:

| Component                | File                            | Current Style     | Type   | Proposed Tailwind Class |
| ------------------------ | ------------------------------- | ----------------- | ------ | ----------------------- |
| `HoldingsTableComponent` | `holdings-table.component.scss` | `margin-top: 8px` | layout | `mt-2`                  |

- **Type** values: `layout` \| `spacing` \| `typography` \| `color` \| `other`
- **Proposed Tailwind Class**: must reference Tailwind v3 class names (migration happens in E5; v4 upgrade in E6)
- Color classes must be left blank with note "Managed by Angular Material" — do not migrate

**E8 — Storybook mock provider pattern**

Services with HTTP dependencies must be mocked using `applicationConfig`, not TestBed:

```typescript
// CORRECT — applicationConfig pattern
import { applicationConfig } from '@angular/core';

export const Default: Story = {
  decorators: [
    applicationConfig({
      providers: [{ provide: HoldingsService, useClass: MockHoldingsService }],
    }),
  ],
};

// WRONG — do not use
import { TestBed } from '@angular/core/testing'; // ← never in stories
```

**E4 — lint-rules-diff.md column format**

| Rule                                 | Old Setting | New Setting | Rationale           | Files to Fix |
| ------------------------------------ | ----------- | ----------- | ------------------- | ------------ |
| `@typescript-eslint/no-explicit-any` | `warn`      | `error`     | Enforce type safety | 12           |

---

### 4. Process Patterns

**E4 — Lint rule adoption sequence (per rule batch)**

Each lint rule change must follow this 5-step sequence before moving to the next rule:

1. **Document** — add row to `lint-rules-diff.md`
2. **Configure** — set rule to `'warn'` in `eslint.config.mjs`
3. **Fix all warnings** — resolve every existing violation
4. **Promote** — change rule to `'error'`
5. **Commit** — one atomic commit per rule batch: `feat(lint): promote {rule-name} to error`

Never batch multiple rule promotions in a single commit.

**E1 — Dead code deletion validation loop**

For each candidate component identified in the scan:

1. Verify all 5 classification criteria (see Structure Patterns above)
2. Run `pnpm nx run dms-material:build` — confirm no build errors
3. Run `pnpm nx run dms-material:test` — confirm test count ≥ pre-deletion baseline
4. Commit individually: `chore(cleanup): remove dead {ComponentName}`

Never batch-delete multiple components in a single commit.

**E5/E6 — Tailwind migration granularity**

- Migrate one component per commit during E5: `style(tailwind): migrate {ComponentName} to utility classes`
- E6 upgrade is a single commit after all E5 migrations are complete: `chore(tailwind): upgrade to v4`
- CSS audit document must be committed before any migration begins

---

### 5. Enforcement Guidelines

**All agents MUST:**

- Check `resolution_source` column existence before writing E2 code
- Apply the `// @atdd` first-line convention to every new ATDD spec file
- Use the 5-criterion dead-component checklist before recommending deletion
- Use `applicationConfig` (never TestBed) in Storybook stories
- Follow the 5-step lint promotion sequence; never batch rule changes
- Migrate one Tailwind component per commit during E5
- Verify E7 is fully complete before running E8 Story 8.4 baseline capture

**Anti-patterns (never do these):**

| Anti-Pattern                                                            | Epic | Correct Pattern                                  |
| ----------------------------------------------------------------------- | ---- | ------------------------------------------------ |
| Batch-delete multiple dead components in one commit                     | E1   | One component per commit, validated individually |
| Add color Tailwind classes during E5 migration                          | E5   | Leave color to Angular Material; layout only     |
| Promote lint rule to `error` without fixing all `warn` violations first | E4   | Follow 5-step sequence                           |
| Capture Storybook baseline (E8.4) before E7 cosmetics are resolved      | E8   | E7 hard prerequisite                             |
| Use `TestBed` inside a Storybook story                                  | E8   | Use `applicationConfig` decorator                |
| Use anonymous arrow functions in `massive-cusip.service.ts`             | E2   | Named functions only                             |

---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
dms-workspace/                                # Nx monorepo root (pnpm 10.x)
├── nx.json                                   # Nx workspace config
├── pnpm-workspace.yaml                       # pnpm workspace definition
├── package.json                              # root deps: Playwright, Vitest, devtools
├── tsconfig.base.json                        # shared TS paths & compiler options
├── eslint.config.mjs                         # root ESLint flat config (E4 target)
├── tailwind.config.js                        # Tailwind v3 config (E6 migration target)
├── postcss.config.js                         # PostCSS config (E6: add @tailwindcss/vite)
├── vitest.config.ts                          # root Vitest config
├── vitest.workspace.ts                       # per-app vitest project definitions
├── prisma/
│   ├── schema.prisma                         # SQLite dev schema (E2: verify resolution_source)
│   ├── schema.postgresql.prisma              # PostgreSQL prod schema
│   └── migrations/                           # SQLite migration history
│
├── apps/
│   ├── dms-material/                         # Angular 21 SPA
│   │   ├── project.json                      # Nx project targets (build, test, lint, storybook)
│   │   ├── eslint.config.mjs                 # app-level ESLint config (E4 target)
│   │   ├── vite.config.ts                    # Vite + @analogjs/vite-plugin-angular
│   │   ├── .storybook/                       # ← NEW (E8): Storybook configuration
│   │   │   ├── main.ts                       # Vite builder, Angular plugin, stories glob
│   │   │   ├── preview.ts                    # global decorators, BrowserAnimationsModule
│   │   │   └── tsconfig.json                 # extends root; includes stories/** glob
│   │   └── src/
│   │       ├── main.ts                       # bootstrap (provideZonelessChangeDetection)
│   │       ├── styles.scss                   # global styles: @layer rules (E5, E6 target)
│   │       ├── index.html
│   │       ├── test-setup.ts
│   │       ├── themes/                       # Material 3 theme definitions
│   │       ├── environments/
│   │       └── app/
│   │           ├── app.ts                    # root AppComponent
│   │           ├── app.config.ts             # provideRouter, HTTP, SmartNgRX, Cognito
│   │           ├── app.routes.ts             # lazy route definitions
│   │           ├── amplify.config.ts         # AWS Cognito/Amplify bootstrap
│   │           ├── auth/                     # login, logout, guards (E1 scan target)
│   │           ├── dashboard/                # dashboard page (E1 scan target)
│   │           ├── accounts/                 # accounts feature (E1 scan target)
│   │           │   ├── account.ts
│   │           │   ├── account-component.service.ts
│   │           │   ├── account-summary/
│   │           │   ├── open-positions/
│   │           │   ├── sold-positions/
│   │           │   └── dividend-deposits/
│   │           ├── global/
│   │           │   ├── cusip-cache/          # E2 (resolution_source), E7 (cosmetics)
│   │           │   │   ├── cusip-cache.component.ts      # E7: dark-mode fixes
│   │           │   │   ├── cusip-cache.html
│   │           │   │   ├── cusip-cache.scss              # E5: migrate layout classes
│   │           │   │   ├── cusip-cache-source.type.ts    # E2: verify values match ADR-003
│   │           │   │   └── cusip-cache-add-dialog.component.ts
│   │           │   ├── global-screener/      # E1 scan target
│   │           │   ├── global-universe/      # E1 scan target
│   │           │   └── global-error-logs.ts  # E1 scan target
│   │           ├── shared/                   # shared components, pipes, directives
│   │           ├── shell/                    # app shell, nav, layout
│   │           ├── store/                    # SmartNgRX store definitions
│   │           ├── universe-settings/
│   │           └── account-panel/
│   │
│   ├── server/                               # Fastify 5 API backend
│   │   ├── project.json
│   │   ├── eslint.config.mjs                 # server ESLint config (E4 target)
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── main.ts                       # Fastify server bootstrap
│   │       ├── app/
│   │       │   ├── app.ts                    # plugin registration, autoload
│   │       │   ├── config/                   # env config, database config
│   │       │   ├── plugins/                  # cors, cookie, csrf, rate-limit, auth
│   │       │   ├── middleware/
│   │       │   ├── routes/
│   │       │   │   ├── admin/
│   │       │   │   │   └── cusip-cache/      # E2: add massive.com route handler
│   │       │   │   ├── auth/
│   │       │   │   ├── accounts/
│   │       │   │   ├── symbol/               # E2: CUSIP lookup, resolution logic
│   │       │   │   ├── screener/
│   │       │   │   ├── universe/
│   │       │   │   ├── import/
│   │       │   │   └── ...
│   │       │   ├── services/
│   │       │   │   ├── cusip-cache-cleanup.service.ts  # E2: integrate massive.com fallback
│   │       │   │   ├── cusip-audit-log.service.ts
│   │       │   │   └── ...
│   │       │   ├── prisma/                   # Prisma client instance, helpers
│   │       │   ├── utils/
│   │       │   └── types/
│   │       ├── middleware/
│   │       └── utils/
│   │           └── massive-cusip.service.ts  # ← NEW (E2): massive.com throttled client
│   │
│   └── dms-material-e2e/                     # Playwright E2E suite
│       ├── playwright.config.ts
│       ├── fixtures/
│       └── src/
│           ├── cusip-cache-admin.spec.ts     # E7+E8 regression scope
│           ├── theme.spec.ts                 # E7: dark mode visual assertions
│           ├── storybook-visual.spec.ts      # ← NEW (E8.4): visual regression baseline
│           ├── *.spec.ts                     # E3: re-enable any skipped tests here
│           └── helpers/
│
├── docs/                                     # Reference documentation (read-only for epics)
│   ├── lint-rules-diff.md                    # ← NEW (E4): lint rule change audit table
│   ├── css-tailwind-audit.md                 # ← NEW (E5): CSS migration audit table
│   └── ...
│
└── _bmad-output/
    └── planning-artifacts/
        ├── architecture.md                   # this document
        ├── prd.md
        └── epics.md
```

---

### Architectural Boundaries

**API Boundaries:**

| Boundary               | Location                               | Protocol                             | Auth                                              |
| ---------------------- | -------------------------------------- | ------------------------------------ | ------------------------------------------------- |
| Frontend → Backend     | `apps/server/src/app/routes/`          | REST/JSON over HTTPS                 | AWS Cognito JWT (RS256) in HTTP-only cookie       |
| Backend → AWS Cognito  | `plugins/auth`                         | HTTPS/JWKS                           | RS256 public key verification                     |
| Backend → OpenFIGI     | `routes/admin/cusip-cache/`            | HTTPS REST                           | API key in header                                 |
| Backend → massive.com  | `utils/massive-cusip.service.ts` ← NEW | HTTPS REST                           | API key in header; 4.5 req/min throttle (ADR-003) |
| Backend → Prisma       | `app/prisma/`                          | Local (SQLite dev / PostgreSQL prod) | TLS in prod                                       |
| Storybook → Components | `.storybook/` ← NEW                    | In-process (Vite dev server)         | None (mocked providers)                           |

**Component Boundaries:**

- **Feature modules** are flat directories under `apps/dms-material/src/app/{feature}/` — each self-contained (standalone components, no NgModules)
- **Shared components** live in `apps/dms-material/src/app/shared/` — imported directly by feature components; no barrel re-exports
- **State**: `apps/dms-material/src/app/store/` — SmartNgRX `@smarttools/smart-signals` entity stores; signals flow down to components, user events flow up via `EffectService<T>`
- **Server routes** are co-located with their handlers under `apps/server/src/app/routes/{domain}/` — no shared route barrels

**Data Boundaries:**

| Layer             | Technology                                | Location                                 |
| ----------------- | ----------------------------------------- | ---------------------------------------- |
| Persistence       | Prisma + SQLite (dev) / PostgreSQL (prod) | `apps/server/src/app/prisma/`            |
| Server-side cache | In-memory (rate-limit store)              | Fastify plugin                           |
| Client-side state | SmartNgRX signals                         | `apps/dms-material/src/app/store/`       |
| Auth tokens       | HTTP-only cookies (never localStorage)    | Browser ↔ Server                         |
| Test database     | SQLite fixture                            | `apps/dms-material-e2e/test-database.db` |

---

### Requirements to Structure Mapping

| Epic                        | Stories | Primary FS Locations                                                                                                                                       |
| --------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **E1** Dead Code Removal    | 1.1–1.4 | `apps/dms-material/src/app/**` — full scan; deletions from any dead component dir                                                                          |
| **E2** massive.com CUSIP    | 2.1–2.4 | `apps/server/src/app/utils/massive-cusip.service.ts` (NEW), `routes/admin/cusip-cache/`, `services/cusip-cache-cleanup.service.ts`, `prisma/schema.prisma` |
| **E3** Enable skipped tests | 3.1–3.4 | `apps/dms-material/src/app/**/*.spec.ts`, `apps/server/src/app/**/*.spec.ts`                                                                               |
| **E4** Lint rules           | 4.1–4.3 | `eslint.config.mjs` (root), `apps/dms-material/eslint.config.mjs`, `apps/server/eslint.config.mjs`; companion: `docs/lint-rules-diff.md` (NEW)             |
| **E5** CSS → Tailwind       | 5.1–5.3 | `apps/dms-material/src/app/**/*.scss`, `styles.scss`; audit: `docs/css-tailwind-audit.md` (NEW)                                                            |
| **E6** Tailwind v4          | 6.1–6.3 | `tailwind.config.js`, `postcss.config.js`, `package.json`, `styles.scss`                                                                                   |
| **E7** CUSIP cosmetics      | 7.1–7.2 | `apps/dms-material/src/app/global/cusip-cache/cusip-cache.component.ts`, `.html`, `.scss`                                                                  |
| **E8** Storybook + visual   | 8.1–8.4 | `apps/dms-material/.storybook/` (NEW), `**/*.stories.ts` (NEW, co-located), `apps/dms-material-e2e/src/storybook-visual.spec.ts` (NEW)                     |

**Cross-Cutting Concerns → Locations:**

| Concern                                                                | Lives at                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------- |
| ATDD spec files (`// @atdd`)                                           | Co-located: `{component}.atdd.spec.ts` alongside source |
| Angular Material theme vars (`--dms-*`)                                | `apps/dms-material/src/themes/`                         |
| CSS layer order (`@layer tailwind-base, material, tailwind-utilities`) | `apps/dms-material/src/styles.scss`                     |
| Rate-limit config (4.5 req/min)                                        | `apps/server/src/app/utils/massive-cusip.service.ts`    |
| ESLint `// @atdd` override rule                                        | Root `eslint.config.mjs` overridePatterns block         |

---

### Integration Points

**Internal Communication:**

- Angular components → SmartNgRX store via `inject(EffectService)` (signal-based; no constructor injection)
- Fastify routes → Services via `@fastify/autoload` DI pattern
- E2 resolution chain: `cusip-cache-cleanup.service.ts` → OpenFIGI → `massive-cusip.service.ts` → Yahoo Finance fallback

**External Integrations:**

| Integration        | Direction           | Rate Limit               | Error Strategy                          |
| ------------------ | ------------------- | ------------------------ | --------------------------------------- |
| OpenFIGI API       | Server outbound     | None specified           | Retry × 3, then massive.com             |
| massive.com CUSIP  | Server outbound     | 5 req/min (4.5 enforced) | Hand-rolled throttle queue; skip on 429 |
| Yahoo Finance      | Server outbound     | Unspecified              | Last-resort fallback only               |
| AWS Cognito (JWKS) | Server inbound-auth | N/A                      | Reject on verification failure          |

**E2 CUSIP Resolution Data Flow:**

```
POST /api/admin/cusip-cache/resolve
  → cusip-cache-cleanup.service.ts
    → [check DB cache]
      → if miss: OpenFIGI lookup
          → if fail: massive-cusip.service.ts (throttled, 4.5/min)
              → if fail: Yahoo Finance fallback
                  → write result + resolution_source to cusip_cache table
```

---

### New Files Summary (epic deliverables)

| File                                                 | Epic | Notes                                         |
| ---------------------------------------------------- | ---- | --------------------------------------------- |
| `apps/server/src/app/utils/massive-cusip.service.ts` | E2   | Named functions; throttle per ADR-003         |
| `apps/dms-material/.storybook/main.ts`               | E8   | Vite builder; `@analogjs/vite-plugin-angular` |
| `apps/dms-material/.storybook/preview.ts`            | E8   | `BrowserAnimationsModule`, Material theme     |
| `apps/dms-material/.storybook/tsconfig.json`         | E8   | Extends root; stories glob                    |
| `**/{component}.stories.ts`                          | E8   | Co-located with each component                |
| `apps/dms-material-e2e/src/storybook-visual.spec.ts` | E8   | Visual regression baseline (after E7)         |
| `docs/lint-rules-diff.md`                            | E4   | Lint rule change audit table                  |
| `docs/css-tailwind-audit.md`                         | E5   | CSS migration audit table                     |

---

## Quality Tool Governance

This section defines the rules for configuring and maintaining the quality enforcement tools in the workspace. All tools run as part of `pnpm all` or as separate CI steps; every check must pass before a story is considered done.

### jscpd (Code Duplication)

**Config file:** `.jscpd.json`
**CI command:** `pnpm dupcheck`
**Threshold:** 0.1% maximum duplication across the scanned codebase

**Rules:**

- Every path in the `ignore` array must resolve to an existing file or directory in the repository. Invalid (non-existent) paths must be removed immediately.
- Duplication violations must be resolved by refactoring duplicated code into shared utilities, services, or base abstractions — never by adding new suppression entries to the `ignore` array.
- The `ignore` array may only contain infrastructure/config patterns (e.g., `node_modules`, `dist`, `coverage`, spec files, config files) and generated output directories (e.g., `_bmad-output`, `docs`). Application source code paths must not be suppressed.
- When new shared code is extracted, each file must export exactly one item (per the `@smarttools/one-exported-item-per-file` ESLint rule) and include a corresponding spec file if it contains non-trivial logic.

### Vitest (Unit Test Coverage)

**Config file:** `vitest.config.ts` (root), per-project configs in `apps/*/vitest.config.ts`
**CI command:** runs as part of `pnpm all` via `nx affected -t test --coverage`
**Thresholds:** 100% for `branches`, `functions`, `lines`, and `statements`

**Rules:**

- Coverage thresholds must not be lowered. All four metrics (branches, functions, lines, statements) must remain at 100%.
- `/* v8 ignore next */` (or `/* v8 ignore start/stop */`) comments are only permitted for provably unreachable branches (e.g., TypeScript exhaustive switch default cases). Each ignore comment must include an explanatory comment on the preceding line stating why the branch is unreachable.
- The `exclude` list in the coverage config must not be modified to hide coverage gaps in application source code. Only test infrastructure, config files, type definitions, and build artifacts may be excluded.
- Tests run through Nx (`npx nx test <project> --coverage`), not directly via the `vitest` CLI, to ensure project-level isolation and correct configuration.

### ESLint (Static Analysis)

**Config file:** `eslint.config.mjs` (root), per-project configs in `apps/*/eslint.config.mjs`
**CI command:** runs as part of `pnpm all` via `nx affected -t lint`

**Rules:**

- `eslint-disable` suppression comments (inline or block) require a brief justification comment explaining why the rule is disabled for that specific line or block.
- New ESLint rules or rule changes must be documented in `docs/lint-rules-diff.md` with the rule name, old severity, new severity, and rationale.
- The `@smarttools/one-exported-item-per-file` rule is enforced workspace-wide: every TypeScript file must export exactly one item. No exceptions without documented justification.

### Prettier (Code Formatting)

**CI command:** `pnpm format` (runs `prettier --write .` followed by verification)

**Rules:**

- All committed code must pass `pnpm format` without changes. Run `pnpm format` before committing.
- Prettier configuration is workspace-level only. Per-file or per-directory overrides are not permitted.

### Governance Enforcement

All quality checks are enforced through the CI pipeline. The `pnpm all` command runs lint, build, and test (with coverage) for all affected projects. Additionally, `pnpm dupcheck` and `pnpm format` run as separate steps. Every story's Definition of Done requires all checks to pass. No PR may be merged with failing quality gates.

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**

| Decision Pair                                                                                                   | Compatible? | Notes                                                                             |
| --------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------- |
| ADR-001 (Storybook 8 + `@analogjs/vite-plugin-angular`) + Angular 21 standalone                                 | ✅          | Vite builder shares same plugin; no zone.js in either path                        |
| ADR-002 (Tailwind v4 three-import path) + CSS layer rule (`@layer tailwind-base, material, tailwind-utilities`) | ✅          | Three-import approach preserves layer order; v4 compatible                        |
| ADR-003 (massive.com 4.5 req/min throttle) + Fastify rate-limit plugin                                          | ✅          | Separate concerns — Fastify rate-limit guards inbound; throttle controls outbound |
| ADR-004 (`// @atdd` ESLint override) + `vitest/no-disabled-tests: 'error'`                                      | ✅          | Override scoped to `*.atdd.spec.ts` pattern only; unit tests unaffected           |
| E7 hard prerequisite for E8.4 + implementation sequence table                                                   | ✅          | Documented in both Step 4 (sequence) and Step 5 (process pattern) — consistent    |
| SmartNgRX `inject()` pattern + zoneless `provideZonelessChangeDetection()`                                      | ✅          | Signal-based store is zoneless-safe; no zone.js triggers needed                   |

No contradictory decisions found.

**Pattern Consistency:**

- Naming patterns align with file structure: `massive-cusip.service.ts` placed at `apps/server/src/app/utils/`; `{component}.stories.ts` co-located with components ✅
- `// @atdd` first-line convention, ESLint override (ADR-004), and CI gate definition are mutually reinforcing ✅
- One-commit-per-component granularity rule appears in both E1 (dead code) and E5 (Tailwind migration) — consistent ✅

**Structure Alignment:**

- `.storybook/main.ts` uses same Vite/Angular plugin as `vite.config.ts` — supported by ADR-001 ✅
- `docs/lint-rules-diff.md` and `docs/css-tailwind-audit.md` are defined as new files in Step 6; their column formats are defined in Step 5 — consistent ✅

---

### Requirements Coverage Validation ✅

**Epic Coverage:**

| Epic                    | Architectural Support                                                                                          | Coverage |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | -------- |
| E1 Dead Code Removal    | 5-criterion classification rule; per-commit deletion loop; build+test gate                                     | ✅ Full  |
| E2 massive.com CUSIP    | ADR-003; `massive-cusip.service.ts` location; resolution_source verify-first; route handler location           | ✅ Full  |
| E3 Enable Skipped Tests | `// @atdd` convention; ADR-004 ESLint override; `*.atdd.spec.ts` naming                                        | ✅ Full  |
| E4 Lint Rules           | 5-step promotion sequence; `lint-rules-diff.md` format; E4-before-E5 ordering                                  | ✅ Full  |
| E5 CSS → Tailwind       | CSS audit table format; no-color rule; per-commit migration; prerequisite for E6/E7                            | ✅ Full  |
| E6 Tailwind v4          | ADR-002; `postcss.config.js` change; go/no-go gate (Story 6.2)                                                 | ✅ Full  |
| E7 CUSIP Cosmetics      | Component location defined; hard prerequisite for E8.4 enforced in 2 places                                    | ✅ Full  |
| E8 Storybook + Visual   | ADR-001; `.storybook/` structure; `applicationConfig` mock pattern; stories naming; `storybook-visual.spec.ts` | ✅ Full  |

**NFR Coverage:**

| NFR             | Epic(s) | Architecturally Addressed                                                 |
| --------------- | ------- | ------------------------------------------------------------------------- |
| Maintainability | E1, E4  | Dead code criteria + lint promotion sequence                              |
| Reliability     | E2, E3  | Throttle prevents 429 failures; test restoration restores coverage ≥ 88%  |
| Performance     | E1, E6  | Bundle reduction via dead code + Tailwind v4 CSS overhead reduction       |
| Accessibility   | E7      | Dark-mode CSS correctness on CUSIP Cache page                             |
| Testability     | E8      | Per-component Storybook isolation + Playwright visual regression pipeline |

---

### Implementation Readiness Validation ✅

**Decision Completeness:**
All 4 ADRs include problem statement, chosen option, rationale, and implications. Implementation sequence with hard ordering is documented. go/no-go gate for E6 Story 6.2 is explicit.

**Structure Completeness:**
Complete directory tree with all existing and new files. All 8 new files explicitly named with epic attribution. Integration boundaries and data flow diagram for E2 included.

**Pattern Completeness:**
All 9 identified conflict points are addressed. Anti-patterns table covers 6 failure modes. Process patterns include step-by-step sequences, not just descriptions.

---

### Gap Analysis Results

**Critical Gaps:** None.

**Important Gaps:**

> **GAP-1 — `massive-cusip.service.ts` canonical location**
> Canonical path is `apps/server/src/app/utils/massive-cusip.service.ts` (inner `app/utils/`, consistent with existing services). Not `apps/server/src/utils/` (outer level).

> **GAP-2 — Storybook Playwright `baseURL`** > `storybook-visual.spec.ts` targets the Storybook dev server (`http://localhost:6006`). E8 Story 8.4 implementation must add a `storybook` project entry to `playwright.config.ts` with the appropriate `baseURL` override.

**Nice-to-Have Gaps:**

> **GAP-3 — Storybook Nx targets** > `apps/dms-material/project.json` will need `storybook` and `build-storybook` Nx targets. Added as part of E8 Story 8.1 setup — not blocking, but implementation agents should expect to add them.

---

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analysed
- [x] Scale and complexity assessed (brownfield, 33 stories, NFR-only)
- [x] 7 technical constraints identified
- [x] 10 cross-cutting concerns mapped

**✅ Architectural Decisions**

- [x] 4 ADRs documented with problem/option/rationale
- [x] Technology stack fully specified (Angular 21, Fastify 5, Prisma 7, Tailwind 3→4, SmartNgRX 3)
- [x] Integration patterns defined (E2 resolution chain, Storybook mock pattern)
- [x] Failure mode register (8 epic-level failure modes)

**✅ Implementation Patterns**

- [x] Naming conventions established (`resolution_source` values, stories naming, service class name)
- [x] Structure patterns defined (dead component 5-criteria, `// @atdd` convention, Storybook dir layout)
- [x] Format patterns specified (CSS audit table, lint diff table, Storybook mock code example)
- [x] Process patterns documented (lint 5-step, dead-code loop, Tailwind one-per-commit)

**✅ Project Structure**

- [x] Complete directory tree with all files and directories
- [x] Component boundaries established
- [x] Integration points mapped (API boundary table, E2 data flow diagram)
- [x] All 8 epics mapped to specific FS locations

---

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High** — all epics have full architectural support; all 4 ADRs resolve previously uncertain decisions; two important gaps are self-contained with documented resolutions.

**Key Strengths:**

- Epic sequencing is fully enforced with hard constraints (E7 → E8.4; E3 → E4 lint promotion)
- The `// @atdd` convention bridges E3 (test repair), E4 (lint exception), and E8 (acceptance baseline) coherently
- Failure Mode Register gives implementation agents pre-computed rollback strategies per epic
- All verify-before-implement checks are named and located (`resolution_source`, E6 go/no-go gate)

**Areas for Future Enhancement (post-epic scope):**

- Nx module boundaries (`@nx/enforce-module-boundaries`) — natural next step after E4
- Storybook interaction tests (`@storybook/addon-interactions`) — extends E8 without architectural conflict
- PostgreSQL migration testing in CI — currently only SQLite tested locally

### Implementation Handoff — AI Agent Guidelines

1. Follow implementation sequence: E1 → E3 → E4(TS rules) → E2 → E5 → E4(template rules) → E6 → E7 → E8
2. Apply `// @atdd` to every new acceptance test spec (line 1)
3. Use `applicationConfig` (never TestBed) in all Storybook stories
4. Verify `resolution_source` column exists in Prisma schema before writing E2 code
5. Place `massive-cusip.service.ts` at `apps/server/src/app/utils/` (not `src/utils/`)
6. Do not capture E8 Story 8.4 baseline until E7 is fully merged and green
7. For E6 Story 6.2: run go/no-go bundle check before proceeding with Vite plugin swap
