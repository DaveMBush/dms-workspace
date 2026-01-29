## Description
Complete implementation of Story AL.4: Wire Update Fields Button to Service

## Changes Made
- **Service Integration**: Wired UpdateUniverseFieldsService into GlobalUniverseComponent
- **Button Functionality**: Added updateFields() method with proper error handling and notifications  
- **UI Updates**: Enhanced button template with loading state and test identifiers
- **Test Suite**: Enabled AL.3 TDD tests (8 comprehensive tests now passing)
- **Code Organization**: Extracted large constants to separate files to reduce component size
- **Error Handling**: Added handleOperationError() method for consistent error patterns
- **Concurrency Control**: Removed redundant guard checks (button disabled state handles this)
- **Service Updates**: Changed from POST to GET method and updated endpoint to `/api/settings/update`
- **Quality Assurance**: Created QA gate file with PASS decision

## Testing
- ✅ All 807 tests passing
- ✅ Production build successful  
- ✅ Manual functionality verification completed
- ✅ QA gate assessment: PASS

## Files Modified
- `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`
- `apps/dms-material/src/app/global/global-universe/global-universe.component.html`
- `apps/dms-material/src/app/global/global-universe/global-universe.component.spec.ts`
- `apps/dms-material/src/app/shared/services/update-universe-fields.service.ts`
- `apps/dms-material/src/app/shared/services/update-universe-fields.service.spec.ts`
- `docs/stories/AL.4.wire-update-fields-button.md`

## Files Added
- `apps/dms-material/src/app/global/global-universe/global-universe.columns.ts`
- `apps/dms-material/src/app/global/global-universe/global-universe.risk-groups.ts`
- `apps/dms-material/src/app/global/global-universe/global-universe.expired-options.ts`
- `docs/qa/gates/AL.4-wire-update-fields-button.yml`

## Related Issues
Closes #346

## Epic Context
Part of Epic AL "Wire Up Universe Update Fields Button" - Stories AL.1-AL.6