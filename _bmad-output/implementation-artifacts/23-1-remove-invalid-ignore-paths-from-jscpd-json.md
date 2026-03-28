# Story 23.1: Remove Invalid Ignore Paths from .jscpd.json

Status: Approved

## Story

As a developer,
I want all ignore paths in `.jscpd.json` to be valid (pointing to actual files/directories),
so that `pnpm dupcheck` runs correctly and reports real duplication.

## Acceptance Criteria

1. **Given** `.jscpd.json` contains 8 ignore paths that point to non-existent locations, **When** the story is complete, **Then** all 8 invalid paths have been removed from `.jscpd.json`.
2. **Given** the updated `.jscpd.json`, **When** `pnpm dupcheck` is executed, **Then** the command exits without "path does not exist" or similar config-error messages (only real duplication findings, if any, are reported).
3. **Given** the remaining ignore entries, **When** reviewed, **Then** each surviving path actually exists in the repository.

## Definition of Done

- [ ] All 8 known invalid paths removed from `.jscpd.json`
- [ ] No new paths added or suppressed
- [ ] `pnpm dupcheck` produces config-clean output (no path-not-found errors)
- [ ] Run `pnpm all`
- [ ] Run `pnpm dupcheck`
- [ ] Run `pnpm format`
- [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Audit current `.jscpd.json` ignore list (AC: #1)
  - [ ] Open `.jscpd.json` and list all entries under `"ignore"` (or equivalent key)
  - [ ] For each entry, confirm whether the path exists in the workspace
  - [ ] Record the 8 (or updated count) invalid paths
- [ ] Remove invalid paths (AC: #1, #3)
  - [ ] Delete only the confirmed-nonexistent entries from the ignore array
  - [ ] Leave all valid (existing) entries unchanged
- [ ] Validate fix (AC: #2)
  - [ ] Run `pnpm dupcheck` and confirm no path-resolution errors in output
  - [ ] Note any duplication findings in Dev Agent Record (do NOT suppress them here — that is Story 23.2)

## Dev Notes

### Key Files

- `.jscpd.json` — root duplication config; the only file changed in this story
- `package.json` — `"dupcheck"` script (confirms the command to run)

### Known Invalid Paths (confirmed at story creation time)

There are 8 invalid ignore paths already confirmed present in `.jscpd.json`. Their exact values should be verified by the implementing agent before removal, but they were all confirmed non-existent at the time this story was written.

### Important Constraints

- Do **not** add new suppression entries — that defeats the purpose of this story.
- Do **not** run or integrate duplication fixes here; that is the scope of Story 23.2.
- If the number of invalid paths differs from 8 when the agent audits, document the discrepancy in Dev Agent Record.

### References

[Source: .jscpd.json]
[Source: package.json#scripts]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
