# Epic AG & AH Completion Summary (Updated with Proper TDD)

## Status: COMPLETE ✅ (Restructured for Proper TDD)

All stories for Epic AG (Risk Group Data Initialization) and Epic AH (Wire Account Panel) have been created and restructured to follow proper TDD practices.

## Epic AG: Risk Group Data Initialization

**Status:** 2/2 stories complete (reduced from 3)

1. **AG.1** - Integrate risk group validation into top route **WITH comprehensive unit tests** ✅
2. **AG.2** - Add E2E tests verifying risk groups load across navigation ✅

**Change:** Merged unit test story (old AG.2) into AG.1's TDD Step 1, following proper TDD practice of writing comprehensive tests BEFORE implementation.

## Epic AH: Wire Account Panel to Backend

**Status:** 5/5 stories complete (reduced from 6)

1. **AH.1** - Wire account list to SmartNgRX backend **WITH comprehensive unit tests** ✅
2. **AH.2** - Implement add account functionality **WITH comprehensive unit tests** ✅
3. **AH.3** - Implement edit account name **WITH comprehensive unit tests** ✅
4. **AH.4** - Implement delete account **WITH comprehensive unit tests** ✅
5. **AH.5** - Add E2E tests for account CRUD workflows ✅

**Change:** Deleted separate unit test story (old AH.5). Each CRUD operation story (AH.1-4) now includes comprehensive unit tests in its TDD Step 1.

## Key Improvement: Proper TDD Structure

### Problem Fixed

- **Before:** Had separate "comprehensive unit tests" stories AFTER implementation
- **After:** Each implementation story includes comprehensive unit tests in TDD Step 1

### Why This Matters

- **Follows TDD:** Tests written BEFORE implementation, not after
- **Prevents gaps:** No deferring comprehensive testing to later story
- **True scope:** Each story's complexity visible upfront
- **Better quality:** >80% coverage required from the start

### When Tests Are Separate Stories

✅ **E2E tests** - Different scope (integrated system), different tools (Playwright), slower execution
❌ **Unit tests** - Same scope as implementation, same tools (Vitest), part of TDD cycle

## Story Template Compliance

All stories include the required 8 sections:

1. ✅ **Story** - User story format
2. ✅ **Context** - Current system and migration target
3. ✅ **Acceptance Criteria** - Functional and technical requirements
4. ✅ **Test-Driven Development Approach** - 5-step TDD process
5. ✅ **Technical Approach** - Implementation details and file changes
6. ✅ **Files Modified** - Table of changed files
7. ✅ **Definition of Done** - Complete checklist with validation commands
8. ✅ **Notes** - Implementation guidance

## Validation Commands

All stories include the required validation commands section:

```bash
- Run `pnpm all`
- Run `pnpm e2e:dms-material`
- Run `pnpm dupcheck`
- Run `pnpm format`
- Repeat all of these if any fail until they all pass
```

## Next Steps

Ready to proceed with remaining epics (AI through AX) on-demand as requested by the user.

### Epic Priority Order

Based on dependencies in NEW-EPICS-STORIES-SUMMARY.md:

- **Epic AI** - Wire Screener Refresh (depends on AH)
- **Epic AJ** - Wire Universe to Backend (depends on AI)
- **Epic AK** - Wire Positions to Backend (depends on AJ)
- **Epic AL** - Wire Import Trades Dialog (depends on AK)
- **Epic AM-AX** - Summaries, persistence, sorting, virtual scrolling

## Story Creation Notes

- Stories follow DMS app patterns closely
- All use SmartNgRX Signals for state management
- **All include comprehensive unit tests in TDD Step 1 (>80% coverage)**
- All reference Material Design components
- E2E tests are separate final story per epic (Playwright verification)
- Unit tests and implementation are in same story (proper TDD)

## Template Pattern for Future Epics

### Implementation Stories (e.g., AI.1, AI.2, etc.)

- TDD Step 1: Write COMPREHENSIVE unit tests (not stubs)
  - Success paths + failure paths + edge cases
  - > 80% coverage target
  - All dependencies mocked
- TDD Steps 2-5: Run, implement, verify

### E2E Test Stories (e.g., AI.3)

- Separate story at end of epic
- Tests integrated system end-to-end
- Uses Playwright
- Verifies all epic stories working together

**Created:** December 25, 2025
**PM Agent:** John (BMad PM)
