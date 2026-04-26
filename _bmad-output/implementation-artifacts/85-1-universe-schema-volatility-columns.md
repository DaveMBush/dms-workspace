# Story 85.1: Add Volatility Columns to Universe Schema

Status: Done

## Story

As a developer,
I want `volatility_long`, `volatility_short`, and `volatility_calculated_at` columns added to
the `universe` Prisma model in both schema files,
so that the database has a home for pre-calculated volatility values before recalculation
triggers and API changes are wired up in subsequent stories.

## Acceptance Criteria

1. **Given** the Prisma schema files (`schema.prisma` and `schema.postgresql.prisma`),
   **When** the developer adds `volatility_long String?`, `volatility_short String?`, and
   `volatility_calculated_at DateTime?` fields to the `universe` model,
   **Then** both schema files are updated identically (SQLite and PostgreSQL variants) and
   `npx prisma validate` exits with no errors.

2. **Given** the updated schema,
   **When** `prisma migrate dev` is run (SQLite) and the equivalent migration SQL is applied,
   **Then** the migration runs without error and the `universe` table in the dev database
   contains the three new nullable columns.

3. **Given** the migration is applied,
   **When** all existing `universe` rows are present,
   **Then** the three new columns are `NULL` for all rows — no backfill is performed in this
   story; that happens as triggers are wired in Story 85.2.

4. **Given** the schema change is complete,
   **When** `pnpm all` is run,
   **Then** all tests pass.

## Tasks / Subtasks

