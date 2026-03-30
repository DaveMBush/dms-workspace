---
description: Update Epic to use TDD as a separate story.
argument-hint: epic=AD
model: Claude Opus 4.6
---

We need to create the stories for the Epic ${epic} but before we do, I'd like to tweak how we do stories. Historically, we've used Test First Development in the same story we implement the functionality. For each story that is an implementation, stick a TDD story before each of them.

At the close of the TDD story, disable the stories using skip and reenable them in the implementation story.

Also, most of our epics have and e2e test story at the end. Create a story just before the e2e test story that is a "bug fix" story that will allow me to verify that the story was implemented correctly and fix any issues that arise before we create the e2e tests.

All stories should be renumbered sequentially 1, 2, 3 etc.

Once you've done this, run #file:./create-stories-for-epic.prompt.md to create the stories for the epic.

## Rate Limits

To avoid GitHub Copilot rate limiting:
- Always wait for at least 2 minutes between terminal calls, calls to MCP servers, or code updates.
- Prefer slow completion over fast failure.
