import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FeatureFlagsService {
  private http = inject(HttpClient);
  
  // Default to false for safety
  private useScreenerForUniverse = signal<boolean>(false);
  
  // Computed signal for the feature flag
  readonly isUseScreenerForUniverseEnabled = computed(() => this.useScreenerForUniverse());
  
  constructor() {
    // Initialize feature flags asynchronously
    void this.initializeFeatureFlags();
  }
  
  private async initializeFeatureFlags(): Promise<void> {
    await this.checkFeatureFlags();
  }
  
  private async checkFeatureFlags(): Promise<void> {
    try {
      // Check if the feature is enabled by calling the sync endpoint
      // If it returns 403, the feature is disabled
      // If it returns 200, the feature is enabled
      await firstValueFrom(this.http.post('http://localhost:3000/api/universe/sync-from-screener', {}, { 
        observe: 'response' 
      }));
      
      // If we get a response (not 403), the feature is enabled
      this.useScreenerForUniverse.set(true);
    } catch (error: unknown) {
      // If we get a 403 error, the feature is disabled
      if (error && typeof error === 'object' && 'status' in error && error.status === 403) {
        this.useScreenerForUniverse.set(false);
      } else {
        // For any other error, default to disabled for safety
        this.useScreenerForUniverse.set(false);
      }
    }
  }
  
  // Method to manually refresh feature flags
  async refreshFeatureFlags(): Promise<void> {
    await this.checkFeatureFlags();
  }
}
