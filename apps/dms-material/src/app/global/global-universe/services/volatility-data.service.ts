import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';

import { VolatilityResult } from './volatility-result.interface';

@Injectable({ providedIn: 'root' })
export class VolatilityDataService {
  private readonly http = inject(HttpClient);

  private readonly volatilityMapSignal = signal<Map<string, VolatilityResult>>(
    new Map()
  );

  readonly volatilityMap = this.volatilityMapSignal.asReadonly();

  constructor() {
    this.loadVolatilityData();
  }

  private loadVolatilityData(): void {
    const service = this;
    this.http.get<VolatilityResult[]>('/api/universe/volatility').subscribe({
      next: function onVolatilityLoaded(results: VolatilityResult[]): void {
        const map = new Map<string, VolatilityResult>();
        for (const result of results) {
          map.set(result.symbol, result);
        }
        service.volatilityMapSignal.set(map);
      },
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- silently handle unavailability; vol cells remain empty
      error: function onVolatilityLoadError(): void {},
    });
  }
}
