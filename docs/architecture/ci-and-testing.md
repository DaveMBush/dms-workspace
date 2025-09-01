# CI and testing

Define quality gates and automation to protect existing functionality while
adding the Screener→Universe sync.

- Strategy

  - Unit: pure logic (selection, mapping, expire rules).
  - Integration (server): Fastify + Prisma on a temp SQLite file.
  - E2E (optional): UI smoke for dialog and table render.
  - Coverage thresholds: lines 85%, branches 75%, functions 85%.

- Frameworks

  - Angular app: Jest (Nx preset), TestBed for components/services.
  - Server: Jest with ts-jest or swc, supertest for HTTP, Prisma test db.

- Nx targets

  - `nx run-many -t lint` for all projects.
  - `nx run-many -t test --ci --code-coverage`.
  - `nx run-many -t build` (affected on PRs).

- Test data and db

  - Use a per-test SQLite file via `DATABASE_URL=file:./test.db`.
  - Migrate before tests, wipe file after suite.
  - Seed minimal `risk_group` rows for server tests.

- Server integration tests must cover

  - Select eligible screener rows (three booleans true).
  - Upsert new, update existing without losing history fields.
  - Mark non-selected as `expired=true`.
  - Idempotency: second run produces no changes.

- Regression focus areas (manual checklist)

  - Trading views: positions and sell history unaffected.
  - Universe table sorting/filtering unchanged for existing symbols.
  - Settings manual update flow still works.

- CI pipeline (high level)

  - Setup Node 20.x and pnpm; cache pnpm store and Nx cache.
  - Install, lint, test with coverage, build.
  - Upload coverage summary and fail under thresholds.
  - For main, build artifacts; for PRs, run affected-only where possible.

- PR gating
  - All checks green: lint, tests, build.
  - Coverage thresholds met.
  - Spec changes required when behavior changes (architecture/backlog).
