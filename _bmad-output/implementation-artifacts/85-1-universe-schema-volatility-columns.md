# Story 85.1: Add Volatility Columns to Universe Schema

Status: Approved

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

- [ ] Task 1: Update `schema.prisma` (SQLite dev schema) (AC: #1, #2)
  - [ ] Open `prisma/schema.prisma` and locate the `universe` model
  - [ ] Add `volatility_long String?` after the `version` field
  - [ ] Add `volatility_short String?` after `volatility_long`
  - [ ] Add `volatility_calculated_at DateTime?` after `volatility_short`
  - [ ] Verify the model compiles with `npx prisma validate`

- [ ] Task 2: Update `schema.postgresql.prisma` (PostgreSQL production schema) (AC: #1)
  - [ ] Open `prisma/schema.postgresql.prisma` and locate the `universe` model
  - [ ] Apply the identical three field additions: `volatility_long String?`, `volatility_short String?`, `volatility_calculated_at DateTime?`
  - [ ] The PostgreSQL schema uses `provider = "postgresql"` and `url = env("DATABASE_URL")` — do not change those
  - [ ] Verify with `npx prisma validate --schema prisma/schema.postgresql.prisma`

- [ ] Task 3: Create and apply the SQLite migration (AC: #2, #3)
  - [ ] Run `npx prisma migrate dev --name add-volatility-columns-to-universe`
  - [ ] Confirm the generated migration SQL adds three nullable columns to the `universe` table
  - [ ] Confirm all existing rows have NULL values for the new columns (no backfill)

- [ ] Task 4: Regenerate Prisma Client (AC: #4)
  - [ ] Run `npx prisma generate` to update the Prisma Client types
  - [ ] Confirm no TypeScript errors in server code from the schema change

- [ ] Task 5: Full test run (AC: #4)
  - [ ] Run `pnpm all` and confirm all tests pass

## Dev Notes

### Schema Files

Both schema files must be updated. They are structurally identical except for the datasource block:

| File | Provider | Location |
|------|----------|----------|
| `prisma/schema.prisma` | `sqlite` | Dev / local |
| `prisma/schema.postgresql.prisma` | `postgresql` | Production |

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

| Column | Type | Purpose |
|--------|------|---------|
| `volatility_long` | `String?` | 5-year distribution volatility category (e.g. `steady`, `increasing`) |
| `volatility_short` | `String?` | 1-year distribution volatility category |
| `volatility_calculated_at` | `DateTime?` | Timestamp of last recalculation — used to detect stale values |

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
