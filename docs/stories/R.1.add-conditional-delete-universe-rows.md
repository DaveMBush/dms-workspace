# Story R.1: Add Conditional Delete Button for Unused Universe Rows

## Status

Ready for Review

## Story

**As a** trader using the RMS system,
**I want** to be able to delete non-CEF universe entries that aren't being used by any trades,
**so that** I can maintain a clean trading universe and remove symbols I no longer need.

## Acceptance Criteria

1. Delete button appears at the end of universe table rows only for non-CEF symbols (is_closed_end_fund = false)
2. Delete button only displays for symbols that have no associated trades in the trades table
3. Clicking delete button shows confirmation dialog before proceeding
4. Successful deletion removes the row from both UI and database
5. CEF symbols (is_closed_end_fund = true) never show delete button regardless of trade usage
6. Symbols with associated trades never show delete button regardless of CEF status
7. Error handling provides clear feedback if deletion fails
8. UI updates immediately after successful deletion without requiring page refresh

## Tasks / Subtasks

- [x] **Task 1: Add delete button column to template** (AC: 1, 2, 5, 6)

  - [x] Add new header column for delete actions in global-universe.component.html
  - [x] Add delete button cell in body template with conditional display
  - [x] Implement conditional logic: `!row.is_closed_end_fund && row.position === 0`
  - [x] Style delete button consistently with existing UI patterns

- [x] **Task 2: Create delete confirmation dialog** (AC: 3)

  - [x] Add p-dialog component for delete confirmation
  - [x] Include symbol name in confirmation message for clarity
  - [x] Handle dialog accept/cancel actions appropriately
  - [x] Show appropriate warning about permanent deletion

- [x] **Task 3: Implement delete method in component** (AC: 4, 7, 8)

  - [x] Add deleteUniverse method to global-universe.component.ts
  - [x] Call universe delete service/API endpoint
  - [x] Handle success and error responses appropriately
  - [x] Update UI signals to reflect deletion
  - [x] Display toast messages for success/error feedback

- [x] **Task 4: Create backend delete API endpoint** (AC: 4, 6, 7)

  - [x] Add DELETE endpoint to universe routes
  - [x] Implement business rule validation (non-CEF, no trades)
  - [x] Check for referential integrity before deletion
  - [x] Return appropriate error messages for validation failures
  - [x] Handle database deletion transaction safely

- [x] **Task 5: Add comprehensive testing** (AC: 1-8)
  - [x] Test conditional button display logic
  - [x] Test confirmation dialog behavior
  - [x] Test successful deletion flow
  - [x] Test error cases (CEF, has trades, API errors)
  - [x] Test UI updates after deletion

## Dev Notes

### Current Universe Screen Analysis

**Template Structure (global-universe.component.html):**

- Table with multiple columns ending at "Expired" (line 252)
- No delete button currently exists
- Need to add new header and body column after "Expired"

**Component Logic (global-universe.component.ts):**

- Uses signals-based architecture with computed values
- Has existing methods for syncing and updating universe
- Uses GlobalUniverseStorageService and UniverseDataService
- Toast notifications already integrated via MessageService

**Data Structure (universe.interface.ts):**

- `is_closed_end_fund: boolean` - Key field for business logic
- `position: number` - Indicates if symbol has active trades
- `id: string` - Primary key for deletion operations

### Business Logic Implementation

**Conditional Display Logic:**

```typescript
shouldShowDeleteButton(row: Universe): boolean {
  return !row.is_closed_end_fund && row.position === 0;
}
```

**Position Field Analysis:**

- `position: number` likely represents current open position quantity
- If `position === 0`, then no open trades exist for this symbol
- This is the business rule indicator for "unused" symbols

### Template Implementation Pattern

**Header Addition:**

```html
<th>Actions</th>
<!-- Add after line 189 -->
```

**Body Addition:**

