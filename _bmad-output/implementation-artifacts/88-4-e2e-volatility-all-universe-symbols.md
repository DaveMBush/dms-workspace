# Story 88.4: E2E — Volatility Visible for Held and Unheld Universe Symbols

Status: Approved

## Story

As Dave,
I want a Playwright E2E test that proves the Universe screen displays a volatility icon for
**both** symbols I currently hold and symbols I have never held,
so that the regression of Vol/SVol going blank for unheld symbols cannot return silently.

## Acceptance Criteria

1. **Given** the live data server (`pnpm start:server` + `pnpm start:dms-material`, port 4201)
   and a database state that contains at least one symbol with an open position **and** at
   least one symbol with no position history,
   **When** the Universe screen is loaded via the Playwright MCP server,
   **Then** the Vol column renders a non-empty icon (i.e. not the `null`/`unknown` icon —
   one of `steady`, `increasing`, `decreasing`, `volatile`, `flat`, `up-then-down`,
   `down-then-up`) for both the held and the unheld symbol.

2. **Given** the same screen load,
   **When** the SVol column (added in Epic 86) is inspected for the same two symbols,
   **Then** it also renders a non-`null`/`unknown` icon for both.

3. **Given** the failing e2e test is written **first** (TDD), reproduced against the current
   build to confirm it fails for the unheld symbol,
   **When** Stories 88.2 and 88.3 are merged,
   **Then** the e2e test passes against the live server with the same fixtures.

4. **Given** the test is committed to
   `apps/dms-material-e2e/src/integration/` (or the existing volatility e2e file alongside
   the Epic 84 tests),
   **When** the chromium and firefox e2e suites run via
   `pnpm exec nx run dms-material-e2e:e2e-chromium` and the firefox equivalent,
   **Then** both pass and the new test does not introduce flakiness (run it twice in a row
   to confirm).

5. **Given** the e2e test passes,
   **When** `pnpm all` runs,
   **Then** every test passes.

## Tasks / Subtasks

