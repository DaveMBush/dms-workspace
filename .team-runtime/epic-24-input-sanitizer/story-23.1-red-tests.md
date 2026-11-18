# Story 23.1 — Red-phase tests (verification record)

Status: **RED-PHASE TESTS COMMITTED & VERIFIED FAILING** — ready for Story 23.2 (green implementation).

## What was committed

- Commit `16e7c8f1` (amended from `29f4e760`) — "feat(story 23.1): Red-phase unit tests for shared input sanitizer and takeUntilDestroyed subscription"
- Files changed (**test scaffolding only, no production code**):
  - `apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.spec.ts` (+127) — new vitest spec: 5 baseline tests (pass) + **2 red-phase assertions that are ACTIVE and FAIL** against current code.
  - `apps/dms-material/vite.config.mts` (+1) — coverage exclude for the new spec so it does not skew Story 23.2's coverage gate.

### The two red-phase assertions (both currently FAIL, as required by the TDD red phase)

- **AC#1 — shared sanitizer:** `routes quantity and price inputs through one shared sanitizer (identical accept/reject for the same raw input)`. Feeds the same raw strings (`'abc'`, `'-5'`, `''`, `'3.14'`) to both `onQuantityInput` and `onPriceInput` and asserts identical results. **Fails** because the handlers diverge: e.g. `'3.14'` → quantity strips all non-digits to `'314'`, price keeps one decimal point as `'3.14'`. Fails until a single shared sanitizer is extracted and both handlers route through it.
- **AC#2 — takeUntilDestroyed teardown:** `tears down the searchControl.valueChanges subscription when destroyed (takeUntilDestroyed)`. Spies on `symbolControl.setValue`, emits before destroy (delivered), then emits after `fixture.destroy()` and asserts no delivery. **Fails** because the component subscribes in `ngAfterViewInit` with a plain `.subscribe(onSearchValueChange)` and has no teardown (`no takeUntilDestroyed`/`ngOnDestroy`), so a post-destroy emission still reaches `symbolControl.setValue('BBB')`. Fails until the subscription is torn down via `takeUntilDestroyed(this.destroyRef)`.

> Note: an earlier draft of this spec wrote these two as `it.skip` (exempted by the file-level `eslint-disable vitest/no-disabled-tests`). That was corrected — skipped ≠ failing, and the task requires tests that **FAIL** against current code. They are now active; no eslint-disable is needed since there are no skips.

## Verification results (run at commit 16e7c8f1)

| Gate                                                            | Result                                                                             | Notes                                                                                                                                                                       |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm nx test dms-material add-position-dialog --skip-nx-cache` | **RED as intended**                                                                | 5 passed, **2 failed**. Both red assertions fail for the _right_ reason (sanitizer divergence; missing teardown). Baseline tests green.                                     |
| `pnpm all` full gate (run at prior commit 29f4e760)             | lint PASS · build PASS · e2e chromium **PASS** · e2e firefox 799 passed / 5 failed | see below — the 5 firefox failures are pre-existing, unrelated to this change. Unit-test phase was an Nx cache hit in that run; re-verified directly above after the amend. |

## The 5 firefox e2e failures are PRE-EXISTING and UNRELATED to Story 23.1

Failing specs (firefox only; all PASS on chromium in the same gate run):

- `add-then-navigate.spec.ts:53` — add position → navigate to Sold Positions (console-error assertion)
- `add-then-navigate.spec.ts:125` — add deposit → navigate to Open Positions (console-error assertion)
- `storybook-snapshots.spec.ts:26/30/36` — BaseTable Default / EmptyState / UniverseTableVariation dual-theme snapshots (~2% pixel drift vs committed firefox baseline, e.g. 11832 px on UniverseTableVariation-light)

Proof they are not caused by this change:

- `git diff --stat origin/main..HEAD -- apps/dms-material-e2e/` → **empty** (branch made zero e2e changes).
- All three failing spec/helper files and every firefox baseline PNG are byte-identical to `origin/main`.
- Chromium passed all five in the same run; an isolated firefox re-run of just those two spec files reproduced the identical 5 failures deterministically.

Conclusion: these are pre-existing firefox-only e2e drift/flakiness on main (snapshot pixel variance + console-error timing), independent of Story 23.1's test-scaffolding-only diff. **Not fixed here** — out of scope for a red-phase unit-test story, and regenerating unrelated baselines / patching `add-then-navigate` would mask real drift and risk cross-machine churn. Flagged for the team to triage separately (likely needs baseline refresh on a firefox CI runner or a console-error tolerance fix).

## Handoff to Story 23.2 (green implementation)

1. Extract a shared sanitizer, e.g. `sanitizeInput(value: string): string` in `apps/dms-material/src/app/shared/utils/input-sanitizer.ts`, and route **both** `onQuantityInput` and `onPriceInput` through it so the same raw input yields identical accept/reject behavior (AC#1). Decide the intended shared policy (the current quantity=strip-all-non-digits vs price=keep-one-decimal divergence is exactly what AC#1 forbids).
2. In `add-position-dialog.component.ts`, replace the plain `.subscribe(onSearchValueChange)` in `ngAfterViewInit` with a subscription piped through `takeUntilDestroyed(this.destroyRef)` (inject `DestroyRef`) so it tears down on destroy (AC#2).
3. Re-run: `pnpm nx test dms-material add-position-dialog --skip-nx-cache` (expect the 2 red assertions to flip green), then full `pnpm all`. The 5 pre-existing firefox e2e failures will remain — do not treat them as a regression from this story.

## Resumed run (correction) — skip markers restored per AC #3/#4

The "active, failing" interpretation above was **wrong** against the story's acceptance criteria: Task 3 / AC #3 explicitly require `it.skip` on every new red-phase assertion and a fully green suite ("red-phase by skip, not by failure"). The resumed run corrected this.

- Commits: `714e3267` (story file → status review + Dev Agent Record) and `dbdaface` (spec: both assertions converted to `it.skip`, header comment rewritten, file-level `// eslint-disable vitest/no-disabled-tests, sonarjs/no-skipped-tests`).
- Verified at `dbdaface`: `nx test dms-material --skip-nx-cache` → **1888 passed | 2 skipped**, suite green; repo-wide `no-skipped-tests.spec.ts` scanner passes (it exempts files carrying the disable directive). Temporarily unskipping reproduced exactly the two expected failures for the right reasons, then restored.
- Lint: `nx lint dms-material --skip-nx-cache` PASS.

### Incident note (for future runs)

The skip-marker fix existed only as an **uncommitted** worktree change when this run started. A verification step ran `git checkout -- <spec>` to restore the file after a temporary sed edit — which restored from HEAD (`16e7c8f1`, active-tests version), silently discarding the uncommitted skip fix (no dangling blob survived; it was never staged). The spec was then rebuilt from scratch against the current content. **Lesson: commit or stash worktree fixes before any `git checkout --` / reset operation on that path.**

### Updated handoff to Story 23.2

First task is now: remove the two `.skip()` markers (and, once both tests pass, the file-level eslint-disable), confirm they FAIL against current code, then implement items 1–2 above until green.
