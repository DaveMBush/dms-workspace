# Story C2: Integration tests (server)

Acceptance Criteria:

- Seed `risk_group`, `screener`, `universe`; run sync; assert upserts and
  expirations; re-run to assert idempotency.
- Executable locally and in CI.

Dependencies: Story A1.
