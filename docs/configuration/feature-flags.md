# Feature Flag Configuration Guide

## Overview

This document describes the feature flag system implemented in the RMS workspace. As of Epic H, the screener-driven universe synchronization feature is now always enabled and no longer requires configuration.

## Current Status

### Universe Synchronization

**Status**: Always enabled (no longer configurable)

**Behavior**: The universe synchronization automatically uses screener data for symbol selection. The previous `USE_SCREENER_FOR_UNIVERSE` feature flag has been deprecated and removed.

**User Interface**: Users can now trigger universe updates directly from the Universe screen toolbar using the dedicated icon buttons.

## Environment Configuration

### Local Development

1. **Create Environment File**: Create a `.env` file in the workspace root:
   ```bash
   # .env
   DATABASE_URL=file:./database.db
   ```

2. **Server Configuration**: The server automatically reads environment variables from:
   - `.env` file (if present)
   - System environment variables
   - Process environment variables

3. **No Feature Flag Configuration**: Universe sync is always enabled and requires no additional configuration.

### Development Environment

1. **Environment Variables**: Only database configuration is required:
   ```bash
   export DATABASE_URL=your_database_url
   ```

2. **Docker/Container**: Database configuration only:
   ```dockerfile
   ENV DATABASE_URL=your_database_url
   ```

3. **Universe Sync**: Automatically enabled in all environments

### Production Environment

1. **Universe Sync**: Always enabled, no configuration required

2. **Monitoring**: Monitor logs for sync operations and verify universe data integrity

3. **Rollback**: Not applicable for universe sync feature (always enabled)

## Behavior by Environment

### Local Development
- **Universe Sync**: Always enabled
- **Database**: Uses local SQLite database
- **UI Controls**: Update icons available in Universe toolbar
- **Testing**: Safe to test sync operations

### Development/Staging
- **Universe Sync**: Always enabled
- **Database**: Separate development database
- **UI Controls**: Update icons available in Universe toolbar
- **Testing**: Safe to test sync behavior

### Production
- **Universe Sync**: Always enabled
- **Database**: Production database with real data
- **UI Controls**: Update icons available in Universe toolbar
- **Monitoring**: Continuous monitoring of sync operations

## Universe Update Operations

### Using the Universe Toolbar Controls

Universe updates are now managed directly from the Universe screen through two icon buttons in the toolbar:

1. **Update Fields Icon** (`pi-refresh`):
   - Updates individual fields in the universe
   - Performs targeted data refresh
   - Located in the Universe title bar

2. **Update Universe Icon** (`pi-sync`):
   - Performs full universe synchronization
   - Updates all universe data from screener
   - Located in the Universe title bar

### Operation Verification

After triggering updates via the toolbar icons:
- [ ] Universe data reflects latest screener information
- [ ] UI updates show progress indicators
- [ ] Sync operations complete successfully
- [ ] No error messages in browser console

## System Behavior

### Server Behavior
- **Universe Sync**: Always enabled automatically
- **Default Behavior**: Screener-driven universe management
- **No Configuration Required**: Sync functionality is built-in

### Frontend Behavior
- **UI State**: Update icons visible in Universe toolbar
- **Functionality**: Direct access to universe update operations
- **User Experience**: Simplified workflow without settings modal

### Database Impact
- **Automatic Sync**: Universe data stays current with screener
- **Update Operations**: Available through toolbar controls
- **Data Integrity**: Continuous synchronization ensures accuracy

## System Architecture

### Universe Sync Service
Universe synchronization is handled by dedicated services:

```typescript
// Universe sync is always enabled through direct service calls
// No feature flag validation required
```

### Frontend Implementation
The frontend provides direct access to universe operations through toolbar controls:

```typescript
// Universe update operations are triggered directly from the UI
// No feature flag checking required - always available
```

## Troubleshooting

### Common Issues

1. **Universe Update Icons Not Visible**:
   - Verify you're on the Universe screen
   - Check that the toolbar is properly rendered
   - Refresh the browser if icons don't appear

2. **Sync Operations Not Working**:
   - Check browser developer tools for API errors
   - Verify server connection is active
   - Check server logs for sync-related errors

3. **Database Connection Issues**:
   - Verify `DATABASE_URL` is set correctly
   - Check database file permissions
   - Ensure database is not locked by another process

### Debugging Commands

```bash
# Check server logs
pnpm nx run server:serve

# Verify database connection
pnpm nx run server:build:production

# Check if universe sync endpoints are responding
curl http://localhost:3000/api/universe/sync-from-screener
```

## Security Considerations

1. **Database Permissions**: Ensure database user has appropriate permissions for universe operations
2. **API Endpoints**: Universe sync endpoints are secured through authentication
3. **Audit Logging**: All universe sync operations are logged for audit purposes
4. **User Access**: Universe update controls are available to all authenticated users

## Related Documentation

- [Architecture Overview](../architecture/index.md) - System architecture
- [Universe Sync Implementation](../architecture/sequence-sync-from-screener.md) - Technical implementation details
- [User Guide](../user-experience/universe-update-journeys.md) - How to use universe update controls



