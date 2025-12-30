We've been working on stories AA.1 through AF.1 I think the intention might have been to implement the components and tie them to the backend but that was not clear at the beginning so we've only implemented the components.

There are a number of things we need to do before we move on:

- We need to implement an import routine that can be accessed from the global/universe screen which will allow us to load the transactions from fidelity's application.
- We need to move and attach the code from the DMS app that connects the components to the server so that the DMS-MATERIAL app is functional. That is, we need to implement what was left out in stories AA.1 through AF.1
- We currently have backend code that checks to make sure the data for the risk groups have been created. I'm not sure where this is but it needs to be executed when we get the risk groups as part of the top route. I have reason to believe this is not occurring at this point.
- There are some minor GUI issues we need to address
- The order that we need to address the above backend integrations, fixes and additional features is as follows:
  1. Make sure the risk group data creation code is executed when we get the risk groups in the top route.
  2. Wire up the Account panel so we can add account and see them in the account list. Use existing logic from the DMS app.
  3. Wire up the Global/Screener refresh button. This is important because this is what populates the the Universe data which is what we use to get the bulk of the symbols we will be working with.
  4. Wire up the Global/Screener table using existing logic from the DMS app. We will move this to virtual scroll at a later time, right now we are only interested in getting the application functional.
  5. Wire up the Global/Universe update universe button. Using existing logic from the DMS app.
  6. Wire up the Global/Universe update fields button. Using existing logic from the DMS app.
  7. Wire up the Global/Universe add button. Using existing logic from the DMS app.
  8. Wire up displaying the data in the Global/Universe table using existing logic from the DMS app.
  9. Implement the import routine for fidelity transactions and wire it up to the global/universe screen.
     10.Wire up the Glocal/Summary screen using existing logic from the DMS app.
     11.Wire up the Account/Summary screen using existing logic from the DMS app.
     12.Wire up the Open Positions screen using the existing logic from the DMS app. Make sure to include the Add New Positions button functionality. And ensure that when the sell and sell date are filled in the position is closed and the row is removed from the open positions table.
     13.Wire up the Account/Sold Positions screen using existing logic from the DMS app.
     14.Wire up the Account/Dividends & Depositions screen using existing logic from the DMS app.
     15.Ensure that when we select a different account from the account list, all the account specific screens update to reflect the newly selected account.
     16.Make sure the selected button for the Global items (Screener/Universe/Summary) and the accounts list is persisted when after refreshing the screen with the browser refresh functionality. Just like in the DMS app, the selected button should be blue when it is the currently selected item.
     17.There is sorting that has not been implemented in several of the tables (Global/Universe, Account/Open Positions, Account/Sold Positions) that I would like to leave until after we've implemented virtual scrolling because it will need to be implemented on the server instead of the client like it is now.
     18.Finally implement Virtual Scrolling for all the tables and implement the sorting and filtering to work with virtual scrolling on the server.

Be sure to use Test Driven Development (TDD) practices as you implement these features. Write unit tests for each new piece of functionality to ensure reliability and maintainability of the codebase.

Be sure to update e2e tests as you go to cover the enhanced functionality and ensure that all user flows are properly tested.

Always make sure to double check your work by:

- Running all unit tests and ensuring they pass.
- Running all e2e tests and ensuring they pass.
- Using the Playwright MPC to verify that the UI behaves as expected and that there are no console errors being displayed.

Start the Epics for these changes at AG and move the current AG epics and related stories to after this series of changes.

Make sure each story is small enough that you can keep track of your progress and complete them without loosing track of what you are doing.

**Critical:** If you have any questions about what we are trying to accomplish here, please ask before proceeding. We want to make sure we are all on the same page before moving forward.

**Critical:** Keep in mind that all unit and end to end tests must pass before we can close the story. What this means in practical terms is that you can't spit the TDD unit tests from the implementation but you may split the e2e tests from the implementation as a separate story if needed.

---

## Implementation Status

**Date**: December 25, 2025
**Completed By**: John (Product Manager)

### Epics Created

Created 18 new epics (AG through AX) covering all 18 items in the implementation plan:

- ✅ Epic AG: Risk Group Data Initialization
- ✅ Epic AH: Wire Account Panel
- ✅ Epic AI: Wire Screener Refresh
- ✅ Epic AJ: Wire Screener Table
- ✅ Epic AK: Wire Universe Update Button
- ✅ Epic AL: Wire Universe Update Fields
- ✅ Epic AM: Wire Universe Add Symbol
- ✅ Epic AN: Wire Universe Table Display
- ✅ Epic AO: Fidelity Transaction Import
- ✅ Epic AP: Wire Global Summary
- ✅ Epic AQ: Wire Account Summary
- ✅ Epic AR: Wire Open Positions
- ✅ Epic AS: Wire Sold Positions
- ✅ Epic AT: Wire Dividends & Deposits
- ✅ Epic AU: Account Selection Updates
- ✅ Epic AV: Persist Selected Button
- ✅ Epic AW: Server-Side Sorting
- ✅ Epic AX: Virtual Scrolling

### Detailed Stories Created

- ✅ Story AG.1: Integrate risk group validation into top route (Full TDD template)
- ✅ Story AH.1: Wire account list to backend via SmartNgRX (Full TDD template)

### Additional Documentation

- ✅ Created [NEW-EPICS-STORIES-SUMMARY.md](NEW-EPICS-STORIES-SUMMARY.md) - Comprehensive overview of all epics, stories, dependencies, and implementation guidance

### Next Actions Required

1. **Rename Old Epic AG**: The existing `epic-ag-testing-polish-validation.md` needs to be renamed to a later letter (e.g., `epic-ay-testing-polish-validation.md`) along with all its story references

2. **Create Remaining Detailed Stories**: Expand the story outlines within each epic into full story documents following the AG.1/AH.1 template

3. **Begin Implementation**: Start with Epic AG, following the dependency chain shown in the summary document

### Reference Documents

- Epic definitions: `docs/backlog/epic-ag-*.md` through `epic-ax-*.md`
- Story details: `docs/stories/AG.1.*.md`, `docs/stories/AH.1.*.md`
- Implementation guide: `docs/NEW-EPICS-STORIES-SUMMARY.md`
