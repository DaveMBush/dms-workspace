---
description: QA the result of story development.
argument-hint: story=AD.3
model: Claude Opus 4.6
---

# QA Gate for Story ${story}

Invoke the `bmad-code-review` skill to perform a comprehensive code review across all quality facets for the changes in this story.

Before invoking, read:

1. `_bmad-output/project-context.md`
2. `_bmad-output/implementation-artifacts/${story}.md` — acceptance criteria and story context

Use `git diff --name-only origin/main...HEAD` to identify the changed files and scope the review to only those files.

Invoke the `#skill:bmad-code-review` skill now.

Do not commit until gate result is evaluated by the calling workflow.

## Rate Limits

If GitHub Copilot rate limiting is detected or approached: (1) pause for at least 2 minutes before the next API call, (2) do not abort the task — resume from the last completed step after the pause, (3) prefer slow completion over fast failure.
