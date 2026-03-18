# Source Tree Analysis

## apps/dms-material — Angular 21 Frontend SPA

```
src/
├── main.ts                           # Bootstrap: bootstrapApplication(App)
├── index.html                        # HTML shell
├── styles.scss                       # Global styles: CSS layers, Material themes, Tailwind
├── test-setup.ts                     # Vitest setup: @testing-library + CDK harnesses
│
├── app/
│   ├── app.ts                        # Root component (selector: dms-root)
│   ├── app.config.ts                 # ApplicationConfig: providers, SmartNgRX, auth, HTTP
│   ├── app.routes.ts                 # Route tree: Shell, lazy-loaded feature routes
│   ├── app.html / app.scss           # Shell template
│   │
│   ├── amplify.config.ts             # AWS Amplify initialization
│   │
│   ├── auth/                         # Authentication module
│   │   ├── auth.service.ts           # AWS Cognito via Amplify (production)
│   │   ├── mock-auth.service.ts      # Mock auth for development
│   │   ├── base-auth-service.abstract.ts # Shared auth contract
│   │   ├── auth.types.ts             # AuthError, AuthUser types
│   │   ├── auth.routes.ts            # /auth routes (login, confirm, etc.)
│   │   ├── guards/auth.guard.ts      # authGuard + guestGuard CanActivateFn
│   │   ├── interceptors/
│   │   │   ├── auth.interceptor.ts   # JWT injection, 401 handling, token refresh
│   │   │   └── sort.interceptor.ts   # Field name mapping for server-side sort
│   │   ├── services/
│   │   │   ├── secure-cookie.service.ts    # Stores JWT in HTTP-only cookies
│   │   │   ├── session-manager.service.ts  # Session lifecycle, expiry events
│   │   │   ├── token-cache.service.ts      # Caches JWT tokens in memory
│   │   │   ├── token-handler.service.ts    # Token validation + extraction
│   │   │   ├── token-refresh.service.ts    # Automatic token refresh
│   │   │   ├── profile.service.ts          # User profile (production)
│   │   │   ├── mock-profile.service.ts     # Mock profile (dev)
│   │   │   ├── user-state.service.ts       # UserProfile signal store
│   │   │   └── auth-metrics.service.ts     # Auth performance metrics
│   │   ├── utils/
│   │   │   ├── amplify-user-mapper.function.ts  # Maps Amplify user → AuthUser
│   │   │   ├── auth-error-handler.function.ts   # Error message extraction
│   │   │   └── clear-auth-tokens.function.ts    # Token cleanup
│   │   └── components/
│   │       └── session-warning/      # Session expiry warning dialog
│   │
│   ├── shell/                        # App shell (toolbar + router outlets)
│   │   ├── shell.component.ts        # Toolbar, dark mode toggle, logout
│   │   ├── shell.html / shell.scss
│   │
│   ├── dashboard/                    # Dashboard feature (lazy-loaded)
│   │   └── dashboard.component.ts   # Route: /dashboard
│   │
│   ├── accounts/                     # Account list (named outlet: 'accounts')
│   │   ├── account.ts / account.html # Account list sidebar
│   │   ├── account-component.service.ts  # Account list business logic
│   │   ├── account-summary/          # Account header summary
│   │   ├── dividend-deposits/        # Div-deposit summary rows
│   │   ├── open-positions/           # Open position summary rows
│   │   └── sold-positions/           # Sold position summary rows
│   │
│   ├── account-panel/                # Account detail panel (route: /account/:accountId)
│   │   ├── account-panel.component.ts     # Tab container: open/sold/div-dep
│   │   ├── account-detail.component.ts    # Hosts SmartNgRX account entities
│   │   ├── open-positions/           # Open positions tab
│   │   │   ├── open-positions.component.ts
│   │   │   ├── open-positions-component.service.ts
│   │   │   ├── add-position-dialog/  # Add new position dialog
│   │   │   └── add-position.service.ts
│   │   ├── sold-positions/           # Sold positions tab
│   │   │   ├── sold-positions.component.ts
│   │   │   ├── sold-positions-component.service.ts
│   │   │   └── classify-capital-gain.function.ts  # Short/long term classification
│   │   ├── dividend-deposits/        # Dividend deposits tab
│   │   │   ├── dividend-deposits.component.ts
│   │   │   └── dividend-deposits-component.service.ts
│   │   ├── summary/                  # Account aggregated summary
│   │   └── div-dep-modal/            # Add dividend deposit dialog
│   │
│   ├── global/                       # Global views (no account context)
│   │   ├── global-summary.ts         # Route: /global/summary — chart + monthly table
│   │   ├── global-universe.ts        # Route entry stub for /global/universe
│   │   ├── global-universe/          # Universe management (CEF watchlist)
│   │   │   ├── global-universe.component.ts    # Main table with inline editing
│   │   │   ├── global-universe.columns.ts      # Column definitions
│   │   │   ├── services/universe.service.ts    # CRUD for universe entities
│   │   │   ├── services/universe-validation.service.ts
│   │   │   ├── enrich-universe-with-risk-groups.function.ts
│   │   │   ├── filter-universes.function.ts
│   │   │   └── sort-universes.function.ts
│   │   ├── global-screener.ts        # Route entry stub for /global/screener
│   │   ├── global-screener/          # CEF screener view
│   │   │   ├── global-screener.component.ts    # Screener table with CEF data
│   │   │   └── services/screener.service.ts    # Screener API calls
│   │   ├── global-error-logs/        # Error log viewer (route: /global/error-logs)
│   │   ├── cusip-cache/              # CUSIP cache admin (route: /global/cusip-cache)
│   │   │   ├── cusip-cache.component.ts
│   │   │   └── cusip-cache-admin.service.ts
│   │   ├── import-dialog/            # Fidelity CSV import dialog component
│   │   └── services/
│   │       ├── summary.service.ts    # Fetches summary data from /api/summary
│   │       ├── summary.interface.ts
│   │       ├── graph-point.interface.ts
│   │       └── month-option.interface.ts
│   │
│   ├── universe-settings/            # Universe settings UI
│   │   └── add-symbol-dialog/        # Add new symbol to universe dialog
│   │
│   ├── demo/                         # Chart demo (dev only)
│   │
│   ├── store/                        # SmartNgRX entity definitions + effects
│   │   ├── top/                      # Bootstrap entity (loads IDs of all collections)
│   │   │   ├── top.interface.ts      # { accounts[], universes[], riskGroups[], ... }
│   │   │   ├── top-definition.const.ts
│   │   │   ├── top-effect.service.ts # POST /api/top
│   │   │   └── selectors/
│   │   ├── accounts/                 # Investment accounts entity
│   │   │   ├── account.interface.ts  # { id, name, openTrades, soldTrades, divDeposits }
│   │   │   ├── accounts-definition.const.ts
│   │   │   ├── account-effect.service.ts  # POST/PUT/DELETE /api/accounts
│   │   │   └── selectors/
│   │   ├── universe/                 # CEF watchlist entity
│   │   │   ├── universe.interface.ts # { id, symbol, distribution, last_price, ... }
│   │   │   ├── universe-definition.const.ts
│   │   │   ├── universe-effect.service.ts  # POST/PUT/DELETE /api/universe
│   │   │   └── selectors/
│   │   ├── risk-group/               # Risk group category entity
│   │   ├── screen/                   # Screener result entity
│   │   ├── trades/                   # Open + sold trade entities
│   │   │   ├── open-trades-definition.const.ts
│   │   │   ├── sold-trades-definition.const.ts
│   │   │   ├── trade-effect.service.ts     # POST /api/accounts/indexes
│   │   │   └── selectors/
│   │   ├── div-deposits/             # Dividend deposits entity
│   │   ├── div-deposit-types/        # Deposit type entity
│   │   └── current-account/          # Non-SmartNgRX signal store for current account
│   │       └── current-account.signal-store.ts
│   │
│   ├── shared/                       # Feature-agnostic shared code
│   │   ├── components/
│   │   │   ├── base-table/           # Virtual-scroll mat-table (core reusable component)
│   │   │   │   ├── base-table.component.ts   # CDK virtual scroll + MatSort
│   │   │   │   ├── virtual-table-data-source.ts  # Custom DataSource for virtual scroll
│   │   │   │   └── column-def.interface.ts   # Column definition type
│   │   │   ├── editable-cell/        # Inline text edit cell
│   │   │   ├── editable-date-cell/   # Inline date edit cell
│   │   │   ├── confirm-dialog/       # Confirmation modal using MatDialog
│   │   │   ├── splitter/             # Resizable horizontal split pane
│   │   │   ├── summary-display/      # Financial summary card (deposits, gains, yield)
│   │   │   ├── symbol-autocomplete/  # Symbol search + autocomplete input
│   │   │   ├── symbol-filter-header/ # Table column filter for symbols
│   │   │   └── edit/node-editor/     # Tree node editor for risk group settings
│   │   ├── services/
│   │   │   ├── theme.service.ts          # Dark/light toggle, localStorage persistence
│   │   │   ├── notification.service.ts   # MatSnackBar wrapper (success/info/warn/error)
│   │   │   ├── confirm-dialog.service.ts # MatDialog wrapper for confirmation modals
│   │   │   ├── error-handling.service.ts # Global error handler with notification
│   │   │   ├── sort-filter-state.service.ts  # Sort+filter state (localStorage)
│   │   │   ├── state-persistence.service.ts  # State persistence/restoration
│   │   │   ├── global-loading.service.ts     # Global loading spinner signal
│   │   │   ├── universe-sync.service.ts      # Universe synchronization triggers
│   │   │   ├── update-universe-fields.service.ts  # Bulk update from Yahoo Finance
│   │   │   ├── symbol-search.service.ts      # Symbol search calls to /api/symbol/search
│   │   │   ├── feature-flags.service.ts      # Feature flag polling from /api/
│   │   │   └── performance-logging.service.ts # Component performance measurement
│   │   ├── interfaces/
│   │   │   ├── performance-metric.interface.ts
│   │   │   ├── performance-thresholds.interface.ts
│   │   │   └── performance-alert.interface.ts
│   │   └── utils/
│   │       └── metrics-storage.function.ts
│   │
│   ├── error-handler/                # Global ErrorHandler implementation
│   └── test-session-warning.component.ts  # Dev test component for session modal
│
├── environments/                     # Environment configs
│   ├── environment.ts                # Dev: mockAuth=true, apiUrl=localhost:3000
│   ├── environment.prod.ts           # Prod: real Cognito, secure cookies, CSP
│   └── environment.docker.ts         # Docker local: PostgreSQL backend
│
├── themes/                           # SCSS themes
│   ├── _light-theme.scss             # mat.define-theme blue/yellow light
│   ├── _dark-theme.scss              # mat.define-theme blue/yellow dark
│   └── _theme-variables.scss         # CSS custom properties (--dms-*)
│
└── test-utils/                       # Shared Vitest helpers
    ├── click-button.function.ts
    ├── create-mock-confirm-dialog-service.function.ts
    ├── create-mock-mat-dialog.function.ts
    ├── create-mock-mat-snack-bar.function.ts
    ├── create-mock-notification-service.function.ts
    ├── get-harness-loader.function.ts
    ├── select-option.function.ts
    └── type-in-input.function.ts
```

