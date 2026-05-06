# Story 97.1: Research Prior Client-Side Implementation of Open Positions Computed Fields

Status: Approved

## Story

As a developer,
I want to study the git history for the previous client-side implementation of Expected$,
Last$ Unrlz Gain%, Unrlz Gain$, Target Gain, and Target Sell — and capture the formulas,
input fields, and edge cases — into a short research document,
So that Stories 97.2 and 97.3 have an unambiguous implementation target instead of
re-deriving the formulas from scratch.

## Acceptance Criteria

1. **Given** the current `open-positions-component.service.ts` and related selectors,
   **When** the developer runs `git log -- apps/dms-material/src/app/.../open-positions*`
   and inspects commits prior to the symbol-on-server refactor (Epics 94–96),
   **Then** the developer locates the original formulas for Expected$, Last$ Unrlz Gain%,
   Unrlz Gain$, Target Gain, and Target Sell.

2. **Given** the formulas are located,
   **When** the research document is written,
   **Then** `_bmad-output/implementation-artifacts/open-positions-fields-research.md`
   documents for each of the five fields: the exact formula, the source columns it depends
   on (from `Trade` and/or `Universe`), the precision/rounding rules, and the file/commit
   it was extracted from.

3. **Given** the research is complete,
   **When** `pnpm all` runs,
   **Then** all tests pass unchanged (no production code is modified in this story).

## Tasks / Subtasks

- [ ] Task 1: Locate the prior client-side implementation in git history
  - [ ] Run `git log --all --oneline -- apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts`
  - [ ] Run `git log --all --oneline -- 'apps/dms-material/src/app/account-panel/open-positions/*'` to catch related selectors/pipes
  - [ ] Identify the commits immediately preceding the symbol-on-server refactor (Epics 94–96)
  - [ ] For each of the 5 fields (Expected$, Last$ Unrlz Gain%, Unrlz Gain$, Target Gain, Target Sell), find the commit/file that defined the original formula
  - [ ] Record the commit SHA and file path for each formula

- [ ] Task 2: Extract the formulas and their inputs
  - [ ] For each of the 5 fields, capture: exact arithmetic formula, every input column it consumes (from `Trade` and/or `Universe`), the data types of those inputs, and any rounding / precision rules (e.g. `toFixed`, `Math.round`, integer cents, etc.)
  - [ ] Note any edge-case handling (missing universe row, zero/null inputs, division-by-zero guards)
  - [ ] Cross-check that every input column either already exists on the current server `Trade`/`Universe` row or is otherwise reachable from `mapTradeToResponse`

- [ ] Task 3: Recommend the server-side input set
  - [ ] For each of the 5 fields, list the exact `Trade` and `Universe` columns the server `mapTradeToResponse` will need to consume
  - [ ] Flag any input that is NOT currently available on the joined row (so Story 97.2 / 97.3 can plan a fix)

- [ ] Task 4: Write the research document
  - [ ] Create `_bmad-output/implementation-artifacts/open-positions-fields-research.md`
  - [ ] One section per field (Expected$, Last$ Unrlz Gain%, Unrlz Gain$, Target Gain, Target Sell)
  - [ ] Each section contains: formula, source columns, precision/rounding rules, originating commit SHA + file path, edge-case notes
  - [ ] Final section: "Required server inputs" summary for Stories 97.2 and 97.3

- [ ] Task 5: Verify no production code changed
  - [ ] `git status` shows only the new research markdown file (and this story file's status updates)
  - [ ] `pnpm all` passes
  - [ ] `pnpm format` passes

## Dev Notes

### Output File

```
_bmad-output/implementation-artifacts/open-positions-fields-research.md
```

This is the only deliverable. **No production code changes** in this story.

### The 5 Fields Under Investigation

| Field                     | Used by                               |
|---------------------------|---------------------------------------|
| Expected$                 | Open Positions table column           |
| Last$ Unrlz Gain%         | Open Positions table column           |
| Unrlz Gain$               | Open Positions table column           |
| Target Gain               | Open Positions table column           |
| Target Sell               | Open Positions table column (still computed client-side today) |

The first four were lost in the symbol-on-server refactor (Epics 94–96) and now render
blank. Target Sell still has a working client-side computation that Story 97.3 will move
to the server.

### Key Files to Inspect (current state)

```
apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts
apps/dms-material/src/app/store/trades/trade.interface.ts
apps/server/src/app/routes/trades/index.ts                  (mapTradeToResponse — destination)
```

`open-positions-component.service.ts` is where the prior formulas lived. Use git history on
that file (and any sibling selector / pipe files in the same folder) to recover them.

### Suggested Git Commands

```bash
# Identify the refactor commits to inspect "before"
git log --all --oneline -- apps/dms-material/src/app/account-panel/open-positions/

# Show the file as it was at a specific commit
git show <SHA>:apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts

# Find when each field name was last referenced in arithmetic context
git log -S 'expectedDollars' --all -- apps/dms-material/
git log -S 'unrealizedGain' --all -- apps/dms-material/
git log -S 'targetGain'      --all -- apps/dms-material/
git log -S 'targetSell'      --all -- apps/dms-material/
```

### Suggested Research Document Skeleton

```markdown
# Open Positions Computed Fields — Prior Implementation Research

## Expected$
- Formula:
- Source columns (Trade): ...
- Source columns (Universe): ...
- Precision / rounding:
- Originating commit: <SHA> (<file path>)
- Edge cases:

## Last$ Unrlz Gain%
... (same structure)

## Unrlz Gain$
... (same structure)

## Target Gain
... (same structure)

## Target Sell
... (same structure — this one still exists today, capture from current code AND any prior version)

## Required Server Inputs Summary
Table mapping each output field → required `Trade` / `Universe` columns on the joined row,
flagging any that are not currently available to `mapTradeToResponse`.
```

### Sequencing Note

This is the FIRST story of Epic 97. It blocks Stories 97.2 and 97.3 — both depend on the
formulas captured here. Story 97.4 (e2e) depends transitively on all of them.

### Test Scope

No tests are added or modified. Verification is:

- `pnpm all` passes (unchanged behavior)
- `pnpm format` passes
- The research document exists and covers all 5 fields with commit citations

## Dev Agent Record

### Agent Notes

_To be filled in during implementation._

## File List

_To be populated during implementation._

## Change Log

_To be populated during implementation._
