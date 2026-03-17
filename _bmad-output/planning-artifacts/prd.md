---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments:
  - docs/project-overview.md
  - docs/architecture-dms-material.md
  - docs/architecture-server.md
  - docs/data-models.md
  - docs/api-contracts.md
  - docs/component-inventory.md
  - _bmad-output/project-context.md
workflowType: prd
classification:
  projectType: web_app
  domain: personal_finance
  complexity: medium
  projectContext: brownfield
documentCounts:
  briefCount: 0
  researchCount: 0
  brainstormingCount: 0
  projectDocsCount: 7
---

# Product Requirements Document — DMS (Dividend Management System)

**Author:** Dave
**Date:** 2026-03-16
**Version:** 1.0
**Status:** Active Development

---

## Executive Summary

DMS is a personal financial portfolio management application purpose-built for **Closed-End Fund (CEF) dividend investing**. It provides a single cohesive workspace where a solo investor can track brokerage accounts, manage a personal CEF watchlist (universe), record buy/sell trades, log dividend deposits, and research new CEFs — all without relying on spreadsheets or fragmented tools.

The system eliminates the friction of maintaining investment data across multiple sources. Yahoo Finance price updates, Fidelity CSV imports, and cefconnect.com screener data all flow into one normalized store. Monthly and yearly income charts provide instant visibility into portfolio performance.

### What Makes This Special

DMS is not a generic portfolio tracker — it is domain-optimized for CEF dividend income strategies:

- **CEF-specific data model**: distribution frequency, ex-dividend dates, and risk groups are first-class fields, not custom tags.
- **Signal-driven reactive UI**: Angular 21 zoneless + SmartNgRX delivers near-instant UI updates with zero manual state synchronization.
- **Zero-spreadsheet workflow**: bulk Yahoo Finance price updates, CSV import from Fidelity, and screener sync remove all manual data entry.
- **Personal ownership**: runs as a self-hosted single-user app, meaning all data is private and the schema can evolve freely to fit the investor's exact needs.

## Project Classification

| Attribute           | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| **Project Type**    | Full-stack web application (Angular SPA + Fastify API)                     |
| **Domain**          | Personal finance — CEF dividend income investing                           |
| **Complexity**      | Medium (financial calculations, external API integrations, import parsing) |
| **Project Context** | Brownfield — active development, production data, ongoing feature work     |
| **Primary User**    | Single investor (Dave) operating a self-hosted instance                    |

---

## Success Criteria

### User Success

- The investor can open the app and see an up-to-date view of all accounts, positions, and dividend history without any manual data entry.
- All open positions reflect current prices after a single "Update Fields" action (Yahoo Finance batch update).
- Fidelity CSV import correctly parses and categorizes transactions without requiring post-import corrections.
- Monthly and yearly distribution charts accurately reflect all recorded dividend deposits.
- New CEF symbols can be discovered through the screener and added to the universe in under two minutes.

### Business / Operational Success

- The application runs reliably as a self-hosted single-user service with no data loss.
- All financial data is owned entirely by the user — no third-party cloud dependency for storage.
- The system survives a full database migration (SQLite → PostgreSQL) with no data loss.
- Test coverage remains at ≥ 88% across the codebase, with E2E coverage across all critical user workflows.

### Technical Success

- All API routes respond within 500 ms under normal load.
- The Angular SPA loads and becomes interactive in under 3 seconds on a local network.
- The database schema is fully managed through Prisma migrations with no manual SQL required.
- The system handles optimistic-lock conflicts gracefully (HTTP 409) without data corruption.
- Soft-delete ensures no data is ever permanently lost without an explicit intent.

### Measurable Outcomes

| Outcome                    | Metric                                                                     |
| -------------------------- | -------------------------------------------------------------------------- |
| Reliable position tracking | 0 trade records with incorrect buy/sell data after CSV import              |
| Dividend income accuracy   | Monthly income charts match manual ledger within $0.01                     |
| Performance                | All page navigations complete in < 1s (cached data); < 3s (cold load)      |
| Test health                | ≥ 1,680 unit tests passing; ≥ 590 E2E tests passing on Chromium + Firefox  |
| Data safety                | No hard deletes on any entity with `deletedAt`; all deletes are reversible |

