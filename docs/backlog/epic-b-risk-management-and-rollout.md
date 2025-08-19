# Epic B: Risk management and rollout

Goal: Reduce brownfield risk and provide a clean rollback path.

## Story B1: Feature flag configuration and docs

Acceptance Criteria:

- `USE_SCREENER_FOR_UNIVERSE` documented (defaults, environments, how to set).
- Local/dev/prod behaviors described, including safe toggling.

## Story B2: Rollback runbook

Reference: [Rollback runbook](./rollback-runbook.md)

Acceptance Criteria:

- Steps to disable the feature quickly and verify system returns to manual
  Universe management.
- Checklist to validate Universe integrity after rollback.

## Story B3: Monitoring and alerts

Acceptance Criteria:

- Define checks for sync errors and unexpected large expirations.
- Document how to review logs and metrics; thresholds for alerting.

Dependencies: Story A3.
