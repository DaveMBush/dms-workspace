# Story R.1: Add Conditional Delete Button for Unused Universe Rows

## Status

Draft

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

- [ ] **Task 1: Add delete button column to template** (AC: 1, 2, 5, 6)

  - [ ] Add new header column for delete actions in global-universe.component.html
  - [ ] Add delete button cell in body template with conditional display
  - [ ] Implement conditional logic: `!row.is_closed_end_fund && row.position === 0`
  - [ ] Style delete button consistently with existing UI patterns

- [ ] **Task 2: Create delete confirmation dialog** (AC: 3)

  - [ ] Add p-dialog component for delete confirmation
  - [ ] Include symbol name in confirmation message for clarity
  - [ ] Handle dialog accept/cancel actions appropriately
  - [ ] Show appropriate warning about permanent deletion

- [ ] **Task 3: Implement delete method in component** (AC: 4, 7, 8)

  - [ ] Add deleteUniverse method to global-universe.component.ts
  - [ ] Call universe delete service/API endpoint
  - [ ] Handle success and error responses appropriately
  - [ ] Update UI signals to reflect deletion
  - [ ] Display toast messages for success/error feedback

- [ ] **Task 4: Create backend delete API endpoint** (AC: 4, 6, 7)

  - [ ] Add DELETE endpoint to universe routes
  - [ ] Implement business rule validation (non-CEF, no trades)
  - [ ] Check for referential integrity before deletion
  - [ ] Return appropriate error messages for validation failures
  - [ ] Handle database deletion transaction safely

- [ ] **Task 5: Add comprehensive testing** (AC: 1-8)
  - [ ] Test conditional button display logic
  - [ ] Test confirmation dialog behavior
  - [ ] Test successful deletion flow
  - [ ] Test error cases (CEF, has trades, API errors)
  - [ ] Test UI updates after deletion

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

_This section will be populated by the development agent during implementation_

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_

## QA Results

_Results from QA Agent review will be populated here_
