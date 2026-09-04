# Review Story (Dark Factory 2 — validation gate)

Self-contained prompt. Runs fully headless — **never ask questions, never wait
for approval, never show menus**. Complete all steps in one run.

## Purpose

Hand it a story file path whose status is `review`. It adversarially reviews
the code changes that implemented the story (three independent review layers),
triages findings, and emits a machine-readable verdict:

- **pass** — no actionable findings; leaves the story and its paired unit-test
  story at `review` (the final flip to `done` is owned by merge-story-pr.mjs,
  which runs only after CodeRabbit + CI pass).
- **fail-rework** — real code issues found; appends them to the shared review
  log for the fix node (`fix-story-findings.md`) and leaves status at `review`.
- **needs-human** — the story itself is wrong, incomplete, or ambiguous in a
  way code cannot fix; leaves status at `review` and reports the spec-level
  issues.

This run NEVER edits implementation code. It may append to exactly one file:
the review log (every non-skipped verdict). The full quality gate (`pnpm all`)
is NOT run here — the pipeline runs its own verification step after fixes.

## Inputs

| Input                                    | Location                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| Story file path (provided at invocation) | `_bmad-output/implementation-artifacts/stories/epic-{N}/{N}.{M}-kebab-title.md` |
| Paired unit-test story (if any)          | same epic directory, number `{N}.{M-1}`, status `review` or `done`              |
| Story File List section                  | inside the story file — authoritative list of files this implementation touched |

## Outputs

| Output                                 | Location                                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Review log (every non-skipped verdict) | same epic directory: `{N}.{M}-review-findings.md` — append-only; each run adds one section, earlier sections are never rewritten or deleted |
| Status update                          | none — this run never sets `done`; merge-story-pr.mjs owns the final flip to `done` (main story + paired unit-test story) after CodeRabbit + CI pass |

Permitted story-file edits: **none.** This run never touches a story file's
`Status:` line in any verdict. Never rewrite ACs, Tasks, Dev Notes, or Dev Agent Record. The
review log is shared with fix passes (they append their own sections) — this
run may only add a new section at the end.

## Workflow

1. Read the complete story file. If status is not `review`, print the final
   report with `result: "skipped"` and stop (no other changes). Extract:
   Acceptance Criteria, Tasks, Dev Notes, References, File List.
2. Check for a paired unit-test story (`{N}.{M-1}-*.md` in the same directory).
   If present at status `review`, include it as a second spec document — its
   ACs are part of what this review validates. Note its ID for the report.
3. **Load prior history.** If `{N}.{M}-review-findings.md` exists, read it in
   full: every earlier review run's findings and verdict, plus every fix pass's
   outcomes (which finding IDs were fixed, rejected with what reason, blocked).
   This is the known-issues ledger used for repeat detection in triage. If the
   file does not exist, this is the first review — no repeats are possible.
4. **Construct the diff under review.** Use the story's File List to scope:
   - For each path in the File List, determine state via `git status --porcelain`
     and `git log`:
     - Untracked (new) file → include full content as an added-file diff
       (`git diff --no-index /dev/null <path>`).
     - Modified/uncommitted → include from `git diff HEAD -- <path>`.
     - Committed on this branch → include from
       `git diff $(git merge-base main HEAD)..HEAD -- <path>`.
   - If the File List is empty or missing, fall back to ALL uncommitted
     changes (`git diff HEAD` + all untracked files), and if that is also
     empty, to all commits since `main` diverged.
   - Verify the combined diff is non-empty. If it is empty (nothing was
     actually changed), print the final report with `result: "skipped"` and a
     note explaining no changes were found — do NOT flip status.
