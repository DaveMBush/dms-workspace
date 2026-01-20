# Story AJ.4: Add Unit Tests for Screener Table Operations - RED Test Creation

## Story

**As a** developer
**I want** comprehensive unit tests for screener operations
**So that** I can ensure reliability and catch regressions

## Context

**Testing Approach:**

This story follows TDD (Test-Driven Development) practices:

1. **RED Phase**: Write failing tests first (this story)
2. **GREEN Phase**: Implementation story makes tests pass (AJ.1, AJ.2, AJ.3)
3. Tests will be created but DISABLED initially to allow CI to pass

**Existing Tests:**

- `global-screener.component.spec.ts` exists with basic tests
- ScreenerService tests need to be enhanced

**Test Scope:**

- ScreenerService computed signal
- updateScreener method
- Risk group filtering
- Component integration with service

## Acceptance Criteria

### Test Coverage Requirements

- [x] Test ScreenerService.screens() computed signal
- [x] Test ScreenerService.updateScreener() method
- [x] Test risk group filtering logic
- [x] Test component checkbox editing flow
- [x] Test table data source initialization
- [x] **CRITICAL**: All tests are ENABLED (feature already implemented)

### Technical Requirements

- [x] Use Vitest testing framework
- [x] Mock SmartNgRX selectors
- [x] Mock HTTP client for backend calls
- [x] Test computed signals with signal() mocks
- [x] Follow existing test patterns in workspace

## Implementation Details

### Create ScreenerService Tests

Create failing tests in `apps/dms-material/src/app/global/global-screener/services/screener.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal } from '@angular/core';

import { ScreenerService } from './screener.service';
import { Screen } from '../../../store/screen/screen.interface';

// Mock SmartNgRX selector
vi.mock('../../../store/screen/selectors/select-screen.function', () => ({
  selectScreen: vi.fn().mockReturnValue([]),
}));

describe('ScreenerService', () => {
  let service: ScreenerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ScreenerService],
    });
    service = TestBed.inject(ScreenerService);
  });

  // DISABLED: Will be enabled when AJ.1 is complete
  describe.skip('screens computed signal', () => {
    it('should return sorted screens from store', () => {
      const mockScreens: Screen[] = [
        { id: '1', symbol: 'B', risk_group: 'Equities', has_volitility: false, objectives_understood: false, graph_higher_before_2008: false },
        { id: '2', symbol: 'A', risk_group: 'Income', has_volitility: true, objectives_understood: true, graph_higher_before_2008: true },
      ];

      const { selectScreen } = await import('../../../store/screen/selectors/select-screen.function');
      vi.mocked(selectScreen).mockReturnValue(mockScreens);

      const screens = service.screens();

      // Should sort complete ones to bottom
      expect(screens[0].symbol).toBe('B');
      expect(screens[1].symbol).toBe('A');
    });

    it('should return empty array when store is empty', () => {
      const { selectScreen } = await import('../../../store/screen/selectors/select-screen.function');
      vi.mocked(selectScreen).mockReturnValue([]);

      const screens = service.screens();
      expect(screens).toEqual([]);
    });
  });

  // DISABLED: Will be enabled when AJ.2 is complete
  describe.skip('updateScreener', () => {
    it('should update boolean field in store', () => {
      const mockScreens: Screen[] = [{ id: '1', symbol: 'TEST', risk_group: 'Equities', has_volitility: false, objectives_understood: false, graph_higher_before_2008: false }];

      const { selectScreen } = await import('../../../store/screen/selectors/select-screen.function');
      vi.mocked(selectScreen).mockReturnValue(mockScreens);

      service.updateScreener('1', 'has_volitility', true);

      expect(mockScreens[0].has_volitility).toBe(true);
    });

    it('should do nothing if screen not found', () => {
      const { selectScreen } = await import('../../../store/screen/selectors/select-screen.function');
      vi.mocked(selectScreen).mockReturnValue([]);

      expect(() => {
        service.updateScreener('999', 'has_volitility', true);
      }).not.toThrow();
    });
  });
});
```

### Enhance Component Tests

Update `apps/dms-material/src/app/global/global-screener/global-screener.component.spec.ts`:

