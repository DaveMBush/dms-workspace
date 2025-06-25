import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable()
export class UpdateUniverseSettingsService {
  private http = inject(HttpClient);
  updateUniverse(equities: string, income: string, taxFreeIncome: string) {
    return this.http.post<void>('/api/settings', { equities, income, taxFreeIncome });
  }

  updateFields() {
    return this.http.get<void>('/api/settings/update');
  }
}