## Product Scope

### MVP — Minimum Viable Product (Current State)

The following capabilities constitute the working MVP already implemented:

- Multi-account management (create, rename, soft-delete accounts)
- CEF universe / watchlist (add symbols, set distribution data, assign risk groups)
- Trade management — open and sold positions per account (buy, sell, inline editing)
- Dividend deposit tracking per account with type classification
- Portfolio summary — monthly/yearly charts and income totals
- Bulk price/distribution update via Yahoo Finance API
- Fidelity CSV import with CUSIP→ticker resolution (OpenFIGI + Yahoo Finance fallback)
- CEF screener data from cefconnect.com with quality filters
- Dark/light theme toggle with persistence
- AWS Cognito authentication (production) + mock auth (development)
- CSRF protection, rate limiting, and audit logging on the API
- Feature flags endpoint

### Phase 2 — Growth

- Multi-user support (family members or co-investors sharing one instance)
- Additional brokerage CSV import formats (Schwab, Vanguard, etc.)
- Push / scheduled notifications for upcoming ex-dividend dates
- Tax-year capital gains exporter (PDF / CSV)
- Portfolio rebalancing suggestions based on risk group targets
- Mobile-responsive layout optimizations

### Phase 3 — Vision

- Native mobile companion app (iOS/Android) for deposit logging on the go
- Automated ex-date calendar integration (Google Calendar / iCal)
- Historical NAV chart overlays for universe symbols
- AI-assisted distribution trend analysis and early warning for distribution cuts
- Comparison views: CEF A vs CEF B across yield, risk, and gain history

---

## User Journeys

### The Investor (Dave) — Primary User

**Profile:** Experienced individual investor focused on CEF income strategies. Manages 3-5 brokerage accounts. Buys CEFs for regular distribution income, tracks open positions, sells when yield or price conditions are unfavorable.

#### Journey 1: Morning Portfolio Check

Dave opens the app to review his current positions before markets open.

1. App loads the shell with account list in the side panel (SmartNgRX hydrates from `POST /api/top`).
2. Dave navigates to `/global/summary` to see the monthly income chart and total invested value.
3. He clicks into `/account/:id/open` for his Fidelity IRA to review open positions, checking current distribution yield.
4. He spots a position with a recent distribution cut — he doesn't want to hold it.
5. He records a sell by inline-editing the `sell` and `sell_date` fields directly in the table.
6. The position moves from "Open" to "Sold" in the account view.

#### Journey 2: Weekly Data Refresh

Dave runs the Yahoo Finance batch update to keep prices current.

1. He navigates to Settings.
2. He triggers `POST /api/settings` — the server queries Yahoo Finance for all active universe symbols.
3. `last_price`, `distribution`, and `ex_date` fields are updated for each symbol.
4. Dave reviews the universe table (`/global/universe`) to verify updated values.
5. Positions with stale prices now show accurate current-value and yield calculations.

#### Journey 3: Importing Fidelity Transactions

Dave downloads a CSV from Fidelity and imports it into DMS.

1. He navigates to the import screen and uploads the CSV file.
2. The server parses each row, resolving CUSIPs to ticker symbols via OpenFIGI and Yahoo Finance.
3. Matched symbols are cross-referenced with the universe; trades and dividend deposits are created.
4. Dave reviews the import summary for any unresolved symbols.
5. Unresolved symbols are flagged; Dave manually maps them or adds them to the universe.

#### Journey 4: Discovering a New CEF

Dave wants to research new CEF candidates for his watchlist.

