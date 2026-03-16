# State File Management

For workflows that can be resumed (epic orchestration, CodeRabbit loops), maintain minimal state files.

## Story Metadata File

Location: `$(git rev-parse --git-common-dir)/tmp/story-${story}-meta.json`

Required fields:

```json
{
  "pr": 123,
  "branch": "feat/story-AD.3",
  "repo": "owner/repo",
  "worktreePath": "../dms/story-AD.3",
  "attempt": 0,
  "maxIterations": 10,
  "merged": false,
  "mergedAt": null
}
```

**IMPORTANT — state file path in worktrees**: When running from inside a git worktree, `.git` is a pointer file rather than a directory. Always resolve the shared git directory using:

```bash
GIT_COMMON_DIR=$(git rev-parse --git-common-dir)
mkdir -p "$GIT_COMMON_DIR/tmp"
```

Then write/read state files at `"$GIT_COMMON_DIR/tmp/story-${story}-meta.json"` (not `.git/tmp/`) so all subagents share the same location regardless of which worktree they run from.

## Epic Aggregation File

Location: `$(git rev-parse --git-common-dir)/tmp/epic-${epic}-stories.json`

Format:

```json
[
  {
    "story": "AD.1",
    "pr": 101,
    "branch": "feat/story-AD.1",
    "merged": true,
    "mergedAt": "2025-03-01T10:30:00Z"
  }
]
```

## State File Best Practices

- Write state files immediately after creating PRs or branches
- Update state files after each significant milestone
- Use state files to resume workflows without re-passing large prompt contexts
- If state file missing or malformed: Call `prompt.sh` to ask for repair instructions
- Make operations idempotent: re-running should re-read state and continue safely

# Rate Limit Protection

To avoid CodeRabbit API rate limiting:

- Wait 5 minutes after initial PR creation before checking CodeRabbit status
- Wait 5 minutes after each CodeRabbit fix commit before checking again
- Total workflow may take 50+ minutes if all CodeRabbit iterations are used
