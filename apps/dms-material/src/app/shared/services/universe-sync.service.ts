import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';

import type { SyncSummary } from './universe-sync.types';

/**
 * Universe Sync Service
 *
 * Handles universe synchronization operations with the external screener service.
 * This service is always enabled and no longer depends on feature flags.
 *
 * As of Epic H, universe synchronization is always available and can be triggered
 * directly from the UI through icon-based controls in the Universe toolbar.
 *
 * Features:
 * - Always-enabled sync functionality (no feature flag dependency)
 * - Real-time sync status tracking via signals
 * - Direct API communication with screener service
 * - Observable-based data flow with error handling
 */
@Injectable({
  providedIn: 'root',
})
export class UniverseSyncService {
  private http = inject(HttpClient);

  // Loading state
  readonly isSyncing = signal<boolean>(false);

  syncFromScreener(): Observable<SyncSummary> {
    this.isSyncing.set(true);

    return this.http
      .post<SyncSummary>('/api/universe/sync-from-screener', {})
      .pipe(
        map(function validateSyncResult(result) {
          if (result === null || result === undefined) {
            throw new Error('No response from sync operation');
          }
          return result;
        }),
        // eslint-disable-next-line @smarttools/no-anonymous-functions -- tap function for RxJS pipe, false positive deprecation warning
        tap(() => {
          this.isSyncing.set(false);
        })
      );
  }
}
