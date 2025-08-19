# Story A1: Backend sync endpoint (behind flag)

Description: Implement a server action that reads eligible Screener rows and
upserts Universe; mark non‑selected as expired. Guard with
`USE_SCREENER_FOR_UNIVERSE=true`.

Acceptance Criteria:

- POST `/api/universe/sync-from-screener` exists and is guarded by the flag.
- Inserts new Universe rows for selected symbols with fields populated from
  Yahoo helpers (`getLastPrice`, `getDistributions`).
- Updates existing rows without resetting historical trading data.
- Marks any non‑selected Universe symbol as `expired=true`.
- Returns summary `{ inserted, updated, markedExpired, selectedCount }`.
- Operation is idempotent.

Dependencies: Architecture doc, Prisma schema, Yahoo helper functions.
