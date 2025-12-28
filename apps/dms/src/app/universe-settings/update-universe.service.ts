import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable()
export class UpdateUniverseSettingsService {
  private http = inject(HttpClient);

  updateFields(): Observable<void> {
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- should be allowed but isn't working
    return this.http.get<void>('/api/settings/update');
  }
}
