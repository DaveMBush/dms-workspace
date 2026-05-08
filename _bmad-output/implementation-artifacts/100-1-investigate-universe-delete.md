# Story 100.1: Reproduce and Diagnose the Universe Delete Bug

Status: Approved

**Story Key:** `100-1-investigate-universe-delete`
**Epic:** 100 — Delete Row on Universe Screen
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-08.md](../planning-artifacts/epics-2026-05-08.md)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a reproduction and root-cause diagnosis of the universe-row delete failure — covering
the HTTP request, server handler, database state, response payload, and client store update —
so that Story 100.2 fixes the actual broken layer rather than guessing.

## Epic Context

**Epic 100 Goal:** The trash-can icon on the Universe screen reports successful deletion in the
UI but the row remains visible and reappears after a hard refresh — meaning the server-side
delete is not actually happening (or is happening but the response is misleading the client).
This epic reproduces the bug, identifies the exact failing layer in the delete pipeline, fixes
it end-to-end, ensures error responses are honest, and adds regression coverage.

This story (100.1) is the **investigation/diagnosis** story. It must produce a precise,
evidence-backed root cause so Story 100.2 can apply a surgical fix. **No production code is
modified in this story.**

Functional requirements addressed by Epic 100 (this story sets them up; 100.2 satisfies them):

- **R3** — Clicking the trash-can icon on a universe row must remove the symbol from the database
- **R4** — After a successful delete, the row must disappear from the UI immediately and remain
  absent after a hard page refresh
- **R5** — If the server-side delete fails, the UI must report the failure (not falsely show
  "deleted") and the row must remain

## Acceptance Criteria

1. **AC1 — Reproduction via Playwright MCP.**
   **Given** the current Universe screen and a symbol present in the universe,
   **When** the developer reproduces the bug using the Playwright MCP server (click trash,
   observe result, refresh page),
   **Then** Dev Notes record the screenshot/observation confirming the row remains after
   refresh.

2. **AC2 — HTTP request/response captured.**
   **Given** the network panel during the delete,
   **When** the request is captured,
   **Then** Dev Notes document the exact HTTP method, URL, payload, status code, and response
   body returned by the server.

3. **AC3 — Server handler traced and DB state verified.**
   **Given** the server delete handler in `apps/server/`,
   **When** the developer traces the code path,
   **Then** Dev Notes record (a) whether the handler reaches the Prisma `delete` call,
   (b) whether that call throws or completes silently, and (c) whether the row is actually
   removed from the database (verified by direct DB query before and after).

4. **AC4 — Client store delete behaviour documented.**
   **Given** the SmartNgRX/SmartSignals universe store,
   **When** the developer traces the client-side delete reducer/effect,
   **Then** Dev Notes record whether the row is removed from the store on a "success" response
   and whether subsequent fetches still return the row.

5. **AC5 — Failing layer(s) identified.**
   Dev Notes explicitly state which of {client request construction, server handler reached,
   Prisma delete executed, DB row actually removed, server response code/body, client store
   reducer, client refetch} is the broken link — with citation to the captured evidence above.

6. **AC6 — No production code changes; quality gate passes.**
   **Given** the diagnosis is complete,
   **When** `pnpm all` runs,
   **Then** all tests pass (no production code is modified in this story).

## Tasks / Subtasks

