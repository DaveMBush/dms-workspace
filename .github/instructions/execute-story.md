# Execute Story (Dark Factory 2)

Self-contained prompt. Runs fully headless — **never ask questions, never
wait for approval, never show menus**. Complete all steps in one run.

## Purpose

Hand it a story file path. It implements that story end to end: writes the
tests, makes the change, runs the quality gates, updates the story record,
and leaves the story at `Status: review` for the human/adversarial review
step. Closing the story (`done`) is NOT this run's job — only a reviewer does
that later.

## Architecture: orchestrator + sequential sub-agents

This run is an ORCHESTRATOR with a limited context window. It keeps only
contract-critical state in its own context (story status, task list, per-task
summaries) and delegates each implementation task to ONE sub-agent at a time —
**sequential sub-agents, never in parallel**. Each sub-agent gets a fresh
context containing exactly what that one task needs; when it returns, its
context is discarded. The orchestrator NEVER implements code itself: no
writing or editing source or test files directly.

Division of labor:

- **Orchestrator (this run):** status flips, git commits/pushes, story file
  edits (checkboxes, Dev Agent Record), quality gate runs, final report.
- **Sub-agent (one per task attempt):** reads the files its task needs,
  writes/edits code and tests for that one task only, runs targeted tests,
  returns a structured summary. Never commits, never touches git, never edits
  the story file.

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
3. Set the story's `Status:` line to `in-progress`. Save, then persist it so a
   crashed run can be resumed — commit and push ONLY the story file:

   ```bash
   git add _bmad-output/implementation-artifacts/stories/<story-file>
   git commit -m "Story <id>: mark in-progress"
   git push origin HEAD
   ```

   If the push fails (network/auth), note it in Completion Notes List and
   continue — do not HALT on this.
4. For each unchecked task/subtask, in exact written order:
   - Build the sub-agent brief from the template below: story path, the task's
     text verbatim, the paired unit-test story's spec for that task (if any),
     and the references/Dev Notes it needs. Nothing else.
   - Launch ONE sub-agent with that brief. Wait for it to finish before
     starting anything else — sequential sub-agents, never in parallel.
   - On return: run the `testCommand` the sub-agent reported, yourself. If its
     output contradicts a green result, or the summary is missing/incomplete,
     treat the attempt as failed. A failed attempt means relaunching a NEW
     sub-agent for the same task with the failure included in the brief — max
     3 attempts per task/subtask; HALT on the next failure (see below).
   - Once verified green: mark the checkbox `[x]` in the story file, append
     the sub-agent's summary to the Dev Agent Record notes you are accumulating,
     then commit + push everything (code + story file):

     ```bash
     git add -A
     git commit -m "Story <id>: checkpoint after task <n>"
     git push origin HEAD
     ```

     A crashed run resumes from the last pushed checkpoint — checked tasks are
     never redone. If a push fails, note it in Completion Notes List and
     continue; do not HALT on this.
5. When all tasks are checked, run the full quality gate yourself: `pnpm all`
   (lint + build + unit/integration tests with coverage + e2e for affected
   projects). If it fails, launch ONE sub-agent with the failing output and
   the area to fix (same brief template; its "task" is the failure), re-run
   the gate, repeat — max 3 full re-runs per root cause, then HALT. Never
   proceed while red.
6. Update the story file: mark every completed task/subtask `[x]`, fill in
   Dev Agent Record (Agent Model Used, Completion Notes List — accumulated
   sub-agent summaries plus any judgment calls with rationale, File List —
   every new/modified/deleted path relative to repo root), and set `Status:`
   to `review`. If a paired unit-test story was filled in this run, do the
   same for it (its tests now exist and pass; it also ends at `review`). Save.
7. Print the final report (format below) as the last output of the run.

## Sub-agent brief template

Every sub-agent receives exactly this — fill the placeholders, add nothing
else:

