# Story 76.2: Fix Test Isolation Issues

Status: Approved

## Story

As a developer,
I want all E2E tests classified as isolation failures in Story 76.1 to be fixed by improving
their setup and teardown so that each test starts with a clean, predictable state regardless of
execution order,
so that the full E2E suite passes reliably on both Chromium and Firefox.

## Acceptance Criteria

1. **Given** the list of class-A isolation failures from Story 76.1,
   **When** the developer adds or corrects `beforeEach` / `afterEach` / `afterAll` hooks in the
   relevant spec files to reset database state, clear localStorage, or undo any other side effects
   that bleed between tests,
   **Then** each previously-failing class-A test now passes when run as part of the full suite.

2. **Given** the isolation fixes are applied,
   **When** `pnpm e2e:dms-material:chromium` is run (full suite),
   **Then** all tests that were classified as class-A isolation failures now pass, and no
   previously passing tests have regressed.

3. **Given** the same fixes,
   **When** `pnpm e2e:dms-material:firefox` is run (full suite),
   **Then** all class-A Firefox isolation failures also pass.

4. **Given** any Firefox-specific failure that was not present in Chromium,
   **When** the isolation fix is applied (improved wait strategy, adjusted locator, or cleanup
   hook),
   **Then** the Firefox-specific test now also passes under `pnpm e2e:dms-material:firefox`.

5. **Given** no functional regressions remain after this story (i.e. all remaining failures are
   class-B and deferred to Story 76.3),
   **When** `pnpm all` runs,
   **Then** all tests pass, including the class-A tests that are now fixed.

## Tasks / Subtasks

