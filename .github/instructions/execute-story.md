# Execute Story (Dark Factory 2)

Self-contained prompt. Runs fully headless — **never ask questions, never
wait for approval, never show menus**. Complete all steps in one run.

## Purpose

Hand it a story file path. It implements that story end to end: writes the
tests, makes the change, runs the quality gates, updates the story record,
and leaves the story at `Status: review` for the human/adversarial review
step. Closing the story (`done`) is NOT this run's job — only a reviewer does
that later.

## Inputs

| Input                                      | Location                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| Story file path (provided at invocation)   | `_bmad-output/implementation-artifacts/stories/epic-{N}/{N}.{M}-kebab-title.md` |
| Paired unit-test story (if any, see below) | same epic directory, number `{N}.{M-1}`, status `skip`                          |
| Architecture spine                         | `_bmad-output/planning-artifacts/architecture/**/ARCHITECTURE-SPINE.md`         |
| Coding standards                           | `docs/architecture/coding-standards.md`                                         |

The story file is the authoritative spec. Its Dev Notes, References, and
verbatim pointers are FINAL — follow them exactly. Do not modify planning
artifacts (spine, PRD, UX).

## Outputs

| Output                                                | Location                                     |
| ----------------------------------------------------- | -------------------------------------------- |
| Implementation code + tests                           | wherever the story's Tasks/Dev Notes say     |
| Updated story file                                    | same path as input (permitted sections only) |
| Updated paired unit-test story (if one was filled in) | its own path (permitted sections only)       |

Permitted story-file edits: `Status:` line, Tasks/Subtasks checkboxes, and the
`## Dev Agent Record` section (Agent Model Used, Debug Log References,
Completion Notes List, File List). Nothing else. Never rewrite the Story, ACs,
Tasks text, or Dev Notes.

## Status Rules

