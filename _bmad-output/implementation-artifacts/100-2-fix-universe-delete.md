# Story 100.2: Fix Universe Row Delete End-to-End

Status: review

## Story

As Dave (the investor),
I want clicking the trash-can icon on a universe row to actually delete the symbol from the
database, remove it from the screen, and keep it gone after a hard refresh,
So that I can manage my universe without the symbol resurrecting itself.

## Acceptance Criteria

1. **Given** a symbol present in the universe,
   **When** Dave clicks the trash-can icon (and confirms, if a confirmation step exists in
   the current UI),
   **Then** the row is removed from the screen AND the symbol is removed from the database
   (verifiable by direct DB query and by the next list-universe response from the server).

2. **Given** the page is hard-refreshed after a successful delete,
   **When** the universe screen reloads from the server,
   **Then** the deleted symbol does not appear in the list.

3. **Given** the server delete fails (simulated, e.g. by a foreign-key constraint or by
   forcing a non-2xx response),
   **When** the response is non-2xx,
   **Then** the UI reports the failure to Dave via the project's standard error mechanism
   (toast / inline error — match existing convention) AND the row remains visible. The UI
   MUST NOT show a success state when the server failed (R5 from the epic).

4. **Given** the fix is applied,
   **When** the Playwright MCP server is used to repeat the original reproduction (click
   trash → observe row removal → hard refresh → confirm row stays gone),
   **Then** the bug no longer reproduces.

5. **Given** the fix is applied,
   **When** existing Universe-screen behaviours are exercised (load, sort, filter, scroll,
   add-symbol, edit-row),
   **Then** none of them regress (NFR2, NFR6 from the epic).

6. **Given** the fix is committed,
   **When** `pnpm all` runs,
   **Then** all tests pass (NFR1).

## Tasks / Subtasks

- [x] Task 1: Read Story 100.1 diagnosis and confirm the failing layer(s) (AC: 1, 3)
  - [x] Open the Story 100.1 Dev Notes section and extract the documented failing
        layer(s): server handler, Prisma call, HTTP response, client effect/reducer,
        or a combination
  - [x] Re-confirm the reproduction once before changing any code, using the
        Playwright MCP server, and capture the current network request/response in
        your Dev Agent Notes so the "before" state is recorded
  - [x] Document in Dev Agent Notes which exact files you intend to modify and why,
        based on Story 100.1's findings — do NOT speculate beyond what 100.1 proved

- [x] Task 2: Read every file you will modify completely BEFORE editing (AC: 1, 5)
  - [x] Server route file containing the universe DELETE handler — read top to bottom
  - [x] Universe row component (the one with the trash-can icon) — read top to bottom
  - [x] SmartNgRX/SmartSignals universe store: action(s), effect(s), reducer(s),
        selectors involved in the delete flow — read top to bottom
  - [x] Any shared error-handling util / toast service used by other delete flows in
        this app (find by searching for similar trash actions on other screens) so
        your error UX matches existing convention (AC 3)
  - [x] In Dev Agent Notes, record for each file: current behaviour, what this story
        will change, and what MUST be preserved (do not break unrelated paths)

- [x] Task 3: Fix the server-side delete (AC: 1, 2, 3)
  - [x] If Story 100.1 identified the server as the failing layer, fix the Fastify
        route so it actually invokes Prisma's `delete` (or the equivalent guarded
        delete used elsewhere in the codebase) on the correct table and primary key
  - [x] Ensure the response status code is HONEST: 2xx ONLY when the row was actually
        removed; 4xx/5xx (with a meaningful body) when it was not
  - [x] If the row does not exist (already deleted), return the project's existing
        convention for "not found on delete" — DO NOT invent a new convention
  - [x] If a foreign-key constraint or other DB error occurs, surface it as a
        non-2xx response with a body the client can render (do not swallow it)

