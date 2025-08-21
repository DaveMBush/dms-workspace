import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';

import type { SyncSummary } from './universe-sync.types';



@Injectable({
  providedIn: 'root'
})
export class UniverseSyncService {
  private http = inject(HttpClient);

  // Loading state
  readonly isSyncing = signal<boolean>(false);

  // Last sync result
  readonly lastSyncResult = signal<SyncSummary | null>(null);

  // Last sync error
  readonly lastSyncError = signal<string | null>(null);

  syncFromScreener(): Observable<SyncSummary> {
    this.isSyncing.set(true);
    this.lastSyncError.set(null);

    return this.http.post<SyncSummary>('/api/universe/sync-from-screener', {}).pipe(
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- map function for RxJS pipe
      map(result => {
        if (result === null || result === undefined) {
          throw new Error('No response from sync operation');
        }
        return result;
      }),
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- tap function for RxJS pipe
      tap(result => {
        this.lastSyncResult.set(result);
        this.isSyncing.set(false);
      })
    );
  }

  // Clear last sync result and error
  clearSyncState(): void {
    this.lastSyncResult.set(null);
    this.lastSyncError.set(null);
  }
}
