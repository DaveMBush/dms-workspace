import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';

export interface VolatilityResult {
  symbol: string;
  volatility1yr: 'decreasing' | 'increasing' | 'steady' | 'volatile' | null;
  volatility5yr: 'decreasing' | 'increasing' | 'steady' | 'volatile' | null;
}

@Injectable({ providedIn: 'root' })
export class VolatilityDataService {
  private readonly http = inject(HttpClient);
  private readonly _volatilityMap = signal<Map<string, VolatilityResult>>(
    new Map()
  );
  readonly volatilityMap = this._volatilityMap.asReadonly();

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
        service._volatilityMap.set(map);
      },
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- silently handle unavailability; vol cells remain empty
      error: function onVolatilityLoadError(): void {},
    });
  }
}