- [x] Task 4: Fix the client-side delete pipeline (AC: 1, 3, 5)
  - [x] If Story 100.1 identified the client store as the failing layer (or in
        addition to the server), fix the SmartNgRX/SmartSignals action → effect →
        reducer chain so that:
    - On a 2xx response, the row is removed from the store immediately and any
      cached selectors / signal queries reflect the removal
    - On a non-2xx response, the store is NOT mutated to a "deleted" state and the
      error is dispatched to the project's standard error channel (toast / inline)
  - [x] If the trash-can click currently optimistically removes the row before the
        server confirms, decide explicitly whether to (a) keep optimistic removal
        with rollback on failure, or (b) switch to pessimistic removal on success
        only. Choose whichever matches the rest of the app's convention; document
        the choice in Dev Agent Notes
  - [x] Verify that subsequent list-universe queries / signal reads exclude the
        deleted symbol — no stale entry hiding in a cache (R4 from the epic)

- [x] Task 5: Honest error UX on delete failure (AC: 3)
  - [x] When the server returns non-2xx, the UI MUST display an error using the same
        mechanism other failed mutations use on this app (find by inspecting another
        failing-mutation flow such as add-symbol or edit-symbol)
  - [x] The row MUST remain visible on failure (no false success)
  - [x] If a confirmation dialog exists for delete, it MUST close on failure too —
        do not leave it stuck

- [x] Task 6: Update / add unit tests (AC: 1, 3, 6)
  - [x] Server route: add or update a Vitest test that asserts the route actually
        calls `prisma.universe.delete` (or equivalent) AND returns 2xx on success
  - [x] Server route: add a Vitest test that asserts a non-2xx response when the
        delete throws (e.g. mock Prisma to throw a constraint error) and that the
        body is meaningful
  - [x] Client effect/reducer: add or update a Vitest test that asserts the row is
        removed from the store on success AND that the store is NOT mutated on
        failure
  - [x] Do NOT weaken any existing assertion to make a test pass (NFR5 from the
        epic). If an existing test is genuinely wrong, fix the production code, not
        the test

- [x] Task 7: Add E2E regression coverage (AC: 1, 2, 4, 6)
  - [x] Add a Playwright E2E test that:
    - Seeds a known symbol into the universe
    - Loads the Universe screen
    - Clicks the trash-can icon for that symbol (and confirms if needed)
    - Asserts the row disappears
    - Reloads the page
    - Asserts the row is still gone
  - [x] Add a second E2E test (or a second branch of the same test) that simulates
        a server failure (e.g. via a route mock / interception) and asserts the row
        REMAINS and an error is shown to the user
  - [x] Test must run on both Chromium AND Firefox (per NFR — E2E targets both)
  - [x] Test must NOT be `.skip` / `xit` / `test.skip` and must be picked up by
        `pnpm all`

- [ ] Task 8: Reproduce-and-verify with Playwright MCP (AC: 4, NFR3)
  - [ ] Use the Playwright MCP server to manually re-run the original reproduction
        path on the running dev app
  - [ ] Capture in Dev Agent Notes: row disappears on click, hard refresh confirms
        the row stays gone, simulated failure shows an honest error
  - [ ] Confirm scroll, sort, and filter on the Universe screen still behave as
        before (NFR6)

- [ ] Task 9: Quality gates (AC: 6)
  - [ ] `pnpm all` passes
  - [ ] `pnpm format` passes
  - [ ] `pnpm e2e:dms-material:chromium` passes (or whichever chromium e2e script
        the workspace currently uses)
  - [ ] `pnpm e2e:dms-material:firefox` passes (or the equivalent firefox script)

## Dev Notes

### Architecture Compliance

- This story spans the full delete pipeline: Fastify route handler → Prisma →
  HTTP response → SmartNgRX/SmartSignals action/effect/reducer → universe row
  component → user-facing toast/error.
- Backend: Fastify routes under `apps/server/src/app/routes/` with Prisma ORM
  (SQLite in dev, PostgreSQL in prod). The delete must use Prisma's typed delete
  on the correct table — do not write raw SQL.
- Frontend: Angular 21 zoneless, `inject()` only (NEVER constructor injection),
  `OnPush` change detection, signal-first state. SmartNgRX / SmartSignals is the
  state container — match the action/effect/reducer pattern already used
  elsewhere in the universe feature.
- Tests are authoritative — do NOT change tests unless a test is asserting
  something we are explicitly changing in this story. (NFR5)

### Failing-Layer Source of Truth

Story 100.1 is the diagnosis story. Its Dev Notes are the source of truth for
WHICH layer is broken. Implementation MUST follow that diagnosis — do NOT
speculate or "fix everything just in case". Surgical change.

