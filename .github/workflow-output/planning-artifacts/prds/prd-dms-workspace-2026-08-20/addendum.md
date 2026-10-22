---
title: DMS — PRD Addendum (technical depth & in-flight work)
parent: prd.md
updated: 2026-08-20
---

# DMS — PRD Addendum

User-contributed technical depth for downstream docs (UX, architecture, epics/stories). This is **not** a PRD feature list — the PRD is the product contract; this addendum records the *how*, the stack, and work that is in flight but not yet a committed feature.

## A. Stack & runtime (authoritative: live `package.json`)

The `docs/project-overview.md` version table is **stale** — treat `package.json` (and the Prisma schema) as the source of truth for versions.

- **Frontend:** Angular 22 (standalone, zoneless), Angular Material + CDK, Tailwind, `@smarttools/smart-core`/`smart-signals`, NgRx (signals-based), `chart.js`/`ng2-charts` for income charts.
- **Backend:** Fastify 5 (Node 24), Cognito JWT + CSRF + rate-limit, `yahoo-finance2`, `nyse-holidays`, `cheerio` (for cefconnect/13f scraping).
- **Data:** Prisma 7 + `better-sqlite3` (local) / PostgreSQL 16 (prod); `prisma/schema.prisma` is the **authoritative** data model.
- **Monorepo / tooling:** Nx 23, Electron (desktop wrapper), AWS Amplify Auth, Vitest (unit), Playwright (e2e), pnpm, Storybook.

> **Note for downstream docs:** do not copy versions from `docs/project-overview.md`. Re-read `package.json` at implementation time.

## B. In-flight work (NOT a PRD feature)

These are active engineering efforts that predate or sit alongside this PRD. They are recorded here so downstream epics/stories account for them, but they are **not** product features and do **not** expand PRD scope.

- **B-1 — `base-table` → `<mat-table>` refactor (epic 2026-07-14).**
  `apps/dms-material/src/app/shared/components/base-table` was converted from a standard `<table mat-table>` to a DIV-based layout (to fix sticky-header issues). The team has discovered an alternate `matColumnDef`/`matHeaderCellDef`/`matCellDef`/`matHeaderRowDef`/`matRowDef` syntax that should avoid the sticky issues and let the header/table separation be removed.
  - Reference original table implementation: commit `36ee7e7cb9910d9ac54cb2c719ffd36cef649520`.
  - Scope: convert `base-table` back to standard Angular Material table syntax **and** modify every component that inherits/uses `base-table`.
  - **PRD relationship:** none — this is UI-engineering, not a feature. FR-4/FR-7 (inline editing) ride on whatever table implementation ends up shipping; the PRD does not depend on the DIV vs `<mat-table>` choice.

## C. Known doc drift (resolve before rebuild)

- **C-1 — `docs/data-models.md` vs. `prisma/schema.prisma`.** The docs and the schema disagree on: `cusip` PK type (`cuid` vs `uuid` default), `screener` shape, `holidays` soft-delete, `divDeposits` field naming, and a `version` default. **Treat `prisma/schema.prisma` as authoritative.** See PRD OQ-2.
- **C-2 — `docs/component-inventory.md` is incomplete.** It omits the Fidelity CSV import UI (Dave confirmed it exists and works). See PRD OQ-1 / FR-6.

## D. Source of the cefconnect / 13f data

- The screener and CUSIP cache are populated by server-side scrapers (`cheerio`) against cefconnect.com and (for CUSIP) the `THIRTEENF`/`YAHOO_FINANCE` sources recorded in the `cusip_cache`/`cusip_cache_audit` tables. This is a **cache** — no live market feed. See PRD FR-12–FR-13, FR-16.

## E. Session / auth mechanics

- Auth is AWS Cognito JWT via `@aws-amplify` on the client, validated on the Fastify server (CSRF + rate-limit). The "session expiring → prompt to extend" behavior in PRD FR-19 is the existing client-side token-refresh UX, not a new feature.
