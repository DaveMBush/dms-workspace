# Epic AD: Global Features Migration

## Epic Goal

Migrate all global feature components (Universe, Screener, Summary, Error Logs) from PrimeNG to Angular Material, fully utilizing the base table with virtual scrolling for data-intensive views.

## Epic Description

**Existing System Context:**

- Current relevant functionality: Global views for universe management, stock screening, summary dashboards, and error logging
- Technology stack: PrimeNG tables with editing, charts, filtering, pagination
- Integration points: SmartNgRX signals for data, shared editable cell components

**Enhancement Details:**

- What's being changed: Replace all PrimeNG components with Material equivalents
- How it integrates: Uses base table component from AC.1, shared editable cells
- Success criteria: All global features functional with improved virtual scrolling

## Stories

1. **Story AD.1:** Migrate Global Universe Component (Complex - editable table)
2. **Story AD.2:** Migrate Screener Component
3. **Story AD.3:** Migrate Global Summary Component
4. **Story AD.4:** Migrate Global Error Logs Component

## Compatibility Requirements

- [x] Same data displayed as current application
- [x] Same editing capabilities preserved
- [x] Same filtering and sorting options
- [x] Charts display same information

## Technical Constraints

- Must use base table component from AC.1
- Must use editable cell components from AC.2/AC.3
- Must use summary display component from AC.6
- Virtual scrolling required for large datasets

## Dependencies

- **Epic AC** - Shared components must be complete

## Risk Assessment

**Risk Level:** High

**Risks:**

1. Global Universe is the most complex table with many editable columns
   - Mitigation: Thorough testing of each editable field
2. Screener filtering complexity
   - Mitigation: Preserve existing filter logic, update UI only

## Estimated Effort

4-5 business days

## Definition of Done

- [ ] Global Universe fully functional with inline editing
- [ ] Screener displays and filters correctly
- [ ] Global Summary charts render properly
- [ ] Error Logs paginate and filter correctly
- [ ] All SmartNgRX data flows working
- [ ] All validation commands pass
