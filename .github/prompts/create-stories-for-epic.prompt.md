---
agent: qa
description: Create stories from Epics that use TDD stories.
argument-hint: epic=AD
model: Claude Sonnet 4.5 (copilot)
---

Now, create the stories. In order to make the CI pass and allow us to merge, once you have a running "RED" test, disable the test and then in the implementation story reimplement it.

Make sure the Definition of Done for each story includes:

- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass
