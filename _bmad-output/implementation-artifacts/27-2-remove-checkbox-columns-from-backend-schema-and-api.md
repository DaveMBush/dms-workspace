# Story 27.2: Remove Checkbox Columns from Backend Schema and API

Status: Approved

## Story

As a developer,
I want the three checkbox fields (`has_volitility`, `objectives_understood`, `graph_higher_before_2008`) removed from the Prisma schema and all backend API payloads,
so that the database and API contract no longer carry these deprecated columns.

## Acceptance Criteria

1. **Given** `prisma/schema.prisma`, **When** this story is complete, **Then** the fields `has_volitility`, `objectives_understood`, and `graph_higher_before_2008` are absent from the `Universe` model (or whichever model they belong to), and the composite index on those three fields is also removed.
2. **Given** `prisma/schema.postgresql.prisma`, **When** this story is complete, **Then** the same three fields and composite index are removed (both schema files must remain in sync).
3. **Given** a new Prisma migration is generated, **When** applied to the database, **Then** the three columns are dropped from the corresponding table without data loss to other columns.
4. **Given** any backend API route that currently selects or returns these fields, **When** the route is updated, **Then** those fields are excluded from the Prisma `select` or removed from the response type.
5. **Given** all changes, **When** `pnpm all` runs, **Then** no TypeScript errors and all remaining tests pass.

## Definition of Done

- [ ] Fields and composite index removed from `prisma/schema.prisma`
- [ ] Fields and composite index removed from `prisma/schema.postgresql.prisma`
- [ ] Prisma migration generated and validated (SQLite + PostgreSQL compatible)
- [ ] Backend API routes updated to not select/return removed fields
- [ ] Run `pnpm all`
- [ ] Run `pnpm format`
- [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Update `prisma/schema.prisma` (AC: #1)
  - [ ] Remove the three fields from the model definition
  - [ ] Remove the composite index `@@index([has_volitility, objectives_understood, graph_higher_before_2008])`
- [ ] Update `prisma/schema.postgresql.prisma` (AC: #2)
  - [ ] Mirror the exact same removals in the PostgreSQL schema variant
  - [ ] Confirm both files are identical in structure for the affected model
- [ ] Generate Prisma migration (AC: #3)
  - [ ] Run `npx prisma migrate dev --name remove_checkbox_columns` (or equivalent project command)
  - [ ] Review the generated SQL to confirm it only drops the three columns and the index
  - [ ] Confirm migration is stored under `prisma/migrations/`
- [ ] Update backend routes (AC: #4)
  - [ ] Search all backend route handlers for references to the three field names
  - [ ] Remove them from any `select` objects, `where` clauses, or response DTOs
  - [ ] Update any TypeScript types/interfaces referencing these fields
- [ ] Validate (AC: #5)
  - [ ] Run `pnpm all` — confirm no TypeScript errors and all tests pass

## Dev Notes

### Key Files

- `prisma/schema.prisma` — SQLite / development schema
- `prisma/schema.postgresql.prisma` — PostgreSQL / production schema
- `prisma/migrations/` — migration output directory
- `apps/server/src/routes/` — backend route handlers to update

### Fields to Remove (exact names)

```prisma
has_volitility         Boolean
objectives_understood  Boolean
graph_higher_before_2008 Boolean

@@index([has_volitility, objectives_understood, graph_higher_before_2008])
```

### Schema Sync Rule

Per architecture constraint, `schema.prisma` and `schema.postgresql.prisma` must always be kept in sync. Any field present in one must be present in both; removals must happen in both simultaneously.

### Migration Safety

- This is a **destructive migration** — it drops columns. It is safe at this point because Story 27.1 has already removed all frontend reads of these fields.
- Do NOT add `@default(false)` back to keep the columns — they must be fully removed.

### Dependencies

- Depends on Story 27.1 (frontend must stop reading these fields before the schema drops them)
- Stories 27.3 and 27.4 depend on this story

### References

[Source: prisma/schema.prisma]
[Source: prisma/schema.postgresql.prisma]
[Source: apps/server/src/routes/]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