- [ ] **Task 1 — Reproduce the bug with Playwright MCP** (AC: #1)
  - [ ] Start the local dev stack (server + dms-material) and ensure the universe screen
        loads with at least one symbol present.
  - [ ] Use the Playwright MCP server to: navigate to the universe screen, click the trash-can
        icon on a known row, observe the immediate UI feedback (success indicator?), then
        hard-refresh the page.
  - [ ] Capture screenshots before click, immediately after click, and after refresh.
  - [ ] Save screenshots/observations into Dev Notes.

- [ ] **Task 2 — Capture the HTTP exchange** (AC: #2)
  - [ ] During the same Playwright reproduction (or a fresh one), capture the network request
        the client makes when the trash-can is clicked: method, full URL (incl. path params),
        request headers/body, response status code, response body.
  - [ ] Record the exact route registered on the server that this URL maps to.
  - [ ] Save to Dev Notes (verbatim, not paraphrased).

- [ ] **Task 3 — Trace the server delete handler** (AC: #3)
  - [ ] Locate the universe delete route under `apps/server/src/app/routes/` (likely a
        `universe` route file).
  - [ ] Read the handler in full and follow every branch — does it reach a Prisma `delete`
        call? Is the result awaited? Are exceptions caught and swallowed (returning a 2xx
        anyway)?
  - [ ] Add temporary logging or use a debugger to confirm the handler is actually invoked
        when the trash-can is clicked.
  - [ ] Verify DB state directly: query the underlying table before the click and again after
        (use Prisma Studio or a direct SQL query against the SQLite/Postgres dev DB).
        Record both results in Dev Notes.

- [ ] **Task 4 — Trace the client delete pipeline** (AC: #4)
  - [ ] Locate the universe-screen delete trigger in `apps/dms-material/src/app/` (component
        + service/store).
  - [ ] Trace through SmartNgRX/SmartSignals: is there an action dispatched? An effect
        making the HTTP call? A reducer removing the row from the store on success?
  - [ ] Confirm whether the client treats every non-throwing response as success, or actually
        inspects the status code / response body.
  - [ ] Confirm whether the universe is refetched after delete, or whether the store update
        is the sole source of truth for the visible list.
  - [ ] Document the full pipeline (component → action → effect → HTTP → store update →
        view) in Dev Notes.

- [ ] **Task 5 — Identify failing layer(s)** (AC: #5)
  - [ ] Cross-reference findings from Tasks 1–4. Mark each layer in the pipeline as:
        ✅ working, ❌ broken, or ❓ inconclusive.
  - [ ] Write a short "Root Cause Hypothesis" section in Dev Notes with the broken layer(s)
        and the evidence that points to it. This is the input Story 100.2 will act on.

- [ ] **Task 6 — Quality gate** (AC: #6)
  - [ ] Confirm no production source files were modified (only Dev Notes / story file
        updated; any temporary logging added in Task 3 must be removed before finishing).
  - [ ] Run `pnpm all` and confirm all tests pass.

## Dev Notes

### Architecture & Code Pointers

The investigation must touch all four layers of the delete pipeline. Concrete starting points:

- **Server route:** `apps/server/src/app/routes/` — look for the universe route module that
  registers a `DELETE` handler. Likely path pattern: `/universe/:symbol` or `/universe/:id`
  (confirm during investigation, do not assume).
- **Server data layer:** Prisma client call against the `Universe` model. Confirm the model
  name and primary-key column in `prisma/schema.prisma`.
- **Client component:** `apps/dms-material/src/app/` — the universe screen / table component
  that owns the trash-can icon. Likely a Material table cell action.
- **Client store:** SmartNgRX / SmartSignals universe feature — actions, effects, reducer.
  Per project convention (Angular 21 zoneless, signal-first, `OnPush`), the store update
  flows through SmartNgRX rather than direct component state.

### Related Prior Work

- **Epic 95** — server-side join of trades → `Universe` (relevant only as context for how the
  universe table is consumed elsewhere; the delete path is independent).
- **Epic 96** — deleted `buildUniverseMap` on the client. If the client universe-screen list
  ever read from a now-deleted helper, that could explain a stale view, but the bug's primary
  symptom (server delete not happening, or response misleading) is more likely.

### Symptoms Recap (from epic doc)

- Click trash → UI reports success.
- Row remains visible immediately after click.
- Row is still present after a hard refresh → confirms the symbol was **not** actually deleted
  from the DB (or that a separate process is re-inserting it, which is unlikely).

### Root-Cause Search Space (audit checklist)

The epic doc explicitly calls out that the bug could live at any of these layers — investigate
all four; do not stop at the first plausible cause:

1. The endpoint exists and is reached but does not actually delete the row.
2. The endpoint deletes the row but returns a misleading status (or vice versa: returns 2xx
   without deleting).
3. SmartNgRX/SmartSignals does not remove the row from the store on success.
4. Subsequent universe queries still return the deleted symbol (caching / stale read /
   server query bug).

### Testing Standards

- **No new tests in this story** — Story 100.3 (or 100.2's regression coverage) owns that.
- **`pnpm all` must still pass** at the end of this story (NFR1).
- **Tests are authoritative** (project convention) — if any existing test is currently
  asserting the broken behaviour, surface it in Dev Notes; do **not** modify it here.

### Project Structure Notes

Investigation work only — no new files, no moved files. Any temporary debug logging added to
the server handler during Task 3 **must be removed** before finishing the story.

### References

- [_bmad-output/planning-artifacts/epics-2026-05-08.md — Epic 100 / Story 100.1](../planning-artifacts/epics-2026-05-08.md)
- Epic doc requirements R3, R4, R5 (universe delete pipeline).
- Project convention: Angular 21 zoneless, `inject()`, `OnPush`, signal-first; SmartNgRX /
  SmartSignals; Fastify + Prisma; Vitest + Playwright; **Playwright MCP server must be used
  to reproduce and verify all UI failures** (NFR3).

## Dev Agent Record

### Agent Model Used

_To be filled by the dev agent on implementation._

### Debug Log References

_To be filled by the dev agent._

### Completion Notes List

_To be filled by the dev agent. Must include the explicit "Root Cause Hypothesis" identifying
the broken layer(s) so Story 100.2 has a concrete target._

### File List

_To be filled by the dev agent. Expected to be empty (or contain only this story file) since
no production code changes are permitted in this story._
