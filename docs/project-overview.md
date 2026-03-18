# DMS — Dividend Management System

## What is DMS?

DMS (Dividend Management System) is a personal financial portfolio management application focused on **Closed-End Fund (CEF) dividend investing**. It tracks investment accounts, CEF positions, dividend deposits, and provides tools for discovering and screening new funds.

## Purpose

The application allows an investor to:

1. **Track accounts** — multiple brokerage accounts, each holding open and sold positions
2. **Manage a universe** — a personal watchlist of CEF symbols with distribution data
3. **Record trades** — buy/sell transactions against universe symbols, per account
4. **Track dividends** — dividend and distribution deposits received per account/symbol
5. **Run a screener** — discover CEFs from cefconnect.com, filter by risk group and quality criteria
6. **Import Fidelity CSVs** — automatically parse and import transaction history from Fidelity exports
7. **View summaries** — monthly and yearly capital gains + dividend income charts

## Key Domain Concepts

| Concept         | Meaning                                                                             |
| --------------- | ----------------------------------------------------------------------------------- |
| **CEF**         | Closed-End Fund — a type of investment fund traded on exchanges                     |
| **Universe**    | The user's personal watchlist of CEF symbols being tracked                          |
| **Risk Group**  | Category for a symbol: `Equities`, `Income`, or `Tax Free Income`                   |
| **Trade**       | A buy or sell transaction; open if `sell_date === null \|\| sell === 0`             |
| **Div Deposit** | A dividend or distribution payment received                                         |
| **Screener**    | External CEF data from cefconnect.com, filtered by quality criteria                 |
| **CUSIP**       | A security identifier; resolved to ticker symbols via OpenFIGI/Yahoo Finance        |
| **Settings**    | Bulk-updates universe fields (last price, distribution, ex-date) from Yahoo Finance |

## Architecture Overview

```
┌─────────────────────────────────────┐
│         dms-material (Angular SPA)   │
│  Port 4201 (dev) / 4301 (e2e)        │
└──────────────┬──────────────────────┘
               │ HTTP /api/*  (proxy in dev)
               │ JWT in cookie or Authorization header
               ▼
┌─────────────────────────────────────┐
│         server (Fastify 5 API)       │
│  Port 3000 (dev) / 3001 (e2e)        │
│  AWS Cognito JWT validation           │
│  CSRF protection + rate limiting      │
└──────────────┬──────────────────────┘
               │ Prisma ORM
               ▼
┌─────────────────────────────────────┐
│  SQLite / better-sqlite3  (local)    │
│  PostgreSQL (production via Docker)  │
└─────────────────────────────────────┘
```

## Technology Stack

| Category                  | Technology                            | Version |
| ------------------------- | ------------------------------------- | ------- |
| Frontend framework        | Angular (standalone, zoneless)        | 21.2.x  |
| UI component library      | Angular Material + CDK                | 21.2.x  |
| CSS utility               | Tailwind CSS                          | 3.4.1   |
| State management          | @smarttools/smart-signals (SmartNgRX) | 3.0.0   |
| Authentication (frontend) | AWS Amplify Auth                      | 6.x     |
| API framework             | Fastify                               | 5.8.x   |
| ORM                       | Prisma                                | 7.2.x   |
| Database adapter          | @prisma/adapter-better-sqlite3        | 7.2.x   |
| Database (local)          | SQLite via better-sqlite3             | 12.6.x  |
| Database (production)     | PostgreSQL 16                         | –       |
| Monorepo tooling          | Nx                                    | 22.5.4  |
| Unit testing              | Vitest                                | 4.0.9   |
| E2E testing               | Playwright                            | 1.55.1  |
| Language                  | TypeScript                            | 5.9.3   |
| Package manager           | pnpm                                  | 10.x    |
| Node requirement          | Node.js                               | ≥ 22    |

## Repository Structure

```
dms-workspace/
├── apps/
│   ├── dms-material/           # Angular 21 SPA frontend
│   ├── dms-material-e2e/       # Playwright E2E tests
│   └── server/                 # Fastify 5 backend API
├── prisma/
│   ├── schema.prisma            # SQLite schema (default)
│   ├── schema.postgresql.prisma # PostgreSQL schema
│   └── migrations/              # Prisma migrations
├── docs/                        # Project documentation (this folder)
├── _bmad-output/                # AI agent context files
├── scripts/                     # Utility scripts
├── tools/                       # Nx custom tools
├── nx.json                      # Nx workspace config
├── pnpm-workspace.yaml          # pnpm workspace
├── package.json                 # Root dependencies
└── tsconfig.base.json           # Shared TypeScript paths
```

## Development Quick Start

```bash
# Install dependencies
pnpm install

# Start backend (port 3000)
pnpm start:server

# Start frontend (port 4201, proxies /api to :3000)
pnpm start:dms-material

# Run all unit tests
nx affected -t test

# Run E2E tests (starts both servers automatically)
pnpm e2e:dms-material
```

## Status

- **Active development** on branch `676-update-bmad-method-to-version-6`
- **Default branch**: `main`
- **Unit tests**: ~1680 tests (88%+ coverage)
- **E2E tests**: ~590 tests across Chromium + Firefox
