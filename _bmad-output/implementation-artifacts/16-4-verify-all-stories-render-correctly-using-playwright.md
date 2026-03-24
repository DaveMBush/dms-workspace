# Story 16.4: Verify All Stories Render Correctly Using Playwright

Status: ready-for-dev

## Story

As a developer,
I want to use the Playwright MCP server to navigate to every story and confirm each one renders its component correctly,
So that I have actual visual confirmation that Storybook is working — not just that it builds.

## Acceptance Criteria

1. **Given** the Storybook dev server is running
   **When** I use the Playwright MCP server to navigate to each story in the sidebar
   **Then** each story displays its component visually (not a blank page, not an error screen)
   **And** no "Cannot destructure property 'id'" or similar runtime errors appear in the browser console for any story
   **And** no uncaught exceptions appear in the browser console for any story

2. **Given** I navigate to a component story with multiple variants (e.g., Default, Empty, Loading)
   **When** I switch between story variants
   **Then** each variant renders a different visual state of the component without errors

3. **Given** all stories pass visual verification
   **When** I document the results
   **Then** a brief verification summary is noted in `_bmad-output/implementation-artifacts/storybook-verification-16-4.md` confirming each story was checked

## Definition of Done

- [ ] Every story verified using Playwright MCP server — component renders visibly
- [ ] Zero console errors across all stories
- [ ] Multiple story variants verified where applicable
- [ ] Verification summary document created at `_bmad-output/implementation-artifacts/storybook-verification-16-4.md`
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Start Storybook dev server (AC: 1)
  - [ ] Run: `pnpm nx run dms-material:storybook`
  - [ ] Confirm server starts on port 6006 (default)
- [ ] Use Playwright MCP to open Storybook (AC: 1)
  - [ ] Navigate to `http://localhost:6006`
  - [ ] Confirm the sidebar loads with stories listed
  - [ ] Check browser console — zero errors on initial load
- [ ] Navigate to each story and verify rendering (AC: 1, 2)
  - [ ] For each component listed in the Storybook sidebar:
    - [ ] Click on the story name
    - [ ] Confirm the component renders visibly (not blank, not error screen)
    - [ ] Check browser console for errors
    - [ ] If multiple variants exist, switch between them and verify each
    - [ ] Take screenshot for record
- [ ] Check specifically for the historic error (AC: 1)
  - [ ] Confirm NO "Cannot destructure property 'id' of 'defaultExport' as it is undefined" appears
  - [ ] Confirm NO uncaught exceptions in console
- [ ] Document verification results (AC: 3)
  - [ ] Create `_bmad-output/implementation-artifacts/storybook-verification-16-4.md`
  - [ ] List each story checked, its status (pass/fail), and any notes
- [ ] Fix any failing stories found during verification (AC: 1)
  - [ ] Return to Story 16.3 if story files need corrections
  - [ ] Re-verify after fixes
- [ ] Run validation suite
  - [ ] `pnpm all`
  - [ ] `pnpm e2e:dms-material:chromium`
  - [ ] `pnpm e2e:dms-material:firefox`
  - [ ] `pnpm dupcheck`
  - [ ] `pnpm format`

## Dev Notes

### Why Playwright Verification Is Mandatory

Previous epics (8, 9) were closed as "done" based only on build success. Building without errors does NOT mean stories render correctly. The "Cannot destructure property 'id' of 'defaultExport' as it is undefined" error only manifests at runtime in the browser — only Playwright (or manual browser inspection) can catch it.

A story is only complete when a human (or Playwright) has seen the component visually rendered.

### Playwright MCP Workflow for Storybook

1. Start Storybook: `pnpm nx run dms-material:storybook`
2. Open browser via Playwright MCP to `http://localhost:6006`
3. Wait for sidebar to populate
4. For each sidebar item:
   - Click the story name
   - Wait for the iframe to load
   - Capture screenshot
   - Check console for errors using `mcp_microsoft_pla_browser_console_messages`

### Story URL Pattern

Individual stories are accessible at:
```
http://localhost:6006/?path=/story/<story-id>
```

Where `<story-id>` is derived from the `title` field in the Meta export, e.g., `title: 'Components/MyComponent'` → `components-mycomponent--default`.

### Success Criteria Per Story

A story is considered **passing** when:
- The component is visible in the Storybook canvas (not blank, not an error overlay)
- The browser console reports zero errors
- Any story variants also render without errors

### Verification Document Template

Create `storybook-verification-16-4.md` with this structure:

```markdown
# Storybook Story Verification — Epic 16

Date: <date>

## Results

| Story | Variants Checked | Status | Notes |
|-------|-----------------|--------|-------|
| Components/MyComponent | Default, Empty | ✅ Pass | - |
```

### Dependency Chain

- Depends on: Story 16.2 (Storybook configured) and Story 16.3 (stories created)
- This is the final verification gate for Epic 16

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-03-23.md#Story 16.4]
- [Source: _bmad-output/project-context.md#Technology Stack (E2E testing: Playwright 1.55.1)]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