- [x] Task 1: Update `schema.prisma` (SQLite dev schema) (AC: #1, #2)

  - [x] Open `prisma/schema.prisma` and locate the `universe` model
  - [x] Add `volatility_long String?` after the `version` field
  - [x] Add `volatility_short String?` after `volatility_long`
  - [x] Add `volatility_calculated_at DateTime?` after `volatility_short`
  - [x] Verify the model compiles with `npx prisma validate`

- [x] Task 2: Update `schema.postgresql.prisma` (PostgreSQL production schema) (AC: #1)

  - [x] Open `prisma/schema.postgresql.prisma` and locate the `universe` model
  - [x] Apply the identical three field additions: `volatility_long String?`, `volatility_short String?`, `volatility_calculated_at DateTime?`
  - [x] Keep `provider = "postgresql"`; remove the legacy schema `url` so Prisma 7 validation uses `prisma.config.ts`
  - [x] Verify with `npx prisma validate --schema prisma/schema.postgresql.prisma`

- [x] Task 3: Create and apply the SQLite migration (AC: #2, #3)

  - [x] Run `npx prisma migrate dev --name add-volatility-columns-to-universe`
  - [x] Confirm the generated migration SQL adds three nullable columns to the `universe` table
  - [x] Confirm all existing rows have NULL values for the new columns (no backfill)

- [x] Task 4: Regenerate Prisma Client (AC: #4)

  - [x] Run `npx prisma generate` to update the Prisma Client types
  - [x] Confirm no TypeScript errors in server code from the schema change

- [x] Task 5: Full test run (AC: #4)
  - [x] Run `pnpm all` and confirm all tests pass

## Dev Notes

### Schema Files

Both schema files must be updated. They are structurally identical except for the datasource block:

| File                              | Provider     | Location    |
| --------------------------------- | ------------ | ----------- |
| `prisma/schema.prisma`            | `sqlite`     | Dev / local |
| `prisma/schema.postgresql.prisma` | `postgresql` | Production  |

Add the three fields after `version Int @default(1)` in the `universe` model:

```prisma
model universe {
  // ... existing fields ...
  version                Int           @default(1)
  volatility_long        String?
  volatility_short       String?
  volatility_calculated_at DateTime?
  // ... existing relations ...
}
```

### Field Semantics

| Column                     | Type        | Purpose                                                               |
| -------------------------- | ----------- | --------------------------------------------------------------------- |
| `volatility_long`          | `String?`   | 5-year distribution volatility category (e.g. `steady`, `increasing`) |
| `volatility_short`         | `String?`   | 1-year distribution volatility category                               |
| `volatility_calculated_at` | `DateTime?` | Timestamp of last recalculation — used to detect stale values         |

The category strings will be values from `VolatilityCategory` type (see `apps/server/src/app/volatility/volatility-category.type.ts`). After Epic 84, this type includes: `steady`, `increasing`, `decreasing`, `volatile`, `flat`, `up-then-down`, `down-then-up`, and `null`.

### No Backfill in This Story

The new columns are intentionally left NULL after migration. Story 85.2 wires the recalculation
triggers that will populate them as data changes. A one-time backfill can be performed manually
or added as a migration step in Story 85.2.

### Prisma Singleton

The Prisma client is a singleton at `apps/server/src/app/prisma/prisma-client.ts`. After running
`prisma generate`, the new fields are available on the `prisma.universe` model automatically.
Do not instantiate `PrismaClient` directly.

### Key Commands

```bash
# Validate both schemas
npx prisma validate
npx prisma validate --schema prisma/schema.postgresql.prisma

# Create and apply SQLite migration
npx prisma migrate dev --name add-volatility-columns-to-universe

# Regenerate Prisma Client after schema change
npx prisma generate

# Full test suite
pnpm all
```

### References

- [prisma/schema.prisma](prisma/schema.prisma) — SQLite dev schema, `universe` model
- [prisma/schema.postgresql.prisma](prisma/schema.postgresql.prisma) — PostgreSQL production schema
- [apps/server/src/app/volatility/volatility-category.type.ts](apps/server/src/app/volatility/volatility-category.type.ts) — Category type
- [apps/server/src/app/prisma/prisma-client.ts](apps/server/src/app/prisma/prisma-client.ts) — Prisma singleton
- Epic 85 goal: pre-calculate and store volatility to avoid on-the-fly calculation on every query

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- `pnpm exec prisma validate`
- `pnpm exec prisma validate --schema prisma/schema.postgresql.prisma`
- `pnpm exec prisma migrate dev --name add-volatility-columns-to-universe`
- `pnpm exec prisma generate`
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-85-1-universe-schema-volatility-columns pnpm all`

### Completion Notes List

- Added `volatility_long`, `volatility_short`, and `volatility_calculated_at` to the `universe` model in both Prisma schemas.
- Removed the legacy `url = env("DATABASE_URL")` line from `prisma/schema.postgresql.prisma` so Prisma 7 validation can use `prisma.config.ts` and the story's PostgreSQL schema validation command can pass.
- Created and applied SQLite migration `20260426142617_add_volatility_columns_to_universe`; the generated SQL adds three nullable columns and performs no backfill.
- Verified the migrated SQLite `universe` table contains the three new nullable columns; the worktree database had `0` `universe` rows and `0` rows with non-NULL volatility values after migration.
- Updated the two server specs that hand-roll a `universe` table so their local SQLite schemas stay in sync with the Prisma model and recreate a fresh DB on each run.
- `pnpm all` passes in the worktree with `NX_DAEMON=false` and `NX_WORKSPACE_ROOT_PATH` set to the story worktree.

### File List

- `prisma/schema.prisma`
- `prisma/schema.postgresql.prisma`
- `prisma/migrations/20260426142617_add_volatility_columns_to_universe/migration.sql`
- `apps/server/src/app/services/auth-database-optimizer.service.spec.ts`
- `apps/server/src/app/services/database-performance-integration.spec.ts`
- `_bmad-output/implementation-artifacts/85-1-universe-schema-volatility-columns.md`

### Change Log

| Date       | Change                                                                                                                                                            | Author |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2026-04-26 | Added nullable volatility columns to the Prisma `universe` model, applied the SQLite migration, regenerated Prisma Client, and validated the worktree end-to-end. | Agent  |
