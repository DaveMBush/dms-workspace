# Fix CI Failures (Dark Factory 2)

Self-contained prompt. Runs fully headless — **never ask questions, never wait
for approval, never show menus**. Complete all steps in one run.

## Purpose

Hand it a PR number plus the failing step names reported by `wait-ci.mjs`. It
reads the CI logs for those failures, diagnoses the root cause, fixes what is
within this story's scope (code, tests, formatting, duplicate code), re-runs the
relevant checks locally to confirm green, and leaves the changes **uncommitted**
in the worktree. The pipeline commits/pushes them (`create-story-pr.mjs`) and
re-waits CI — so this run's only job is to make the failing checks pass on disk.

This is a safety net: if the validation loop worked correctly, there should be
nothing to fix here. If you find yourself fixing something broad or unrelated to
the story, that is a HALT (step 6), not a reason to widen scope.

Closing/merging the PR and committing/pushing are NOT this run's job.

## Inputs

| Input                                                           | Location / source                                                                |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| PR number (provided at invocation)                              | e.g. `43`                                                                        |
| Failing step names (provided at invocation, from `wait-ci.mjs`) | JSON array of `{job, step}`; may be empty — then discover them yourself          |
| Repo owner/name                                                 | derived from `git remote get-url origin`                                         |
| CI workflow definition                                          | `.github/workflows/ci.yml` (job `main`: format:check, dupcheck, lint/build/test) |
| Coding standards                                                | `docs/architecture/coding-standards.md`                                          |

You are running inside the story's worktree (the PR head branch). All edits go
to files in this working tree.

## Outputs

| Output                             | Location                              |
| ---------------------------------- | ------------------------------------- |
| Fixes for failing checks           | wherever each failure points          |
| Local re-runs of the failed checks | matching `pnpm` commands (see step 4) |

No story-file, planning-artifact, or git changes. Do not touch `_bmad-output/`.

## Workflow

1. Derive the repo from `git remote get-url origin` (strip `.git`). Confirm you
   are on the PR head branch and note any pre-existing uncommitted changes with
   `git status --porcelain` — they belong to this story's in-progress work, not
   foreign damage.
2. **Get the failure details.** If failing step names were provided, use them.
   Otherwise discover them: find the Actions run for the PR head sha and list
   failed steps:
   ```bash
   gh api repos/<owner>/<name>/actions/runs?head_sha=$(git rev-parse HEAD)&per_page=5
   # then, for the completed run whose head_sha matches:
   gh api repos/<owner>/<name>/actions/runs/<runId>/jobs?per_page=100
   ```
   For each failed step you need to understand, fetch its log (or the relevant
   slice): `gh api repos/<owner>/<name>/actions/jobs/<jobId>/logs`. Read only as
   much of each log as needed to find the error — do not dump whole logs into
   context.
3. **Diagnose and fix, in scope.** For each failing check:
   - `format:check` → run `pnpm format` (or the formatter's write mode) on the
     files it flagged; confirm with `pnpm format:check`.
   - `dupcheck` → resolve the reported duplicate code per coding standards
     (extract a shared helper or de-duplicate), keeping behavior identical.
   - `lint` / `build` / `test` → fix the underlying cause in this story's code
     or tests. A test failure means either your code is wrong or the test is —
     decide which from the assertion, and fix that one. Never weaken a test to
     make it pass (no `.skip`, `xit`, deleted assertions).
   - If a failure is clearly outside this story's scope (pre-existing breakage
     on main, infra/dependency issue, e2e environment), do NOT try to fix it —
     that is a HALT.
4. **Re-run the failed checks locally** with the matching commands so you know
   they pass before pushing: `pnpm format:check`, `pnpm dupcheck`, and targeted
   `pnpm exec nx test <project>` / `lint` for each touched project. Do NOT run
   the full `pnpm all` here — CI is the authoritative re-run, and e2e is not in
   scope locally. Iterate until every previously-failing check passes locally.
5. Re-read each file you changed; confirm the diff is minimal, matches coding
   standards, and introduces no new dependencies or drive-by refactors.
6. Print the final report (format below) as the last output of the run.

## HALT Conditions

Stop when any of these is true:

- A failure's root cause is outside this story's scope (pre-existing breakage,
  infra/dependency/environment issue).
- Fixing it requires a new dependency, schema migration, or cross-project change
  not named in the story.
- You are about to weaken or skip an existing test to make a check green.

On HALT: do NOT commit anything (you don't commit anyway), print the final
report with `result: "blocked"` and explain the exact blocker (failing step,
error summary, why it is out of scope) in `notes`. Do not attempt workarounds
that bypass failing checks.

## Hard Rules

- Never ask a question. Make every judgment call yourself; record each one in
  `notes` with rationale.
- NEVER skip, disable, or weaken an existing test (no `.skip`, `xit`, deleted
  assertions) to make a check green.
- No git mutations: do NOT commit, push, branch, rebase, or create worktrees.
  Read-only git and read-only `gh` are allowed. Version control of your changes
  is handled by the pipeline after this run.
- Work only in the current directory (the story's working tree). All file writes
  are small and incremental — one file per write, no bulk multi-file dumps.
- The model has limited context: work in small chunks, read files/logs on demand,
  prefer targeted grep/read over dumping large logs or files.

## Final Report (always printed last)

The final output of every run — success, HALT, or nothing-to-fix — must be
exactly one report block so N8N can parse stdout mechanically. Structure: line
1 is exactly `=== DF2 CI FIX REPORT ===`, followed by a single valid JSON object
with the fields below.

Strict JSON rules — violations break the pipeline:

- Double quotes for all keys and string values; no single quotes, no unquoted
  keys.
- No trailing commas, no comments, no ellipses, no leftover placeholders. Every
  field holds a real value from this run.
- Use `[]` for `fixed`, `outOfScope`, or `notes` when nothing applies.
- Escape backslashes and newlines inside strings; keep each note on one line.
- No markdown fences, code blocks, or prose before or after the block — the
  closing brace is the last content of run output (a single trailing newline is
  fine).

Example shape (values below are illustrative only):

```text
=== DF2 CI FIX REPORT ===
{
  "prNumber": 43,
  "result": "fixed",
  "failedStepsInput": [{"job":"main","step":"pnpm format:check"}],
  "fixed": [
    {"check":"format:check","summary":"ran pnpm format on base-table.component.ts; format:check now passes"}
  ],
  "outOfScope": [],
  "checksReRunPassed": true,
  "notes": []
}
```

`result` must be exactly one of `"fixed"`, `"nothing-to-fix"`, or `"blocked"`:

- `fixed` — at least one failing check was fixed and re-runs green locally.
- `nothing-to-fix` — no failures found to address (e.g. CI already passing).
- `blocked` — a HALT condition fired (read `notes`).

`checksReRunPassed` is always `true` when `result` is `"fixed"` or
`"nothing-to-fix"`, and may be `false` on `"blocked"`.

Validate before printing — do not trust your own formatting. Write the JSON
object (without the header line) to `/tmp/df2-ci-report.json`, then run:

```bash
node -e 'JSON.parse(require("fs").readFileSync("/tmp/df2-ci-report.json","utf8"))'
```

If it throws, fix the file and re-run until clean. Only then print line 1
followed by the exact contents of that file, unmodified.
