# Epic C: Testing and CI

Goal: Ensure quality gates and regression protection.

## Story C1: Unit tests coverage

Acceptance Criteria:

- Unit tests for selection, upsert mapping, expire logic, idempotency helper.
- Coverage thresholds documented; tests run in CI.

Dependencies: Story A1, A2.

## Story C2: Integration tests (server)

Acceptance Criteria:

- Seed `risk_group`, `screener`, `universe`; run sync; assert upserts and
  expirations; re-run to assert idempotency.
- Executable locally and in CI.

Dependencies: Story A1.

## Story C3: CI pipeline steps

Acceptance Criteria:

- CI runs lint, unit tests, integration tests, and build.
- Secrets handling and env var strategy documented.

Dependencies: Story C1, C2.