```html
<td class="text-center">
  @if (shouldShowDeleteButton(row)) {
  <p-button icon="pi pi-trash" severity="danger" size="small" (onClick)="confirmDelete(row)" pTooltip="Delete unused symbol" tooltipPosition="top" />
  }
</td>
```

### Backend API Requirements

**Endpoint:** `DELETE /api/universe/:id`

**Validation Logic:**

1. Check if universe entry exists
2. Verify `is_closed_end_fund = false`
3. Query trades table for any references to this universe_id
4. If trades exist, return validation error
5. If validations pass, delete from universe table

**Expected Response:**

```typescript
// Success: 200
{ success: true, message: "Symbol deleted successfully" }

// Error: 400
{ success: false, error: "Cannot delete CEF symbols" }
{ success: false, error: "Cannot delete symbols with active trades" }
```

### Source Tree Information

**Affected Files:**

- `apps/rms/src/app/global/global-universe/global-universe.component.html` - Add delete button column
- `apps/rms/src/app/global/global-universe/global-universe.component.ts` - Add delete methods
- `apps/server/src/app/routes/universe/` - Add delete endpoint (likely new file)
- Backend route registration for new DELETE endpoint

**Existing Services to Use:**

- `MessageService` - For toast notifications
- `UniverseDataService` - For data operations
- `GlobalUniverseStorageService` - For state management

### Error Handling Strategy

**Frontend Validation:**

- Button only shows when conditions met
- Double-check conditions before API call
- Handle network errors gracefully

**Backend Validation:**

- Return specific error messages for different validation failures
- Use appropriate HTTP status codes
- Log deletion attempts for audit purposes

**User Feedback:**

- Toast success message with symbol name
- Toast error messages with specific reason
- Loading state during deletion process

### Testing Strategy

**Unit Tests:**

- Test shouldShowDeleteButton logic with various universe entries
- Mock API calls for delete operations
- Test error handling paths

**Integration Tests:**

- Test full delete flow from button click to database removal
- Test that UI updates correctly after deletion
- Verify business rules are enforced end-to-end

**Manual Testing Scenarios:**

1. CEF symbol (should not show delete button)
2. Non-CEF with trades (should not show delete button)
3. Non-CEF without trades (should show delete button and allow deletion)
4. API error scenarios (network issues, validation failures)

## Change Log

| Date       | Version | Description            | Author             |
| ---------- | ------- | ---------------------- | ------------------ |
| 2025-09-23 | 1.0     | Initial story creation | Bob (Scrum Master) |

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (claude-sonnet-4-20250514)

### Debug Log References

No debug log entries required - implementation proceeded smoothly.

### Completion Notes List

- Successfully implemented conditional delete button for non-CEF universe entries with zero position
- Added comprehensive validation on both frontend and backend
- Created reusable DeleteUniverseHelper to maintain component size limits
- All business rules implemented according to acceptance criteria
- Comprehensive testing added for both frontend and backend functionality
- All validation commands pass successfully

### File List

**Modified Files:**

- `apps/rms/src/app/global/global-universe/global-universe.component.html` - Added delete button column and confirmation dialog
- `apps/rms/src/app/global/global-universe/global-universe.component.ts` - Integrated delete helper and bound methods
- `apps/rms/src/app/global/global-universe/global-universe.component.spec.ts` - Updated tests for delete helper integration
- `apps/rms/src/app/global/global-universe/universe.selector.ts` - Added id field to display data
- `apps/rms/src/app/global/global-universe/universe-display-data.interface.ts` - Added id field
- `apps/server/src/app/routes/universe/index.ts` - Enhanced delete endpoint with business validation

**New Files:**

- `apps/rms/src/app/global/global-universe/delete-universe.helper.ts` - Standalone helper for delete functionality
- `apps/rms/src/app/global/global-universe/delete-universe.helper.spec.ts` - Comprehensive tests for delete helper
- `apps/server/src/app/routes/universe/delete-universe.spec.ts` - Integration tests for delete API endpoint

## QA Results

_Results from QA Agent review will be populated here_
