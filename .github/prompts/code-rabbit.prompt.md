````prompt
---
description: Handle CodeRabbit review loop for a story PR
argument-hint: story=AD.3
model: Claude Opus 4.6
---

# CodeRabbit Review Loop Subagent

This subagent implements Phase 6 (CodeRabbit review loop). It is intentionally small and stateful so it can be re-invoked and resumed.

Shell execution rule: every shell command in this workflow must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, `bash`, and `.github/prompts/prompt.sh`.

INPUT: `story` (required). Reads the story metadata file for PR metadata. Resolve the path via:
```bash
GIT_COMMON_DIR=$(git rev-parse --git-common-dir)
META_FILE="$GIT_COMMON_DIR/tmp/story-${story}-meta.json"
```
If that file is missing, use `prompt.sh` through the bash MCP server with `timeout: 0` to ask for help.

**IMPORTANT**: After reading the state file, use `worktreePath` (from the state file) as the `cwd` for bash MCP calls before applying any code fixes or running validations. All git operations must be executed from within that worktree directory.

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

**CodeRabbit Review Loop:**

Key steps:

1. Resolve `GIT_COMMON_DIR=$(git rev-parse --git-common-dir)` and read `$GIT_COMMON_DIR/tmp/story-${story}-meta.json` into local state; then use `worktreePath` from that state as the `cwd` for subsequent bash MCP calls

2. Look at the current PR's CI pipeline status and verify that is succeeded.

**IMPORTANT**:
If the PR CI pipeline is still running, wait and re-check every 120s (with a max timeout of 30 min). If it fails, look at the pipeline for the failure and fix the issue(s) before proceeding.

3. Loop while `attempt < maxIterations` (increment and persist immediately)
4. Poll `mcp_github_pull_request_read` with `method: "get_review_comments"` every 240s (10 min timeout)
5. If no suggestions: proceed to merge checks
6. If suggestions: classify (valid/invalid, in-scope/out-of-scope), use Context7/Playwright for verification
7. Apply valid in-scope fixes, then run full quality validation:
   ```bash
   run #file:./quality-validation.prompt.md context=story-${story}-cr
   ```
8. Commit "Apply CodeRabbit suggestions", push, wait 5 minutes, continue loop
9. Update state file with final status when complete

Error handling: Use `prompt.sh` through the bash MCP server with `timeout: 0` for any unexpected failures or max iterations.

Notes:
- Use state file to avoid passing large context
- Make operations idempotent: re-running should continue safely
- All detailed instructions are in the "CodeRabbit Review Loop Pattern" section of bmad-workflow skill

## Rate Limits

To avoid GitHub Copilot rate limiting:

**CRITICAL**: Always wait for at least 2 minutes between terminal calls, calls to MCP servers, or code updates.
- Prefer slow completion over fast failure.

````