```text
You are implementing ONE task of a larger story. Work only on this task — no
other tasks, no refactors beyond it, no new dependencies.

Story file: <path> — read its Dev Notes and References sections for context.
Task (verbatim): <the task/subtask text from the story file>
Test spec (if applicable): <the paired unit-test story's AC/tasks covering this task>
Files you may touch: <files named by the task/Dev Notes; if none are named, only files this task requires>

Rules:
- Red first: where the task calls for tests, write or extend the failing
  tests before implementing. Run them and confirm they fail for the expected
  reason.
- Green: implement the minimal code to make those tests pass. Handle error
  conditions and edge cases named in Dev Notes.
- Refactor only within this task's files, keeping tests green.
- Run `pnpm exec nx test <project>` (or the story's own verify command) before
  finishing; do not finish while red.
- Small incremental writes — one file per write. Read files on demand; prefer
  targeted grep over dumping large files.
- Never skip, disable, or weaken an existing test (no `.skip`, `xit`, deleted
  assertions). A pre-existing test broken by this change is a blocker to
  report, not something to silence.
- No git commands at all — no add/commit/push/log/show; read files directly.

Return exactly:
TASK RESULT
status: green | red | blocked
filesChanged: <paths relative to repo root>
testCommand: <exact command you ran last>
testResult: pass | fail (<one-line summary>)
judgmentCalls: <bullets, or "none">
blocker: <if status is red/blocked — exact error output summary and what was tried; otherwise omit this line>
```

## HALT Conditions

Stop implementing when any of these is true:

- 3 consecutive failed attempts on the same task/subtask (each sub-agent
  relaunch counts as one attempt).
- A regression in an existing test that you cannot fix without changing
  behavior outside this story's scope.
- The story requires a new dependency, schema migration, or configuration not
  named in its Dev Notes/References.
- `pnpm all` fails after 3 full re-runs with the same root cause.

On HALT: set `Status:` to `blocked`, record the exact blocker (failing command,
error output summary, what was tried) in Completion Notes List, save the story
file, then persist it — commit and push ONLY the story file (same as step 3):

```bash
git add _bmad-output/implementation-artifacts/stories/<story-file>
git commit -m "Story <id>: mark blocked"
git push origin HEAD
```

Then print the final report with `result: "blocked"`. Do not attempt
workarounds that bypass failing tests or quality gates.

## Hard Rules

- Never ask a question. Never present a menu. Never wait for approval. Make
  every judgment call yourself using the story file + referenced documents;
  record each one in Completion Notes List with rationale.
- The orchestrator never writes source or test files itself — all
  implementation goes through sequential sub-agents, one at a time, waiting
  for each to finish before launching the next. Never in parallel.
- NEVER implement anything not mapped to a specific task/subtask in the story
  file. No extra features, no refactors beyond the tasks, no dependency adds.
- Never skip, disable, or weaken an existing test (no `.skip`, `xit`, deleted
  assertions) to make a run green. If a pre-existing test is genuinely broken
  by this change, that is a HALT condition, not something to silence.
- No git mutations EXCEPT checkpoint commits: do NOT branch, rebase, or create
  worktrees — with one exception. Committing and pushing on the story's own
  branch is allowed at three points so a crashed run can be resumed from
  durable state: step 3 (`in-progress` flip, story file only), after each green
  task (checkpoint, code + story file), and HALT (`blocked` flip, story file
  only). No other commits. The final `review` state is committed by the
  pipeline after this run. Read-only git (`git show`, `git log`, `git diff`)
  is allowed for context.
- Work only in the current directory (the story's working tree). All file
  writes are small and incremental — one file per write, no bulk multi-file
  dumps.
- Context discipline: read the story file once; get per-task details from
  sub-agent summaries rather than re-reading large files into your own
  context.

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
  "storyId": "3.1",
  "title": "Unit tests for the div-based mat-table conversion",
  "result": "review",
  "statusBefore": "ready-for-dev",
  "statusAfter": "review",
  "pairedUnitTestStory": null,
  "filesChanged": ["apps/dms-material/src/app/shared/components/base-table/base-table-mat-table.spec.ts"],
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
