---
description: 'Format code with pnpm format, commit all staged changes, create a GitHub PR linked to the story issue, and write the story metadata file'
model: Claude Sonnet 4.6 High (copilot)
tools: [read, edit, mcp_bash/*, mcp_github/*]
user-invocable: false
---

Shell execution rule: use the bash MCP server for every shell command in this prompt. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only when a background process is truly required. This applies to `pnpm`, `git`, `gh`, `bash`, and helper scripts.

- Resolve working directory: if a `WORKTREE_PATH:` line appears at the top of this prompt, use that value as `WORKTREE_PATH`. Otherwise resolve it with:
  WORKTREE_PATH=$(pwd)

- run `pnpm format` using the bash mcp server to auto-format any files that need it before committing:

```
mcp_bash_run({ command: "pnpm format", cwd: "${WORKTREE_PATH}", timeout: 0 })
```

- commit all existing changes and create a pull request. Do not reference Claude code in either the commit or the PR.
- Make sure you reference the github issue number in the PR so that when we merge the PR it will close the issue automatically.
- When drafting the PR description, do not include literal escape sequences like `\n`. Instead, write the summary as regular Markdown (paragraphs or bullet lists) derived from the story's "Change Log" section and repeat the testing steps under a "Testing" heading.

Write story metadata file (required)

After creating the PR, write a minimal, idempotent metadata file for the story at `.git/tmp/story-${story}-meta.json`. This file allows other subagents (CodeRabbit, epic orchestrator) to resume work without passing large prompt contexts. If your `gh` command returns JSON, capture the number; otherwise capture whichever PR id is available.

Suggested bash MCP script (pass this content to `mcp_bash_run` with `cwd` set to `${WORKTREE_PATH}`):

```bash
# Resolve the shared git dir (works from both main repo and worktrees)
GIT_COMMON_DIR=$(git rev-parse --git-common-dir)
mkdir -p "$GIT_COMMON_DIR/tmp"

# get PR number from gh (adjust flags if you create PR differently)
PR_NUMBER=$(gh pr create --fill --base main --head "${branch}" --json number -q .number)

# fallback if gh didn't return JSON
if [ -z "$PR_NUMBER" ]; then
	PR_NUMBER=$(gh pr view --json number -q .number || echo "")
fi

# get repo owner/name
REPO_NAME=$(gh repo view --json nameWithOwner -q .nameWithOwner)

cat > "$GIT_COMMON_DIR/tmp/story-${story}-meta.json" <<EOF
{
	"pr": ${PR_NUMBER:-null},
	"branch": "${branch}",
	"repo": "${REPO_NAME}",
	"worktreePath": "${WORKTREE_PATH}",
	"attempt": 0,
	"maxIterations": 10
}
EOF

echo "WROTE $GIT_COMMON_DIR/tmp/story-${story}-meta.json"
```
