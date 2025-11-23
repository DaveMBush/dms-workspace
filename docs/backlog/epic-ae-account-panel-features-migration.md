# Epic AE: Account Panel Features Migration

## Epic Goal

Migrate all account-specific feature components (Summary, Open Positions, Sold Positions, Dividend Deposits) from PrimeNG to Angular Material, with special focus on the dividend deposits table which requires virtual scrolling with lazy loading.

## Epic Description

**Existing System Context:**

- Current relevant functionality: Account-specific views for positions, dividends, and summaries
- Technology stack: PrimeNG tables with editing, virtual scrolling, lazy loading
- Integration points: SmartNgRX signals for trade/dividend data, shared editable components
- Critical component: Dividend deposits with virtual scrolling and lazy loading

**Enhancement Details:**

- What's being changed: Replace all PrimeNG components with Material equivalents
- How it integrates: Uses base table with virtual scrolling, shared components
- Success criteria: All account features functional, lazy loading works correctly

## Stories

1. **Story AE.1:** Migrate Account Panel Container (tabs/navigation)
2. **Story AE.2:** Migrate Account Detail Container
3. **Story AE.3:** Migrate Account Summary Component
4. **Story AE.4:** Migrate Open Positions Component (Complex - editable)
5. **Story AE.5:** Migrate Sold Positions Component (Complex - editable)
6. **Story AE.6:** Migrate Dividend Deposits Component (CRITICAL - lazy loading)
7. **Story AE.7:** Migrate Dividend Deposit Modal

## Compatibility Requirements

- [x] Same account data displayed
- [x] Same editing capabilities for positions
- [x] Lazy loading works for dividend deposits
- [x] Same modal behavior for dividend entry

## Technical Constraints

- Must use base table component with virtual scrolling
- Dividend deposits is the PRIMARY USE CASE for migration
- Must handle 1000+ dividend records efficiently

## Dependencies

- **Epic AC** - Shared components
- **Epic AD** - Global features (patterns established)

## Risk Assessment

**Risk Level:** Critical

**Risks:**

1. Dividend deposits lazy loading is the primary driver - must work correctly
   - Mitigation: Extensive testing with large datasets
2. Open/Sold positions have many editable fields
   - Mitigation: Reuse patterns from Global Universe

## Estimated Effort

5-6 business days

## Definition of Done

- [ ] Account panel navigation works
- [ ] Account summary displays charts
- [ ] Open positions editable and functional
- [ ] Sold positions editable and functional
- [ ] Dividend deposits lazy loads correctly
- [ ] Dividend deposit modal works
- [ ] All validation commands pass
