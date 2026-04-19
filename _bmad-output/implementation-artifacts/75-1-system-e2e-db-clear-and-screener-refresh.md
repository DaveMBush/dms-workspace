# Story 75.1: Create System E2E Test Infrastructure with DB-Clear Fixture and Screener Refresh Test

Status: Approved

## Story

As a developer,
I want a new system integration E2E test file with a clean-database setup fixture and a test that
exercises the screener refresh workflow end-to-end,
so that subsequent stories can add distribution and CSV import assertions on top of a reliable
foundation.

## Acceptance Criteria

1. **Given** a new file at `apps/dms-material-e2e/src/system-integration.spec.ts` and a supporting server-side `DELETE /api/test/reset` endpoint,
   **When** the test's `beforeAll` fixture runs,
   **Then** the database tables `screener`, `universe`, `trades`, and `divDeposits` are confirmed empty before the test body executes.

2. **Given** the empty database state,
   **When** the Playwright test navigates to `http://localhost:4201/global/screener` (via `baseURL` in the `integration` project) and clicks the element matching `[data-testid="refresh-button"]`,
   **Then** the loading overlay at `[data-testid="loading-overlay"]` appears, the test waits for it to disappear (timeout 120 000 ms for live CefConnect fetch), and the screener table renders with at least one row of data.

3. **Given** the screener data is loaded,
   **When** `pnpm all` runs (without `--project=integration`),
   **Then** all existing tests continue to pass and `system-integration.spec.ts` is not executed by the `chromium` or `firefox` Playwright projects.

## Tasks / Subtasks

### Task 1 — Add `integration` Playwright project
- [ ] 1.1 Open `apps/dms-material-e2e/playwright.config.ts`.
- [ ] 1.2 Add `testIgnore: ['**/system-integration.spec.ts']` to **both** the `chromium` and `firefox` project entries.
- [ ] 1.3 Append a new project entry named `integration` with:
  - `testMatch: ['**/system-integration.spec.ts']`
  - `use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4201' }`
  - No `webServer` — the integration project assumes the dev server is already running on port 4201 and the API server on port 3000.
- [ ] 1.4 Verify `pnpm nx run dms-material-e2e:e2e --project=chromium` and `--project=firefox` still pass (system-integration.spec.ts excluded).

### Task 2 — Implement `DELETE /api/test/reset` server endpoint
- [ ] 2.1 Create `apps/server/src/app/routes/test/index.ts` with a `FastifyInstance`-based route file.
- [ ] 2.2 Register `fastify.delete('/reset', ...)` which:
  - Returns HTTP 403 immediately if `process.env.NODE_ENV === 'production'`.
  - Calls `prisma.trades.deleteMany()`, `prisma.divDeposits.deleteMany()`, `prisma.screener.deleteMany()`, `prisma.universe.deleteMany()` in that order (trades/divDeposits first to respect FK constraints).
  - Returns `{ cleared: ['trades', 'divDeposits', 'screener', 'universe'] }` on success.
- [ ] 2.3 Export as `export default function registerTestRoutes(fastify: FastifyInstance): void` to match the autoLoad naming pattern used by existing routes.
- [ ] 2.4 Confirm the endpoint is registered at `/api/test/reset` (the autoLoad prefix is `/api`; Fastify autoLoad constructs sub-path from directory name `test` + registered path `/reset`).

### Task 3 — Create `system-integration.spec.ts`
- [ ] 3.1 Create `apps/dms-material-e2e/src/system-integration.spec.ts`.
- [ ] 3.2 In `test.beforeAll`:
  - Call `request.delete('/api/test/reset')` (uses the `request` fixture from `@playwright/test`).
  - Assert the response is `ok()`.
  - Optionally call `request.get('/api/screener/count')` (or make a direct assertion) to confirm tables are empty — alternatively, trust the 200 OK response from the reset endpoint.
- [ ] 3.3 Write a `test('screener refresh populates the screener table', ...)` that:
  - Calls `login(page)` from the existing `./helpers/login.helper`.
  - Navigates to `/global/screener` and calls `page.waitForLoadState('networkidle')`.
  - Locates `[data-testid="refresh-button"]` and clicks it.
  - Waits for `[data-testid="loading-overlay"]` to be visible.
  - Waits for `[data-testid="loading-overlay"]` to be hidden (`{ timeout: 120_000 }`).
  - Asserts that at least one row is present in the screener table (see selector guidance in Dev Notes).
- [ ] 3.4 Ensure no `test.use({ ... })` annotations conflict with the project-level `integration` configuration.

### Task 4 — Verify CI isolation
- [ ] 4.1 Run `pnpm all` (the default suite) and confirm it passes without running `system-integration.spec.ts`.
- [ ] 4.2 Run `pnpm nx run dms-material-e2e:e2e --project=integration` manually (requires live network + running dev stack) and confirm the screener refresh test is green.

## Dev Notes

### Playwright `integration` Project Configuration

The `playwright.config.ts` `projects` array currently contains `chromium` and `firefox`. The
integration project must be isolated from the default run:

