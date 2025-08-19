# Story A2: Idempotency and transaction safety

Description: Ensure the sync logic is idempotent and wraps changes in a
transaction to avoid partial updates.

Acceptance Criteria:

- Running the sync twice with unchanged Screener produces no data changes on
  the second run.
- Bulk changes are committed atomically; on error, no partial results remain.
- Unit tests cover symbol present/absent, new/existing, and failure paths.

Dependencies: Story A1.
