---
description: 'Generate epics and stories from a planning file using bmad-create-epics-and-stories.md and bmad-create-story.md commands, then set all story statuses to Approved'
argument-hint: file=epics-2026-03-31.md
tools: { execute: true, read: true, agent: true, edit: true, 'context7/*': true, 'playwright/*': true, todo: true }
user-invocable: true
---

## Instructions

If `${file}` is not provided, is empty, or does not exist, stop and report the error to the user before invoking any skill.

### Epics

Use the command `@bmad-create-epics-and-stories.md`, passing `${file}` as the epic descriptions input. The skill must write its epics file to `_bmad-output/planning-artifacts/${file}`.

Each epic must have stories for unit tests, implementation, and e2e tests for every change that needs to be made and each story must be as small as possible while still being able to make it through our validation code (see .opencode/agents/quality-validation.agent.md). You must create unit tests before any of the changes you intend to make which we will mark with `skip.` before we commit the code and create the pull request.

If the skill fails, if the expected epics file is not present at `_bmad-output/planning-artifacts/${file}`, or if the resulting epics file contains zero stories, stop and report the failure. Do not proceed to story creation.

### Stories

Once that completes, iterate sequentially over each story metadata file generated for that epics run under `_bmad-output/planning-artifacts/story-meta/`, and invoke `bmad-create-story.md` with that story metadata file as input. If creation of an individual story fails, log the failure, continue with the remaining stories, and report all failures at the end. Remember to include the fact that unit test stories will `skip.` the unit tests prior to committing and issuing a pull request and that the implementation step will un-`skip.` them.

After each story is created, edit its status field to `Approved`.

After all stories are processed, output a summary listing each story file path and its final status, plus any failures.