```ts
// In playwright.config.ts — projects array additions/modifications

{
  name: 'chromium',
  testIgnore: ['**/system-integration.spec.ts'],   // ADD THIS LINE
  use: { ...devices['Desktop Chrome'] },
},
{
  name: 'firefox',
  testIgnore: ['**/system-integration.spec.ts'],   // ADD THIS LINE
  use: {
    ...devices['Desktop Firefox'],
    baseURL: 'http://127.0.0.1:4301',
  },
},
// NEW project:
{
  name: 'integration',
  testMatch: ['**/system-integration.spec.ts'],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:4201',
    navigationTimeout: 120_000,
    actionTimeout:     60_000,
  },
},
```

**Why `baseURL: 'http://localhost:4201'`?**
The integration test targets the live Angular dev server (`pnpm nx run dms-material:serve` → port
4201), not the E2E-specific server (`serve-e2e` → port 4301). The rationale is that the test
exercises real CefConnect network traffic, which requires the full dev stack.

**Running the integration project:**
```sh
# Ensure dev stack is running first in another terminal:
pnpm nx run dms-material:serve        # port 4201
pnpm nx run server:serve              # port 3000 (API)

# Then run the integration project:
pnpm nx run dms-material-e2e:e2e --project=integration
```

### DB-Clear Endpoint — Implementation Pattern

New file: `apps/server/src/app/routes/test/index.ts`

The `@fastify/autoload` plugin in `app.ts` picks up every file in `routes/` and prefixes all
routes with `/api`. The folder name `test` + route path `/reset` → `/api/test/reset`.

```ts
import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/prisma-client';

export default function registerTestRoutes(fastify: FastifyInstance): void {
  fastify.delete(
    '/reset',
    async function handleTestReset(_request, reply): Promise<void> {
      if (process.env.NODE_ENV === 'production') {
        reply.status(403);
        return reply.send({ error: 'Not available in production' });
      }
      // Clear in FK-safe order: dependent tables first
      await prisma.trades.deleteMany();
      await prisma.divDeposits.deleteMany();
      await prisma.screener.deleteMany();
      await prisma.universe.deleteMany();
      return reply.send({
        cleared: ['trades', 'divDeposits', 'screener', 'universe'],
      });
    }
  );
}
```

**FK-order rationale:** The existing unit test helpers (e.g.
`apps/server/src/app/routes/summary/get-risk-group-data.function.spec.ts`) always delete `trades`
and `divDeposits` before `universe`. Follow the same order.

**Security guard:** The `NODE_ENV === 'production'` check is sufficient because:
1. The endpoint is only called from test fixtures.
2. The E2E server is launched with `NODE_ENV: 'local'` by the `webServer` config.
3. The dev server runs with `NODE_ENV: 'development'`.

### `beforeAll` Fixture Pattern

The tests use the `request` API fixture from `@playwright/test` to avoid spinning up a separate
HTTP client:

```ts
import { test, expect } from '@playwright/test';
import { login } from './helpers/login.helper';

test.describe('System Integration — Epic 75', () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.delete('/api/test/reset');
    if (!response.ok()) {
      throw new Error(`DB reset failed: ${response.status()} ${await response.text()}`);
    }
  });

  // ... tests
});
```

> **Note on `request` base URL:** When used inside `test.beforeAll({ request })`, the `request`
> fixture honours the project-level `baseURL` (`http://localhost:4201`). However, the API server
> lives on port 3000 / 3001. To send the reset request to the correct host without hardcoding a
> second URL, either:
> - (Option A) Configure the integration project `use.baseURL: 'http://localhost:3000'` and use
>   relative paths for API calls, then use `page.goto('http://localhost:4201/global/screener')`
>   for UI navigation; or
> - **(Option B — preferred)** Use a hardcoded absolute URL for the reset call only:
>   `request.delete('http://localhost:3000/api/test/reset')` while keeping `baseURL:
>   'http://localhost:4201'` for all `page.goto()` calls.
>
> Option B keeps the screener URL clean and is the simpler approach for a one-off reset call.

### Screener Refresh — Selectors and Wait Pattern

From the existing `screener-refresh.spec.ts` (confirmed selectors):

| Element             | Selector                             |
|---------------------|--------------------------------------|
| Refresh button      | `[data-testid="refresh-button"]`     |
| Loading overlay     | `[data-testid="loading-overlay"]`    |
| Spinner inside overlay | `[data-testid="loading-overlay"] mat-progress-spinner` |

**Wait pattern for live CefConnect fetch (may take 30–90 s):**

```ts
const button  = page.locator('[data-testid="refresh-button"]');
const overlay = page.locator('[data-testid="loading-overlay"]');

await expect(button).toBeVisible();
await button.click();

// Overlay must appear quickly after click
await expect(overlay).toBeVisible({ timeout: 10_000 });

// Wait for CefConnect fetch to complete (live network — allow up to 2 min)
await expect(overlay).toBeHidden({ timeout: 120_000 });
```

**Screener table row assertion:** Look for AG Grid rows or a `data-testid` on the table. If no
`data-testid` exists on row elements, use the AG Grid row selector pattern already used in other
specs:

