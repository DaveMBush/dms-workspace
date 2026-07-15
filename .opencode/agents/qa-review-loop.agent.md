---
description: 'QA review and remediation loop: run the gate up to 10 times, auto-apply fixes using Context7 and Playwright, re-validate after each fix until the gate passes'
argument-hint: story=3-3
tools: { execute: true, read: true, agent: true, edit: true, 'context7/*': true, 'playwright/*': true, todo: true }
agents: [gate, quality-validation]
user-invocable: false
---

## Dedicated QA Review Loop

Run this prompt from the story worktree that contains the implementation under review.

### Purpose

This prompt exists to run the full QA gate, remediation, and re-validation cycle in a **fresh subagent context** so the parent story workflow does not accumulate QA findings, fix attempts, and validation output.

### Required Startup Context

Before doing anything else, read all of the following:

1. `_bmad-output/project-context.md`
2. `.opencode/agents//gate.agent.md`
3. `.opencode/agents//quality-validation.agent.md`

If any required startup file is missing or unreadable, return `QA FAILED: missing required context file <path>` immediately without running the gate.

### Execution Rules

1. If `${story}` is empty or does not match `[0-9]+-[0-9]+`, ask for guidance before starting the loop. If no corrected valid story id is provided, return `QA FAILED: invalid story id`.
2. If a `WORKTREE_PATH:` line appears at the top of this prompt, use that value as the `cwd` for all bash MCP calls. Otherwise use the current working directory.
3. Use the bash MCP server for every shell command in this workflow. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, and `bash`.
4. Maintain one global gate-attempt counter for the entire workflow with a maximum of 10 attempts. This counter never resets after re-validation passes. Also track `consecutive_gate_errors`, `consecutive_validation_failures`, and a `fix_summary` list with entries marked `applied`, `deferred`, or `failed`.
5. Execute this state machine with the single global gate-attempt counter:

   - For each gate attempt from 1 through 10, call the `runSubagent` tool with:
     - `description`: `"QA gate for story ${story}"`
     - `prompt`: Prepend `WORKTREE_PATH: <WORKTREE_PATH>` and `Use this path as the cwd for all bash MCP calls.` then read the full contents of `.opencode/agents//gate.agent.md` and append them verbatim, substituting `${story}` with the actual story ID.
   - If the final line is exactly `GATE: PASS`, return immediately with `QA PASSED`.
   - If the final line is exactly `GATE: FAIL`, continue to remediation and then re-validation within the same attempt.
   - If the gate returns anything else, treat that as `ERROR/UNKNOWN` for this attempt.

6. Interpret `ERROR/UNKNOWN` gate results exactly as follows:

   - Log the raw response, count it as a failed gate attempt, increment `consecutive_gate_errors`, and continue to the next gate attempt.
   - If `consecutive_gate_errors` reaches 3, report the issue summary and ask how to proceed. After that, return `QA FAILED: repeated gate errors`.

7. When the gate returns `GATE: FAIL`, apply QA remediation automatically as follows:

   - If the gate response contains a `recommendations[]` array, treat each element as one remediation item.
   - Otherwise treat each explicit finding or recommendation in the gate report body as one remediation item.
   - If a remediation item is clearly actionable and does not conflict with another item, apply it automatically using the appropriate edit or bash MCP tools.
   - If a recommendation lacks enough detail to auto-apply, requires architectural judgment, or conflicts with another recommendation, skip it, record it in `fix_summary` as `deferred`, and continue with the remaining items.
   - If a remediation step uses `mcp_bash_run` and the command exits non-zero, capture stderr, abort only that remediation item, record it in `fix_summary` as `failed`, and continue with remaining items.
   - For findings tagged `category: api`, or findings that explicitly describe API or library misuse, use Context7 documentation for the referenced library before applying the fix.
   - For findings tagged `category: ui`, or findings that explicitly describe UI behavior, use Playwright to inspect or verify the behavior before applying the fix.

8. After applying remediation items, call the `runSubagent` tool with:

   - `description`: `"Validation for story ${story} after QA fixes"`
   - `prompt`: Prepend `WORKTREE_PATH: <WORKTREE_PATH>` and `Use this path as the cwd for all bash MCP calls.` then read the full contents of `.opencode/agents//quality-validation.agent.md` and append them verbatim, replacing every occurrence of the literal token `${context}` with `story-${story}-qa`.

9. Interpret the re-validation result exactly as follows:

   - If the result is `VALIDATION PASSED`, reset `consecutive_validation_failures` to 0 and continue to the next gate attempt without resetting the global gate-attempt counter.
   - If the result is `VALIDATION FAILED: <reason>`, or if validation returns empty output, timeout, tool error, or malformed content, count it as a failed gate attempt, log the raw response, and increment `consecutive_validation_failures`.
   - If `consecutive_validation_failures` reaches 3, report the validation failure summary and ask how to proceed. After that completes, return `QA FAILED: repeated validation failures`.
   - Otherwise continue to the next gate attempt.

10. If the workflow reaches 10 failed gate attempts without returning `QA PASSED`, report the issue summary and ask how to proceed. After that completes, return `QA FAILED: max_attempts_reached` immediately to the caller.
11. Do not ask for confirmation on success; return control immediately to the caller.

### Completion Contract

Return a concise summary containing:

- `story`: `${story}`
- `status`: `QA PASSED` or `QA FAILED`
- gate attempts used
- brief summary of fixes applied during QA remediation, including `applied`, `deferred`, and `failed` items
- whether re-validation was required

If the QA loop exhausts its retries or hits a required escalation threshold, prompt the user for guidance. If that fails, then return `QA FAILED: <reason>` immediately to the caller.
