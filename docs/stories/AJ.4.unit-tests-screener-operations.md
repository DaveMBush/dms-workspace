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

- [ ] Test ScreenerService.screens() computed signal
- [ ] Test ScreenerService.updateScreener() method
- [ ] Test risk group filtering logic
- [ ] Test component checkbox editing flow
- [ ] Test table data source initialization
- [ ] **CRITICAL**: All tests are disabled (.skip) to pass CI

### Technical Requirements

- [ ] Use Vitest testing framework
- [ ] Mock SmartNgRX selectors
- [ ] Mock HTTP client for backend calls
- [ ] Test computed signals with signal() mocks
- [ ] Follow existing test patterns in workspace

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

- [ ] All new tests created and initially failing (RED)
- [ ] All tests are disabled with `.skip`
- [ ] Test file created for ScreenerService
- [ ] Component tests enhanced
- [ ] Tests follow workspace patterns
- [ ] All validation commands pass (with tests disabled)
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

These tests will be enabled in the implementation stories (AJ.1, AJ.2, AJ.3) as features are completed. This follows TDD best practices while ensuring CI remains green.

## Dev Agent Record

### Status

Not Started

### File List

(To be filled during implementation)

### Completion Notes

(To be filled during implementation)

### Change Log

(To be filled during implementation)
