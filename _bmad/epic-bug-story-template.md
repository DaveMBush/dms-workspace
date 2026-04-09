# Bug Story Template for BMAD Epics

Whenever you add a new bug to your epic, copy and fill out this template in your story file:

---

## Bug Title: [Short summary of the bug]

**Status:** Draft

### Steps to Reproduce (Automate with Playwright)
1. [Step 1]
2. [Step 2]
3. ...

### Expected Result
- [Describe what should happen]

### Actual Result
- [Describe what actually happens]

### Acceptance Criteria
- [ ] Playwright E2E test reproduces the bug (should fail before fix)
- [ ] Unit test covers the root cause (should fail before fix)
- [ ] Bug is fixed
- [ ] Both tests pass after fix
- [ ] QA Automation skill run to ensure coverage

### Implementation Checklist
- [ ] Add failing Playwright E2E test
- [ ] Add failing unit test
- [ ] Fix the bug
- [ ] Ensure both tests pass
- [ ] Run `bmad-qa-generate-e2e-tests` for extra coverage
- [ ] Code review (`bmad-code-review`)

---

**BMAD Workflow Steps:**
1. Create Story (`bmad-create-story`)
2. Validate Story (`bmad-create-story`)
3. Dev Story (`bmad-dev-story`)
4. QA Automation Test (`bmad-qa-generate-e2e-tests`)
5. Code Review (`bmad-code-review`)
6. Retrospective (`bmad-retrospective`, optional)

---

> **Tip:** Never mark a bug story as "done" unless both the Playwright E2E and unit test pass after the fix.
