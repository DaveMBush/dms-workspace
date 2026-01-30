# Story AM.4: Implement Symbol Search/Autocomplete - TDD GREEN Phase

## Story

**As a** user
**I want** to search for stock symbols using autocomplete
**So that** I can easily find and add the correct symbol to my universe

## Context

**Current System:**

- Add Symbol dialog exists with basic input
- Unit tests written in Story AM.3 (currently disabled)
- Need symbol search/autocomplete functionality

**Implementation Approach:**

- Re-enable unit tests from AM.3
- Create SymbolSearchService
- Integrate Material Autocomplete
- Connect to symbol lookup API
- Make all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

- [ ] Autocomplete displays as user types
- [ ] Search is debounced (300ms delay)
- [ ] Results show symbol and company name
- [ ] Selecting result fills form field
- [ ] "No results" message when search yields nothing
- [ ] Loading indicator during search
- [ ] All unit tests from AM.3 re-enabled and passing

### Technical Requirements

- [ ] Uses Material Autocomplete component
- [ ] Debounces with RxJS operators
- [ ] Calls backend or external API for symbol search
- [ ] Proper error handling
- [ ] Accessible keyboard navigation

## Implementation Details

### Step 1: Re-enable Unit Tests

Remove `x` prefix or `.skip` from tests written in AM.3.

### Step 2: Create SymbolSearchService

\`\`\`typescript
@Injectable({ providedIn: 'root' })
export class SymbolSearchService {
  constructor(private http: HttpClient) {}

  searchSymbols(query: string): Observable<SymbolSearchResult[]> {
    return this.http.get<SymbolSearchResult[]>(
      \`/api/symbols/search?q=\${query}\`
    );
  }
}
\`\`\`

### Step 3: Update AddSymbolDialogComponent with Autocomplete

\`\`\`typescript
export class AddSymbolDialogComponent {
  form = this.fb.group({
    symbol: ['', Validators.required]
  });
  
  filteredSymbols$: Observable<SymbolSearchResult[]>;

  constructor(
    private fb: FormBuilder,
    private symbolSearch: SymbolSearchService,
    // ... other dependencies
  ) {
    this.filteredSymbols$ = this.form.get('symbol')!.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => 
        value ? this.symbolSearch.searchSymbols(value) : of([])
      )
    );
  }
}
\`\`\`

### Step 4: Update Template with Autocomplete

\`\`\`html
<mat-form-field>
  <mat-label>Symbol</mat-label>
  <input matInput 
         formControlName="symbol"
         [matAutocomplete]="auto" />
  <mat-autocomplete #auto="matAutocomplete" 
                    (optionSelected)="onSymbolSelected($event)">
    <mat-option *ngFor="let symbol of filteredSymbols$ | async" 
                [value]="symbol.symbol">
      {{symbol.symbol}} - {{symbol.name}}
    </mat-option>
  </mat-autocomplete>
</mat-form-field>
\`\`\`

### Step 5: Verify All Tests Pass

\`\`\`bash
pnpm test:dms-material
\`\`\`

## Definition of Done

- [ ] All unit tests from AM.3 re-enabled
- [ ] All unit tests passing
- [ ] Symbol search autocomplete working
- [ ] Debouncing implemented
- [ ] Results display correctly
- [ ] Selection updates form
- [ ] Manual testing completed
- [ ] All validation commands pass:
  - [ ] Run \`pnpm all\`
  - [ ] Run \`pnpm e2e:dms-material\`
  - [ ] Run \`pnpm dupcheck\`
  - [ ] Run \`pnpm format\`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase for AM.3 tests
- Backend API endpoint may need to be created
- Consider rate limiting on search API

## Related Stories

- **Prerequisite**: Story AM.3
- **Next**: Story AM.5 (TDD for validation)
- **Pattern Reference**: Story AM.2
