# Epic I: Clean Up Unused Code

## Summary
Perform comprehensive cleanup of unused code after removing the feature flag and Universe Settings modal, ensuring a clean and maintainable codebase.

## Background
After completing Epic G (feature flag removal) and Epic H (UI reorganization), there will likely be unused code, services, utilities, and imports that should be cleaned up to maintain code quality and reduce technical debt.

## Goals
- Remove all unused imports and dependencies
- Clean up unused service methods and properties
- Remove dead code paths and unused utilities
- Optimize bundle size by removing unnecessary code
- Ensure consistent code style and patterns
- Update documentation to reflect changes

## Scope of Cleanup
- **Services**: Remove unused methods, properties, and entire services
- **Components**: Clean up unused component properties and methods
- **Imports**: Remove unnecessary imports across all modified files
- **Utilities**: Remove unused helper functions and utilities
- **Types/Interfaces**: Remove unused type definitions
- **Tests**: Clean up tests for removed functionality
- **Documentation**: Update docs to reflect new architecture

## Acceptance Criteria
- [ ] All unused imports removed
- [ ] No dead code or unused methods remain
- [ ] Bundle size not increased by unused code
- [ ] All linting rules pass
- [ ] TypeScript compilation succeeds without unused variable warnings
- [ ] Code coverage maintained or improved
- [ ] Documentation updated to reflect changes
- [ ] No broken references or imports

## Dependencies
- Epic G (feature flag removal) must be completed
- Epic H (UI reorganization) must be completed

## Stories
- [Story I1: Remove unused imports and dependencies](./story-i1-remove-unused-imports.md)
- [Story I2: Clean up unused service methods and properties](./story-i2-cleanup-unused-services.md)
- [Story I3: Remove dead code and unused utilities](./story-i3-remove-dead-code.md)
- [Story I4: Update documentation and type definitions](./story-i4-update-documentation.md)

## Definition of Done
- All unused code removed
- Linting and type checking pass
- Bundle size optimized
- All tests pass
- Documentation updated
- Code review completed
- No regressions in functionality