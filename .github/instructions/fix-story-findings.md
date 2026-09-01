# Fix Story Findings (Dark Factory 2 — in-task rework)

Self-contained prompt. Runs fully headless — **never ask questions, never wait
for approval, never show menus**. Complete all steps in one run.

## Purpose

Hand it a story file path whose status is `review` and which has a review log
(`{N}.{M}-review-findings.md`) written by `review-story.md`. It evaluates each
actionable finding from the LATEST review run for validity against the actual
codebase, fixes the ones that are real, rejects false positives with reasons,
sanity-checks its changes with targeted tests, and emits a machine-readable
report.

The story status is NOT changed here — it stays at `review` so the pipeline
can re-run review after this fix pass. The full quality gate (`pnpm all`:
lint/build/tests/format/dupcheck) is NOT run here either — the pipeline runs
its own verification step after fixes. This run only runs targeted unit tests
for the files it touches.

## Inputs

| Input                                    | Location                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Story file path (provided at invocation) | `_bmad-output/implementation-artifacts/stories/epic-{N}/{N}.{M}-kebab-title.md`                                                                                                                                                                                                                          |
| Review log                               | same epic directory: `{N}.{M}-review-findings.md` — append-only shared audit trail. Work items are the `F1..Fn` findings in the **latest** `## Review run ... — verdict: fail-rework` section only; earlier sections (older review runs, prior fix passes) are context for repeat/incomplete-fix history |

## Outputs

| Output           | Location                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Code/test fixes  | the files named by the valid findings (plus any spec file covering them)                                                              |
| Fix pass section | appended to the review log — one new `## Fix pass {ISO timestamp}` section at the end; earlier sections are never modified or deleted |
| Fix report       | printed as the final output block (see below); nothing else is written to disk                                                        |

## Workflow

1. Read the complete story file and the full review log. Identify the latest
   `## Review run` section: if it is not a `fail-rework` verdict, or contains
   zero patch (`F`) findings, print the final report with
   `result: "nothing-to-fix"` and stop (no other changes). Older sections' F
   findings are NOT work items — they were already handled by earlier fix
   passes; use them only to understand history.

   **Retry awareness:** this run may be a retry after an earlier incomplete
   pass that died before printing its report. Such a pass may have left code
   changes without a corresponding `## Fix pass` section in the log. Do not
   assume the log reflects all work already done — evaluate every finding
   against the current state of the code (step 2 does this by design). A
   finding whose fix is already present gets rejected as "already handled"
   with a citation, exactly like any other false positive; that is correct and
   expected on retries. If targeted tests fail on code you did not change in
   this run, repair it (step 4) rather than treating it as foreign damage.

2. **Evaluate each finding independently — do not trust it.** For every `F`
   finding in the latest review run, in order:
   - Read the cited location and enough surrounding code to understand context.
     If the finding references an earlier finding (incomplete-fix repeat), read
     that history too before judging.
   - Decide: **valid** (the issue is real and fixable by a bounded code/test
     edit) or **invalid** (false positive — already handled elsewhere, not
     reachable, misread of the code, or would require an architectural change,
     schema migration, or dependency that is out of scope for this story).
   - Record one line of justification per finding either way. A rejected
     finding must state concretely why it does not apply (cite the file/line
     that already handles it, or name the out-of-scope requirement).
3. **Fix each valid finding.** For each:
   - Make the minimal change that closes the issue — prefer the suggested fix
     in the review log when it is sound; adapt it when context shows a better
     minimal fix.
   - If the fix changes or adds behavior, add or update unit tests covering it
     (in the story's own spec files or the paired unit-test story's specs).
     Never delete or weaken an existing assertion to make a test pass — only
     change an expectation when the finding proves the old behavior was wrong.
   - Follow project conventions: read neighboring code first; match its style,
     naming, and patterns (Angular standalone components/signals where
     relevant, no RxJS outside SmartNgRX EffectServices).