- [ ] Read Story 76.1 Dev Agent Record and extract class-A isolation failures (AC: #1)
  - [ ] Open `_bmad-output/implementation-artifacts/76-1-catalogue-failing-e2e-tests.md`
  - [ ] Read the **Chromium Failure Catalogue** section and collect every entry where
        Classification = **A**
  - [ ] Read the **Firefox Failure Catalogue** section and collect every entry where
        Classification = **A** (including Firefox-specific class-A entries)
  - [ ] Build a working list of class-A failures: spec file, test description, root cause notes
  - [ ] **N/A path:** If zero class-A failures are found in both catalogues, proceed to the N/A
        path task below and skip all fix tasks

- [ ] **N/A path (conditional — only if zero class-A failures found)** (AC: #5)
  - [ ] Add a note at the top of the Dev Agent Record: "Story 76.2 N/A — Story 76.1 found zero
        class-A isolation failures. No fixes required."
  - [ ] Run `pnpm all` and confirm it passes
  - [ ] Mark all remaining tasks as N/A and complete this story

- [ ] Fix class-A isolation failures: database state leakage (AC: #1, #2, #3)
  - [ ] For each class-A failure whose root cause is **leftover DB rows**:
    - [ ] Identify the upstream spec file whose `afterAll` is missing or incomplete cleanup
    - [ ] Add or correct `afterAll` in that spec file to delete all records seeded in `beforeAll`
          (use `shared-prisma-client.helper.ts` and the appropriate seed helper's cleanup method)
    - [ ] Ensure cleanup runs even if mid-test failures occur (wrap in try/finally if needed)
    - [ ] Verify the previously-failing test now passes in full suite:
          `pnpm e2e:dms-material:chromium` (or Firefox as appropriate)

- [ ] Fix class-A isolation failures: localStorage / sessionStorage leakage (AC: #1, #2, #3)
  - [ ] For each class-A failure whose root cause is **stale localStorage or sessionStorage**:
    - [ ] Identify the upstream spec file that sets localStorage/sessionStorage without clearing
    - [ ] Add `afterEach` (or `afterAll` if per-suite) hook:
          `await page.evaluate(() => localStorage.clear())` and/or
          `await page.evaluate(() => sessionStorage.clear())`
    - [ ] If only specific keys must be cleared (to avoid affecting other tests), delete by key:
          `await page.evaluate(() => localStorage.removeItem('<key>'))`
    - [ ] Verify the previously-failing test now passes in full suite

- [ ] Fix class-A isolation failures: cookie / session state leakage (AC: #1, #2, #3)
  - [ ] For each class-A failure whose root cause is **leaked auth or session cookies**:
    - [ ] Identify the upstream spec file whose teardown does not clear cookies
    - [ ] Add `afterEach` hook: `await page.context().clearCookies()`
    - [ ] If a logout flow is missing, add it before `clearCookies` to also invalidate the
          server-side session
    - [ ] Verify the previously-failing test now passes in full suite

- [ ] Fix class-A isolation failures: server-side cache or session state (AC: #1, #2, #3)
  - [ ] For each class-A failure whose root cause is **server-side cached state**:
    - [ ] Use a Prisma call via `shared-prisma-client.helper.ts` in `afterAll` to reset the
          relevant server-side data (e.g., delete or reset records that the server caches)
    - [ ] If a test-only reset endpoint is available, call it via `page.request.post(...)` in the
          teardown hook
    - [ ] Verify the previously-failing test now passes in full suite

- [ ] Fix Firefox-specific class-A failures: timing / wait strategy (AC: #3, #4)
  - [ ] For each class-A failure that is **Firefox-specific** (not present in Chromium):
    - [ ] Inspect the failing test for fixed `page.waitForTimeout(...)` calls or missing explicit
          waits
    - [ ] Replace fixed waits with `await expect(locator).toBeVisible()` or
          `await page.waitForSelector('<selector>')` with an appropriate timeout
    - [ ] If a locator is Firefox-specific (e.g., shadow DOM or animation timing difference),
          adjust the locator or add a `.first()` / `.last()` disambiguator as needed
    - [ ] Run `pnpm e2e:dms-material:firefox` (full suite) to confirm the fix

- [ ] Verify Chromium full suite passes with no regressions (AC: #2)
  - [ ] Run: `pnpm e2e:dms-material:chromium`
  - [ ] Confirm all previously class-A failing tests now pass
  - [ ] Confirm no previously passing tests have regressed
  - [ ] Record the full suite pass/fail counts in Dev Agent Record

- [ ] Verify Firefox full suite passes with no regressions (AC: #3, #4)
  - [ ] Run: `pnpm e2e:dms-material:firefox`
  - [ ] Confirm all previously class-A failing tests (including Firefox-specific) now pass
  - [ ] Confirm no previously passing tests have regressed
  - [ ] Record the full suite pass/fail counts in Dev Agent Record

- [ ] Run `pnpm all` for final regression check (AC: #5)
  - [ ] Run: `pnpm all`
  - [ ] Confirm all tests pass (unit + e2e Chromium + e2e Firefox)
  - [ ] If any class-B functional regression failures remain, confirm they are already tracked in
        Story 76.1 and are explicitly deferred to Story 76.3 — do **not** fix them here
  - [ ] Record outcome in Dev Agent Record

## Dev Notes

### Input: Story 76.1 Classification Results

**This story's entire scope is determined by Story 76.1.** Before writing any fix, read the
completed Dev Agent Record in:

```
_bmad-output/implementation-artifacts/76-1-catalogue-failing-e2e-tests.md
```

Focus on:
- **Chromium Failure Catalogue** — entries with `Classification: A`
- **Firefox Failure Catalogue** — entries with `Classification: A`
- The **Root cause notes** field for each class-A entry — this tells you *which* preceding spec
  leaked state and *what* state was leaked

> **If Story 76.1 is not yet complete** (Dev Agent Record still contains TBD entries), do NOT
> proceed with this story. Story 76.1 must be fully executed first.

---

### N/A Path

If the Story 76.1 Dev Agent Record shows **zero class-A failures** in both the Chromium and
Firefox catalogues:

1. Add a note to the Dev Agent Record Completion Notes: _"Story 76.2 N/A — Story 76.1 found
   zero class-A isolation failures. No test isolation fixes are required."_
2. Run `pnpm all` and confirm it passes.
3. Mark this story complete.

This is a valid and expected outcome. Do not invent work to do.

---

### Isolation Fix Patterns

Use the pattern below that matches the root cause documented in Story 76.1.

#### Pattern 1 — Leftover Database Rows

**Symptom:** A `beforeAll` in a spec asserts a clean DB state (e.g., zero rows) but finds rows
left by a preceding spec.

**Fix:** Add or correct `afterAll` in the *upstream* spec (the one that seeds the data):

```typescript
afterAll(async () => {
  // delete in reverse dependency order to avoid FK constraint errors
  await prisma.childEntity.deleteMany({ where: { parentId: { in: seededParentIds } } });
  await prisma.parentEntity.deleteMany({ where: { id: { in: seededParentIds } } });
});
```

Use `shared-prisma-client.helper.ts` for the Prisma client instance. The seed helpers (
`seed-*.helper.ts`) often expose a `cleanup()` method — use it if available.

**Safety:** Wrap in `try/finally` if the test body may crash before reaching `afterAll`:

```typescript
afterAll(async () => {
  try {
    await seedHelper.cleanup();
  } catch (e) {
    console.error('afterAll cleanup failed:', e);
  }
});
```

#### Pattern 2 — localStorage / sessionStorage Leakage

**Symptom:** A test that reads sort state, filter state, theme, or other persisted UI state sees
unexpected values because a preceding spec changed localStorage without clearing it.

**Fix:** Add a teardown hook in the *upstream* spec:

```typescript
// Clear all localStorage (safe if the spec doesn't need persistence across tests)
afterEach(async ({ page }) => {
  await page.evaluate(() => localStorage.clear());
});

// Or clear a specific key only:
afterEach(async ({ page }) => {
  await page.evaluate(() => localStorage.removeItem('myApp:sortState'));
});
```

#### Pattern 3 — Cookie / Session State Leakage

**Symptom:** A test that expects an unauthenticated state (or a different user's session) sees an
existing authenticated session from a preceding spec.

**Fix:**

```typescript
afterEach(async ({ page }) => {
  await page.context().clearCookies();
});
```

If the application has a logout API, call it before clearing cookies to also invalidate the
server-side session:

```typescript
afterAll(async ({ page }) => {
  await page.request.post('/api/auth/logout');
  await page.context().clearCookies();
});
```

#### Pattern 4 — Server-Side Session or Cache State

**Symptom:** The server caches data (e.g., a computed value, user preferences, a rate-limit
counter) between requests. A preceding spec changes this server-side state; the following spec
sees unexpected cached values.

**Fix (Prisma-based reset):**

```typescript
afterAll(async () => {
  const prisma = sharedPrismaClient();
  await prisma.cachedEntity.deleteMany({ where: { testMarker: 'e2e' } });
});
```

**Fix (test-only reset endpoint, if available):**

```typescript
afterAll(async ({ request }) => {
  await request.post('http://localhost:3001/api/test/reset-cache');
});
```

#### Pattern 5 — Firefox Timing Issues

**Symptom:** A test passes in Chromium but fails in Firefox due to a race condition: the test
asserts on an element before it has appeared or settled.

**Fix — replace fixed waits with explicit waits:**

```typescript
// Instead of:
await page.waitForTimeout(500);

// Use:
await expect(page.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 5000 });
// Or:
await page.waitForSelector('[data-testid="result-row"]', { timeout: 5000 });
```

**Fix — disambiguate unstable locators:**

```typescript
// Instead of a generic locator that may match multiple elements at different times:
await page.getByText('Edit').click();

// Use a scoped locator:
await page.getByRole('row', { name: 'My Record' }).getByRole('button', { name: 'Edit' }).click();
```

---

### Key Rules

1. **No assertion weakening.** Do not change `expect(x).toBe(y)` to `expect(x).toBeTruthy()` or
   similar. Fixes must be in lifecycle hooks or test infrastructure, not in the assertions
   themselves.
2. **No production code changes.** Do not modify any file in `apps/dms-material/`,
   `apps/server/`, `prisma/`, or any non-test TypeScript source. All changes are confined to
   `apps/dms-material-e2e/src/`.
3. **Fix in the correct spec file.** The fix goes in the *upstream* spec that leaks state, not in
   the failing spec itself. Modifying the failing spec to be resilient to dirty state masks the
   underlying problem.
4. **Class-B failures are out of scope.** If a test fails in isolation (class B), do not touch
   it here. It belongs to Story 76.3.
5. **Do not disable or skip tests.** `test.skip()` and `test.fixme()` are forbidden in this
   story unless explicitly listed in Story 76.1 as already-skipped tests.
6. **Retries remain intact.** Do not change `retries` configuration. The goal is zero retries
   needed, not hiding flakiness with more retries.

---

### Key Commands

| Purpose | Command |
|---|---|
| Run full Chromium suite | `pnpm e2e:dms-material:chromium` |
| Run full Firefox suite | `pnpm e2e:dms-material:firefox` |
| Run single test in isolation (Chromium) | `pnpm nx run dms-material-e2e:e2e --project=chromium --grep "<test description>"` |
| Run single test in isolation (Firefox) | `pnpm nx run dms-material-e2e:e2e --project=firefox --grep "<test description>"` |
| Run only the previously-failing class-A tests (Chromium) | `pnpm nx run dms-material-e2e:e2e --project=chromium --grep "<test1>\|<test2>"` |
| Run all tests (unit + e2e) | `pnpm all` |
| Inspect DB visually | `npx prisma studio --schema prisma/schema.prisma` |
| Show git diff (verify no prod code changed) | `git diff --name-only` |

> **`--grep` tip:** Value must match the full test description string exactly as written in
> `test('...')`. For nested `test.describe`, concatenate: `"describe text test text"`.

---

### Key Files

| File | Purpose |
|---|---|
| `_bmad-output/implementation-artifacts/76-1-catalogue-failing-e2e-tests.md` | **Primary input** — class-A failure catalogue with root cause notes |
| `apps/dms-material-e2e/playwright.config.ts` | Playwright config — browsers, retries, baseURL, webServer |
| `apps/dms-material-e2e/src/*.spec.ts` | All E2E spec files (~70 files, alphabetical order = execution order) |
| `apps/dms-material-e2e/src/helpers/shared-prisma-client.helper.ts` | Prisma client instance for DB teardown in `afterAll` hooks |
| `apps/dms-material-e2e/src/helpers/seed-*.helper.ts` | Seed helpers — check for existing `cleanup()` methods |
| `apps/dms-material-e2e/src/helpers/login.helper.ts` | Login helper — auth state that may leak if not cleared |
| `apps/dms-material-e2e/test-database.db` | Shared SQLite DB — source of DB isolation failures |

---

### Architecture Reminders

- **Serial execution:** `workers: 1`, `fullyParallel: false`. Tests run alphabetically by file
  name. A spec that runs before the failing spec is the candidate for dirty-state emission.
- **Retries:** `retries: 2` locally, `retries: 3` in CI. A fix is only complete when the test
  passes on its *first* attempt without retries.
- **Firefox baseURL:** `http://127.0.0.1:4301` (IPv4). Firefox-specific timing issues are common
  on Linux due to `localhost` → IPv6 resolution. The config already handles baseURL; timing fixes
  are the remaining Firefox-specific concern.

### References

- [Source: `.github/epic descriptions/epics-2026-04-17.md`] — Epic 76 metadata and story 76.2 definition
- [Input: `_bmad-output/implementation-artifacts/76-1-catalogue-failing-e2e-tests.md`] — Story 76.1 classification results
- [Source: `apps/dms-material-e2e/playwright.config.ts`] — Playwright configuration
- [Source: `apps/dms-material-e2e/src/helpers/`] — Test helpers and seed utilities

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
