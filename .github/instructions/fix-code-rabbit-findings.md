# Fix CodeRabbit Findings (Dark Factory 2)

Self-contained prompt. Runs fully headless — **never ask questions, never wait
for approval, never show menus**. Complete all steps in one run.

## Purpose

Hand it a PR number. It reads the inline review comments that `code-rabbit[bot]`
left on that PR, evaluates each against the actual code, fixes the valid ones,
rejects false positives with a cited reason, runs targeted tests to confirm the
fixes are green, and leaves the changes **uncommitted** in the worktree. The
pipeline commits and pushes them (via `create-story-pr.mjs`) and re-runs the
CodeRabbit wait — so this run's only job is to make the code correct on disk.

Closing the PR or merging is NOT this run's job. Committing/pushing is NOT this
run's job either.

## Inputs

| Input                              | Location / source                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| PR number (provided at invocation) | e.g. `43`                                                                                        |
| Repo owner/name                    | derived from `git remote get-url origin`                                                         |
| CodeRabbit inline comments         | `gh api repos/<owner>/<name>/pulls/<pr>/comments`, filtered to author matching `/code.?rabbit/i` |
| Coding standards                   | `docs/architecture/coding-standards.md`                                                          |

You are running inside the story's worktree (the PR head branch). All edits go
to files in this working tree.

## Outputs

| Output                        | Location                                          |
| ----------------------------- | ------------------------------------------------- |
| Code fixes for valid findings | wherever each comment points                      |
| Targeted test runs            | `pnpm exec nx test <project>` per touched project |

No story-file, planning-artifact, or git changes. Do not touch `_bmad-output/`.

## Workflow

1. Derive the repo from `git remote get-url origin` (strip `.git`). Confirm you
   are on the PR head branch (`git rev-parse --abbrev-ref HEAD`) and that the
   worktree is clean enough to start (`git status --porcelain` — note any
   pre-existing uncommitted changes; they belong to this story's in-progress
   work, not foreign damage).
2. Fetch CodeRabbit's inline comments:
   `gh api repos/<owner>/<name>/pulls/<pr>/comments`. Keep only entries whose
   `user.login` matches `/code.?rabbit/i`. Each has `path`, `line` (or
   `original_line`), and `body`. If there are zero such comments, print the
   final report with `result: "nothing-to-fix"` and stop.
3. **Evaluate each comment independently — do not trust it.** For every
   CodeRabbit comment, in order:
   - Read the cited file at the cited line plus enough surrounding context to
     understand what the bot is claiming.
   - Decide one disposition:
     - `fix` — the finding is real and actionable in this story's code. Fix it
       minimally, following coding standards. No drive-by refactors beyond the
       point raised.
     - `reject` — false positive, already handled, out of scope for this story,
       or a style preference that contradicts an established project convention.
       Record a one-line reason citing the specific code/doc that justifies the
       rejection (e.g. "guard already present at base-table.component.ts:88",
       "matches coding-standards.md §naming"). Never reject with a bare
       "noted" or "won't fix".
   - **Retry awareness:** this run may be a retry after an earlier pass that
     fixed some findings and pushed. CodeRabbit re-reviews the new head, so its
     current comment set is authoritative — but a finding whose issue you (or a
     prior pass) already resolved in code gets disposition `reject` with reason
     "already addressed" plus a citation to the now-correct line. That is
     correct and expected on retries; it does not count as a new fix. If a file
     has an error you did not introduce this run, repair it (step 4) rather than
     treating it as foreign damage.
4. After applying all `fix` dispositions, run targeted tests for every project
   you touched: `pnpm exec nx test <project>` (or the narrowest affected target).
   Fix your changes until they pass. Do NOT run the full `pnpm all` gate here —
   the pipeline re-runs its own validation gate after pushing. If a targeted
   test fails for a reason outside this story's scope, that is a HALT (step 6),
   not something to silence or work around.
5. Re-read each file you changed and confirm the diff is minimal and matches
   coding standards. No leftover debug code, no commented-out blocks, no new
   dependencies.
6. Print the final report (format below) as the last output of the run.

## HALT Conditions

Stop when any of these is true:

- A fix requires a change outside this story's scope (new dependency, schema
  migration, cross-project refactor).
- A targeted test fails for a reason you cannot attribute to your own changes.
- You are about to weaken or skip an existing test to make a run green.

On HALT: do NOT commit anything (you don't commit anyway), print the final
report with `result: "blocked"` and explain the exact blocker in `notes`. Do not
attempt workarounds that bypass failing tests.

## Hard Rules

- Never ask a question. Make every judgment call yourself; record each one in
  `notes` with rationale.
- NEVER skip, disable, or weaken an existing test (no `.skip`, `xit`, deleted
  assertions) to make a run green.
- No git mutations: do NOT commit, push, branch, rebase, or create worktrees.
  Read-only git (`git status`, `git diff`, `git log`) and read-only `gh` are
  allowed. Version control of your changes is handled by the pipeline after this
  run.
- Work only in the current directory (the story's working tree). All file writes
  are small and incremental — one file per write, no bulk multi-file dumps.
- The model has limited context: work in small chunks, read files on demand,
  prefer targeted grep/read over dumping large files.

## Final Report (always printed last)

The final output of every run — success, HALT, or nothing-to-fix — must be
exactly one report block so N8N can parse stdout mechanically. Structure: line
1 is exactly `=== DF2 CR FIX REPORT ===`, followed by a single valid JSON object
with the fields below.

Strict JSON rules — violations break the pipeline:

- Double quotes for all keys and string values; no single quotes, no unquoted
  keys.
- No trailing commas, no comments, no ellipses, no leftover placeholders. Every
  field holds a real value from this run.
- Use `[]` for `fixed`, `rejected`, or `notes` when nothing applies.
- Escape backslashes and newlines inside strings; keep each note on one line.
- No markdown fences, code blocks, or prose before or after the block — the
  closing brace is the last content of run output (a single trailing newline is
  fine).

Example shape (values below are illustrative only):

```text
=== DF2 CR FIX REPORT ===
{
  "prNumber": 43,
  "result": "fixed",
  "commentsTotal": 3,
  "fixed": [
    {"path": "apps/dms/src/app/components/base-table/base-table.component.ts", "line": 88, "summary": "added null guard before .length"}
  ],
  "rejected": [
    {"path": "apps/dms/src/app/services/lookup.service.ts", "line": 12, "reason": "already addressed — retry of prior pass; guard present at lookup.service.ts:14"}
  ],
  "testsPassed": true,
  "notes": []
}
```

`result` must be exactly one of `"fixed"`, `"nothing-to-fix"`, or `"blocked"`:

- `fixed` — at least one comment was fixed (and targeted tests pass).
- `nothing-to-fix` — zero actionable CodeRabbit comments, or every comment was
  rejected as a false positive / already addressed.
- `blocked` — a HALT condition fired (read `notes`).

`testsPassed` is always `true` when `result` is `"fixed"` or `"nothing-to-fix"`,
and may be `false` on `"blocked"`.

Validate before printing — do not trust your own formatting. Write the JSON
object (without the header line) to `/tmp/df2-cr-report.json`, then run:

```bash
node -e 'JSON.parse(require("fs").readFileSync("/tmp/df2-cr-report.json","utf8"))'
```

If it throws, fix the file and re-run until clean. Only then print line 1
followed by the exact contents of that file, unmodified.