5. **Run three review layers.** Each layer must be independent: findings from
   one layer must not influence another. If sub-agents are available, run each
   layer as a separate sub-agent with ONLY the inputs listed (no shared
   conversation history), sequentially. Otherwise perform each layer as a
   separate focused pass in this session, deliberately setting aside what
   earlier layers concluded before starting the next.

   **Layer 1 — Blind Hunter.** Input: the diff only. No spec, no project file
   access, no knowledge of which story produced it. Role: cynical, jaded
   reviewer with zero patience for sloppy work; assume problems exist and look
   for what is missing, not just what is wrong. Output: markdown list of
   findings (one-line title + description + location if visible in the diff).

   **Layer 2 — Edge Case Hunter.** Input: the diff plus read access to project
   files (to check whether a guard exists elsewhere that the diff omits). Role:
   pure path tracer — never judge quality, only enumerate branching paths and
   boundary conditions reachable from changed lines that lack an explicit
   guard. Output: strict JSON array of objects with exactly these fields:
   `location` (`file:start-end` or `file:line`), `trigger_condition` (≤15
   words), `guard_snippet` (single-line escaped string sketching the minimal
   fix), `potential_consequence` (≤15 words). Empty array `[]` is valid.

   **Layer 3 — Acceptance Auditor.** Input: the diff, the story file, and the
   paired unit-test story if present. Role: check for violations of acceptance
   criteria, deviations from spec intent, missing implementation of specified
   behavior, contradictions between Dev Notes/References constraints and actual
   code, and test coverage gaps against the ACs (an AC with no corresponding
   passing test is a finding). Output: markdown list; each finding has a
   one-line title, which AC/constraint it violates, and evidence from the diff.

6. **Triage.** Normalize all findings into a common shape (`id`, `source` =
   blind/edge/auditor or merged, `title`, `detail`, `location`). Deduplicate:
   merge findings describing the same issue (prefer the one with a concrete
   location; combine unique detail). Then classify each finding into exactly
   one bucket — when uncertain between two, choose the more conservative one:

   - **patch** — real code issue in this change that is fixable by a bounded
     code edit.
   - **defer** — pre-existing issue not caused by this change (real, but out of
     scope).
   - **spec** — the story/ACs themselves are wrong, incomplete, or ambiguous;
     cannot be resolved from existing information.
   - **reject** — false positive, noise, already handled elsewhere, or not a
     problem in context.

   **Repeat detection (only when prior history exists).** Before finalizing
   each classification, compare the finding against the known-issues ledger —
   same location and same root cause as a recorded earlier finding counts as a
   repeat:
   - Repeat of an earlier finding that a fix pass marked **fixed**: verify the
     current code at that location actually addresses it. Addressed → classify
     `reject`, note "repeat of {run date} F{n} — verified addressed". NOT
     addressed → keep as `patch` (the prior fix was incomplete; re-flagging is
     correct) and reference the original finding in its detail so the fix node
     sees the full history.
   - Repeat of an earlier finding that a review or fix pass **rejected** with a
     recorded reason: classify `reject`, note "repeat of {run date} F{n} — prior
     rejection stands", unless this run's evidence contradicts that reason (then
     reclassify normally and record the contradiction).

   Count findings rejected specifically as repeats → report field
   `repeatFindings`. Repeats verified addressed never block a pass.

   Drop all `reject` findings (count them). Do NOT invent minimum finding
   counts — zero real findings is a valid outcome. If a layer failed or
   returned nothing usable, note it in the report; if ALL layers failed, print
   `result: "skipped"` with an explanatory note instead of declaring pass.

7. **Decide and act.** In every non-skipped verdict, first append this run's
   section to the review log (format below), then:
   - Any `spec` finding → verdict **needs-human**. Leave status at `review`.
     Put the spec findings in the report's `notes` (one line each, with AC
     reference) and list them in the log section.
   - Else any `patch` finding → verdict **fail-rework**. Leave status at
     `review`. The log section lists only this run's `patch` and `defer`
     findings; mark each with its bucket so the fix node knows which are
     actionable vs informational.
   - Else → verdict **pass**. Append a short clean-run entry to the log and
     leave both the story and its paired unit-test story at `review`. Do NOT
     set either status line — merge-story-pr.mjs flips them to `done` after
     CodeRabbit + CI pass. Save only the review-log section.

## Review log format (append-only)

The review log is a running audit trail shared by review and fix passes. Each
pass appends exactly one section at the end; earlier sections are never edited,
renumbered, or deleted. Finding IDs (`F1..Fn`, `D1..Dm`) are scoped to the run
that created them — reference an older finding as `{run date} F{n}` when a new
finding relates to it.

Review-run section (appended by this instruction):

