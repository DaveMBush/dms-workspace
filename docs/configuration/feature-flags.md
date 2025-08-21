# Feature Flag Configuration Guide

## Overview

This document describes the feature flag system implemented in the RMS workspace, specifically focusing on the `USE_SCREENER_FOR_UNIVERSE` flag that controls the screener-driven universe synchronization feature.

## Feature Flags

### USE_SCREENER_FOR_UNIVERSE

**Purpose**: Controls whether the universe synchronization uses the screener data for symbol selection instead of manual input.

**Default Value**: `false` (manual universe management)

**Accepted Values**:
- `true` - Enable screener-driven universe sync
- `false` - Use manual universe management (default)
- Any other value - Treated as `false`

## Environment Configuration

### Local Development

1. **Create Environment File**: Create a `.env` file in the workspace root:
   ```bash
   # .env
   USE_SCREENER_FOR_UNIVERSE=true
   DATABASE_URL=file:./database.db
   ```

2. **Server Configuration**: The server automatically reads environment variables from:
   - `.env` file (if present)
   - System environment variables
   - Process environment variables

3. **Frontend Configuration**: The frontend automatically detects feature flags via the `/api/feature-flags` endpoint.

### Development Environment

1. **Environment Variables**: Set in your deployment configuration:
   ```bash
   export USE_SCREENER_FOR_UNIVERSE=true
   ```

2. **Docker/Container**: Add to your container environment:
   ```dockerfile
   ENV USE_SCREENER_FOR_UNIVERSE=true
   ```

3. **Kubernetes**: Add to your deployment YAML:
   ```yaml
   env:
   - name: USE_SCREENER_FOR_UNIVERSE
     value: "true"
   ```

### Production Environment

1. **Safe Toggling**:
   - **Enable**: Set `USE_SCREENER_FOR_UNIVERSE=true` and restart the server
   - **Disable**: Set `USE_SCREENER_FOR_UNIVERSE=false` and restart the server

2. **Rollback Procedure**: See [Rollback Runbook](../rollback-runbook.md) for detailed steps

3. **Monitoring**: Monitor logs for sync operations and verify universe data integrity

## Behavior by Environment

### Local Development
- **Feature Flag**: Can be easily toggled via `.env` file
- **Database**: Uses local SQLite database
- **Testing**: Safe to experiment with different flag values
- **Restart Required**: Yes, after changing `.env` file

### Development/Staging
- **Feature Flag**: Set via environment variables
- **Database**: Separate development database
- **Testing**: Safe to test feature behavior
- **Restart Required**: Yes, after changing environment variables

### Production
- **Feature Flag**: Set via environment variables
- **Database**: Production database with real data
- **Testing**: Feature should be thoroughly tested before enabling
- **Restart Required**: Yes, after changing environment variables
- **Rollback Plan**: Must have rollback procedure ready

## Safe Toggling Procedures

### Enabling the Feature

1. **Pre-enablement Checklist**:
   - [ ] Feature has been tested in development/staging
   - [ ] Rollback procedure is documented and tested
   - [ ] Monitoring and alerting are in place
   - [ ] Team is available for potential issues

2. **Enablement Steps**:
   ```bash
   # Set the feature flag
   export USE_SCREENER_FOR_UNIVERSE=true

   # Restart the server
   pnpm nx run server:serve
   ```

3. **Verification**:
   - [ ] Feature flag endpoint returns `{"useScreenerForUniverse": true}`
   - [ ] UI shows "Use Screener" button in Universe Settings
   - [ ] Manual input fields are hidden
   - [ ] Universe sync operations work correctly

### Disabling the Feature

1. **Pre-disablement Checklist**:
   - [ ] No active sync operations are running
   - [ ] Universe data is in a known good state
   - [ ] Team is available for verification

2. **Disablement Steps**:
   ```bash
   # Set the feature flag to false
   export USE_SCREENER_FOR_UNIVERSE=false

   # Restart the server
   pnpm nx run server:serve
   ```

3. **Verification**:
   - [ ] Feature flag endpoint returns `{"useScreenerForUniverse": false}`
   - [ ] UI shows manual input fields in Universe Settings
   - [ ] "Use Screener" button is hidden
   - [ ] Manual universe management works as expected

## What Happens When Flags Aren't Set

### Server Behavior
- **Missing Environment Variable**: Treated as `false`
- **Invalid Values**: Any value other than `"true"` is treated as `false`
- **Default Behavior**: Manual universe management mode

### Frontend Behavior
- **API Response**: `{"useScreenerForUniverse": false}`
- **UI State**: Manual input fields visible, "Use Screener" button hidden
- **Functionality**: Original manual universe management workflow

### Database Impact
- **No Changes**: Existing universe data remains unchanged
- **No Sync Operations**: Screener sync operations are not available
- **Manual Operations**: All manual universe operations continue to work

## Configuration Validation

### Server Startup Validation
The server validates the feature flag configuration on startup:

```typescript
// From apps/server/src/app/routes/feature-flags/index.ts
export default function registerFeatureFlagsRoutes(fastify: FastifyInstance): void {
  fastify.get('/', function handleGetFeatureFlags() {
    return {
      useScreenerForUniverse: process.env.USE_SCREENER_FOR_UNIVERSE === 'true'
    };
  });
}
```

### Frontend Validation
The frontend automatically detects and responds to feature flag changes:

```typescript
// From apps/rms/src/app/shared/services/feature-flags.service.ts
readonly isUseScreenerForUniverseEnabled = computed(() => {
  const result = this.featureFlagsResource.value();
  return result?.useScreenerForUniverse ?? false;
});
```

## Troubleshooting

### Common Issues

1. **Feature Flag Not Taking Effect**:
   - Verify environment variable is set correctly
   - Restart the server after changing the flag
   - Check for typos in the variable name

2. **Frontend Not Responding to Changes**:
   - Clear browser cache
   - Check browser developer tools for API errors
   - Verify the feature flags endpoint is accessible

3. **Database Connection Issues**:
   - Verify `DATABASE_URL` is set correctly
   - Check database file permissions
   - Ensure database is not locked by another process

### Debugging Commands

```bash
# Check current environment variables
echo $USE_SCREENER_FOR_UNIVERSE

# Test feature flags endpoint
curl http://localhost:3000/api/feature-flags

# Check server logs
pnpm nx run server:serve

# Verify database connection
pnpm nx run server:build:production
```

## Security Considerations

1. **Environment Variable Access**: Only authorized personnel should have access to modify environment variables
2. **Database Permissions**: Ensure database user has appropriate permissions
3. **API Endpoints**: Feature flags endpoint is public but only returns boolean values
4. **Audit Logging**: All universe sync operations are logged for audit purposes

## Related Documentation

- [Rollback Runbook](../rollback-runbook.md) - Emergency rollback procedures
- [Architecture Overview](../architecture/index.md) - System architecture
- [Universe Sync Implementation](../architecture/sequence-sync-from-screener.md) - Technical implementation details


