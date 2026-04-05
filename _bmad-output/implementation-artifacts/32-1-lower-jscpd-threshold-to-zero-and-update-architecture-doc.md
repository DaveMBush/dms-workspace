# Story 32.1: Lower jscpd Threshold to Zero and Update Architecture Doc

Status: Approved

## Story

As a developer maintaining code quality,
I want the jscpd copy-paste detection threshold set to zero tolerance and the Architecture documentation to reflect this standard,
so that no code duplication can accumulate undetected and the documented standard matches the enforced standard.

## Acceptance Criteria

1. **Given** `.jscpd.json` currently has `"threshold": "0.1"`, **When** the change is applied, **Then** `.jscpd.json` has `"threshold": "0"`.
2. **Given** `_bmad-output/planning-artifacts/architecture.md` section `### jscpd (Code Duplication)`, **When** the change is applied, **Then** the line `**Threshold:** 0.1% maximum duplication across the scanned codebase` is updated to `**Threshold:** 0% — zero tolerance for code duplication across the scanned codebase`.
3. **Given** the threshold change, **When** `pnpm dupcheck` runs, **Then** its output (pass or violation list) is captured — if violations exist, they are recorded in `_bmad-output/implementation-artifacts/jscpd-violations.md` for Story 32.2.
4. **Given** no entries are added to the `ignore` array in `.jscpd.json`, **When** the change is applied, **Then** the `ignore` array remains identical to its current state.
5. **Given** all changes, **When** `pnpm all` runs, **Then** it passes (if violations exist they will cause `pnpm dupcheck` to fail — see Dev Notes).

## Definition of Done

- [ ] `.jscpd.json` `"threshold"` changed from `"0.1"` to `"0"`
- [ ] `architecture.md` threshold line updated
- [ ] `pnpm dupcheck` run and output captured
- [ ] If violations exist: `_bmad-output/implementation-artifacts/jscpd-violations.md` created
- [ ] If no violations: `pnpm all` passes and epic is complete (Story 32.2 is a no-op)
- [ ] Run `pnpm format`

## Tasks / Subtasks

- [ ] Update `.jscpd.json` (AC: #1, #4)
  - [ ] Change `"threshold": "0.1"` to `"threshold": "0"`
  - [ ] Confirm no other changes to the file (ignore array unchanged)
- [ ] Update architecture documentation (AC: #2)
  - [ ] Open `_bmad-output/planning-artifacts/architecture.md`
  - [ ] Find line: `**Threshold:** 0.1% maximum duplication across the scanned codebase`
  - [ ] Replace with: `**Threshold:** 0% — zero tolerance for code duplication across the scanned codebase`
- [ ] Run `pnpm dupcheck` and capture output (AC: #3)
  - [ ] Run `pnpm dupcheck` and observe the result
  - [ ] If result is **PASS**: `pnpm all` passes, Story 32.2 is not needed. Record "no violations found" note.
  - [ ] If result is **FAIL** (violations listed): extract the list of duplicated files and line ranges
    - [ ] Create `_bmad-output/implementation-artifacts/jscpd-violations.md` with the full violation list
    - [ ] Format: for each violation: file paths, start/end line numbers, number of duplicated tokens
- [ ] Run `pnpm all` (if no violations) (AC: #5)
  - [ ] If `pnpm dupcheck` already passed at threshold 0: run `pnpm all` and confirm green

## Dev Notes

### Current `.jscpd.json` State

```json
{
  "silent": false,
  "threshold": "0.1", // ← change to "0"
  "mode": "weak",
  "pattern": "**/*.{js,ts,html,css,scss,json,md}",
  "minLines": 15,
  "minTokens": 100,
  "//": "ignore spec files for now",
  "ignore": ["**/_bmad-output/**", "**/_bmad/**", "**/docs/**", "**/*.test.ts", "**/eslint.config.mjs", "**/jest.config.ts", "**/*.spec.ts", "**/tsconfig.json", "**/tsconfig.lib.json", "**/node_modules/**", "**/{.*,coverage,dist,tmp}/**"]
}
```

### Architecture Doc Target Section (in `architecture.md`)

Location: `_bmad-output/planning-artifacts/architecture.md` section `### jscpd (Code Duplication)` around line 695.

Change this line:

```
**Threshold:** 0.1% maximum duplication across the scanned codebase
```

To:

```
**Threshold:** 0% — zero tolerance for code duplication across the scanned codebase
```

### What `pnpm dupcheck` Does

Running `pnpm dupcheck` executes jscpd with the `.jscpd.json` config. At threshold `"0"`, it will fail if ANY duplication is detected above the `minLines: 15` / `minTokens: 100` minimums. The output lists each duplicated block with file paths and line numbers.

### IMPORTANT: If Violations Exist

If `pnpm dupcheck` fails after this change, Story 32.2 is needed. The violations file must be created. Do NOT fix violations in this story — that is Story 32.2's scope. This story's job is only to change the threshold and document what violations exist.

### Architecture Rules on jscpd (for information only — enforced in Story 32.2)

From the architecture doc:

- Duplication violations MUST be resolved by refactoring into shared utilities, services, or base abstractions
- NEVER add new suppression entries to the `ignore` array
- The `ignore` array may only contain infrastructure/config patterns — application source code paths must not be suppressed
- When new shared code is extracted, each file must export exactly one item (per `@smarttools/one-exported-item-per-file`) and include a spec file if it contains non-trivial logic

### References

[Source: .jscpd.json]
[Source: _bmad-output/planning-artifacts/architecture.md#jscpd (Code Duplication) ~line 695]
[Source: _bmad-output/planning-artifacts/epics-2026-03-30.md — Epic 32]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
