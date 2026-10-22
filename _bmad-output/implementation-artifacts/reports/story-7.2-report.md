# Story 7.2 Completion Report — Upgrade yahoo-finance2 to v4

**Status:** done
**Branch:** `issue-1443-story-7-2-upgrade-yahoo-finance2-to-v4` (pushed; final commit after this report: see git log)
**Date:** 2026-10-22

## Summary

Upgraded `yahoo-finance2` from the v3 line (`^3.13.0`, resolved 3.15.4) to `^4.0.4`. No production code changes were required: v4.0.4's API surface (constructor options, `search()`, `quote()` signatures and return shapes) is fully compatible with existing usage — verified against the installed `.d.ts` before touching anything. The only code change was unskipping Story 7.1's red-phase version assertion so it now passes under v4.

## Acceptance Criteria Verification

| AC | Result | Evidence |
|----|--------|----------|
| #1 — root `package.json` targets 4.0.4, lockfile on v4 line | PASS | `"yahoo-finance2": "^4.0.4"` in root `package.json`; `pnpm-lock.yaml` resolves to the v4 line after `pnpm install`. |
| #2 — single import point still constructs a working instance | PASS | `apps/server/src/app/routes/settings/yahoo-finance.instance.ts` unchanged; constructor options valid against v4 `.d.ts`; server build succeeds. |
| #3 — all three consumers compile and pass unit tests | PASS | `symbol/search/index.ts`, `import/resolve-cusip.function.ts`, `settings/common/get-last-price.function.ts` unchanged (signatures compatible); full server suite green: 78 files / 1027 passed, 6 pre-existing skips in `database-performance-integration.spec.ts`. No new failures. |
| #4 — Story 7.1 tests unskipped and green; no regressions; lint + build clean | PASS | `.skip` removed from `apps/server/src/yahoo-finance2-version.spec.ts`; version assertion passes under v4. `nx run dms-server:lint` clean, `dms-server:build` succeeds (verified with `--skip-nx-cache`). |

## Files Changed

- `package.json` — `"yahoo-finance2": "^3.13.0"` → `"^4.0.4"`
- `pnpm-lock.yaml` — regenerated via `pnpm install` (v4 line resolved)
- `apps/server/src/yahoo-finance2-version.spec.ts` — removed `.skip` markers from Story 7.1's red-phase tests

No production source files modified.

## Quality Gate (`pnpm all`)

Ran the full affected-project gate against base ref:

- **Lint:** PASS (no new errors)
- **Build:** PASS (`dms-server`, `dms-material` builds succeed)
- **Unit tests:** PASS (server suite 1027 passed; no regressions vs. baseline)
- **E2E chromium:** PASS — `dms-material-e2e:e2e-chromium` completed in 45m 51s
- **E2E firefox:** FAIL — pre-existing infrastructure failure, not caused by this story

### Pre-existing e2e-firefox failure (not a regression)

`dms-material-e2e:e2e-firefox` fails with an Nx recursive task-invocation loop:

```
dms-material-e2e:e2e -> dms-material:serve-e2e -> dms-material-e2e:e2e-firefox -> dms-material:serve-e2e
Task "dms-material:serve-e2e" was already invoked by a parent Nx process in this chain.
```

Root cause is the e2e project's own `webServer` config (`apps/dms-material-e2e/playwright.config.ts` line ~110–129) invoking `pnpm nx run dms-material:serve-e2e`, which re-enters the same task chain. This configuration is **identical on `origin/main`**, and this branch's diff shifts no `nx` or `@playwright/*` versions (lockfile delta contains only the yahoo-finance2 v4 resolution). The failure reproduces independent of this story's changes; it should be tracked as a separate infrastructure fix.

## Notes / Follow-ups

1. **e2e-firefox webServer recursion** — needs its own story/fix: dedupe `dms-material:serve-e2e` invocation in the e2e project's Nx target chain (or make `serve-e2e` idempotent/re-entrant).
2. Deprecation warning observed during gate: `@nx/playwright:playwright` executor deprecated, removal planned for Nx v24 — migrate via `nx g @nx/playwright:convert-to-inferred` when convenient.

## Verification Commands (reproducible)

```bash
pnpm install
npx nx run dms-server:test --skip-nx-cache        # 1027 passed, version assertion green
npx nx run dms-server:lint --skip-nx-cache        # clean
npx nx run dms-server:build --skip-nx-cache       # succeeds
pnpm all                                          # full gate (see firefox caveat above)
```
