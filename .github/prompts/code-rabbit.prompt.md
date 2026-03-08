````prompt
---
description: Handle CodeRabbit review loop for a story PR
agent: dev
argument-hint: story=AD.3
model: Claude Sonnet 4.6 (copilot)
---

# CodeRabbit Review Loop Subagent

**IMPORTANT**: This subagent uses the bmad-workflow skill. Read and apply:
- run #file:./bmad-workflow.SKILL.md

Key points from bmad-workflow skill:
- **Human Interaction**: Use `prompt.sh` with `timeout: 0` (no timeout)
- **CodeRabbit Review Loop**: Follow the pattern in the skill for polling, evaluating, fixing
- **Quality Validation**: Run full validation loop after applying fixes
- **State Files**: Read and update `.git/tmp/story-${story}-meta.json`

This subagent implements Phase 6 (CodeRabbit review loop). It is intentionally small and stateful so it can be re-invoked and resumed.

INPUT: `story` (required). Reads the story metadata file for PR metadata. Resolve the path via:
```bash
GIT_COMMON_DIR=$(git rev-parse --git-common-dir)
META_FILE="$GIT_COMMON_DIR/tmp/story-${story}-meta.json"
```
If that file is missing, use `prompt.sh` with `timeout: 0` to ask for help.

**IMPORTANT**: After reading the state file, cd into `worktreePath` (from the state file) before applying any code fixes or running validations. All git operations must be executed from within that worktree directory.

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

**Follow the "CodeRabbit Review Loop Pattern" from bmad-workflow skill exactly.**

Key steps:
1. Resolve `GIT_COMMON_DIR=$(git rev-parse --git-common-dir)` and read `$GIT_COMMON_DIR/tmp/story-${story}-meta.json` into local state; then `cd` to `worktreePath` from that state
2. Loop while `attempt < maxIterations` (increment and persist immediately)
3. Poll `mcp_github_pull_request_read` with `method: "get_review_comments"` every 30s (10 min timeout)
4. If no suggestions: proceed to merge checks
5. If suggestions: classify (valid/invalid, in-scope/out-of-scope), use Context7/Playwright for verification
6. Apply valid in-scope fixes, run full quality validation loop (see skill)
7. Commit "Apply CodeRabbit suggestions", push, wait 5 minutes, continue loop
8. Update state file with final status when complete

Error handling: Use `prompt.sh` with `timeout: 0` for any unexpected failures or max iterations.

Notes:
- Use state file to avoid passing large context
- Make operations idempotent: re-running should continue safely
- All detailed instructions are in the "CodeRabbit Review Loop Pattern" section of bmad-workflow skill

````