4. **Sanity-check.** Identify the project's targeted unit-test command from
   `package.json` scripts / Nx configuration (do not guess), and run it for
   ONLY the spec files touched or directly covering changed behavior. If a
   targeted test fails, fix your change — do not weaken the test. Do NOT run
   the full quality gate; that is the pipeline's job after this pass.
5. **Record.** Append this pass's section to the review log (format below),
   then print the final report block (below). Leave story status at `review`.

## Fix pass section format (append-only)

Append exactly one section at the end of `{N}.{M}-review-findings.md`; never
edit earlier sections. Finding IDs referenced are those from the latest review
run this pass addresses:

```markdown
## Fix pass {ISO timestamp} — addressed {n}/{m} findings

### F1 — fixed

- Change: {one-line summary of what was changed and where}
- Tests: {spec file(s) added/updated, or "none needed"}

### F2 — rejected (false positive)

- Reason: {concrete justification; cite the file/line that already handles it,
  or name the out-of-scope requirement}

### F3 — blocked

- Reason: {why closing it requires work outside this story's scope}

Sanity check: `{command}` → passed|failed. Files changed: {list}.
```

## Hard Rules

- Never ask a question, present a menu, or wait for approval. Make every
  judgment call yourself; record material ones in the report's `notes`.
- No git mutations (no commit/push/branch/stash). Read-only git is allowed.
- Do not fix defer (`D`) findings — they are pre-existing and out of scope by
  definition.
- Do not run the full quality gate, builds, or e2e suites. Targeted unit tests
  only (step 4).
- Scope discipline: a fix must stay within files related to the finding plus
  their specs. If closing a valid finding genuinely requires touching
  unrelated modules, schema migrations, or new dependencies, mark that finding
  `blocked` in the report instead of expanding scope — the pipeline will
  escalate it.
- Work in small chunks; read files on demand; prefer targeted grep/read over
  dumping large files.

## Final Report (always printed last)

The final output of the run must be exactly one report block so N8N can parse
stdout mechanically. Line 1 is exactly `=== DF2 FIX REPORT ===`, followed by a
single valid JSON object. Strict JSON rules: double quotes for all keys and
string values; no trailing commas, comments, ellipses, or leftover
placeholders; real `null`/`[]` where nothing applies; escaped strings; no
markdown fences or prose before or after the block — the closing brace is the
last content of run output (a single trailing newline is fine).

Example shape (values illustrative only):

```text
=== DF2 FIX REPORT ===
{
  "storyId": "1.2",
  "result": "fixed",
  "reviewLog": "_bmad-output/implementation-artifacts/stories/epic-1/1.2-review-findings.md",
  "fixedFindings": ["F1"],
  "rejectedFindings": [{"id": "F2", "reason": "Guard already exists in base-table.component.ts:87"}],
  "blockedFindings": [],
  "filesChanged": ["apps/dms/src/app/components/base-table/base-table.component.spec.ts"],
  "sanityCheck": {"command": "pnpm nx run dms:test --testPathPattern=base-table", "passed": true},
  "notes": []
}
```

`result` is exactly one of `"fixed"`, `"nothing-to-fix"`, or `"blocked"`:

- `fixed` — every patch finding from the latest review run was either fixed
  (listed in `fixedFindings`) or rejected with a concrete reason
  (`rejectedFindings`). Re-running review should now pass.
- `nothing-to-fix` — no actionable findings existed; nothing changed.
- `blocked` — at least one valid finding could not be closed within scope
  (listed in `blockedFindings`); the pipeline must escalate to a human.

Validate before printing — do not trust your own formatting. Write the JSON
object (without the header line) to `/tmp/df2-fix-report.json`, then run:

```bash
node -e 'JSON.parse(require("fs").readFileSync("/tmp/df2-fix-report.json","utf8"))'
```

If it throws, fix the file and re-run until clean. Only then print line 1
followed by the exact contents of that file, unmodified.
