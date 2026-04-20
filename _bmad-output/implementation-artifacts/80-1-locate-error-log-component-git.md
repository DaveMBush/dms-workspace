# Story 80.1: Locate Original Error Log Component in Git History

Status: Approved

## Story

As a developer,
I want to find the last commit that contained the full error-log file-viewer component by examining the git history for Epic 1 and Epic 70,
so that Story 80.2 has the exact code to restore.

## Acceptance Criteria

1. **Given** git log for the repository,
   **When** developer runs `git log --all --oneline` and filters for Epic 1 and Epic 70 commits,
   **Then** commit SHAs are identified and recorded in Dev Notes.

2. **Given** Epic 1 commits,
   **When** developer runs `git show <sha> -- <path>` for paths affected by Epic 1,
   **Then** full source of deleted error-log file-viewer component is retrieved.

3. **Given** Epic 70 commits,
   **When** developer inspects routing change,
   **Then** incorrect component reference (stub) and correct component path (file-viewer) are both documented in Dev Notes.

4. **Given** no production code changed,
   **When** `pnpm all` runs,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] Task 1: Find Epic 1 and Epic 70 commits in git history (AC: #1)
  - [ ] Run `git log --all --oneline --grep="Epic 1\|Epic 70\|error.log\|error-log\|ErrorLog"` to find relevant commits
  - [ ] Run `git log --all --oneline -- apps/dms-material/src/ | head -50` to scan recent frontend commits
  - [ ] Record all relevant commit SHAs in Dev Notes

- [ ] Task 2: Recover deleted error-log file-viewer component source (AC: #2)
  - [ ] For each Epic 1 commit SHA: run `git show <sha> -- apps/dms-material/src/` to see what was deleted
  - [ ] Search specifically: `git log --all --oneline -- apps/dms-material/src/app/` for paths containing `error-log`, `error-logs`
  - [ ] Use `git show <sha>:<file-path>` to retrieve full file content of the deleted component
  - [ ] Record full component source code in Dev Notes (all `.ts`, `.html`, `.scss` files)

- [ ] Task 3: Document the incorrect routing from Epic 70 (AC: #3)
  - [ ] Find Epic 70 commits and inspect `app.routes.ts` or routing file changes
  - [ ] Run `git diff <epic70-sha>~1 <epic70-sha> -- apps/dms-material/src/` to see the routing change
  - [ ] Identify: what component was the Error Logs route pointing at before (stub name) vs what it should point at (file-viewer)
  - [ ] Record both component class names/paths in Dev Notes

- [ ] Task 4: Confirm no production code changes and tests pass (AC: #4)
  - [ ] Run `pnpm all` — this is investigation only, no files should have been modified

## Dev Notes

### Epic Context

- **Epic 1** = "Remove Unused Code" — **completed/done**. During this epic, the error-log file-viewer component was likely deleted as "unused code" — but it is actually needed for the Error Logs screen.
- **Epic 70** = "Restore Error Logs Route" — stories are `ready-for-dev`. During this epic, a routing change pointed the Error Logs route at a summary stub instead of the file-viewer component.

### Git Investigation Strategy

Run these commands in order and record results:

```bash
# 1. Find commits mentioning Epic 1 / Epic 70 / error-log
git log --all --oneline --grep="Epic 1\|Epic 70\|error.log\|error-log\|ErrorLog"

# 2. Find commits touching frontend app dir
git log --all --oneline -- apps/dms-material/src/ | head -50

# 3. Find commits that touched error-log related files
git log --all --oneline -- "apps/dms-material/src/app/**/*error*"
git log --all --oneline -- "apps/dms-material/src/app/**/*Error*"

# 4. Once you have a SHA, see what was in that commit for frontend
git show <sha> --stat -- apps/dms-material/src/

# 5. Recover a deleted file from a specific commit
git show <sha>:apps/dms-material/src/app/path/to/component.ts

# 6. See the full diff for the routing change
git diff <sha>~1 <sha> -- apps/dms-material/src/app/app.routes.ts
```

### Expected Component Structure

The error-log file-viewer component was likely structured as:

```
apps/dms-material/src/app/
  error-log/
    error-log.component.ts    (or error-logs.component.ts)
    error-log.component.html
    error-log.component.scss  (optional)
```

Look for variations: `error-log`, `error-logs`, `error-log-viewer`, `error-log-file-viewer`.

### Current Route Situation (Epic 70 context)

Check `apps/dms-material/src/app/app.routes.ts` for the current error-logs route entry. It likely points to a stub component. The correct target should be the file-viewer component recovered from git history.

### Investigation Findings (to be filled in)

#### Relevant Commit SHAs

| Purpose | SHA | Commit Message |
|---------|-----|----------------|
| Epic 1 — deleted file-viewer | _TBD_ | _TBD_ |
| Epic 70 — routing change | _TBD_ | _TBD_ |

#### Recovered Component Files

> Paste full file contents here for Story 80.2 to use:

**`error-log.component.ts`** (full source):
```typescript
// TBD — paste recovered source here
```

**`error-log.component.html`** (full source):
```html
<!-- TBD — paste recovered template here -->
```

**`error-log.component.scss`** (if exists):
```scss
/* TBD */
```

#### Routing Change (Epic 70)

- Current route target (stub): _TBD_
- Correct route target (file-viewer): _TBD_
- File: `apps/dms-material/src/app/app.routes.ts`

### Key Commands

| Purpose | Command |
|---------|---------|
| Grep commit messages for epic/error-log | `git log --all --oneline --grep="Epic 1\|Epic 70\|error.log\|error-log"` |
| Commits touching frontend | `git log --all --oneline -- apps/dms-material/src/ \| head -50` |
| Show commit diff | `git show <sha> --stat -- apps/dms-material/src/` |
| Recover deleted file | `git show <sha>:<file-path>` |
| Routing file diff | `git diff <sha>~1 <sha> -- apps/dms-material/src/app/app.routes.ts` |
| Run all tests | `pnpm all` |

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material/src/app/app.routes.ts` | Angular router config — current Error Logs route definition |
| `apps/dms-material/src/app/` | Search here for error-log related component directories |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Sprint status — confirm Epic 1 is done, Epic 70 is ready-for-dev |

### Constraints

- **Investigation only** — no production code changes
- All findings must be recorded in Dev Notes so Story 80.2 can proceed without re-investigation
- If the component source cannot be recovered from git, note that explicitly so Story 80.2 can reconstruct from scratch

## Dev Agent Record

### Agent Model Used

_TBD_

### Debug Log References

### Completion Notes List

### File List