1. He navigates to `/global/screener` and triggers a screener refresh (`POST /api/screener`).
2. Screener data from cefconnect.com populates the table with distribution rates, premium/discount, YTD return.
3. Dave filters by risk group to focus on income-oriented funds.
4. He finds a candidate, checks `objectives_understood` and `graph_higher_before_2008` quality criteria.
5. He syncs the symbol to his universe (`POST /api/universe/sync-from-screener`).
6. The symbol appears in the universe view ready to be assigned a risk group and tracked.

#### Journey 5: Recording a Dividend Deposit

Dave receives a dividend payment in his account.

1. He navigates to `/account/:id/div-dep`.
2. He clicks "Add Deposit" and fills in symbol (autocomplete from universe), amount, date, and deposit type (Dividend / Capital Gain / Return of Capital).
3. The deposit is saved and immediately appears in the table.
4. The monthly summary chart updates to reflect the new income.

---

## Domain Requirements

### Financial Data Accuracy

- All monetary values are stored as IEEE 754 `Float` with display rounding applied at the presentation layer; no intermediate rounding in calculations.
- Capital gain classification (short-term vs long-term) is computed from trade hold duration: < 365 days = short-term, ≥ 365 days = long-term. This is for personal tracking only — not tax advice.
- Distribution yield calculations use: `(distribution × distributions_per_year) / last_price × 100`.

### Data Integrity Patterns

- **Optimistic locking**: every mutable entity carries a `version: Int`. All UPDATE operations must match the current version; a mismatch returns HTTP 409 Conflict.
- **Soft delete**: all financial records (`accounts`, `universe`, `trades`, `divDeposits`) are never permanently deleted. `deletedAt` is set; all queries filter `WHERE deletedAt IS NULL`.
- **CUID primary keys**: no sequential integer IDs. All PKs are Prisma `cuid()` values to avoid ID inference attacks and enumeration.

### External Data Dependencies

| Source            | Data Provided                                                   | Failure Behavior                       |
| ----------------- | --------------------------------------------------------------- | -------------------------------------- |
| Yahoo Finance API | Current price, distribution, ex-date                            | Show stale data; user retries manually |
| OpenFIGI API      | CUSIP → ticker resolution (primary)                             | Fall back to Yahoo Finance             |
| Yahoo Finance API | CUSIP → ticker resolution (fallback)                            | Mark CUSIP as unresolved               |
| cefconnect.com    | Screener data (distribution rate, premium/discount, YTD return) | Show cached data; user retries         |

### Security Constraints

- JWT authentication via AWS Cognito (RS256). JWKS keys are cached in memory.
- All mutating requests require a valid CSRF token from `GET /api/csrf-token`.
- Rate limiting enforced per IP: 100 req/15min (default), 10 attempts/15min (auth), 5 req/hour (import).
- Tokens are stored in HTTP-only cookies; never in `localStorage`.
- Development environment uses mock auth — Cognito credentials are never required locally.

---

## Functional Requirements

### Account Management

- FR1: User can create a new investment account with a unique name.
- FR2: User can rename an existing account.
- FR3: User can soft-delete an account (account and all its trades are hidden, not erased).
- FR4: User can view a list of all active accounts in the sidebar.

### Universe / Watchlist Management

- FR5: User can add a new CEF symbol to the universe via symbol autocomplete search.
- FR6: User can assign a risk group (Equities / Income / Tax Free Income) to each universe symbol.
- FR7: User can view and inline-edit distribution amount, distributions per year, and ex-date for each symbol.
- FR8: User can mark a symbol as expired (inactive) to remove it from active views without deleting it.
- FR9: User can sync a screener-discovered symbol into the universe.
- FR10: User can view the universe filtered to active (non-expired) symbols only.

### Trade Management

- FR11: User can record a new open trade (symbol, account, buy price, buy date, quantity).
- FR12: User can close an open trade by entering a sell price and sell date.
- FR13: User can view all open trades for a specific account, sorted and filtered.
- FR14: User can view all sold trades for a specific account with realized gain/loss displayed.
- FR15: User can inline-edit trade fields (price, date, quantity) directly in the table.
- FR16: System classifies each closed trade as short-term or long-term capital gain.

