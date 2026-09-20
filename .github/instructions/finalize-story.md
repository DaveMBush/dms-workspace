# Finalize Story (Dark Factory 2)

Self-contained prompt. Runs fully headless — **never ask questions, never wait
for approval**. Complete all steps in one run.

## Purpose

Runs immediately after the Develop Story run, in a FRESH context. The develop
run may have completed everything but died before printing its final report
block (context exhaustion). Your job: bring the story file to a consistent
terminal state and print the `=== DF2 FINAL REPORT ===` block so N8N can parse
it. You NEVER implement code, write tests, or run quality gates — you only
read state, edit the story file's `Status:` line (and Dev Agent Record fields),
commit/push that one file, and emit the report.

## Inputs

| Input | Location |
|---|---|
| Story file | Path given in your prompt (`_bmad-output/implementation-artifacts/stories/<epic>/<file>.md`) |
| Working tree | Current directory (the story's worktree) — work only here |

Read the story file ONCE. Extract: `Status:` line, task/subtask checkboxes,
Dev Agent Record fields (Agent Model Used, Debug Log References, Completion
Notes List), and any recorded quality-gate result.

## Branches (pick exactly one)

**A. Status is `done` or `skip`.** Nothing to do. Emit a report with
`result: "skipped"`, `statusAfter` = the current status. No git operations.

**B. Status is `blocked`.** Leave it blocked — resuming is not your job. Emit
a report with `result: "blocked"` and copy the blocker summary from Completion
Notes List into `notes`. No git operations (the develop run already committed
the blocked state).

**C. Status is `in-progress` AND every task/subtask checkbox is checked.** The
develop agent finished all tasks but died before flipping status (context
exhaustion). Only the flip and report are missing:
1. Set `Status:` to `review`. Save.
2. Commit ONLY the story file:
   ```bash
   git add _bmad-output/implementation-artifacts/stories/<epic>/<file>.md
   git commit -m "Story <id>: mark review"
   git push origin HEAD
   ```
   If the push fails (network/auth), note it in `notes` and continue.
3. Emit a report with `result: "review"`, `statusAfter: "review"`. Set
   `qualityGate.passed` to `true` if the Dev Agent Record documents a completed
   gate run whose failures are noted as pre-existing/environmental; `false`
   otherwise (and add a note explaining).

**D. Status is `in-progress` but at least one task/subtask checkbox is
unchecked.** The develop run died mid-work. Do NOT flip to review and do NOT
commit anything — the next Develop Story run resumes from the first unchecked
task. Emit a report with `result: "blocked"`,
`statusAfter: "in-progress"`, and one note naming the first unchecked
task/subtask so the resume knows where it left off.

**E. Status is already `review`.** The develop run completed normally but did
not print its final report block before ending — you are re-emitting it. No
git operations: leave the tree exactly as the develop run left it (the
downstream PR step commits whatever exists). Emit a report with
`result: "review"`, `statusAfter: "review"`; set `qualityGate.passed` per
branch C step 3 from what the Dev Agent Record documents. Take every other
field from the record — do not invent values.

## Final Report (always printed last)

The final output of this run must be exactly one report block so N8N can parse
stdout mechanically. Line 1 is exactly `=== DF2 FINAL REPORT ===`, followed by
a single valid JSON object:

```text
{
  "storyId": "<epic>.<number>",
  "title": "<story H1 title>",
  "result": "review | blocked | skipped",
  "statusBefore": "<Status before your change, or current if unchanged>",
  "statusAfter": "<final Status value>",
  "pairedUnitTestStory": null,
  "filesChanged": ["<paths from the Dev Agent Record; [] if none>"],
  "qualityGate": {"command": "pnpm all", "passed": true},
  "notes": ["<one line each; [] if none>"]
}
```

Strict JSON rules — violations break the pipeline: double quotes only, no
trailing commas, no comments, no placeholders copied from this file. `null`
(not a quoted word) for absent paired story; `[]` when nothing applies.
Escape backslashes/newlines inside strings; one line per note. No markdown
fences or prose before/after the block — the closing brace is the last content
of run output (a single trailing newline is fine).

Field rules:
- `result`: `"review"` in branches C and E; `"blocked"` in B and D;
  `"skipped"` in A.
- `qualityGate.passed`: per branch C step 3 — `true` when the record documents
  a completed gate run whose failures are noted as pre-existing/environmental;
  `false` in branches B and D.
- Take every value from the story file — do not invent values.

Validate before printing — do not trust your own formatting. Write the JSON
object (without the header line) to `/tmp/df2-report.json`, then run:

```bash
node -e 'JSON.parse(require("fs").readFileSync("/tmp/df2-report.json","utf8"))'
```

If it throws, fix the file and re-run until clean. Only then print line 1
followed by the exact contents of that file, unmodified.
