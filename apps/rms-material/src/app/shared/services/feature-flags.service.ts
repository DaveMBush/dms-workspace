import { Injectable } from '@angular/core';

/**
 * Feature Flags Service
 *
 * Shell service maintained for potential future feature flag implementations.
 *
 * Note: As of Epic H, universe synchronization is always enabled and no longer
 * uses feature flags. The previous USE_SCREENER_FOR_UNIVERSE flag has been
 * removed in favor of always-on functionality with direct UI controls.
 */
@Injectable({
  providedIn: 'root',
})
export class FeatureFlagsService {
  // Service maintained as shell for future feature flag implementations
}
