# Epic A: Universe sync from Screener

Goal: Use curated Screener rows (all three booleans true) to populate and
maintain the tradable Universe.

## Story A1: Backend sync endpoint (behind flag)

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

## Story A2: Idempotency and transaction safety

Description: Ensure the sync logic is idempotent and wraps changes in a
transaction to avoid partial updates.

Acceptance Criteria:

- Running the sync twice with unchanged Screener produces no data changes on
  the second run.
- Bulk changes are committed atomically; on error, no partial results remain.
- Unit tests cover symbol present/absent, new/existing, and failure paths.

Dependencies: Story A1.

## Story A3: Logging and metrics

Description: Add structured logs and basic counters for inserted/updated/
expired to aid verification and troubleshooting.

Acceptance Criteria:

- Logs include correlation id and counts per request.
- Errors log symbol and operation context without secrets.
- Metrics counters or log-derived dashboard documented.

Dependencies: Story A1.

## Story A4: UI action "Use Screener"

Description: Add a button in Universe Settings to invoke the sync, show a
spinner, and close on success (feature-flag aware).

Acceptance Criteria:

- Button is visible only when the feature flag is enabled.
- Clicking triggers POST and shows progress.
- On success, dialog closes and data refresh is triggered.
- On error, a visible error message is shown.

Dependencies: Story A1.
