---
description: 'QA gate: review story-scoped changes for acceptance criteria, code quality, and test coverage'
argument-hint: story=3-3
tools: { execute: true, read: true, agent: true, edit: true, 'context7/*': true, 'playwright/*': true, todo: true }
user-invocable: false
---

# QA Gate for Story ${story}

Invoke the `#skill:bmad-code-review` to perform a comprehensive code review across all quality facets for the changes in this story.

Before invoking:

1. Validate `${story}`. If it is empty or does not match `^\d+-\d+$`, abort with a short report requesting a valid story id and make the final line exactly `GATE: FAIL`.
2. Read `_bmad-output/project-context.md`. If it is missing or unreadable, abort with a short report naming the missing path and make the final line exactly `GATE: FAIL`.
3. Resolve the story file from `_bmad-output/implementation-artifacts/${story}*.md`. If exactly one readable match is not found, abort with a short report naming the missing or ambiguous path and make the final line exactly `GATE: FAIL`.

Then read:

1. `_bmad-output/project-context.md`
2. The resolved story file for `${story}` — acceptance criteria and story context

Use `git diff --name-only $(git merge-base HEAD origin/main)...HEAD` to identify the changed files already present in `HEAD` and scope the review to only those files.

If that committed diff returns zero files, run `git diff --name-only` and use tracked working-tree changes as the review scope fallback. Mention in the gate report that the fallback was used.

If `git merge-base` fails, or if both diff commands fail, return a short report with the command error and make the final line exactly `GATE: FAIL`.

Exclude non-reviewable files from the review scope: binary files, lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`), and generated directories or outputs (`dist/`, `build/`, `.next/`, `coverage/`).

Exclude story artifacts and QA workflow files from the review scope because they are operational context, not story implementation: `_bmad-output/implementation-artifacts/`, `.opencode/agents//`.

If both committed diff and working-tree fallback return zero changed files, or if no reviewable changed files remain after exclusions, inspect the story scope before failing. If the story is explicitly investigation-only, documentation-only, or otherwise states that no implementation changes are expected, assess the acceptance criteria from the story artifact itself and return `GATE: PASS` when that evidence is complete. Otherwise return a short report with reason `no changes detected vs origin/main or working tree` and make the final line exactly `GATE: FAIL`.

Invoke the `#skill:bmad-code-review` skill now against the reviewable changed files and the story context.

If the skill invocation fails or returns no structured result, return a short report with the error message and make the final line exactly `GATE: FAIL`. Do not fabricate findings.

Gate result rules:

- Return `GATE: FAIL` if any acceptance criterion in the story document is unmet.
- Return `GATE: FAIL` if the review finds any blocking or high-severity issue.
- Return `GATE: FAIL` if new or changed code lacks corresponding tests.
- Report low-severity, medium-severity, or warning-only findings in the gate report, but do not fail on them unless they imply unmet acceptance criteria or missing tests.
- Otherwise return `GATE: PASS`.

Final output contract:

- Include a short structured gate report covering acceptance criteria, blocking issues, and test coverage.
- The final line of the response MUST be exactly `GATE: PASS` or `GATE: FAIL`.

Do not run `git commit` or `git push` under any circumstances in this prompt.
