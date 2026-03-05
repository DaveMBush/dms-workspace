````prompt
---
description: Handle CodeRabbit review loop for a story PR
agent: dev
argument-hint: story=AD.3
model: Claude Sonnet 4.6 (copilot)
---

# CodeRabbit Review Loop Subagent

This subagent implements Phase 6 (CodeRabbit review loop). It is intentionally small and stateful so it can be re-invoked and resumed.

INPUT: `story` (required). Reads `.git/tmp/story-${story}-meta.json` for PR metadata. If that file is missing, call `.github/prompts/prompt.sh "Missing meta file for story ${story}. Create or repair?"` via `run_in_terminal` and handle response.

State file format (example):

```json
{
  "pr": 123,
  "branch": "feat/story-AD.3",
  "repo": "owner/repo",
  "attempt": 0,
  "maxIterations": 10
}
```

Behavior (concise):

1. Read `.git/tmp/story-${story}-meta.json` into local state. If `attempt` missing, default to `0`.
2. Loop while `attempt < maxIterations`:
   - Increment `attempt` and persist state immediately.
   - Call `activate_repository_inspection_tools` to enable `mcp_github_pull_request_read`.
   - Poll `mcp_github_pull_request_read` with `method: "get_review_comments"` for the PR in state every 30s until CodeRabbit review completes or timeout (10 minutes). A review is considered complete when no returned comment bodies contain the phrases `Currently processing` or `review in progress`.
   - If timeout: call `.github/prompts/prompt.sh "CodeRabbit review timed out after 10 minutes for PR ${state.pr}"` via `run_in_terminal` and handle the response.
   - If no inline suggestions: proceed to merge checks and finalize — break loop.
   - If suggestions exist: classify each suggestion (valid/invalid, in-scope/out-of-scope). For API suggestions use `mcp_context7_query-docs` as needed; for UI suggestions use Playwright spot checks.
   - For valid + in-scope suggestions: apply fixes (create commits). After applying fixes, run Phase 3 validations (run `pnpm all`, `pnpm e2e:dms-material:chromium`, `pnpm e2e:dms-material:firefox`, `pnpm dupcheck`, `pnpm format`). If any validation fails, retry fix attempts up to configured limits; on repeated failure call `prompt.sh`.
   - After fixes and validation pass: commit changes with message `Apply CodeRabbit suggestions`, push, wait 5 minutes, then continue next iteration (go to top of loop).

3. If loop completes with no suggestions outstanding: verify PR mergeable (CI green, no conflicts, issue linked). If ready, perform `gh pr merge ${state.pr} --squash --delete-branch` or instruct `prompt.sh` if auto-merge fails.

4. Update `.git/tmp/story-${story}-meta.json` with final status: `{ "pr": ..., "merged": true, "mergedAt": "<ts>", "filesChanged": <n> }`.

Error handling and human interaction:
- On any unexpected failure or after max iterations exhausted, call `bash .github/prompts/prompt.sh "CodeRabbit loop for ${story} failed: <short reason>"` via `run_in_terminal` and follow the returned instruction (`continue`/`stop`/custom).

Notes:
- This subagent must use the small state file to avoid passing large context between subagents.
- Make operations idempotent: re-running should re-read state and continue safely.

````