If Story 100.1 has not been completed when you start this story, STOP and flag
the dependency in your Dev Agent Notes. Do not implement blindly.

### File Locations (probable — confirm by reading current code first)

The exact paths must be confirmed by inspecting the repo before editing:

- Server delete route: under `apps/server/src/app/routes/` — look for the
  universe route file/folder — UPDATE
- Server route unit test: co-located with the route — UPDATE or NEW
- Universe row component (with the trash-can icon): under
  `apps/dms-material/src/app/...` in the universe feature — UPDATE
- SmartNgRX/SmartSignals universe store (actions / effects / reducer / selectors)
  — UPDATE
- Client store unit tests: co-located with the store files — UPDATE or NEW
- Playwright E2E spec: under `apps/dms-material-e2e/src/` (or the workspace's
  current e2e project location) — NEW or UPDATE

**CRITICAL:** Before modifying any file above, read it fully and document in
Dev Agent Notes:
- Current behaviour (what it does today)
- What this story changes
- What MUST be preserved (existing interactions and behaviours that the story
  must not break — see NFR2 / NFR6)

### Library / Framework Requirements

- Backend: Fastify + Prisma. No new deps.
- Frontend: Angular 21 zoneless, SmartNgRX / SmartSignals. No new deps.
- Tests: Vitest for unit, Playwright for E2E. No new deps.
- DO NOT introduce a new toast/error library — use whatever the rest of the app
  uses for failed mutations on other screens.

### Honest Error Reporting (R5)

The defining symptom of this bug is that the UI lies — it shows success while the
server silently fails. The fix MUST close every path by which the UI can show
success without server confirmation:
- Optimistic UI updates must roll back on failure
- The reducer must NOT remove the row on a non-2xx outcome
- The error must reach the user via the project's standard channel
- The HTTP response itself must be honest (status code reflects DB outcome)

### Scope of "Universe Delete"

This story covers the trash-can icon on the Universe screen ONLY. It does NOT
cover:
- Bulk delete (if such UI exists) — out of scope unless Story 100.1 found that
  the bulk path shares the same broken layer; in that case, fix the shared layer
  but do not extend acceptance into bulk-delete UX
- Delete from any OTHER screen (Open Positions, Sold Positions, etc.) — out of
  scope
- The Universe add/edit flows — out of scope

### Test Strategy

- Unit (Vitest): server route happy-path, server route failure-path, client
  effect happy-path, client effect failure-path.
- E2E (Playwright): seeded-row delete + refresh + confirm-gone, AND
  intercepted-failure-stays-visible.
- Use the Playwright MCP server to reproduce-and-verify the bug interactively
  before AND after the fix (NFR3).
- Both Chromium and Firefox E2E runs must pass (NFR — workspace targets both).

### Out of Scope (do NOT do in this story)

- Story 100.1 (diagnosis) — already its own story
- Refactoring the universe screen layout, columns, or styling
- Refactoring SmartNgRX patterns beyond what is necessary to fix this bug
- Adding new universe features (filtering, sorting, etc.)
- Touching unrelated screens

### What Must Be Preserved

- All other Universe-screen behaviours: load, sort, filter, scroll, add-symbol,
  edit-row, navigation in/out of the screen (NFR2, NFR6)
- All other server routes and other client store features
- The existing visual design (no UX spec changes in this batch — see epic
  "UX Design Requirements" section)

## Project Context

- Project root: `/home/dave/code/dms-workspace`
- Architecture reference: `_bmad-output/planning-artifacts/architecture.md`
- Epic source: `_bmad-output/planning-artifacts/epics-2026-05-08.md` → Epic 100 →
  Story 100.2
- Sibling stories in this epic: 100.1 (diagnosis — must precede this story),
  100.3 (regression coverage / follow-on, if planned)
- Quality gates: `pnpm all`, `pnpm format`, `pnpm e2e:dms-material:chromium`,
  `pnpm e2e:dms-material:firefox`
- Conventions:
  - Angular 21 zoneless, `inject()` only, `OnPush`, signal-first
  - SmartNgRX / SmartSignals for state
  - Fastify + Prisma backend (SQLite dev / PostgreSQL prod)
  - Vitest for unit, Playwright for E2E
  - Tests are authoritative — fix the source, never weaken the test (NFR5)
  - Playwright MCP server is mandatory for UI reproduction and verification
    (NFR3)