| Current status              | Behavior                                                                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ready-for-dev`             | Implement from scratch.                                                                                                                               |
| `in-progress`               | Resume: start at the first unchecked task/subtask. Do not redo checked work.                                                                          |
| `skip`                      | Unit-test placeholder — it is filled in by its paired implementation story, never executed directly. Print a skipped report and exit without changes. |
| `review`, `done`, `blocked` | Already handled or parked. Print a skipped report and exit without changes. Do not re-implement.                                                      |

Transitions this run may make: `ready-for-dev → in-progress → review`, or
`in-progress → review`, or either → `blocked`. This run NEVER sets `done` and
NEVER clears `skip` except by filling the paired unit-test story (which then
ends at `review`).

## Workflow

1. Read the complete story file. Extract: status, Acceptance Criteria,
   Tasks/Subtasks, Dev Notes, References. If status is not implementable per
   the table above, print the final report (`result: "skipped"`) and stop.
2. Check for a paired unit-test story: in the same epic directory, look for
   `{N}.{M-1}-*.md` (the number immediately below this story's). If it exists
   and has `Status: skip`, read it completely — its Acceptance Criteria and
   Tasks define the exact test files and cases to write first (red phase).
3. Set the story's `Status:` line to `in-progress`. Save.
4. Load context on demand from the References section: architecture spine ADs,
   coding standards, prior commits (`git show <sha>:<path>` is allowed — read
   only), and any source files named in Dev Notes. Read what a task needs when
   you reach that task; do not preload the whole repo.
5. Implement tasks in exact written order, one at a time:
   - **Red:** for each task/subtask, write or extend the failing tests first
     (from the paired unit-test story's spec where it applies). Run them and
     confirm they fail for the expected reason.
   - **Green:** implement the minimal code to make those tests pass. Handle
     error conditions and edge cases named in Dev Notes.
   - **Refactor:** clean up while keeping tests green, following coding
     standards and the ADs cited in Dev Notes.
   - Run targeted tests for the touched project after each task before moving
     on (`pnpm exec nx test <project>` or the story's own Task 5-style verify
     step). Never proceed to the next task while a test is red.
6. When all tasks are checked, run the full quality gate: `pnpm all` (lint +
   build + unit/integration tests with coverage + e2e for affected projects).
   Fix failures and re-run until green or you hit a HALT condition below.
7. Update the story file: mark every completed task/subtask `[x]`, fill in
   Dev Agent Record (Agent Model Used, Completion Notes List — what was
   actually implemented and tested plus any judgment calls with rationale,
   File List — every new/modified/deleted path relative to repo root), and set
   `Status:` to `review`. If a paired unit-test story was filled in this run,
   do the same for it (its tests now exist and pass; it also ends at
   `review`). Save.
8. Print the final report (format below) as the last output of the run.

## HALT Conditions

Stop implementing when any of these is true:

- 3 consecutive failed attempts on the same task/subtask.
- A regression in an existing test that you cannot fix without changing
  behavior outside this story's scope.
- The story requires a new dependency, schema migration, or configuration not
  named in its Dev Notes/References.
- `pnpm all` fails after 3 full re-runs with the same root cause.

On HALT: set `Status:` to `blocked`, record the exact blocker (failing command,
error output summary, what was tried) in Completion Notes List, save the story
file, and print the final report with `result: "blocked"`. Do not attempt
workarounds that bypass failing tests or quality gates.

## Hard Rules

- Never ask a question. Never present a menu. Never wait for approval. Make
  every judgment call yourself using the story file + referenced documents;
  record each one in Completion Notes List with rationale.
- NEVER implement anything not mapped to a specific task/subtask in the story
  file. No extra features, no refactors beyond the tasks, no dependency adds.
- Never skip, disable, or weaken an existing test (no `.skip`, `xit`, deleted
  assertions) to make a run green. If a pre-existing test is genuinely broken
  by this change, that is a HALT condition, not something to silence.
- No git mutations: do NOT commit, push, branch, rebase, or create worktrees.
  Read-only git (`git show`, `git log`, `git diff`) is allowed for context.
  Version control of your changes is handled by the pipeline after this run.
- Work only in the current directory (the story's working tree). All file
  writes are small and incremental — one file per write, no bulk multi-file
  dumps.
- The model has limited context: work in small chunks, read files on demand,
  prefer targeted grep/read over dumping large files. If you must delegate a
  self-contained subtask to a sub-agent, run sub-agents sequentially, never in
  parallel.

## Final Report (always printed last)

The final output of every run — success, HALT, or skip — must be exactly one
report block so N8N can parse stdout mechanically. Structure: line 1 is
exactly `=== DF2 FINAL REPORT ===`, followed by a single valid JSON object with
the fields below.

Strict JSON rules — violations break the pipeline:

- Double quotes for all keys and string values; no single quotes, no unquoted
  keys.
- No trailing commas, no comments, no ellipses, no leftover placeholders.
  Every field holds a real value from this run — do not copy example values or
  template text verbatim.
- Use JSON `null` (not the quoted word) when there is no paired unit-test
  story; use `[]` for `filesChanged` or `notes` when nothing applies.
- Escape backslashes and newlines inside strings; keep each note on one line.
- No markdown fences, code blocks, or prose before or after the block — the
  closing brace is the last content of run output (a single trailing newline
  is fine).

Example shape (values below are illustrative only):

```text
=== DF2 FINAL REPORT ===
{
  "storyId": "1.2",
  "title": "Convert DMS base table to Angular Material mat-table",
  "result": "review",
  "statusBefore": "ready-for-dev",
  "statusAfter": "review",
  "pairedUnitTestStory": null,
  "filesChanged": ["apps/dms/src/app/components/base-table/base-table.component.ts"],
  "qualityGate": {"command": "pnpm all", "passed": true},
  "notes": []
}
```

`result` must be exactly one of `"review"`, `"blocked"`, or `"skipped"`:
`review` = complete, awaiting human/adversarial review; `blocked` = a HALT
condition fired (read `notes`); `skipped` = not implementable in this run
(status already handled, or it is a `skip` placeholder).
`qualityGate.passed` is always `true` when `result: "review"` (the gate must be
green before completion) and `false` on `blocked`.

Validate before printing — do not trust your own formatting. Write the JSON
object (without the header line) to `/tmp/df2-report.json`, then run:

```bash
node -e 'JSON.parse(require("fs").readFileSync("/tmp/df2-report.json","utf8"))'
```

If it throws, fix the file and re-run until clean. Only then print line 1
followed by the exact contents of that file, unmodified.
