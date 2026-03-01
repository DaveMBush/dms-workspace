# Coding Standards

## Database Safety Rules

**CRITICAL — These rules are NON-NEGOTIABLE for all AI agents and developers:**

1. **NEVER run `prisma db push --force-reset`** — This destroys all data in the database. The production and development databases contain real financial data that takes hours to re-seed.

2. **NEVER run `prisma migrate reset`** — Same as above, this wipes the database.

3. **NEVER delete or overwrite `prisma/database.db`** — This is the local development database file containing real imported data.

4. **NEVER run any command that drops tables, truncates data, or resets the database** without explicit human approval via `prompt.sh`.

5. **Safe commands** (these are OK to run):

   - `prisma db push` (without `--force-reset`) — safely applies schema changes
   - `prisma migrate dev` — applies pending migrations
   - `prisma generate` — regenerates the Prisma client
   - `prisma studio` — opens the database browser (read-only by default)

6. **If you need to inspect the database**, use read-only queries or `prisma studio`. Never modify data unless explicitly instructed.

7. **If a schema change requires a reset**, call `prompt.sh` to inform the human operator and get explicit approval before proceeding.

## General Coding Standards

- Follow existing code patterns and conventions in the codebase
- Use named functions instead of anonymous functions (per `@smarttools/no-anonymous-functions` ESLint rule)
- Use `.bind(this)` pattern when named functions need component/service context
- Follow Angular's `OnPush` change detection strategy
- Use signals for reactive state management
- All code must pass `pnpm all` (lint + build + test) before committing
- All code must pass `pnpm dupcheck` (no duplicate code)
- All code must pass `pnpm format` (consistent formatting)
