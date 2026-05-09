---
description: 'QA gate: invoke the bmad-code-review skill against changed files to verify acceptance criteria, code quality, and test coverage — returns PASS or FAIL'
argument-hint: story=3-3
model: Claude Sonnet 4.6 High (copilot)
tools: [read, search, mcp_bash/*]
user-invocable: false
---

## Code Exploration Rule

Before exploring source code structure, architecture, or relationships between components, **always read `graphify-out/GRAPH_REPORT.md` first** (if it exists). This pre-built graph answers "where is X", "what does Y do", and "how do X and Y relate" questions without reading individual source files. Only read source files directly when (a) reviewing specific changed code, (b) the graph lacks the needed detail, or (c) the graph is missing or stale.

# QA Gate for Story ${story}

Invoke the `bmad-code-review` skill to perform a comprehensive code review across all quality facets for the changes in this story.

Before invoking, read:

1. `_bmad-output/project-context.md`
2. `_bmad-output/implementation-artifacts/${story}.md` — acceptance criteria and story context

Use `git diff --name-only origin/main...HEAD` to identify the changed files and scope the review to only those files.

Invoke the `#skill:bmad-code-review` skill now.

Do not commit until gate result is evaluated by the calling workflow.
