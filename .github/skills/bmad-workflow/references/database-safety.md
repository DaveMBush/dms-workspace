# Database Safety

**NEVER run destructive database commands** including but not limited to:

- `prisma db push --force-reset`
- `prisma migrate reset`
- Deleting or overwriting `prisma/database.db`
- Any command that drops tables, truncates data, or resets the database

The development database contains real financial data that takes hours to re-seed. If a schema change requires a reset, call `prompt.sh` to get explicit human approval first.

See `docs/architecture/coding-standards.md` for full database safety rules.
