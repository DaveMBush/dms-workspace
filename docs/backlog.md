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

## Epic G: Remove Sync Feature Flag

**Status**: Planned  
**Priority**: High  
**Dependencies**: Epic F must be complete and stable

Goal: Remove the feature flag for sync functionality now that it's stable and working correctly.

### [Story G1: Remove feature flag from frontend components](./epic-g-remove-sync-feature-flag/story-g1-remove-frontend-feature-flag.md)

Description: Remove all feature flag conditional logic from Universe Settings component and related frontend code.

Acceptance Criteria:

- Remove `isFeatureEnabled$` computed signal from UniverseSettingsComponent
- Remove conditional rendering in universe-settings.component.html
- Always show screener-based "Update Universe" button
- Remove manual input fields for equity/income/tax-free symbols
- Update component tests to remove feature flag scenarios

### [Story G2: Update backend feature flag endpoint](./epic-g-remove-sync-feature-flag/story-g2-update-backend-feature-flag.md)

Description: Update or remove the backend feature flag endpoint since the sync feature flag is no longer needed.

Acceptance Criteria:

- Update `/api/feature-flags` endpoint implementation
- Ensure backward compatibility during transition
- Update API documentation if applicable
- Remove or update related backend tests

### [Story G3: Clean up feature flag service](./epic-g-remove-sync-feature-flag/story-g3-cleanup-feature-flag-service.md)

Description: Clean up the FeatureFlagsService to remove unused sync feature flag logic while maintaining service structure for potential future use.

Acceptance Criteria:

- Remove `isUseScreenerForUniverseEnabled` computed signal
- Simplify or remove feature flag HTTP resource
- Update service interface and methods
- Update service tests

## Epic H: Reorganize Universe Screen UI Controls

**Status**: Planned  
**Priority**: High  
**Dependencies**: Epic G must be complete

Goal: Reorganize the Universe screen by moving "Update Fields" and "Update Universe" buttons from the Universe Settings modal to the Universe title bar as intuitive icons with tooltips and overlays.

### [Story H1: Add "Update Fields" icon to Universe title bar](./epic-h-reorganize-universe-ui-controls/story-h1-add-update-fields-icon.md)

Description: Add an "Update Fields" icon to the Universe screen title bar that triggers the same functionality as the current "Update Fields" button in the Universe Settings modal.

Acceptance Criteria:

- Add "Update Fields" icon to Universe title bar in the `#end` template section
- Position icon to the left of the existing settings icon
- Use appropriate PrimeNG icon (e.g., `pi-database`)
- Add tooltip with text "Update Fields"
- Wire up click handler to call the same endpoint as current modal button

### [Story H2: Add "Update Universe" sync icon to Universe title bar](./epic-h-reorganize-universe-ui-controls/story-h2-add-update-universe-icon.md)

Description: Add an "Update Universe" sync icon to the Universe screen title bar that triggers the same screener sync functionality as the current "Update Universe" button in the Universe Settings modal.

Acceptance Criteria:

- Add "Update Universe" sync icon to Universe title bar
- Position icon to the left of the "Update Fields" icon
- Use sync icon (`pi-sync`)
- Add tooltip with text "Update Universe"
- Wire up click handler to call screener sync endpoint

### [Story H3: Implement translucent overlay for update operations](./epic-h-reorganize-universe-ui-controls/story-h3-implement-update-overlay.md)

Description: Add a translucent overlay to the Universe screen during "Update Fields" and "Update Universe" operations, similar to the overlay used in the Screener refresh functionality.

Acceptance Criteria:

- Add overlay signal to track loading state
- Show overlay during both "Update Fields" and "Update Universe" operations
- Use same overlay styling as Screener screen
- Include loading spinner and appropriate text
- Proper accessibility attributes for overlay

### [Story H4: Remove Universe Settings modal](./epic-h-reorganize-universe-ui-controls/story-h4-remove-settings-modal.md)

Description: Remove the Universe Settings modal and all related components since the "Update Fields" and "Update Universe" functionality has been moved to the Universe title bar.

Acceptance Criteria:

- Remove settings icon from Universe title bar
- Remove Universe Settings modal component files
- Remove Universe Settings service
- Update Universe component to remove modal-related code
- Remove related imports and dependencies

## Epic I: Clean Up Unused Code

**Status**: Planned  
**Priority**: Medium  
**Dependencies**: Epics G and H must be complete

Goal: Perform comprehensive cleanup of unused code after removing the feature flag and Universe Settings modal, ensuring a clean and maintainable codebase.

### [Story I1: Remove unused imports and dependencies](./epic-i-cleanup-unused-code/story-i1-remove-unused-imports.md)

Description: Remove all unused imports and dependencies from files modified during Epic G and Epic H, ensuring clean and optimized imports.

Acceptance Criteria:

- Remove unused imports from all modified components
- Clean up import statements to follow project conventions
- Run ESLint to catch any unused import warnings
- Organize imports according to project standards

### [Story I2: Clean up unused service methods and properties](./epic-i-cleanup-unused-code/story-i2-cleanup-unused-services.md)

Description: Clean up unused methods, properties, and service logic that is no longer needed after feature flag removal and UI reorganization.

Acceptance Criteria:

- Remove unused methods from remaining services
- Clean up unused properties and signals
- Remove unused service dependencies
- Simplify service interfaces where possible

### [Story I3: Remove dead code and unused utilities](./epic-i-cleanup-unused-code/story-i3-remove-dead-code.md)

Description: Identify and remove dead code paths, unused utility functions, and any other code that is no longer reachable or needed after the changes.

Acceptance Criteria:

- Remove unused utility functions
- Clean up dead code paths in conditional logic
- Remove unused constants and configuration
- Clean up unused type definitions and interfaces

### [Story I4: Update documentation and type definitions](./epic-i-cleanup-unused-code/story-i4-update-documentation.md)

Description: Update documentation, README files, and type definitions to reflect the changes made during Epic G and Epic H, ensuring accurate and current project documentation.

Acceptance Criteria:

- Update component documentation comments
- Update service documentation and JSDoc comments
- Revise README files if they reference removed features
- Update type definitions to reflect new interfaces

## Summary

**Overview**: [Epics G, H, I: UI Cleanup and Enhancement](./epic-g-h-i-ui-cleanup-and-enhancement.md)

These three epics work together to:

1. **Epic G**: Remove feature flag complexity
2. **Epic H**: Improve Universe screen UX with direct icon controls
3. **Epic I**: Clean up and maintain code quality

**Total Estimated Duration**: 5-8 days  
**Implementation Order**: G → H → I (sequential due to dependencies)
