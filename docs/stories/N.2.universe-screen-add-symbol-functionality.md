# Story N.2: Universe Screen Add Symbol Functionality

## Status

Draft

## Story

**As a** trader using the RMS application,
**I want** to manually add symbols (primarily ETFs) to the universe through the Universe screen,
**so that** I can trade symbols that are not available through the screener-driven CEF universe.

## Acceptance Criteria

1. Add "Add Symbol" button to the Universe screen with proper styling using PrimeNG and TailwindCSS
2. Implement add symbol dialog with form validation for symbol input and risk group selection
3. Create backend API endpoint to add symbols to universe with `is_closed_end_fund = false`
4. Integrate symbol addition with existing universe data service and store management
5. Validate symbol format and check for duplicates before allowing addition
6. Fetch symbol data (price, distributions) from Yahoo APIs when adding new symbols
7. Display newly added symbols in the universe table with proper sorting and filtering
8. Ensure the following commands run without errors:
   - `pnpm format`
   - `pnpm dupcheck`
   - `pnpm nx run rms:test --code-coverage`
   - `pnpm nx run server:build:production`
   - `pnpm nx run server:test --code-coverage`
   - `pnpm nx run server:lint`
   - `pnpm nx run rms:lint`
   - `pnpm nx run rms:build:production`
   - `pnpm nx run rms-e2e:lint`

## Tasks / Subtasks

- [ ] **Task 1: Create backend API endpoint for adding symbols** (AC: 3, 6)

  - [ ] Implement POST `/api/universe/add-symbol` endpoint in universe routes
  - [ ] Add request validation for symbol and risk_group_id
  - [ ] Integrate with existing Yahoo API functions for price and distribution data
  - [ ] Set `is_closed_end_fund = false` for manually added symbols
  - [ ] Return appropriate error responses for invalid symbols or duplicates

- [ ] **Task 2: Implement frontend add symbol dialog** (AC: 2, 5)

  - [ ] Create add symbol dialog component using PrimeNG Dialog
  - [ ] Add form with symbol input field and risk group dropdown
  - [ ] Implement client-side validation for symbol format
  - [ ] Add loading state during symbol addition process
  - [ ] Handle success and error responses with appropriate messaging

- [ ] **Task 3: Update Universe screen with add symbol functionality** (AC: 1, 7)

  - [ ] Add "Add Symbol" button to Universe screen header
  - [ ] Integrate dialog opening/closing with button click
  - [ ] Ensure proper styling with PrimeNG and TailwindCSS
  - [ ] Update universe table to display newly added symbols
  - [ ] Maintain existing sorting and filtering functionality

- [ ] **Task 4: Integrate with universe data services** (AC: 4)

  - [ ] Update universe data service to call new add symbol endpoint
  - [ ] Refresh universe store after successful symbol addition
  - [ ] Update universe effects service to handle new symbol additions
  - [ ] Ensure signals-based state management is properly updated

- [ ] **Task 5: Add comprehensive testing** (AC: 8)

  - [ ] Create unit tests for add symbol API endpoint
  - [ ] Create unit tests for add symbol dialog component
  - [ ] Add integration tests for symbol addition workflow
  - [ ] Test error handling for invalid symbols and duplicates
  - [ ] Verify universe table updates correctly after symbol addition

- [ ] **Task 6: Run all quality gates** (AC: 8)
  - [ ] Execute `pnpm format` and fix any formatting issues
  - [ ] Execute `pnpm dupcheck` and resolve duplicates
  - [ ] Execute all test suites and ensure 100% pass rate
  - [ ] Execute all lint commands and resolve issues
  - [ ] Execute all build commands and ensure successful compilation

## Dev Notes

### Previous Story Context

This story builds on N.1 which added the `is_closed_end_fund` flag to the universe table. The new functionality will create universe records with `is_closed_end_fund = false` to distinguish manually-added symbols from screener-derived CEFs.

### Data Models and Architecture

**Source: [docs/architecture/domain-model-prisma-snapshot.md]**

**Universe Model (After N.1):**

```prisma
model universe {
  id                      Int      @id @default(autoincrement())
  symbol                  String
  risk_group_id           Int
  distribution            Decimal?
  distributions_per_year  Int?
  ex_date                 DateTime?
  last_price              Decimal?
  most_recent_sell_date   DateTime?
  expired                 Boolean  @default(false)
  is_closed_end_fund      Boolean  @default(true)
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  risk_group              risk_group @relation(fields: [risk_group_id], references: [id])
  trades                  trades[]
}
```

**Risk Group Model:**

```prisma
model risk_group {
  id       Int       @id @default(autoincrement())
  name     String
  screeners screener[]
  universes universe[]
}
```

### API Specifications

