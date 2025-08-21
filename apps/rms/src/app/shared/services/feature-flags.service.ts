import { httpResource } from '@angular/common/http';
import { computed, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FeatureFlagsService {
    // Use httpResource for reactive HTTP requests
  private featureFlagsResource = httpResource<{ useScreenerForUniverse: boolean }>(function getResource() {
    return {
      url: '/api/feature-flags'
    }
  });

  // Computed signal for the feature flag
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  readonly isUseScreenerForUniverseEnabled = computed(() => {
    const result = this.featureFlagsResource.value();
    return result?.useScreenerForUniverse ?? false;
  });

  // Method to manually refresh feature flags
  refreshFeatureFlags(): void {
    this.featureFlagsResource.set(undefined); // Trigger refresh
  }
}
