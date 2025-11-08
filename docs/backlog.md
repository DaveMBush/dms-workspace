# Backlog: Universe Sync From Screener (Brownfield)

This backlog converts the architecture into actionable epics and stories with clear acceptance criteria for delivery and review.

## Table of Contents

- [Epic A: Universe sync from Screener](./backlog/epic-a-universe-sync-from-screener.md)
  - [Story A.1: Backend sync endpoint (behind flag)](./stories/A.1.backend-sync-endpoint-behind-flag.md)
  - [Story A.2: Idempotency and transaction safety](./stories/A.2.idempotency-and-transaction-safety.md)
  - [Story A.3: Logging and metrics](./stories/A.3.logging-and-metrics.md)
  - [Story A.4: UI action "Use Screener"](./stories/A.4.ui-action-use-screener.md)

- [Epic B: Risk management and rollout](./backlog/epic-b-risk-management-and-rollout.md)
  - [Story B.1: Feature flag configuration and docs](./stories/B.1.feature-flag-configuration-and-docs.md)
  - [Story B.2: Rollback runbook](./stories/B.2.rollback-runbook.md)
  - [Story B.3: Monitoring and alerts](./stories/B.3.monitoring-and-alerts.md)

- [Epic C: Testing and CI](./backlog/epic-c-testing-and-ci.md)
  - [Story C.1: Unit tests coverage](./stories/C.1.unit-tests-coverage.md)
  - [Story C.2: Integration tests (server)](./stories/C.2.integration-tests-server.md)
  - [Story C.2b: Fix database isolation](./stories/C.2b.fix-database-isolation.md)
  - [Story C.3: CI pipeline steps](./stories/C.3.ci-pipeline-steps.md)

- [Epic D: UX enhancements for Universe flows](./backlog/epic-d-ux-enhancements-for-universe-flows.md)
  - [Story D.1: User journeys and error/loading states](./stories/D.1.user-journeys-and-errorloading-states.md)
  - [Story D.2: A11y checklist for PrimeNG/Tailwind](./stories/D.2.a11y-checklist-for-primengtailwind.md)

- [Epic E: Data and database](./backlog/epic-e-data-and-database.md)
  - [Story E.1: Risk group seed and validation](./stories/E.1.risk-group-seed-and-validation.md)
  - [Story E.2: Backup and restore guidance](./stories/E.2.backup-and-restore-guidance.md)
  - [Story E.3: Schema integrity and performance](./stories/E.3.schema-integrity-and-performance.md)

- [Epic F: Documentation](./backlog/epic-f-documentation.md)
  - [Story F.1: API schema doc for sync endpoint](./stories/F.1.api-schema-doc-for-sync-endpoint.md)
  - [Story F.2: Update acceptance criteria and sequence on change](./stories/F.2.update-acceptance-criteria-and-sequence-on-change.md)

- [Epic G: Remove Sync Feature Flag](./backlog/epic-g-h-i-ui-cleanup-and-enhancement.md)
  - [Story G.1: Remove frontend feature flag](./stories/G.1.remove-frontend-feature-flag.md)
  - [Story G.2: Update backend feature flag](./stories/G.2.update-backend-feature-flag.md)
  - [Story G.3: Cleanup feature flag service](./stories/G.3.cleanup-feature-flag-service.md)

- [Epic H: Universe Yield Enhancements](./backlog/epic-h-universe-yield-enhancements.md)
  - [Story H.1: Avg purchase yield calculation](./stories/H.1.avg-purchase-yield-calculation.md)
  - [Story H.2: Add avg yield column](./stories/H.2.add-avg-yield-column.md)
  - [Story H.3: Unit tests yield calculations](./stories/H.3.unit-tests-yield-calculations.md)
  - [Story H.4: Integration testing validation](./stories/H.4.integration-testing-validation.md)

- [Epic I: Universe Display Filtering](./backlog/epic-i-universe-display-filtering.md)
  - [Story I.1: Expired with positions filter](./stories/I.1.expired-with-positions-filter.md)
  - [Story I.2: Update default filter behavior](./stories/I.2.update-default-filter-behavior.md)
  - [Story I.4: Unit tests filtering logic](./stories/I.4.unit-tests-filtering-logic.md)
  - [Story I.5: Integration testing validation](./stories/I.5.integration-testing-validation.md)

- [Epic J: AWS Deployment Infrastructure](./backlog/epic-j-aws-deployment-infrastructure.md)
  - [Story J.1: Setup Terraform infrastructure](./stories/J.1.setup-terraform-infrastructure.md)
  - [Story J.2: Database migration RDS](./stories/J.2.database-migration-rds.md)
  - [Story J.3: Backend deployment ECS](./stories/J.3.backend-deployment-ecs.md)
  - [Story J.4: Frontend deployment S3 CloudFront](./stories/J.4.frontend-deployment-s3-cloudfront.md)
  - [Story J.5: Domain SSL configuration](./stories/J.5.domain-ssl-configuration.md)
  - [Story J.6: Monitoring logging setup](./stories/J.6.monitoring-logging-setup.md)
  - [Story J.7: Infrastructure documentation](./stories/J.7.infrastructure-documentation.md)

