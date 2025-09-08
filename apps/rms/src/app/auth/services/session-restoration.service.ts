import { Injectable } from '@angular/core';

import { SessionConfig, SessionStatus } from './session-manager.service';
import { SessionMetadata } from './user-state.service';

export interface SessionRestorationResult {
  status: SessionStatus;
  shouldStartTimers: boolean;
  shouldShowWarning: boolean;
}

@Injectable({ providedIn: 'root' })
// eslint-disable-next-line @smarttools/one-exported-item-per-file -- Main service class with required interface
export class SessionRestorationService {
  /**
   * Determine session status from stored metadata
   */
  determineRestorationStatus(
    sessionMetadata: SessionMetadata,
    config: SessionConfig
  ): SessionRestorationResult {
    const now = Date.now();

    // Check if session is still valid
    if (
      sessionMetadata.expirationTime &&
      now > sessionMetadata.expirationTime.getTime()
    ) {
      return {
        status: SessionStatus.Expired,
        shouldStartTimers: false,
        shouldShowWarning: false,
      };
    }

    // Calculate remaining time and set appropriate status
    const sessionAge = now - sessionMetadata.loginTime.getTime();
    const sessionTimeoutMs = config.sessionTimeoutMinutes * 60 * 1000;
    const warningTimeMs = config.warningTimeMinutes * 60 * 1000;

    if (sessionAge >= sessionTimeoutMs) {
      return {
        status: SessionStatus.Expired,
        shouldStartTimers: false,
        shouldShowWarning: false,
      };
    }

    if (sessionAge >= sessionTimeoutMs - warningTimeMs) {
      return {
        status: SessionStatus.Warning,
        shouldStartTimers: false,
        shouldShowWarning: true,
      };
    }

    return {
      status: SessionStatus.Active,
      shouldStartTimers: true,
      shouldShowWarning: false,
    };
  }

  /**
   * Check if session has expired
   */
  isSessionExpired(
    sessionMetadata: SessionMetadata,
    config: SessionConfig
  ): boolean {
    const now = Date.now();

    // Check explicit expiration time
    if (
      sessionMetadata.expirationTime &&
      now > sessionMetadata.expirationTime.getTime()
    ) {
      return true;
    }

    // Check session timeout
    const sessionAge = now - sessionMetadata.loginTime.getTime();
    const sessionTimeoutMs = config.sessionTimeoutMinutes * 60 * 1000;

    return sessionAge >= sessionTimeoutMs;
  }

  /**
   * Check if session should show warning
   */
  shouldShowWarning(
    sessionMetadata: SessionMetadata,
    config: SessionConfig
  ): boolean {
    if (this.isSessionExpired(sessionMetadata, config)) {
      return false;
    }

    const now = Date.now();
    const sessionAge = now - sessionMetadata.loginTime.getTime();
    const sessionTimeoutMs = config.sessionTimeoutMinutes * 60 * 1000;
    const warningTimeMs = config.warningTimeMinutes * 60 * 1000;

    return sessionAge >= sessionTimeoutMs - warningTimeMs;
  }
}