- [ ] Task 1: Inspect existing volatility e2e infrastructure to decide where the new test lives (AC: #4)
  - [ ] Open `apps/dms-material-e2e/src/volatility-visibility.spec.ts` (Epic 84) and
        `apps/dms-material-e2e/src/volatility-new-categories.spec.ts` (Epic 84) to understand patterns
  - [ ] Open `apps/dms-material-e2e/src/helpers/seed-volatility-column-base.helper.ts`,
        `seed-volatility-new-categories.helper.ts`, `seed-stored-volatility-e2e-data.helper.ts`,
        `seed-stored-volatility-update-e2e-data.helper.ts` to understand the seed-helper conventions
  - [ ] Decide: extend `volatility-visibility.spec.ts` with a new `describe('Story 88.4 — held + unheld symbols', ...)` block, OR create a new file `apps/dms-material-e2e/src/volatility-all-universe-symbols.spec.ts`. Pick one and document the choice in Dev Notes.

- [ ] Task 2: Create or extend a seed helper for the held + unheld pair (AC: #1, #2)
  - [ ] Create `apps/dms-material-e2e/src/helpers/seed-volatility-held-and-unheld.helper.ts` (or extend an existing helper if the patterns line up cleanly)
  - [ ] The helper must seed:
    - One **held** symbol: `universe` row + at least one open position + 12+ months of `divDeposits` rows (so volatility can be computed both pre- and post-Epic 88)
    - One **unheld** symbol: `universe` row + **zero** positions + zero `divDeposits` rows. The dividend history fetched from `dividendhistory.net` (or its mock/stub in the e2e environment) must contain enough rows for `calculateVolatility` to return a non-`null`/`unknown` category.
  - [ ] The helper must trigger the universe-sync flow (or whichever flow Story 88.3 wires) so that volatility columns get populated. If the e2e env mocks `fetchDividendHistory`, the helper must arrange that mock to return a deterministic non-empty payload for the unheld symbol.
  - [ ] Return both symbol names so the test can use them
  - [ ] Document in Dev Notes how the seed helper handles the `dividendhistory.net` dependency in the e2e environment (real network call vs. mocked vs. test seed endpoint)

- [ ] Task 3: Write the failing E2E test **first** (TDD) (AC: #1, #2, #3)
  - [ ] In the chosen spec file, add a `describe('Story 88.4 — Volatility for held and unheld universe symbols', ...)` block
  - [ ] Inside, add `test('Vol column shows a real category for both held and unheld symbols', async ({ page }) => { ... })`:
    1. Use the seed helper from Task 2 to set up `heldSymbol` and `unheldSymbol`
    2. Log in via the existing `login` helper (`apps/dms-material-e2e/src/helpers/login.helper.ts`)
    3. Navigate to the Universe screen (`/global/universe` per Story 85.3 verification notes)
    4. For `heldSymbol`: locate its row, locate the Vol-column `<mat-icon>`, assert `aria-label` matches `Volatility: <one of steady|increasing|decreasing|volatile|flat|up-then-down|down-then-up>` and is **not** absent
    5. For `unheldSymbol`: same assertion. **This is the assertion that fails before Story 88.3 is merged.**
  - [ ] Add `test('SVol column shows a real category for both held and unheld symbols', async ({ page }) => { ... })`:
    - Same structure, but target the SVol column added in Epic 86 (use its column name/aria-label per `volatility-new-categories.spec.ts` patterns)
  - [ ] Run the spec against a build that has Stories 88.2 + 88.3 NOT merged — confirm both tests **fail** for the unheld symbol (TDD red)
  - [ ] Commit the failing tests with a clear commit message identifying them as Story 88.4 TDD-red

- [ ] Task 4: Verify the tests pass after Stories 88.2 + 88.3 are present in the branch (AC: #3)
  - [ ] On the branch that contains Stories 88.2 and 88.3 merged: re-run the spec
  - [ ] Both tests must now pass (TDD green)
  - [ ] If they still fail: do **not** weaken the assertions. Return to Story 88.3 and confirm the wiring is complete; the bug is in the production code, not the test.

- [ ] Task 5: Flake check (AC: #4)
  - [ ] Run the spec twice in a row: `pnpm exec nx run dms-material-e2e:e2e-chromium --grep "Story 88.4"` × 2
  - [ ] Both runs must pass
  - [ ] If either run fails: investigate the root cause. Acceptable causes for a fix include: missing `await`, race on initial data load, sub-second polling. Unacceptable: adding `waitForTimeout` or `networkidle`.
  - [ ] Use `expect.poll(...)` for any retried assertion

- [ ] Task 6: Cross-browser verification (AC: #4)
  - [ ] Run `pnpm exec nx run dms-material-e2e:e2e-chromium --grep "Story 88.4"` — must pass
  - [ ] Run the firefox equivalent (`pnpm e2e:dms-material:firefox` or `pnpm exec nx run dms-material-e2e:e2e-firefox --grep "Story 88.4"`) — must pass
  - [ ] Record both runs' pass/fail in Dev Notes under "Browser Verification"

- [ ] Task 7: Full regression run (AC: #5)
  - [ ] Run the full chromium suite: `pnpm e2e:dms-material:chromium` — must pass with no new failures attributable to this story
  - [ ] Run the full firefox suite: `pnpm e2e:dms-material:firefox` — must pass
  - [ ] Run `pnpm all` — must pass

## Dev Notes

### Why TDD-First Here Specifically

Five prior epics shipped volatility "fixes" that broke or ignored cases the test suite never
exercised. The unheld-symbol case is one of those — there was no e2e coverage for it before
Epic 88. Writing the failing test **first**, against the unfixed build, is the only way to
prove the e2e closes the gap rather than papering over it.

### Existing Volatility E2E Infrastructure

| File | Purpose |
| --- | --- |
| `apps/dms-material-e2e/src/volatility-visibility.spec.ts` | Epic 84 — Vol icon visible at all (post bug-fix) |
| `apps/dms-material-e2e/src/volatility-new-categories.spec.ts` | Epic 84 — `flat`, `up-then-down`, `down-then-up` categories |
| `apps/dms-material-e2e/src/helpers/seed-volatility-column-base.helper.ts` | Base seed helper for Vol column |
| `apps/dms-material-e2e/src/helpers/seed-volatility-new-categories.helper.ts` | Seeds the Epic 84 new-category symbols |
| `apps/dms-material-e2e/src/helpers/seed-stored-volatility-e2e-data.helper.ts` | Story 85.4 — seeds stored volatility |
| `apps/dms-material-e2e/src/helpers/seed-stored-volatility-update-e2e-data.helper.ts` | Story 85.4 — update-trigger flow |

Read all four helpers before writing the new one — re-use their seed-API endpoint pattern
exactly. Do **not** reach into the database directly from the test.

### The `dividendhistory.net` Problem in E2E

`fetchDividendHistory` in production calls `https://dividendhistory.net` with a 10-second
rate limiter. In the e2e environment this is unworkable: the test must not hit the network,
and even if it could, dividendhistory.net data for an arbitrary symbol changes over time.

**Required investigation in Task 2:** read existing e2e helpers for any sign of:
- A mock/stub layer for `fetchDividendHistory` already in use (e.g. via a `__mocks__` folder, an MSW handler, or a test-mode env var that the service checks)
- A test-seed API endpoint that allows the test to **directly** populate `universe.volatility_*` columns (which would bypass the entire fetch-and-recalculate path — acceptable for verifying the **rendering** half of Epic 88 but **does not** verify the wiring half)

The chosen approach must be documented in Dev Notes. If no clean mock layer exists, the
seed helper must:
1. Insert the unheld `universe` row directly via the test-seed endpoint
2. Either (a) directly write `volatility_*` columns to a real category (verifies rendering only — incomplete proof of Epic 88), OR (b) trigger the sync route with the real `fetchDividendHistory` enabled for a symbol whose dividendhistory.net page is stable enough for a regression test (e.g. a long-established CEF like `PDI`)

Document the trade-off; do not silently pick one.

### Vol Column `aria-label` Values (per Story 85.4 Dev Notes)

After Epic 84 the expected `aria-label` values on `<mat-icon>` in the Vol column are:
- `Volatility: steady`
- `Volatility: increasing`
- `Volatility: decreasing`
- `Volatility: volatile`
- `Volatility: flat`
- `Volatility: up-then-down`
- `Volatility: down-then-up`
- No icon rendered for `null`/`unknown`/`insufficient-history`

The Story 88.4 assertion is: for the unheld symbol, the icon **must be rendered** and its
`aria-label` must match one of the seven categories above. Equivalent for SVol.

### SVol Column

Epic 86 added the SVol (short-term volatility) column. Find its selector + `aria-label`
pattern by reading `apps/dms-material-e2e/src/volatility-new-categories.spec.ts` and the
universe template `apps/dms-material/src/app/global/global-universe/global-universe.component.html`
to confirm the exact attribute name (likely `Short-term Volatility: <category>` but **verify**).

### Universe Screen Selector Patterns (per Story 85.4)

```typescript
// Locate a row by symbol, then the icon in the Vol cell
const volCell = page
  .locator('tr.mat-mdc-row')
  .filter({ hasText: symbolName })
  .locator('td')
  .first(); // Vol column is first column per Epic 81; verify per current template
const icon = volCell.locator('mat-icon');
await expect(icon).toHaveAttribute('aria-label', /^Volatility: /);
```

Use `expect.poll(...)` for retries; **do not** use `waitForLoadState('networkidle')` or
`waitForTimeout(...)`.

### Port and Login

Per recent reviewer note in Story 85.3: `pnpm start:dms-material` serves on **4201** in this
repo; `pnpm nx run dms-material:serve-e2e` serves on 4301 (used by the playwright stack).
Confirm the port from the e2e config (`apps/dms-material-e2e/playwright.config.ts`) before
hard-coding any URL in the test. Use the existing `baseURL` from playwright config.

Login: use `apps/dms-material-e2e/src/helpers/login.helper.ts` exactly as Story 85.4 does.

### Expected Failure Mode (Pre-Epic 88)

Against `origin/main` (no Epic 88 work merged):
- `heldSymbol` Vol icon: rendered, valid `aria-label` (Story 85.2 trigger paths populate volatility for held symbols)
- `unheldSymbol` Vol icon: **absent** (`volatility_long` and `volatility_short` are `NULL` because `divDeposits.findMany` returned `[]` for that symbol)

After Stories 88.2 and 88.3 are merged:
- Both symbols' Vol icons rendered with valid `aria-label`
- Same for SVol

### What NOT to Do

- Do **not** assert the specific category (e.g. `steady` vs `volatile`) — the category depends on the seed data and would couple the test to the seed helper's internals. Assert only that the `aria-label` matches the regex `^Volatility: (steady|increasing|decreasing|volatile|flat|up-then-down|down-then-up)$`.
- Do **not** weaken the assertion by accepting an absent icon as a pass.
- Do **not** add `waitForTimeout` or `waitForLoadState('networkidle')` (project-wide e2e rule).
- Do **not** mark the new tests as `test.skip` or `test.fail` once Story 88.3 is merged — they must run green in CI.

### Files Likely to Change

| File | Change |
| --- | --- |
| `apps/dms-material-e2e/src/volatility-all-universe-symbols.spec.ts` (or extend `volatility-visibility.spec.ts`) | New `describe` block with two tests |
| `apps/dms-material-e2e/src/helpers/seed-volatility-held-and-unheld.helper.ts` | New seed helper for held + unheld pair |

### Project Structure Notes

- E2E project: `apps/dms-material-e2e`
- Test files live directly under `apps/dms-material-e2e/src/` (per existing volatility specs); the epic body mentions `src/integration/` as an alternative — only use it if other tests are already there
- Seed helpers live under `apps/dms-material-e2e/src/helpers/`
- Playwright config: `apps/dms-material-e2e/playwright.config.ts`
- Run scripts: `pnpm e2e:dms-material:chromium`, `pnpm e2e:dms-material:firefox` (root `package.json`)
- Nx targets: `dms-material-e2e:e2e-chromium`, `dms-material-e2e:e2e-firefox` — use `--grep` to scope runs

### Dependency Notes

- Hard prerequisite: Stories 88.2 and 88.3 must be merged before this test can be expected to pass
- The TDD-red step (Task 3) requires a build state where 88.2 and 88.3 are absent
- The seed helper depends on whatever test-seed API endpoint and `fetchDividendHistory` mocking strategy exists in the e2e env (Task 2 investigation)
- Story 85.3 already serves stored volatility through `/api/universe`, so no API changes are needed in this story

### Useful Commands

```bash
pnpm start:server                                                  # Fastify API
pnpm start:dms-material                                            # Angular dev (port 4201 per Story 85.3 note)
pnpm exec nx run dms-material-e2e:e2e-chromium --grep "Story 88.4" # Scoped run
pnpm e2e:dms-material:chromium                                     # Full chromium suite
pnpm e2e:dms-material:firefox                                      # Full firefox suite
pnpm all                                                           # Full lint + build + test
```

### References

- [apps/dms-material-e2e/src/volatility-visibility.spec.ts](apps/dms-material-e2e/src/volatility-visibility.spec.ts) — Epic 84 visibility tests (template to follow)
- [apps/dms-material-e2e/src/volatility-new-categories.spec.ts](apps/dms-material-e2e/src/volatility-new-categories.spec.ts) — Epic 84 new categories + SVol patterns
- [apps/dms-material-e2e/src/helpers/seed-volatility-column-base.helper.ts](apps/dms-material-e2e/src/helpers/seed-volatility-column-base.helper.ts) — Base seed helper
- [apps/dms-material-e2e/src/helpers/seed-volatility-new-categories.helper.ts](apps/dms-material-e2e/src/helpers/seed-volatility-new-categories.helper.ts) — New-category seed helper
- [apps/dms-material-e2e/src/helpers/seed-stored-volatility-e2e-data.helper.ts](apps/dms-material-e2e/src/helpers/seed-stored-volatility-e2e-data.helper.ts) — Story 85.4 stored-volatility seed
- [apps/dms-material-e2e/src/helpers/seed-stored-volatility-update-e2e-data.helper.ts](apps/dms-material-e2e/src/helpers/seed-stored-volatility-update-e2e-data.helper.ts) — Story 85.4 update-trigger seed
- [apps/dms-material-e2e/src/helpers/login.helper.ts](apps/dms-material-e2e/src/helpers/login.helper.ts) — Login helper
- [apps/dms-material-e2e/playwright.config.ts](apps/dms-material-e2e/playwright.config.ts) — Playwright config (port + baseURL)
- [apps/dms-material/src/app/global/global-universe/global-universe.component.html](apps/dms-material/src/app/global/global-universe/global-universe.component.html) — Vol/SVol column templates + `aria-label` values
- [_bmad-output/implementation-artifacts/85-4-e2e-stored-volatility.md](_bmad-output/implementation-artifacts/85-4-e2e-stored-volatility.md) — Closest pattern to follow
- [_bmad-output/implementation-artifacts/87-1-reproduce-scrolling-failures-all-screens.md](_bmad-output/implementation-artifacts/87-1-reproduce-scrolling-failures-all-screens.md) — TDD-red discipline reference
- [_bmad-output/implementation-artifacts/88-2-refactor-volatility-to-use-distribution-history.md](_bmad-output/implementation-artifacts/88-2-refactor-volatility-to-use-distribution-history.md) — Required prerequisite
- [_bmad-output/implementation-artifacts/88-3-wire-distribution-history-volatility-into-universe-retrieval.md](_bmad-output/implementation-artifacts/88-3-wire-distribution-history-volatility-into-universe-retrieval.md) — Required prerequisite
- [_bmad-output/planning-artifacts/epics-2026-04-28.md](_bmad-output/planning-artifacts/epics-2026-04-28.md) — Source epic (Epic 88, Story 88.4)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
