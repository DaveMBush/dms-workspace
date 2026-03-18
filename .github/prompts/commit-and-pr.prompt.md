---
model: Claude Sonnet 4.5 (copilot)
---

- run `pnpm format`
- commit all existing changes and create a pull request. Do not reference Claude code in either the commit or the PR.
- Make sure you reference the github issue number in the PR so that when we merge the PR it will close the issue automatically.
- When drafting the PR description, do not include literal escape sequences like `\n`. Instead, write the summary as regular Markdown (paragraphs or bullet lists) derived from the story's "Change Log" section and repeat the testing steps under a "Testing" heading.

Write story metadata file (required)

After creating the PR, write a minimal, idempotent metadata file for the story at `.git/tmp/story-${story}-meta.json`. This file allows other subagents (CodeRabbit, epic orchestrator) to resume work without passing large prompt contexts. If your `gh` command returns JSON, capture the number; otherwise capture whichever PR id is available.

Suggested shell snippet (use in `run_in_terminal`):

```bash
# Resolve the shared git dir (works from both main repo and worktrees)
GIT_COMMON_DIR=$(git rev-parse --git-common-dir)
mkdir -p "$GIT_COMMON_DIR/tmp"

# Capture current worktree path
WORKTREE_PATH=$(pwd)

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