**New Endpoint: POST `/api/universe/add-symbol`**

**Request Schema:**

```typescript
{
  symbol: string; // Required, uppercase format (e.g., "SPY")
  risk_group_id: number; // Required, valid risk group ID
}
```

**Response Schema (Success):**

```typescript
{
  id: number;
  symbol: string;
  risk_group_id: number;
  distribution: number | null;
  distributions_per_year: number | null;
  ex_date: string | null;
  last_price: number | null;
  most_recent_sell_date: string | null;
  expired: boolean;
  is_closed_end_fund: boolean; // Will be false for manually added
  createdAt: string;
  updatedAt: string;
}
```

**Error Responses:**

- 400: Invalid symbol format or missing required fields
- 409: Symbol already exists in universe
- 404: Invalid risk group ID
- 500: Yahoo API failure or database error

### File Locations

**Source: [docs/architecture/references-source-of-truth.md]**

**Primary Backend Files to Modify:**

1. `/apps/server/src/app/routes/universe/index.ts` - Add new endpoint
2. Create `/apps/server/src/app/routes/universe/add-symbol/index.ts` - New route handler
3. `/apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts` - Core logic
4. `/apps/server/src/app/routes/universe/add-symbol/validate-add-symbol-request.function.ts` - Validation

**Primary Frontend Files to Modify:**

1. Universe screen component (location from references: `/apps/rms/src/app/universe-settings/*`)
2. Update `/apps/rms/src/app/store/universe/universe-effect.service.ts`
3. Update `/apps/rms/src/app/global/global-universe/universe-data.service.ts`
4. Create add symbol dialog component in universe-settings directory

**Files to Create:**

1. `/apps/rms/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts`
2. `/apps/rms/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.html`
3. `/apps/rms/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.scss`

### Component Architecture

**Angular 20 Standards (from project guidelines):**

- Use standalone components (no explicit `standalone: true` declaration)
- Use signals for all inputs, outputs, and template variables
- External files only (no inline HTML/SCSS)
- Service injection via `inject()` instead of constructor injection
- Component naming: `add-symbol-dialog.*` (not `add-symbol-dialog.component.*`)

**Add Symbol Dialog Component Structure:**

```typescript
export class AddSymbolDialog {
  private universeService = inject(UniverseDataService);
  private riskGroupService = inject(RiskGroupService); // If exists

  symbolInput = signal('');
  selectedRiskGroup = signal<number | null>(null);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  riskGroups = signal<RiskGroup[]>([]);

  ngOnInit() {
    // Load risk groups for dropdown
  }

  onSubmit() {
    // Handle form submission
  }
}
```

### Technical Implementation Details

**PrimeNG Components to Use:**

- `p-dialog` for add symbol modal
- `p-inputText` for symbol input
- `p-dropdown` for risk group selection
- `p-button` for submit/cancel actions
- `p-message` for error display

**Validation Rules:**

- Symbol: Required, 1-5 characters, uppercase letters only
- Risk Group: Required, must be valid existing risk group ID

**Integration with Existing Services:**

- Use existing Yahoo API integration for price/distribution fetching
- Integrate with existing universe store refresh mechanisms
- Follow existing error handling patterns

**State Management:**

- Use signals for component state
- Update universe store via existing effects service
- Trigger universe table refresh after successful addition

### Testing Standards

**Source: [docs/architecture/ci-and-testing.md]**

**Testing Framework:** Jest with TestBed for Angular components
**Test Location:** Tests alongside components in `/apps/rms/src/app/` structure
**Coverage Requirements:** Lines 85%, branches 75%, functions 85%

**Key Test Scenarios:**

**Frontend Component Tests:**

- Add symbol dialog renders correctly
- Form validation works for symbol and risk group
- Loading states display properly
- Success/error messages display correctly
- Dialog closes after successful submission

**Backend API Tests:**

- Symbol addition with valid data succeeds
- Duplicate symbol addition returns 409 error
- Invalid risk group returns 404 error
- Symbol format validation works correctly
- Yahoo API integration functions properly

**Integration Tests:**

- End-to-end symbol addition workflow
- Universe table updates after symbol addition
- Error handling across frontend and backend

### Security and Performance Considerations

**Authentication:** Use existing authentication middleware for API endpoints
**Rate Limiting:** Apply existing rate limiting to new endpoint
**Data Validation:** Validate both frontend and backend for security
**Performance:** Implement proper loading states and error boundaries

## Change Log

| Date       | Version | Description                         | Author            |
| ---------- | ------- | ----------------------------------- | ----------------- |
| 2024-09-20 | 1.0     | Initial story creation for Epic N.2 | BMad Orchestrator |

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

_Results from QA Agent review will be populated here after implementation_
