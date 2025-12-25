# Epic AH: Wire Up Account Panel for Add/Edit/Delete Operations

## Epic Goal

Enable users to add, edit, and delete accounts in the RMS-MATERIAL application by connecting the UI to existing backend services.

## Epic Description

**Existing System Context:**

- RMS app has full account CRUD functionality
- RMS-MATERIAL has UI components but no backend integration
- Account management is foundational for all account-specific features

**Enhancement Details:**

- Wire account list component to account effect service
- Implement add account dialog/inline editing
- Connect edit and delete operations
- Ensure SmartNgRX signal updates work properly

**Success Criteria:**

- Users can add new accounts
- Users can edit account names
- Users can delete accounts
- Account list updates reactively

## Stories

1. **Story AH.1:** Wire account list to backend via SmartNgRX
2. **Story AH.2:** Implement add account functionality with inline editing
3. **Story AH.3:** Implement edit account name functionality
4. **Story AH.4:** Implement delete account functionality
5. **Story AH.5:** Add unit tests for account operations
6. **Story AH.6:** Add e2e tests for account CRUD operations

## Dependencies

- Epic AG (Risk group initialization)

## Priority

**High** - Required for account-specific screens

## Estimated Effort

3-4 days

## Definition of Done

- [ ] All account CRUD operations functional
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] UI matches RMS app behavior
- [ ] All linting passes
