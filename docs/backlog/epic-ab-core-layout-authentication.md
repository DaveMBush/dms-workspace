# Epic AB: Core Layout & Authentication Migration

## Epic Goal

Migrate the core application shell, navigation, and authentication components from PrimeNG to Angular Material, establishing the foundational UI structure for all other features.

## Epic Description

**Existing System Context:**

- Current relevant functionality: Shell component with toolbar, splitter layout, account list, and authentication flows
- Technology stack: Angular 20, PrimeNG (p-toolbar, p-splitter, p-dialog, p-toast, p-listbox, p-password, p-button)
- Integration points: Auth guards, auth interceptors, session management, navigation routing

**Enhancement Details:**

- What's being changed: Replace all PrimeNG components with Angular Material equivalents
- How it integrates: Same routing structure, same auth flow, Material UI components
- Success criteria: Full authentication flow working with Material components, shell layout functional

## Stories

1. **Story AB.1:** Migrate Shell Component (toolbar, splitter, navigation)
2. **Story AB.2:** Migrate Login Component
3. **Story AB.3:** Migrate Profile Components (profile page, password change, email change)
4. **Story AB.4:** Migrate Session Warning Dialog
5. **Story AB.5:** Migrate Account List Component

## Compatibility Requirements

- [x] Auth flow identical to existing application
- [x] Same route guards (authGuard, guestGuard) used
- [x] Same HTTP interceptor for JWT tokens
- [x] Session timeout behavior preserved
- [x] Theme toggle accessible from shell

## Technical Constraints

- Must use Angular Material components exclusively
- Custom splitter component needed (no direct Material equivalent)
- MatDialog for all modal dialogs
- MatSnackBar for toast notifications
- No PrimeNG imports in any migrated component

## Success Metrics

- User can log in and log out
- Session warning appears before timeout
- Profile can be viewed and edited
- Shell layout displays correctly with accounts list
- Theme toggle works from toolbar
- All auth-protected routes work correctly

## Dependencies

- **Epic AA** - Project setup must be complete

## Risk Assessment

**Risk Level:** Medium

**Risks:**

1. Custom splitter component may not match PrimeNG splitter behavior exactly
   - Mitigation: Use CDK drag/drop for resize functionality
2. Dialog paradigm different (imperative vs declarative)
   - Mitigation: Create wrapper services for consistent API
3. Toast notification API different
   - Mitigation: Create notification service wrapping MatSnackBar

## Impact Analysis

**Components Created:**

- `shell/shell.component.ts` - Main application shell
- `shell/components/splitter.component.ts` - Custom splitter
- `auth/login/login.ts` - Login page
- `auth/profile/profile.ts` - Profile page
- `auth/profile/components/password-change-card.ts` - Password change
- `auth/profile/components/email-change-card.ts` - Email change
- `auth/components/session-warning/session-warning.ts` - Session dialog
- `accounts/account.ts` - Account list

**Services Created:**

- `shared/services/notification.service.ts` - Toast wrapper
- `shared/services/confirm-dialog.service.ts` - Confirm dialog wrapper

## Priority

**Critical** - Core navigation and auth required before feature migration

## Estimated Effort

2-3 business days

## Definition of Done

- [ ] Shell component migrated with Material toolbar
- [ ] Custom splitter component functional
- [ ] Login page fully functional with Material forms
- [ ] Profile page with password/email change working
- [ ] Session warning dialog working
- [ ] Account list displaying and selecting accounts
- [ ] Theme toggle in toolbar working
- [ ] All auth flows tested and working
- [ ] All validation commands pass
