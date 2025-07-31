import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable()
export class UpdateUniverseSettingsService {
  private http = inject(HttpClient);
  updateUniverse(equities: string, income: string, taxFreeIncome: string): Observable<void> {
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- should be allowed but isn't working
    return this.http.post<void>('/api/settings', { equities, income, taxFreeIncome });
  }

  updateFields(): Observable<void> {
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- should be allowed but isn't working
    return this.http.get<void>('/api/settings/update');
  }
}
