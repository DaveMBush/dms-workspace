# Story AJ.1: Wire Screener Table to SmartNgRX Screen Entities

## Story

**As a** developer
**I want** the screener table to display data from SmartNgRX screen entities
**So that** the table reflects live data from the backend store

## Context

**Current State:**

- Screen store already exists in apps/dms-material/src/app/store/screen
- Screen interface, effects service, definition, and selectors are configured
- GlobalScreenerComponent exists but doesn't use SmartNgRX data yet

**Enhancement Goal:**

- Wire screener table to use SmartNgRX selectScreen selector
- Display data in table with proper sorting and formatting
- Match DMS app implementation pattern

**Reference Implementation:**

- DMS app: apps/dms/src/app/global/screener/screener.ts
- DMS app service: apps/dms/src/app/global/screener/screener.service.ts

## Acceptance Criteria

### Functional Requirements

- [ ] Table displays screen data from SmartNgRX store
- [ ] Data automatically updates when store changes
- [ ] Table shows all required columns (symbol, risk_group, booleans)
- [ ] Computed signal for screens follows DMS pattern with sorting

### Technical Requirements

- [ ] Import and use selectScreen selector
- [ ] Create computed signal that sorts screens
- [ ] Update component to use screenerService.screens()
- [ ] Remove mock data/static arrays
- [ ] Follow SmartNgRX patterns from reference docs

## Implementation Details

### Update ScreenerService

Modify `apps/dms-material/src/app/global/global-screener/services/screener.service.ts`:

```typescript
import { computed, inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Screen } from '../../../store/screen/screen.interface';
import { selectScreen } from '../../../store/screen/selectors/select-screen.function';

@Injectable({
  providedIn: 'root',
})
export class ScreenerService {
  private readonly http = inject(HttpClient);

  // Computed signal that provides sorted screens from SmartNgRX store
  screens = computed(function screensCompute() {
    const screens = selectScreen();
    const screenReturn = [] as Screen[];
    for (let i = 0; i < screens.length; i++) {
      const screen = screens[i];
      screenReturn.push(screen);
    }
    // Sort by completion status (complete ones to bottom), then by symbol
    screenReturn.sort(function screenSort(a, b) {
      const aScore = (a.graph_higher_before_2008 && a.has_volitility && a.objectives_understood ? 'z' : 'a') + a.symbol;
      const bScore = (b.graph_higher_before_2008 && b.has_volitility && b.objectives_understood ? 'z' : 'a') + b.symbol;

      return aScore.localeCompare(bScore);
    });
    return screenReturn;
  });

  // ... rest of existing methods (refresh, loading, error signals)
}
```

### Update GlobalScreenerComponent

Modify `apps/dms-material/src/app/global/global-screener/global-screener.component.ts`:

1. Remove `readonly filteredData$` computed signal that uses mock data
2. Use `screenerService.screens()` in a computed signal for filtering
3. Update data source initialization to use the computed signal

Example pattern:

```typescript
// eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal
readonly filteredData$ = computed(() => {
  const screens = this.screenerService.screens();
  const riskGroupFilter = this.riskGroupFilter$();

  if (riskGroupFilter === null) {
    return screens;
  }

  return screens.filter(function filterByRiskGroup(row) {
    return row.risk_group === riskGroupFilter;
  });
});
```

### Verify Store Registration

Ensure screen store is registered in routes:

- Check `apps/dms-material/src/app/app.routes.ts`
- Verify `screenDefinition` is included in `provideSmartFeatureSignalEntities`
- Ensure `screenEffectsServiceToken` is provided in app config

## Definition of Done

- [ ] Component displays data from SmartNgRX store
- [ ] Data updates automatically when store changes
- [ ] Sorting matches DMS app behavior
- [ ] No console errors
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Testing Strategy

- Manual testing: Navigate to screener, verify data displays
- Visual verification: Compare with DMS app screener display
- Store verification: Check Redux DevTools shows screen entities

## Dev Agent Record

### Status

Not Started

### File List

(To be filled during implementation)

### Completion Notes

(To be filled during implementation)

### Change Log

(To be filled during implementation)
