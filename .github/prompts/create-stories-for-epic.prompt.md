---
agent: pm
description: Create stories from Epics that use TDD stories.
argument-hint: epic=AD
model: Claude Sonnet 4.5 (copilot)
---

Next we want to create the stories for epic ${epic} but before we do, we need to adjust the epic.

Originally, we had bundled the TDD unit tests with the implementation of the feature, that the story represented. This generally makes the story too large.

Instead, break the stories into TDD story, implementation story, and repeat for as many implementation stories as exist in the original epic.

In the TDD stories, in order to make the CI pass and allow us to merge, once you have a running "RED" test, disable the test and then in the implementation story reimplement it.

Make sure the Definition of Done for each story includes:

- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass
