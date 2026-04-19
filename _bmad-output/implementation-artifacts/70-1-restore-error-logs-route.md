# Story 70.1: Restore the Error Logs Route

Status: Approved

## Story

As a user,
I want to click "Error Logs" in the navigation and reach the error logs page,
so that I can review historical errors without a route crash.

## Acceptance Criteria

1. **Given** `apps/dms-material/src/app/app.routes.ts`, **When** a route entry for path `'global/error-logs'` with `loadComponent` pointing to `./global/global-error-logs/global-error-logs` is added inside the `ShellComponent` children array, **Then** navigating to `/global/error-logs` loads the `GlobalErrorLogsComponent` without a `NG04002` error.

2. **Given** the Playwright MCP server, **When** the developer clicks "Error Logs" in the navigation, **Then** the error-logs page renders without any `NG04002` console error.

3. **Given** the existing accessibility e2e test in `apps/dms-material-e2e/src/accessibility.spec.ts` that navigates to `/global/error-logs` (line 142), **When** `pnpm all` runs after the fix, **Then** that test passes.

4. **Given** all other passing tests, **When** `pnpm all` runs, **Then** no previously passing test regresses.

## Tasks / Subtasks

- [ ] **Task 1: Confirm the GlobalErrorLogsComponent exists and identify the correct export** (AC: #1)
  - [ ] Subtask 1.1: Read `apps/dms-material/src/app/global/global-error-logs/global-error-logs.ts` — confirm the exported class name (expected: `GlobalErrorLogsComponent`) and that it is a standalone component
  - [ ] Subtask 1.2: Read `apps/dms-material/src/app/app.routes.ts` in full — confirm there is no existing `global/error-logs` entry and identify the correct insertion point (after `global/cusip-cache` and before `account/:accountId` is a reasonable position)

- [ ] **Task 2: Add the route entry** (AC: #1)
  - [ ] Subtask 2.1: Add the following route object inside the `ShellComponent` children array in `app.routes.ts`:
    ```ts
    {
      path: 'global/error-logs',
      loadComponent: async () =>
        import('./global/global-error-logs/global-error-logs').then(
          (m) => m.GlobalErrorLogsComponent
        ),
    },
    ```
  - [ ] Subtask 2.2: Verify the TypeScript compiles with no errors (`pnpm nx build dms-material` or `pnpm all`)

- [ ] **Task 3: Verify with Playwright MCP server** (AC: #2)
  - [ ] Subtask 3.1: Use the Playwright MCP server to navigate to `/global/error-logs`
  - [ ] Subtask 3.2: Confirm the page loads without a `NG04002: Cannot match any routes` console error
  - [ ] Subtask 3.3: Confirm the "Error Logs" nav link in the shell navigation also routes correctly when clicked

- [ ] **Task 4: Run full test suite** (AC: #3, #4)
  - [ ] Subtask 4.1: Run `pnpm all` and confirm all tests pass, specifically including `accessibility.spec.ts`

## Dev Notes

### Background

`GlobalErrorLogsComponent` exists at `apps/dms-material/src/app/global/global-error-logs/global-error-logs.ts`. The route entry was removed (or never re-added) during an earlier refactor that removed a stub `global/global-error-logs.ts` file. The accessibility e2e test at line 142 navigates to `/global/error-logs` and confirms the component should exist at this path.

The current `app.routes.ts` has the following `global/` routes but is missing `global/error-logs`:
- `global/summary`
- `global/universe`
- `global/screener`
- `global/cusip-cache`

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material/src/app/app.routes.ts` | Angular router config — add route here |
| `apps/dms-material/src/app/global/global-error-logs/global-error-logs.ts` | Component to lazy-load |
| `apps/dms-material-e2e/src/accessibility.spec.ts` | Line 142 navigates to `/global/error-logs` — must pass after fix |

### Route Entry to Add

Insert after the `global/cusip-cache` block, before `account/:accountId`:

```ts
{
  path: 'global/error-logs',
  loadComponent: async () =>
    import('./global/global-error-logs/global-error-logs').then(
      (m) => m.GlobalErrorLogsComponent
    ),
},
```

### Project Structure Notes

- Router file: `apps/dms-material/src/app/app.routes.ts`
- Component: `apps/dms-material/src/app/global/global-error-logs/global-error-logs.ts`
- The route must be a child of the `ShellComponent` path (the top-level route wrapping all authenticated pages), not at the root of `appRoutes`
- `pnpm all` must be fully green after this one-line change

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-13.md - Epic 70 Story 70.1]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
