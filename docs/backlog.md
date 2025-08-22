# Backlog: Universe Sync From Screener (Brownfield)

This backlog converts the architecture into actionable epics and stories with
clear acceptance criteria for delivery and review.

## Epic A: Universe sync from Screener

Goal: Use curated Screener rows (all three booleans true) to populate and
maintain the tradable Universe.

### Story A1: Backend sync endpoint (behind flag)

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

### Story A2: Idempotency and transaction safety

Description: Ensure the sync logic is idempotent and wraps changes in a
transaction to avoid partial updates.

Acceptance Criteria:

- Running the sync twice with unchanged Screener produces no data changes on
  the second run.
- Bulk changes are committed atomically; on error, no partial results remain.
- Unit tests cover symbol present/absent, new/existing, and failure paths.

Dependencies: Story A1.

### Story A3: Logging and metrics

Description: Add structured logs and basic counters for inserted/updated/
expired to aid verification and troubleshooting.

Acceptance Criteria:

- Logs include correlation id and counts per request.
- Errors log symbol and operation context without secrets.
- Metrics counters or log-derived dashboard documented.

Dependencies: Story A1.

### Story A4: UI action "Use Screener"

Description: Add a button in Universe Settings to invoke the sync, show a
spinner, and close on success (feature-flag aware).

Acceptance Criteria:

- Button is visible only when the feature flag is enabled.
- Clicking triggers POST and shows progress.
- On success, dialog closes and data refresh is triggered.
- On error, a visible error message is shown.

Dependencies: Story A1.

## Epic B: Risk management and rollout

Goal: Reduce brownfield risk and provide a clean rollback path.

### Story B1: Feature flag configuration and docs

Acceptance Criteria:

- `USE_SCREENER_FOR_UNIVERSE` documented (defaults, environments, how to set).
- Local/dev/prod behaviors described, including safe toggling.

### Story B2: Rollback runbook

Reference: [Rollback runbook](./rollback-runbook.md)

Acceptance Criteria:

- Steps to disable the feature quickly and verify system returns to manual
  Universe management.
- Checklist to validate Universe integrity after rollback.

### Story B3: Monitoring and alerts

Acceptance Criteria:

- Define checks for sync errors and unexpected large expirations.
- Document how to review logs and metrics; thresholds for alerting.

Dependencies: Story A3.

## Epic C: Testing and CI

Goal: Ensure quality gates and regression protection.

### Story C1: Unit tests coverage

Acceptance Criteria:

- Unit tests for selection, upsert mapping, expire logic, idempotency helper.
- Coverage thresholds documented; tests run in CI.

Dependencies: Story A1, A2.

### Story C2: Integration tests (server)

Acceptance Criteria:

- Seed `risk_group`, `screener`, `universe`; run sync; assert upserts and
  expirations; re-run to assert idempotency.
- Executable locally and in CI.

Dependencies: Story A1.

### Story C3: CI pipeline steps

Acceptance Criteria:

- CI runs lint, unit tests, integration tests, and build.
- Secrets handling and env var strategy documented.

Dependencies: Story C1, C2.

## Epic D: UX enhancements for Universe flows

Goal: Clarify user journeys and state handling.

### Story D1: User journeys and error/loading states

Acceptance Criteria:

- Document journeys for manual update and "Use Screener".
- Define loading and error states; consistent messaging.
- Accessibility checks for dialog and buttons.

### Story D2: A11y checklist for PrimeNG/Tailwind

Acceptance Criteria:

- Define keyboard focus behavior and color contrast expectations.
- Validate spinner and messages with screen readers.

## Epic E: Data and database

Goal: Safe data evolution and recovery.

### Story E1: Risk group seed and validation

Acceptance Criteria:

- Ensure risk groups exist before sync; seed script or runtime ensure.
- Unit test for ensure behavior.

### Story E2: Backup and restore guidance

### Story E3: Schema integrity and performance

Description: Add uniques and indexes, and plan a phased rename for the
misspelled field.

Acceptance Criteria:

- Unique on `universe.symbol` added after dedupe; unique on `risk_group.name`.
- Indexes: `universe(expired)`, `universe(risk_group_id)`,
  `screener(has_volitility, objectives_understood, graph_higher_before_2008)`,
  `screener(risk_group_id)`.
- Rename plan documented: `has_volitility` → `has_volatility` with 3‑phase
  migration plan and rollback steps.
Acceptance Criteria:

- Doc steps to back up SQLite db before rollout; restore procedure included.

## Epic F: Documentation

Goal: Keep specs accurate and auditable.

### Story F1: API schema doc for sync endpoint

Acceptance Criteria:

- Document request/response schema and examples.
- Add to `docs/architecture.md` and cross-link in this backlog.

### Story F2: Update acceptance criteria and sequence on change ✅

**Status**: Completed

Acceptance Criteria:

- [x] Architecture and backlog kept in sync during delivery; changes reviewed
- [x] Documentation synchronization process documented and implemented  
- [x] Cross-reference system established between architecture and backlog
- [x] Review checklist created for documentation updates
- [x] Quality gates defined for documentation consistency

**Implementation**: [Documentation Sync Process](./documentation-sync-process.md)