### Dividend Deposit Tracking

- FR17: User can record a dividend deposit (account, symbol, amount, date, deposit type).
- FR18: User can view all deposits for an account, sortable by date and amount.
- FR19: User can edit or delete a deposit record.
- FR20: Deposit types (Dividend, Capital Gain, Return of Capital) are a configurable reference list.

### Portfolio Summary & Reporting

- FR21: User can view a portfolio-wide monthly income chart (bar chart, current year).
- FR22: User can view yearly income totals and switch between available years.
- FR23: User can view per-account summaries: total invested, current value, dividends received, realized gain/loss.
- FR24: System calculates distribution yield for each open position based on current price and distribution data.

### Data Import

- FR25: User can upload a Fidelity transaction CSV and have trades/deposits automatically created.
- FR26: System resolves CUSIP codes to ticker symbols via OpenFIGI (primary) and Yahoo Finance (fallback).
- FR27: System displays import results: successfully imported rows, unresolved CUSIPs, skipped duplicates.
- FR28: CUSIP resolution results are cached to avoid redundant external API calls.

### Screener

- FR29: User can trigger a live screener data refresh from cefconnect.com.
- FR30: User can browse screener results filtered by quality criteria (volatility, objectives, graph history).
- FR31: User can promote a screener result to the universe as a tracked symbol.

### Settings / Bulk Updates

- FR32: User can trigger a batch update of all universe symbols' prices, distributions, and ex-dates from Yahoo Finance.
- FR33: User can manually update individual symbol settings fields.

### Risk Group Management

- FR34: User can view and edit risk group names and colors.
- FR35: User can assign any universe symbol to a different risk group.

### Authentication & Security

- FR36: Unauthenticated users are redirected to the login page.
- FR37: Session tokens are refreshed automatically on expiry without interrupting the user.
- FR38: Log out clears session cookies and invalidates the token server-side.

### CUSIP Cache Administration

- FR39: User can view the CUSIP cache table (cached symbol resolutions).
- FR40: User can inspect CUSIP audit log entries for resolution history.

### Error Logs Administration

- FR41: User can list server error log files.
- FR42: User can delete individual log files.

---

## Non-Functional Requirements

### Performance

- All API responses under normal load: ≤ 500 ms (p95).
- Initial SPA load (Angular shell + bootstrap): ≤ 3 seconds on local network.
- Virtual-scroll tables (open/sold trades, deposits) must remain fluid with ≥ 1,000 rows.
- Yahoo Finance batch update (`POST /api/settings`) may run up to 8 hours for large universes; the API must not time out (currently configured: 28,800,000 ms request timeout).

### Security

- All API routes except `/health`, `/health/detailed`, and `/api/csrf-token` require valid JWT authentication.
- All mutating API requests (POST, PUT, DELETE, PATCH) require a valid CSRF token.
- Auth routes are rate-limited to 10 attempts / 15 min per IP to prevent brute-force attacks.
- Import endpoint is rate-limited to 5 requests / hour per IP.
- All PII (user email, token payloads) is never logged in plain text.
- JWTs are stored in HTTP-only cookies — not accessible from JavaScript.

### Reliability & Data Safety

- All financial records use soft-delete — no destructive deletes.
- Optimistic locking prevents silent concurrent write conflicts.
- Database connections use exponential backoff retry on startup (up to 5 attempts).
- Graceful shutdown responds to SIGTERM/SIGINT, drains connections before exit.
- SQLite uses WAL mode for improved concurrent read performance.

### Maintainability

- Test coverage: ≥ 88% unit test coverage across the Angular SPA.
- All new components must follow the project patterns: standalone, OnPush, `inject()`, signal-first state.
- No NgModules. No Zone.js. No `@Input`/`@Output` decorators.
- Prisma manages all schema changes; no raw SQL migrations are permitted.
- ESLint rules enforce critical patterns (no anonymous callbacks, no constructor DI, `OnPush` required).

