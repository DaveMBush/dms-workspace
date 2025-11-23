# Epic AF: Universe Settings Migration

## Epic Goal

Migrate the universe settings components (container and add symbol dialog) from PrimeNG to Angular Material.

## Epic Description

**Existing System Context:**

- Current relevant functionality: Universe settings for adding symbols to the investment universe
- Technology stack: PrimeNG dialog, autocomplete, select, button
- Integration points: Universe sync service, symbol search API

**Enhancement Details:**

- What's being changed: Replace PrimeNG dialog and form components with Material equivalents
- How it integrates: Uses symbol autocomplete from AC.4, Material dialog
- Success criteria: Add symbol functionality works identically

## Stories

1. **Story AF.1:** Migrate Universe Settings Container
2. **Story AF.2:** Migrate Add Symbol Dialog

## Compatibility Requirements

- [x] Same symbol search functionality
- [x] Same form validation
- [x] Same add-to-universe behavior

## Technical Constraints

- Uses shared symbol autocomplete component
- Material dialog for modal

## Dependencies

- **Epic AC** - Symbol autocomplete component

## Risk Assessment

**Risk Level:** Low

**Risks:**

1. Symbol search API integration
   - Mitigation: Reuse existing service

## Estimated Effort

1 business day

## Definition of Done

- [ ] Universe settings container migrated
- [ ] Add symbol dialog works
- [ ] Symbol search functional
- [ ] All validation commands pass
