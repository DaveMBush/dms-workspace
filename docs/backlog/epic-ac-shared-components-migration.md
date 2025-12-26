# Epic AC: Shared Components Migration

## Epic Goal

Create all shared/reusable components that will be used across multiple features, including the critical base table component with virtual scrolling and lazy loading that addresses the primary driver for this migration.

## Epic Description

**Existing System Context:**

- Current relevant functionality: Shared components including base table, editable cells, autocomplete, charts
- Technology stack: PrimeNG p-table with virtual scrolling, p-cellEditor, p-autoComplete, p-chart
- Integration points: Used across global features and account panel features
- Problem: PrimeNG virtual scrolling with lazy data fetching does not meet requirements

**Enhancement Details:**

- What's being created: Angular Material-based shared components with CDK virtual scrolling
- How it integrates: Components used by all feature modules
- Success criteria: Virtual scrolling with lazy loading works correctly, all shared components functional

## Stories

1. **Story AC.1:** Create Base Table Component with Virtual Scrolling (CRITICAL)
2. **Story AC.2:** Create Editable Cell Component
3. **Story AC.3:** Create Editable Date Cell Component
4. **Story AC.4:** Create Symbol Autocomplete Component
5. **Story AC.5:** Create Symbol Filter Header Component
6. **Story AC.6:** Create Summary Display Component (Charts)
7. **Story AC.7:** Create Notification Service (completed in AB.1)
8. **Story AC.8:** Create Confirm Dialog Service (completed in AB.1)

## Compatibility Requirements

- [x] Virtual scrolling handles large datasets (1000+ rows)
- [x] Lazy loading fetches data on scroll
- [x] Editable cells support same field types as current
- [x] Autocomplete supports same options as current
- [x] Charts render identically to current

## Technical Constraints

- CDK Virtual Scroll for table virtualization
- Material table for structure and styling
- ng2-charts wrapping existing Chart.js usage
- Custom cell edit patterns (no Material equivalent)

## Success Metrics

- Virtual scroll renders 1000+ rows smoothly
- Lazy loading triggers correctly on scroll
- Table editing feels responsive
- Chart interactions work correctly
- All components reusable across features

## Dependencies

- **Epic AA** - Project setup
- **Epic AB** - Core layout (notification/confirm services)

## Risk Assessment

**Risk Level:** High (contains critical functionality)

**Risks:**

1. Virtual scrolling performance with complex rows
   - Mitigation: Optimize row templates, use trackBy
2. Lazy loading timing/thresholds
   - Mitigation: Configurable thresholds, debouncing
3. Editable cell focus/blur behavior differences
   - Mitigation: Extensive testing of edit flows

## Impact Analysis

**Components Created:**

- `shared/components/base-table/` - Virtual scrolling table
- `shared/components/editable-cell/` - Inline number editing
- `shared/components/editable-date-cell/` - Inline date editing
- `shared/components/symbol-autocomplete/` - Symbol search
- `shared/components/symbol-filter-header/` - Filter dropdown
- `shared/components/summary-display/` - Chart wrapper

## Priority

**Critical** - Base table is the primary driver for migration

## Estimated Effort

3-4 business days

## Definition of Done

- [ ] Base table with virtual scrolling working
- [ ] Lazy loading fetches data correctly
- [ ] Editable cells work with number inputs
- [ ] Editable date cells work with datepicker
- [ ] Symbol autocomplete searches and selects
- [ ] Charts render with proper styling
- [ ] All components documented with inputs/outputs
- [ ] All validation commands pass