### Scalability

- This is a single-user personal tool; horizontal scaling is out of scope.
- The schema and API are designed to support multi-user in Phase 2 (e.g., `userId` foreign keys can be added without breaking existing data).
- PostgreSQL is the production database target; SQLite is used for local development and E2E tests only.

### Accessibility

- Angular Material components provide ARIA roles and keyboard navigation by default.
- All interactive table actions (add, edit, delete) must be keyboard-accessible.
- Dark/light theme is user-selectable and persisted across sessions.
- Color is never the sole differentiator for data (risk groups use both color and text labels).

### Integration

- Yahoo Finance integration is used for price updates and CUSIP resolution; no API key required.
- OpenFIGI integration (`https://api.openfigi.com`) is used for CUSIP resolution; rate-limited by the provider.
- cefconnect.com screener data is fetched on-demand; no persistent external subscription.
- AWS Cognito provides authentication in production; mock auth replaces it in development.

---

## Technical Architecture Summary

> This section is informational — for architect and development agent context.

### Frontend

| Concern   | Technology                                                                  |
| --------- | --------------------------------------------------------------------------- |
| Framework | Angular 21 (standalone, zoneless)                                           |
| State     | SmartNgRX (@smarttools/smart-signals) — signal-based entity store           |
| UI        | Angular Material 3 + CDK                                                    |
| CSS       | Tailwind (layout only) + Angular Material theming + `--dms-*` CSS variables |
| Auth      | AWS Amplify Auth (prod) / MockAuthService (dev)                             |
| Build     | Vite + @analogjs/vite-plugin-angular                                        |
| Tests     | Vitest 4 + @analogjs/vitest-angular                                         |
| E2E       | Playwright                                                                  |

### Backend

| Concern         | Technology                                             |
| --------------- | ------------------------------------------------------ |
| Framework       | Fastify 5                                              |
| ORM             | Prisma 7                                               |
| DB (local/e2e)  | SQLite via better-sqlite3                              |
| DB (production) | PostgreSQL 16                                          |
| Auth            | JWT RS256 via AWS Cognito JWKS                         |
| Security        | CSRF tokens, rate limiting, CSP headers, audit logging |

### Data Model Summary

| Entity           | Key Fields                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `accounts`       | name, soft-delete, version                                                                         |
| `universe`       | symbol (unique), distribution, distributions_per_year, last_price, ex_date, risk_group_id, expired |
| `risk_group`     | name (unique), color                                                                               |
| `trades`         | universeId, accountId, buy, sell, buy_date, sell_date, quantity                                    |
| `divDeposits`    | accountId, universeId, amount, date, typeId                                                        |
| `divDepositType` | name (unique)                                                                                      |
| `screener`       | symbol (unique), distribution_rate, premium_discount, ytd_return, quality flags                    |
| `cusip_cache`    | cusip (PK), symbol, source, resolvedAt                                                             |
| `holidays`       | date (unique), name                                                                                |

### Monorepo Structure

```
dms-workspace/
├── apps/dms-material/     # Angular SPA
├── apps/dms-material-e2e/ # Playwright tests
├── apps/server/           # Fastify API
├── prisma/                # Prisma schemas + migrations
├── docs/                  # Architecture & domain docs
└── _bmad-output/          # AI agent outputs (PRD, stories, etc.)
```

---

## Open Questions & Decisions

| #   | Question                                                                                           | Status |
| --- | -------------------------------------------------------------------------------------------------- | ------ |
| 1   | Will multi-user support be added before Phase 3?                                                   | Open   |
| 2   | Should ex-date reminders be in-app notifications or email/push?                                    | Open   |
| 3   | Is a tax export (Schedule D format) a Phase 2 priority?                                            | Open   |
| 4   | Should the screener run on a scheduled background job, or remain on-demand?                        | Open   |
| 5   | Will additional brokerage import formats (Schwab, Vanguard) follow the same CUSIP-resolution flow? | Open   |