```ts
// Option A — if the screener table has a data-testid attribute:
const rows = page.locator('[data-testid="screener-table"] [role="row"]').filter({ hasNot: page.locator('[aria-rowindex="0"]') });
await expect(rows).toHaveCount(1);  // at least one

// Option B — generic AG Grid row count:
const rows = page.locator('.ag-row');
await expect(rows.first()).toBeVisible({ timeout: 5_000 });
const count = await rows.count();
expect(count).toBeGreaterThan(0);
```

Option B is safer if the screener table does not expose `data-testid` on rows. Inspect the
screener component during manual verification to confirm the correct selector.

### Screener URL

- **Relative path** (used inside the test, resolves against `baseURL`): `/global/screener`
- **Absolute URL** during development: `http://localhost:4201/global/screener`

### Why This Story Is the Foundation

Stories 75.2 and 75.3 will add additional `test()` blocks *inside the same
`test.describe('System Integration — Epic 75', ...)` block*. The `beforeAll` fixture that
clears the DB is written once here. Subsequent stories rely on execution order within the
describe block to build on the state left by previous tests (screener populated → 75.2 populates
universe → 75.3 imports CSVs).

### Key Files

| File | Action | Purpose |
|------|--------|---------|
| `apps/dms-material-e2e/playwright.config.ts` | Modify | Add `integration` project, add `testIgnore` to `chromium`/`firefox` |
| `apps/dms-material-e2e/src/system-integration.spec.ts` | **Create** | New spec file with `beforeAll` DB-clear and screener-refresh test |
| `apps/server/src/app/routes/test/index.ts` | **Create** | `DELETE /api/test/reset` endpoint |
| `apps/dms-material-e2e/src/helpers/login.helper.ts` | Read-only | Reuse `login()` helper |
| `apps/server/src/app/routes/screener/index.ts` | Read-only | Understand screener `GET /` for refresh behaviour |

### Architecture Context

**Route registration:** `app.ts` uses `@fastify/autoload` on the `routes/` directory with
`prefix: '/api'`. Fastify autoLoad discovers `routes/test/index.ts` and registers it under `/api/test`.
The file must export a default function matching the signature Fastify autoLoad expects. The
existing `health/index.ts` uses `FastifyPluginAsync`; the existing `screener/index.ts` uses a
synchronous `function registerXxx(fastify): void`. Use the synchronous pattern for consistency.

**Prisma client import:** All server routes import from `'../../prisma/prisma-client'` (relative
from `routes/test/index.ts` the path is `../../prisma/prisma-client`).

**Base URL mismatch:** The integration Playwright project targets port 4201 (Angular dev server)
but the Fastify API lives on port 3000. The proxy at `apps/dms-material/proxy.conf.json` forwards
`/api/**` from the Angular dev server to the backend. So `request.delete('/api/test/reset')`
using the integration `baseURL` of `http://localhost:4201` will proxy through Angular dev server
to the Fastify backend at port 3000. **This means the reset request can also use a relative path**
as long as the Angular dev server is running. Verify the proxy config path is `/api` → verify by
checking `apps/dms-material/proxy.conf.json`.

**E2E server vs dev server:** The existing `chromium`/`firefox` projects use port 4301
(`serve-e2e`), which uses a separate proxy config (`proxy.test-conf.json`) pointing to the
Fastify server on port 3001. The integration project uses port 4201 with the standard
`proxy.conf.json` pointing to port 3000. Confirm which port the server runs on in the manual
integration setup.

### References

- Playwright multi-project configuration: https://playwright.dev/docs/test-projects
- Existing screener refresh E2E selectors: `apps/dms-material-e2e/src/screener-refresh.spec.ts`
- Fastify autoLoad route discovery: `apps/server/src/app/app.ts`
- Prisma delete patterns: `apps/server/src/app/routes/summary/get-risk-group-data.function.spec.ts`
- Login helper: `apps/dms-material-e2e/src/helpers/login.helper.ts`

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

`/home/dave/.config/Code/User/workspaceStorage/9117f4dfebedc800a9f9baf39267cef9/GitHub.copilot-chat/debug-logs/45a87ae3-8f44-4b60-9b11-520c69db4789`

### Completion Notes List

- Story was written autonomously without user interaction.
- The `baseURL` mismatch between the Angular dev server (4201) and the Fastify API (3000/3001) is
  resolved via Angular's proxy config. The implementing agent must verify
  `apps/dms-material/proxy.conf.json` routes `/api/**` to the correct backend port.
- The Playwright `integration` project is intentionally not triggered by `pnpm all` because it
  requires live CefConnect internet access. It is run manually with `--project=integration`.
- Screener table row selector (AG Grid vs `data-testid`) must be verified during implementation
  by inspecting the live screener component in the browser.
- Stories 75.2 (universe + distributions) and 75.3 (CSV import) will append tests to the same
  describe block; the `beforeAll` here runs once for the entire suite.

### File List

- `apps/dms-material-e2e/playwright.config.ts` (modified)
- `apps/dms-material-e2e/src/system-integration.spec.ts` (created)
- `apps/server/src/app/routes/test/index.ts` (created)