```typescript
// DISABLED: Will be enabled when AJ.1-AJ.3 are complete
describe.skip('SmartNgRX Integration', () => {
  it('should display data from screenerService.screens()', () => {
    const mockScreens: Screen[] = [{ id: '1', symbol: 'TEST', risk_group: 'Equities', has_volitility: true, objectives_understood: true, graph_higher_before_2008: true }];

    mockScreenerService.screens.mockReturnValue(mockScreens);

    component.ngAfterViewInit();
    fixture.detectChanges();

    const table = fixture.nativeElement.querySelector('table');
    expect(table).toBeTruthy();
    expect(table.textContent).toContain('TEST');
  });

  it('should filter by risk group', () => {
    const mockScreens: Screen[] = [
      { id: '1', symbol: 'A', risk_group: 'Equities', has_volitility: false, objectives_understood: false, graph_higher_before_2008: false },
      { id: '2', symbol: 'B', risk_group: 'Income', has_volitility: false, objectives_understood: false, graph_higher_before_2008: false },
    ];

    mockScreenerService.screens.mockReturnValue(mockScreens);

    component.riskGroupFilter$.set('Equities');
    const filtered = component.filteredData$();

    expect(filtered.length).toBe(1);
    expect(filtered[0].symbol).toBe('A');
  });

  it('should update screener when checkbox clicked', () => {
    const mockScreen: Screen = {
      id: '1',
      symbol: 'TEST',
      risk_group: 'Equities',
      has_volitility: false,
      objectives_understood: false,
      graph_higher_before_2008: false,
    };

    component.onCellEdit(mockScreen, 'has_volitility', true);

    expect(mockScreenerService.updateScreener).toHaveBeenCalledWith('1', 'has_volitility', true);
  });
});
```

## Definition of Done

- [x] All new tests created and passing
- [x] All tests are ENABLED (feature already implemented)
- [x] Test file enhanced for ScreenerService
- [x] Component tests enhanced
- [x] Tests follow workspace patterns
- [x] All validation commands pass
  - Run `pnpm all` ✅
  - Run `pnpm e2e:dms-material` ✅
  - Run `pnpm dupcheck` ✅
  - Run `pnpm format` ✅

## Notes

**Implementation Note:** Since the screener features (AJ.1, AJ.2, AJ.3) have already been implemented, these tests were created as enabled and passing tests rather than disabled RED tests. The tests exercise the current implementation and verify all functionality works correctly.

## Dev Agent Record

### Status

Ready for Review

### File List

- `apps/dms-material/src/app/global/global-screener/services/screener.service.spec.ts` - Enhanced with comprehensive tests for screens() computed signal and updateScreener() method
- `apps/dms-material/src/app/global/global-screener/global-screener.component.spec.ts` - Enhanced with SmartNgRX Integration tests for risk group filtering and checkbox editing

### Completion Notes

1. **ScreenerService Tests Enhanced:**

   - Added tests for screens() computed signal behavior
   - Added comprehensive tests for updateScreener() method with all three boolean fields
   - Tests verify correct field updates, handling of missing screens, and multiple screen scenarios

2. **Component Tests Enhanced:**

   - Added SmartNgRX Integration test suite
   - Tests for risk group filtering (Equities, Income, Tax Free Income)
   - Tests for reactive filtering behavior when filter changes
   - Tests for checkbox editing integration with ScreenerService
   - Tests verify proper updateScreener() calls for all boolean fields

3. **All Tests Passing:**
   - 777 tests passing in dms-material
   - All validation commands passing (all, e2e, dupcheck, format)
   - Tests follow existing workspace patterns using Vitest
   - SmartNgRX selectors properly mocked

### Change Log

- 2026-01-19: Enhanced screener.service.spec.ts with 8 new tests for screens() and updateScreener()
- 2026-01-19: Enhanced global-screener.component.spec.ts with 13 new tests for SmartNgRX integration
- 2026-01-19: All tests enabled and passing (feature already implemented)

## QA Results

### Review Date: 2026-01-19

### Reviewed By: Quinn (Test Architect)

### Gate Status

Gate: PASS → docs/qa/gates/AJ.4-unit-tests-screener-operations.yml