- [Epic K: Authentication Security](./backlog/epic-k-authentication-security.md)
  - [Story K.1: AWS Cognito setup](./stories/K.1.aws-cognito-setup.md)
  - [Story K.2: Backend auth middleware](./stories/K.2.backend-auth-middleware.md)
  - [Story K.3: Frontend login auth service](./stories/K.3.frontend-login-auth-service.md)
  - [Story K.4: Route protection auth guards](./stories/K.4.route-protection-auth-guards.md)
  - [Story K.5: Token refresh session management](./stories/K.5.token-refresh-session-management.md)
  - [Story K.6: User profile account management](./stories/K.6.user-profile-account-management.md)
  - [Story K.7: Security hardening production](./stories/K.7.security-hardening-production.md)
  - [Story K.8: Integration testing documentation](./stories/K.8.integration-testing-documentation.md)

- [Epic L: Performance Optimization](./backlog/epic-l-performance-optimization.md)
  - [Story L.1: Implement token caching system](./stories/L.1.implement-token-caching-system.md)
  - [Story L.2: Implement request-level performance monitoring](./stories/L.2.implement-request-level-performance-monitoring.md)
  - [Story L.3: Database connection and query optimization](./stories/L.3.database-connection-and-query-optimization.md)

- [Epic M: LocalStack Development Environment](./backlog/epic-m-localstack-development-environment.md)
  - [Story M.1: LocalStack Docker infrastructure](./stories/M.1.localstack-docker-infrastructure.md)
  - [Story M.2: Local authentication configuration](./stories/M.2.local-authentication-configuration.md)
  - [Story M.3: Development tooling documentation](./stories/M.3.development-tooling-documentation.md)

- [Epic N: ETF Universe Management](./backlog/epic-n-etf-universe-management.md)
  - [Story N.1: Add is_closed_end_fund flag](./stories/N.1.add-is-closed-end-fund-flag.md)
  - [Story N.2: Universe screen add symbol functionality](./stories/N.2.universe-screen-add-symbol-functionality.md)
  - [Story N.3: Prevent ETF expiration during sync](./stories/N.3.prevent-etf-expiration-during-sync.md)

- [Epic O: Persistent Toast Notifications](./backlog/epic-o-persistent-toast-notifications.md)
  - [Story O.1: Implement persistent toast notifications](./stories/O.1.implement-persistent-toast-notifications.md)

- [Epic P: Cap Gains Calculations](./backlog/epic-p-cap-gains-calculations.md)
  - [Story P.1: Fix cap gains display sold tab](./stories/P.1.fix-cap-gains-display-sold-tab.md)

- [Epic Q: Null ExDate Handling](./backlog/epic-q-null-exdate-handling.md)
  - [Story Q.1: Handle null exdate open positions](./stories/Q.1.handle-null-exdate-open-positions.md)

- [Epic R: Universe Delete Functionality](./backlog/epic-r-universe-delete-functionality.md)
  - [Story R.1: Add conditional delete universe rows](./stories/R.1.add-conditional-delete-universe-rows.md)

- [Epic S: Error Log Viewing Screen](./backlog/epic-s-error-log-viewing-screen.md)
  - [Story S.1: Create error log viewing screen](./stories/S.1.create-error-log-viewing-screen.md)

- [Epic T: Unified ExDate Data Source](./backlog/epic-t-unified-exdate-data-source.md)
  - [Story T.1: Migrate exdate data to Yahoo Finance](./stories/T.1.migrate-exdate-data-to-yahoo-finance.md)

- [Epic U: Lazy Loading Dividend Deposits](./backlog/epic-u-lazy-loading-dividend-deposits.md)
  - [Story U.1: Dividend deposits lazy loading](./stories/U.1.dividend-deposits-lazy-loading.md)

- [Epic V: Lazy Loading Open Positions](./backlog/epic-v-lazy-loading-open-positions.md)
  - [Story V.1: Open positions lazy loading](./stories/V.1.open-positions-lazy-loading.md)

- [Epic W: Lazy Loading Sold Positions](./backlog/epic-w-lazy-loading-sold-positions.md)
  - [Story W.1: Sold positions lazy loading](./stories/W.1.sold-positions-lazy-loading.md)

- [Epic X: Lazy Loading Global Universe](./backlog/epic-x-lazy-loading-global-universe.md)
  - [Story X.1: Global universe lazy loading](./stories/X.1.global-universe-lazy-loading.md)

- [Epic Y: Fix Account Summary Pie Chart Filtering](./backlog/epic-y-account-summary-pie-chart-fix.md)
  - [Story Y.1: Update getRiskGroupData to Filter by Account](./stories/Y.1.update-get-risk-group-data-filter.md)
  - [Story Y.2: Add Tests for Account-Specific Risk Group Calculations](./stories/Y.2.add-tests-risk-group-calculations.md)
  - [Story Y.3: Verify Fix and Run Full Test Suite](./stories/Y.3.verify-fix-and-run-tests.md)

## Related Documentation

- [PRD: Enhancement to Universe Update Process](./prd.md)
- [Architecture Documentation](./architecture.md)
- [Rollback Runbook](./rollback-runbook.md)
- [Documentation Sync Process](./documentation-sync-process.md)
