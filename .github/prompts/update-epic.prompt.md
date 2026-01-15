---
agent: qa
description: Update Epic to use TDD as a separate story.
argument-hint: epic=AD
model: Claude Sonnet 4.5 (copilot)
---

We need to create the stories for the Epic ${epic} but before we do, I'd like to tweak how we do stories. Historically, we've used Test First Development in the same story we implement the functionality. For each story that is an implementation, stick a TDD story before each of them.

At the close of the TDD story, disable the stories using skip and reenable them in the implementation story.