## apps/server — Fastify 5 Backend API

```
src/
├── main.ts                           # Server bootstrap: fastify, graceful shutdown
│
├── app/
│   ├── app.ts                        # Registers plugins + autoload routes with /api prefix
│   │
│   ├── config/                       # Cognito configuration
│   │   ├── cognito.config.ts         # Reads userPoolId/clientId from env/SSM
│   │   ├── get-cognito-config.function.ts
│   │   ├── build-cognito-urls.function.ts   # Builds JWKS/issuer URLs
│   │   ├── cognito-validation.function.ts   # Validates config completeness
│   │   └── validate-cognito-config-async.function.ts
│   │
│   ├── plugins/                      # Fastify plugins (auto-loaded)
│   │   ├── auth.ts                   # JWT authentication preHandler hook
│   │   ├── cookie.ts                 # @fastify/cookie registration
│   │   ├── cors.ts                   # @fastify/cors with origin validation
│   │   ├── cors-config.function.ts   # CORS options builder
│   │   ├── cors-origin-handler.function.ts  # Dynamic origin validation
│   │   ├── security.ts               # Security plugin: CSP, CSRF, rate limit, audit
│   │   ├── security-hooks.function.ts        # onRequest/onResponse security hooks
│   │   ├── sensible.ts               # @fastify/sensible (HTTP helpers)
│   │   └── multipart.ts              # @fastify/multipart (file uploads)
│   │
│   ├── middleware/                   # Auth + security middleware
│   │   ├── authenticate-jwt.function.ts  # JWT validation preHandler
│   │   ├── csrf.middleware.ts         # CSRF token generation/validation
│   │   ├── csrf-protection-hook.middleware.ts  # Fastify hook wrapper
│   │   ├── csrf-token-store.constant.ts  # In-memory CSRF token store
│   │   ├── security.middleware.ts     # Security headers (CSP, HSTS, X-Frame-Options)
│   │   ├── security-headers.function.ts
│   │   ├── create-rate-limiter.function.ts   # Rate limiter factory
│   │   ├── rate-limit-configs.constant.ts    # Per-endpoint rate limit config
│   │   ├── rate-limit-store.constant.ts      # In-memory rate limit store
│   │   └── [29 other middleware files]       # Rate limiting, auth failure tracking, etc.
│   │
│   ├── prisma/                       # Database layer
│   │   ├── prisma-client.ts          # Singleton PrismaClient with SQLite adapter
│   │   ├── build-database-url.function.ts    # URL construction
│   │   ├── create-base-prisma-config.function.ts
│   │   ├── create-connection-pool-config.function.ts
│   │   └── optimized-*.function.ts   # Query optimization helpers
│   │
│   ├── routes/                       # API routes (auto-loaded, prefixed /api)
│   │   ├── root.ts                   # GET / — basic info
│   │   ├── health/index.ts           # GET /health, GET /health/detailed
│   │   ├── auth/index.ts             # POST /auth/set-secure-cookie, etc.
│   │   ├── accounts/index.ts         # POST|PUT|DELETE /accounts + /indexes
│   │   ├── universe/                 # /universe CRUD + sync-from-screener + add-symbol
│   │   ├── top/index.ts              # POST /top — bootstrap data
│   │   ├── trades/                   # /trades, /trades/open, /trades/closed
│   │   ├── div-deposits/index.ts     # /div-deposits CRUD
│   │   ├── div-deposit-types/index.ts # /div-deposit-types
│   │   ├── risk-group/index.ts       # /risk-group CRUD
│   │   ├── screener/index.ts         # POST /screener — CEF screening from cefconnect
│   │   ├── screener/rows/index.ts    # POST /screener/rows
│   │   ├── settings/index.ts         # POST /settings — bulk Yahoo Finance update
│   │   ├── settings/update/          # PUT /settings/update
│   │   ├── summary/index.ts          # GET /summary, /summary/graph, /summary/months, /summary/years
│   │   ├── import/index.ts           # POST /import — Fidelity CSV ingestion
│   │   ├── symbol/search/index.ts    # GET /symbol/search
│   │   ├── logs/index.ts             # GET|DELETE /logs
│   │   ├── feature-flags/index.ts    # GET / — feature flags
│   │   ├── admin/cusip-cache/        # /admin/cusip-cache — CUSIP management
│   │   └── common/                   # Shared route utilities
│   │       ├── parse-sort-filter-header.function.ts  # Parses x-table-state header
│   │       ├── get-table-state.function.ts
│   │       ├── table-state.interface.ts
│   │       ├── distribution-api.function.ts  # Yahoo Finance distributions fetch
│   │       └── universe-operations.function.ts
│   │
│   ├── services/                     # Singleton services
│   │   ├── audit-log.service.ts      # Security event audit logging
│   │   ├── audit-log-service.instance.ts  # Singleton instance
│   │   ├── database-performance.service.ts # Query timing + slow query detection
│   │   ├── cusip-audit-log.service.ts      # CUSIP-specific audit trail
│   │   ├── cusip-cache-cleanup.service.ts  # Periodic CUSIP cache maintenance
│   │   └── auth-database-optimizer.service.ts # Auth query optimization
│   │
│   ├── types/                        # TypeScript interface/type definitions
│   │   ├── fastify.d.ts              # Augments FastifyRequest with user property
│   │   ├── auth.types.ts             # Auth-related types
│   │   ├── authenticated-user.interface.ts
│   │   ├── cognito-jwt-payload.interface.ts
│   │   └── jwt-user.interface.ts
│   │
│   └── utils/                        # Server utility functions
│       ├── apply-rate-limiting.function.ts
│       ├── apply-security-validation.function.ts
│       ├── extract-token-from-header.function.ts
│       ├── extract-user-from-payload.function.ts
│       ├── get-auth-cookie-name.function.ts
│       ├── get-signing-key.function.ts  # Fetches Cognito JWKS key
│       ├── validate-jwt-token.function.ts
│       └── verify-jwt-token.function.ts
│
├── middleware/                       # Request tracing (AWS X-Ray stubs)
│   ├── tracing.ts
│   └── [mock X-Ray helpers]
│
└── utils/
    ├── aws-config.ts                 # AWS SSM Parameter Store config loading
    ├── logger.ts                     # Fastify-compatible logger wrapper
    └── structured-logger.ts          # Structured JSON logging
```

