# Migration Plan: has_volitility → has_volatility

## Overview

This document outlines the 3-phase migration plan to rename the misspelled field `has_volitility` to `has_volatility` in the `screener` table.

## Migration Strategy

A 3-phase approach ensures zero downtime and provides rollback capability at each stage.

### Phase 1: Add New Column (Week 1)

**Goal**: Add the correctly spelled column alongside the existing one

**Steps**:

1. Add new column `has_volatility Boolean` to screener table
2. Create migration to copy existing `has_volitility` values to `has_volatility`
3. Update application code to write to both columns (dual-write)
4. Deploy application changes
5. Verify data consistency between columns

**Migration SQL**:

```sql
-- Add new column
ALTER TABLE screener ADD COLUMN has_volatility Boolean;

-- Copy existing data
UPDATE screener SET has_volatility = has_volitility;

-- Add NOT NULL constraint
ALTER TABLE screener ALTER COLUMN has_volatility SET NOT NULL;
```

**Application Changes**:

- Update all write operations to set both `has_volitility` and `has_volatility`
- Continue reading from `has_volitility` for backward compatibility

**Verification**:

```sql
-- Verify data consistency
SELECT COUNT(*) FROM screener WHERE has_volitility != has_volatility;
-- Should return 0
```

**Rollback Plan Phase 1**:

```sql
-- Remove new column if needed
ALTER TABLE screener DROP COLUMN has_volatility;
```

### Phase 2: Switch Reads (Week 2)

**Goal**: Switch application to read from new column while maintaining dual-write

**Prerequisites**:

- Phase 1 completed successfully
- Data consistency verified for at least 1 week
- All application instances updated with dual-write logic

**Steps**:

1. Update application code to read from `has_volatility` instead of `has_volitility`
2. Continue dual-write to both columns
3. Deploy application changes
4. Monitor application performance and data consistency
5. Verify all functionality works with new column

**Application Changes**:

- Update all read operations to use `has_volatility`
- Continue writing to both columns
- Update API responses to use correct spelling

**Verification**:

```sql
-- Monitor query patterns
-- Ensure all reads use has_volatility column
```

**Rollback Plan Phase 2**:

- Revert application to read from `has_volitility`
- No database changes needed

### Phase 3: Remove Old Column (Week 3)

**Goal**: Remove the misspelled column and clean up code

**Prerequisites**:

- Phase 2 completed successfully
- Application reading from new column for at least 1 week
- No issues reported with new column usage

**Steps**:

1. Update application code to remove dual-write (only write to `has_volatility`)
2. Deploy application changes
3. Monitor for 24-48 hours
4. Create migration to drop old column
5. Apply database migration
6. Clean up any remaining references in code/docs

**Migration SQL**:

```sql
-- Remove old column
ALTER TABLE screener DROP COLUMN has_volitility;
```

**Application Changes**:

- Remove all references to `has_volitility`
- Update TypeScript interfaces and types
- Update any documentation or comments

**Verification**:

```sql
-- Verify column is removed
PRAGMA table_info(screener);
-- Should not show has_volitility column
```

**Rollback Plan Phase 3**:
⚠️ **WARNING**: This rollback requires downtime and data loss risk

```sql
-- Re-add old column
ALTER TABLE screener ADD COLUMN has_volitility Boolean;
-- Copy data back
UPDATE screener SET has_volitility = has_volatility;
-- Update application to use old column
```

## Timeline

- **Week 1**: Phase 1 implementation and verification
- **Week 2**: Phase 2 implementation and monitoring
- **Week 3**: Phase 3 implementation and cleanup

## Risk Assessment

- **Phase 1**: Low risk - only additive changes
- **Phase 2**: Medium risk - application behavior changes
- **Phase 3**: High risk - destructive changes, rollback requires downtime

## Testing Requirements

Each phase requires:

1. Unit tests for affected code paths
2. Integration tests for database operations
3. Manual testing of screener functionality
4. Performance testing for query impact
5. Data consistency verification

## Monitoring

Monitor the following during each phase:

- Database query performance
- Application error rates
- Data consistency between columns
- User functionality (screener features)
- System resource usage

## Communication Plan

- Notify stakeholders before each phase
- Document progress and any issues
- Provide status updates during deployment windows
- Alert on-call team of migration windows

## Success Criteria

- All screener functionality works correctly
- No performance degradation
- Data consistency maintained
- Old column successfully removed
- No references to misspelled field in codebase
