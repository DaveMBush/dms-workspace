---
description: 'Generate epics and stories from a planning file using bmad-create-epics-and-stories.md and bmad-create-story.md commands, then set all story statuses to Approved'
argument-hint: file=epics-2026-03-31.md
tools: {execute: true, read: true, agent: true, edit: true, 'context7/*': true, 'playwright/*': true, todo: true}
user-invocable: true
---

## Instructions

If `${file}` is not provided, is empty, or does not exist, stop and report the error to the user before invoking any skill.

Use the agent tool to invoke the `#skill:bmad-create-epics-and-stories` skill, passing `${file}` as the epic descriptions input. The skill must write its epics file to `_bmad-output/planning-artifacts/${file}`.

If the skill fails, if the expected epics file is not present at `_bmad-output/planning-artifacts/${file}`, or if the resulting epics file contains zero stories, stop and report the failure. Do not proceed to story creation.

Once that completes, iterate sequentially over each story metadata file generated for that epics run under `_bmad-output/planning-artifacts/story-meta/`, and invoke `#skill:bmad-create-story` with that story metadata file as input. If creation of an individual story fails, log the failure, continue with the remaining stories, and report all failures at the end.

After each story is created, edit its status field to `Approved`.

After all stories are processed, output a summary listing each story file path and its final status, plus any failures.
