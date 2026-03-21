# Story 15.2: [Implementation] Apply Formatting and Sizing to Position Column

Status: Approved

## Story

As a user,
I want the Position column to display numbers clearly formatted and fully visible,
So that I can quickly read position sizes without having to resize columns or guess at clipped values.

## Acceptance Criteria

1. **Given** I am viewing the Universe table
   **When** I look at the Position column
   **Then** all numeric values display with exactly 2 decimal places
   **And** values of 1,000 or greater display comma separators (e.g., "100,000.00")
   **And** all values are right-aligned within the column

2. **Given** a position with value 100,000.00
   **When** it is displayed in the Position column
   **Then** the entire value is visible without clipping
   **And** there is sufficient padding on the right side
   **And** the column width is wide enough to accommodate the value

3. **Given** the Angular component template or TypeScript format logic
   **When** I implement the number formatting
   **Then** I use Angular's DecimalPipe or a custom formatter with pattern '1.2-2'
   **And** the formatter includes thousands separator logic
   **And** the column CSS includes `text-align: right` or Tailwind's `text-right` class

4. **Given** the table column definition
   **When** I set the column width
   **Then** the width accommodates at least 10 characters plus padding
   **And** the width can be specified in pixels, rem, or a flex-basis value
   **And** the column does not shrink below the minimum width on narrow screens

5. **Given** I use the Playwright MCP server
   **When** I verify the Universe table with various position values
   **Then** values under 1,000 display like "500.00" (no comma)
   **And** values of 1,000 or more display like "1,234.56" or "100,000.00"
   **And** no values are clipped or truncated
   **And** all values are right-aligned
   **And** the column width is visually appropriate relative to other columns

## Definition of Done

- [ ] Unit tests from Story 15.1 re-enabled and passing
- [ ] Number formatting applied to Position column (2 decimals, comma separators)
- [ ] Values right-aligned in column
- [ ] Column width sufficient for values up to 100,000.00 without clipping
- [ ] Verified with various position values using Playwright MCP server
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Re-enable unit tests from Story 15.1 (DoD)
  - [ ] Remove `.skip` from test file
  - [ ] Run tests to verify they pass
- [ ] Implement formatting logic (AC: 3)
  - [ ] Apply DecimalPipe or custom pipe/formatter from Story 15.1
  - [ ] Update Universe template to use formatter
  - [ ] Ensure formatting handles edge cases (null, undefined, NaN)
- [ ] Apply right alignment to column (AC: 1, 3)
  - [ ] Add Tailwind class `text-right` to Position column cells
  - [ ] Or add CSS `text-align: right`
  - [ ] Verify alignment in browser
- [ ] Set Position column width (AC: 2, 4)
  - [ ] Add explicit width to column definition
  - [ ] Use `w-32` (8rem/128px) or similar Tailwind class
  - [ ] Or use inline style: `style="min-width: 140px"`
  - [ ] Test that column doesn't shrink below minimum
  - [ ] Ensure column can accommodate "100,000.00" plus padding
- [ ] Test locally with various position values (AC: 1, 2)
  - [ ] Navigate to Universe screen
  - [ ] Verify values < 1,000 display without commas: "500.00"
  - [ ] Verify values ≥ 1,000 display with commas: "1,234.56"
  - [ ] Verify large values display correctly: "100,000.00"
  - [ ] Verify no clipping occurs
  - [ ] Verify right alignment
  - [ ] Test at different browser window widths
- [ ] Use Playwright MCP server for verification (AC: 5)
  - [ ] Navigate to Universe screen
  - [ ] Take screenshot of table
  - [ ] Use `mcp_microsoft_pla_browser_evaluate` to check:
    - Column values have correct format
    - Column width is sufficient
    - No text overflow or clipping
  - [ ] Verify at multiple viewport sizes

## Dev Notes

### Dependencies
- Requires Story 15.1 to be complete with formatting logic implemented

### Formatting Implementation
Use the formatting approach chosen in Story 15.1:

**If using DecimalPipe in template:**
```html
<td class="text-right w-32">{{ position | number:'1.2-2' }}</td>
```

**If using custom pipe:**
```html
<td class="text-right w-32">{{ position | formatPosition }}</td>
```

**If using utility function:**
```typescript
// In component
formattedPosition = computed(() => formatPosition(this.position()));
```
```html
<td class="text-right w-32">{{ formattedPosition() }}</td>
```

### Column Width Considerations
- "100,000.00" = 10 characters
- Add padding: ~16px each side = 32px
- Character width: ~8px for monospace numbers
- Minimum width: 10 chars * 8px + 32px padding = 112px minimum
- Recommended: 140px (w-35) or 160px (w-40) for comfortable spacing

### Tailwind Width Classes
- `w-32`: 8rem / 128px
- `w-36`: 9rem / 144px
- `w-40`: 10rem / 160px
- Or custom: `style="width: 140px; min-width: 140px;"`

### Key Files to Modify
- Universe page: `apps/dms-material/src/app/pages/universe/universe.component.html`
- Universe page: `apps/dms-material/src/app/pages/universe/universe.component.ts`
- Possibly table component if Position column is in a child component
- Test file from Story 15.1 (re-enable tests)

### Testing with Playwright MCP Server
```javascript
// Check formatting
const positionText = await page.locator('td.position-column').first().innerText();
expect(positionText).toMatch(/^\d{1,3}(,\d{3})*\.\d{2}$/);

// Check alignment
const textAlign = await page.locator('td.position-column').first().evaluate(el =>
  getComputedStyle(el).textAlign
);
expect(textAlign).toBe('right');

// Check no overflow
const isOverflowing = await page.locator('td.position-column').first().evaluate(el =>
  el.scrollWidth > el.clientWidth
);
expect(isOverflowing).toBe(false);
```

### Project Structure Notes
- Universe screen manages watchlist of CEF symbols
- Position values represent share quantities held
- Values can range from 0 to potentially millions
- Pre-existing issue since table creation, not caused by Epic 8

### References
- [Source: _bmad-output/planning-artifacts/epics-2026-03-21.md#Story 15.2]
- [Source: _bmad-output/implementation-artifacts/15-1-tdd-write-unit-tests-for-position-number-formatting.md]
- [Source: apps/dms-material/src/app/pages/universe/]

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