## apps/dms-material-e2e — Playwright E2E Tests

```
src/
├── helpers/                          # Shared test helpers
│   ├── login.helper.ts               # Mock login flow
│   ├── seed-*.helper.ts              # Database seeding for test data
│   ├── shared-prisma-client.helper.ts # Direct DB access for test setup/teardown
│   └── [other helpers]
│
└── *.spec.ts                         # 47 E2E spec files covering:
    # accessibility, accounts, account-crud, account-panel children,
    # fidelity-import, global-universe, global-screener, global-summary,
    # cusip-cache-admin, add-symbol, risk-groups, symbol-autocomplete,
    # editable-cell, theme, splitter, session-warning, performance, and more
```

## Root-Level Files

| File                              | Purpose                                              |
| --------------------------------- | ---------------------------------------------------- |
| `nx.json`                         | Nx workspace configuration                           |
| `pnpm-workspace.yaml`             | pnpm workspace definition                            |
| `package.json`                    | All dependencies (single-package workspace)          |
| `tsconfig.base.json`              | Shared TypeScript path aliases                       |
| `vitest.config.ts`                | Root vitest config                                   |
| `vitest.workspace.ts`             | Points to app-level vitest configs                   |
| `eslint.config.mjs`               | ESLint flat config (unicorn, sonarjs, smarttools)    |
| `tailwind.config.js`              | Tailwind config: dark mode via `.dark-theme` class   |
| `prisma/schema.prisma`            | SQLite Prisma schema                                 |
| `prisma/schema.postgresql.prisma` | PostgreSQL Prisma schema                             |
| `docker-compose.local.yml`        | Local Docker stack (PostgreSQL + backend + frontend) |
| `env.example`                     | Environment variable template                        |
