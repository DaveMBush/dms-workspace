# Story AM.2: Wire Add Symbol Dialog to Universe Service - TDD GREEN Phase

## Story

**As a** user
**I want** to add new symbols to my universe tracking list
**So that** I can manually expand my portfolio coverage

## Acceptance Criteria

### Functional Requirements
- [ ] Add Symbol button opens dialog
- [ ] Dialog contains symbol input field
- [ ] Symbol field validates format (uppercase, valid ticker)
- [ ] Submit button calls UniverseService.addSymbol()
- [ ] Success adds symbol to table and closes dialog
- [ ] Error displays appropriate message
- [ ] Cancel button closes dialog without action
- [ ] All unit tests from AM.1 re-enabled and passing

### Technical Requirements
- [ ] Dialog uses Material Dialog
- [ ] Form uses Reactive Forms with validation
- [ ] Service calls POST /api/universe
- [ ] Proper error handling and user feedback
- [ ] Loading state during API call

## Definition of Done
- [ ] All unit tests from AM.1 re-enabled
- [ ] All unit tests passing
- [ ] Add symbol dialog functional
- [ ] Symbol validation working
- [ ] API integration complete
- [ ] Error handling implemented
- [ ] Manual testing completed
- [ ] All validation commands pass

## Related
- Prerequisite: Story AM.1
- Pattern Reference: Story AK.4, AL.2
