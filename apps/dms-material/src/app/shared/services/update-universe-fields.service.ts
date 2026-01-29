import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { finalize, map, Observable } from 'rxjs';

import type { UpdateFieldsSummary } from './update-universe-fields.types';

/**
 * Update Universe Fields Service
 *
 * Handles updating price and distribution information for universe entries.
 */
@Injectable({
  providedIn: 'root',
})
export class UpdateUniverseFieldsService {
  private http = inject(HttpClient);

  readonly isUpdating = signal<boolean>(false);

  updateFields(): Observable<UpdateFieldsSummary> {
    this.isUpdating.set(true);

    return this.http
      .get<UpdateFieldsSummary>('/api/settings/update', {})
      .pipe(
        map(function validateUpdateResult(result) {
          if (result === null || result === undefined) {
            throw new Error('No response from update operation');
          }
          return result;
        }),
        // eslint-disable-next-line @smarttools/no-anonymous-functions -- finalize operator requires inline function
        finalize(() => {
          this.isUpdating.set(false);
        })
      );
  }
}
