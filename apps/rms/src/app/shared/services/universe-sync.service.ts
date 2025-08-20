import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

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
  
  async syncFromScreener(): Promise<SyncSummary> {
    this.isSyncing.set(true);
    this.lastSyncError.set(null);
    
    try {
      const result = await firstValueFrom(this.http.post<SyncSummary>(
        'http://localhost:3000/api/universe/sync-from-screener',
        {}
      ));
      
      if (!result) {
        throw new Error('No response from sync operation');
      }
      
      this.lastSyncResult.set(result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.lastSyncError.set(errorMessage);
      throw error;
    } finally {
      this.isSyncing.set(false);
    }
  }
  
  // Clear last sync result and error
  clearSyncState(): void {
    this.lastSyncResult.set(null);
    this.lastSyncError.set(null);
  }
}