```markdown
## Review run {ISO timestamp} — verdict: {pass|fail-rework|needs-human}

Counts: patch {n}, defer {m}, spec {s}, rejected {r}; repeats of prior findings rejected as addressed: {k}.

### F1 — {one-line title} ← fail-rework only

- Location: `{file}:{lines}`
- Source: {blind|edge|auditor|merged}
- Issue: {what is wrong and why it matters}
- Evidence: {quote from diff or code proving the issue}
- Suggested fix: {minimal concrete change; guard snippet for edge findings}

### D1 — {one-line title} ← fail-rework only, pre-existing

- Location: `{file}:{lines}`
- Issue: {description}

Spec issues: ← needs-human only

- {AC reference}: {what is wrong/incomplete/ambiguous in the story}
```

A `pass` run appends just the header + counts line (plus one note per repeat
rejected as addressed). Fix passes append their own sections using the format
defined in `fix-story-findings.md`. The fix node acts only on the latest
review-run section's F findings; earlier sections are context.

## Hard Rules

- Never ask a question, present a menu, or wait for approval. Make every
  judgment call yourself; record material ones in the report's `notes`.
- Read-only with respect to implementation code: no edits to source files, no
  git mutations (no commit/push/branch/stash). Read-only git (`git diff`,
  `git log`, `git show`, `git status`) is allowed. The only file this run may
  touch is the review log (append one new section at the end; never modify
  earlier sections). This run NEVER edits a story file — not on pass, not in
  any verdict. The final flip to `done` belongs to merge-story-pr.mjs.
- Do not run the quality gate, builds, or test suites — review is static
  analysis of the diff plus targeted reads of surrounding code.
- Every finding must cite evidence from the diff or a specific file/line. No
  speculative findings ("this might be slow", "consider using X") — those are
  `reject` by definition.
- Work in small chunks; read files on demand; prefer targeted grep/read over
  dumping large files.

## Final Report (always printed last)

The final output of the run must be exactly one report block so N8N can parse
stdout mechanically. Line 1 is exactly `=== DF2 REVIEW REPORT ===`, followed by
a single valid JSON object. Strict JSON rules: double quotes for all keys and
string values; no trailing commas, comments, ellipses, or leftover
placeholders; real `null`/`[]` where nothing applies; escaped strings; no
markdown fences or prose before or after the block — the closing brace is the
last content of run output (a single trailing newline is fine).

Example shape (values illustrative only):

```text
=== DF2 REVIEW REPORT ===
{
  "storyId": "1.2",
  "result": "fail-rework",
  "statusBefore": "review",
  "statusAfter": "review",
  "findingsFile": "_bmad-output/implementation-artifacts/stories/epic-1/1.2-review-findings.md",
  "counts": {"patch": 2, "defer": 1, "spec": 0, "rejected": 5},
  "repeatFindings": 1,
  "pairedUnitTestStory": "1.1",
  "notes": []
}
```

`result` is exactly one of `"pass"`, `"fail-rework"`, `"needs-human"`, or
`"skipped"`:

- `pass` — zero actionable findings this run (`counts.patch` and `counts.spec`
  are both 0); story (and paired unit-test story) remain at `review`. This is
  the "review passed" signal for N8N, including on re-runs after fixes. The
  final flip to `done` happens in merge-story-pr.mjs after CodeRabbit + CI pass.
- `fail-rework` — this run's patch findings appended to the review log for the
  fix node.
- `needs-human` — spec-level issues in `notes`; human must amend the story,
  then re-run review.
- `skipped` — status was not `review`, no changes found, or all layers failed;
  nothing changed. `findingsFile` is `null`.

`counts` reflects only this run's findings. On a re-review after fixes,
`repeatFindings > 0` with `result: "pass"` means earlier issues came back but
were verified addressed — still a clean pass. A repeat that was NOT addressed
stays in `counts.patch`, so an incomplete fix cannot hide behind a pass.

Validate before printing — do not trust your own formatting. Write the JSON
object (without the header line) to `/tmp/df2-review-report.json`, then run:

```bash
node -e 'JSON.parse(require("fs").readFileSync("/tmp/df2-review-report.json","utf8"))'
```

If it throws, fix the file and re-run until clean. Only then print line 1
followed by the exact contents of that file, unmodified.
