# DMS Workspace Documentation Index

> **CEF Personal Dividend Investment Tracker**
> Angular 21 + Fastify 5 + Prisma 7 + SmartNgRX + AWS Cognito
> Nx 22 monorepo — scan level 3 (exhaustive)

---

## Quick Reference

| Need                                      | Document                                                  |
| ----------------------------------------- | --------------------------------------------------------- |
| "What does this project do?"              | [Project Overview](./project-overview.md)                 |
| "How do I set up my dev environment?"     | [Development Guide](./development-guide.md)               |
| "How do I deploy to production?"          | [Deployment Guide](./deployment-guide.md)                 |
| "What API endpoints exist?"               | [API Contracts](./api-contracts.md)                       |
| "What does the code structure look like?" | [Source Tree Analysis](./source-tree-analysis.md)         |
| "How does the Angular app work?"          | [Frontend Architecture](./architecture-dms-material.md)   |
| "How does the Node.js API work?"          | [Backend Architecture](./architecture-server.md)          |
| "What are all the components?"            | [Component Inventory](./component-inventory.md)           |
| "What is the database schema?"            | [Data Models](./data-models.md)                           |
| "How does front + back communicate?"      | [Integration Architecture](./integration-architecture.md) |

---

## Documentation Files

### Project-Level

| File                                                   | Description                                                   | Status |
| ------------------------------------------------------ | ------------------------------------------------------------- | ------ |
| [project-overview.md](./project-overview.md)           | Domain intro, architecture diagram, tech stack, quick-start   | ✅     |
| [project-parts.json](./project-parts.json)             | Machine-readable app catalog (SmartNgRX, Playwright, Fastify) | ✅     |
| [project-scan-report.json](./project-scan-report.json) | Scan metadata and document list                               | ✅     |

### Architecture & Code

| File                                                           | Description                                                   | Status |
| -------------------------------------------------------------- | ------------------------------------------------------------- | ------ |
| [source-tree-analysis.md](./source-tree-analysis.md)           | Annotated source tree for all 3 apps + root files             | ✅     |
| [architecture-dms-material.md](./architecture-dms-material.md) | Angular bootstrap, routing, SmartNgRX, auth, theming, testing | ✅     |
| [architecture-server.md](./architecture-server.md)             | Fastify bootstrap, plugins, middleware pipeline, security, DB | ✅     |
| [component-inventory.md](./component-inventory.md)             | All Angular components with inputs/outputs and purpose        | ✅     |
| [integration-architecture.md](./integration-architecture.md)   | Frontend↔backend protocols, auth flow, SmartNgRX data flow    | ✅     |

### Data & APIs

| File                                   | Description                                                | Status |
| -------------------------------------- | ---------------------------------------------------------- | ------ |
| [api-contracts.md](./api-contracts.md) | All REST endpoints with request/response shapes            | ✅     |
| [data-models.md](./data-models.md)     | Prisma schema, TypeScript interfaces, ER diagram, patterns | ✅     |

### Developer Operations

| File                                           | Description                                              | Status |
| ---------------------------------------------- | -------------------------------------------------------- | ------ |
| [development-guide.md](./development-guide.md) | Setup, commands, testing, conventions, debugging         | ✅     |
| [deployment-guide.md](./deployment-guide.md)   | Local, Docker, E2E, and production deployment procedures | ✅     |

### Pre-existing Documentation

| File                                                                             | Description                       |
| -------------------------------------------------------------------------------- | --------------------------------- |
| [architecture.md](./architecture.md)                                             | High-level architecture decisions |
| [front-end-spec.md](./front-end-spec.md)                                         | Frontend specification            |
| [frontend-architecture.md](./frontend-architecture.md)                           | Frontend architecture reference   |
| [prd.md](./prd.md)                                                               | Product requirements document     |
| [backlog.md](./backlog.md)                                                       | Feature backlog                   |
| [local-development.md](./local-development.md)                                   | Local development setup notes     |
| [monitoring-and-alerts.md](./monitoring-and-alerts.md)                           | Monitoring setup                  |
| [rollback-runbook.md](./rollback-runbook.md)                                     | Rollback procedures               |
| [SmartNgRX-Implementation-Checklist.md](./SmartNgRX-Implementation-Checklist.md) | SmartNgRX implementation guide    |
| [SmartNgRX-Signals-Reference.md](./SmartNgRX-Signals-Reference.md)               | SmartNgRX signals API reference   |

---

## Technology Stack Summary

| Layer                 | Technology                              | Version |
| --------------------- | --------------------------------------- | ------- |
| Frontend framework    | Angular                                 | 21.2.x  |
| UI component library  | Angular Material + CDK                  | 21.2.x  |
| CSS utility           | Tailwind CSS                            | 3.4.1   |
| State management      | SmartNgRX (`@smarttools/smart-signals`) | 3.0.0   |
| Authentication (prod) | AWS Amplify + Cognito                   | 6.x     |
| Backend framework     | Fastify                                 | 5.8.x   |
| ORM                   | Prisma                                  | 7.2.x   |
| Database (dev)        | SQLite via better-sqlite3               | 12.6    |
| Database (prod)       | PostgreSQL                              | 16      |
| Monorepo tooling      | Nx                                      | 22.5.4  |
| Package manager       | pnpm                                    | 10.x    |
| Unit testing          | Vitest                                  | 4.0.9   |
| E2E testing           | Playwright                              | 1.55.1  |
| Language              | TypeScript                              | 5.9.3   |
| Runtime               | Node.js                                 | ≥ 22    |

---

## Application Structure

```
dms-workspace/
├── apps/
│   ├── dms-material/          Angular 21 SPA (431 source files)
│   ├── dms-material-e2e/      Playwright E2E tests (71 files)
│   └── server/                Fastify 5 API (310 source files)
├── prisma/
│   ├── schema.prisma          SQLite schema
│   └── schema.postgresql.prisma  PostgreSQL schema
├── docs/                      ← you are here
└── scripts/                   Operational scripts
```

---

## Domain Glossary

| Term             | Definition                                                                         |
| ---------------- | ---------------------------------------------------------------------------------- |
| **CEF**          | Closed-End Fund — a publicly traded investment fund with a fixed number of shares  |
| **Universe**     | Personal watchlist of CEF ticker symbols being tracked                             |
| **Risk Group**   | Category for universe entries: Equities, Income, Tax Free Income                   |
| **Distribution** | Regular income payment from a CEF (like a dividend)                                |
| **Ex-Date**      | Ex-dividend date — must own shares before this date to receive the distribution    |
| **Open Trade**   | A position currently held (bought, not yet sold)                                   |
| **Closed Trade** | A position that has been sold                                                      |
| **Screener**     | CEF Connect screener data showing distribution rates, premium/discount, YTD return |
| **CUSIP**        | 9-character security identifier used in Fidelity CSV exports                       |
| **Top**          | Virtual bootstrap entity — aggregates all root entity IDs for app initialization   |
| **SmartNgRX**    | Custom entity store library replacing NgRx for signal-based state management       |