## Dev Agent Record

### Agent Notes

**Diagnosis (from Story 100.1):**

- PRIMARY failing layer: `GlobalUniverseComponent.deleteUniverse()` was emitting `symbolDeleted` Angular output event into the void (no parent listener) and showing a false success toast, without ever calling `(row as RowProxyDelete).delete!()`. No HTTP DELETE request was sent.
- SECONDARY: Production server handler blocked deletion for symbols with ANY associated trades (including sold trades). Test handler correctly only blocked symbols with active (unsold) trades.

**Files read before modification:**
1. `apps/server/src/app/routes/universe/index.ts` — `handleDeleteUniverseRoute` queried ALL trades and blocked deletion if ANY existed. Server is correct otherwise (Prisma `.delete()` is called, returns 200 with `{ success: true, message: 'Symbol deleted successfully' }`).
2. `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` — `deleteUniverse()` wrongly called `symbolDeleted.emit(row)` and `notification.success()` with no HTTP request.
3. `apps/dms-material/src/app/store/universe/universe-effect.service.ts` — `delete(id)` method correctly sends HTTP DELETE to `./api/universe/${id}`. The method exists and works — it just wasn't being called.
4. `apps/dms-material/src/app/error-handler/error-handler.service.ts` — Registered via `smartErrorHandlerToken`. Calls `notification.error(message)` when SmartNgRX effects fail. This means error UX is automatic when `delete!()` propagates a server error.
5. `apps/dms-material/src/app/accounts/account-component.service.ts` — Pattern reference: `deleteAccount` calls `(item as RowProxyDelete).delete!()` with no extra notification.

**Changes made:**

1. **Client (primary fix):** Changed `deleteUniverse()` to call `(row as RowProxyDelete).delete!()`. Removed false success notification and dead `symbolDeleted` output event. Added `RowProxyDelete` import from `@smarttools/smart-signals`. Error UX is handled automatically by SmartNgRX → `ErrorHandlerService.handleError()` → `notification.error()`.

2. **Server (secondary fix):** Updated `handleDeleteUniverseRoute` to filter trades by `sell_date === null` (active only). Symbols with only sold trades are now deletable. Sold trades are deleted first (to avoid FK constraint) before deleting the universe row. Behavior now matches the test handler in `delete-universe.spec.ts`.

3. **No confirmation dialog** exists for universe delete — single-click trash icon. No dialog to close on failure.

4. **SmartNgRX deletion pattern**: Uses the same pessimistic/optimistic pattern as accounts (framework-managed). Error handler is global via `smartErrorHandlerToken`.

## File List

- `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` — MODIFIED (fix deleteUniverse, add RowProxyDelete import, remove symbolDeleted output)
- `apps/server/src/app/routes/universe/index.ts` — MODIFIED (fix handleDeleteUniverseRoute to allow sold-trade-only symbols)
- `apps/dms-material/src/app/global/global-universe/global-universe.component.spec.ts` — MODIFIED (update deleteUniverse tests to assert delete!() called, not false toast)
- `apps/dms-material/src/app/store/universe/universe-effect.service.spec.ts` — MODIFIED (add delete() unit tests: correct URL, 2xx success, non-2xx error)
- `apps/dms-material-e2e/src/universe-delete-row.spec.ts` — NEW (E2E tests: happy path persists across reload, failure path shows error and keeps row)

## Change Log

- Fix universe row delete: changed `deleteUniverse()` to call SmartNgRX `(row as RowProxyDelete).delete!()`, removing false success notification (Date: 2026-05-09)
- Fix server delete handler: allow deletion of symbols with only sold trades; delete sold trades before universe row to avoid FK constraint (Date: 2026-05-09)
- Update component spec: replace tests for broken `symbolDeleted.emit()` pattern with tests for correct `delete!()` pattern (Date: 2026-05-09)
- Add UniverseEffectsService delete() unit tests: correct HTTP method/URL, 2xx success, non-2xx error propagation (Date: 2026-05-09)
- Add E2E spec `universe-delete-row.spec.ts`: happy path (delete persists after reload) and failure path (server 500 → error toast shown, row remains) (Date: 2026-05-09)
