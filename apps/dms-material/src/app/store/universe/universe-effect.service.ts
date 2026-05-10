import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  EffectService,
  PartialArrayDefinition,
} from '@smarttools/smart-signals';
import { catchError, Observable, throwError } from 'rxjs';

import { NotificationService } from '../../shared/services/notification.service';
import { Universe } from './universe.interface';

@Injectable()
export class UniverseEffectsService extends EffectService<Universe> {
  private http = inject(HttpClient);
  private notification = inject(NotificationService);
  apiUniverse = './api/universe';

  override loadByIds(ids: string[]): Observable<Universe[]> {
    return this.http.post<Universe[]>(this.apiUniverse, ids);
  }

  override update(newRow: Universe): Observable<Universe[]> {
    return this.http.put<Universe[]>(this.apiUniverse, newRow);
  }

  override add(row: Universe): Observable<Universe[]> {
    return this.http.post<Universe[]>(this.apiUniverse + '/add', row);
  }

  override delete(id: string): Observable<void> {
    return this.http.delete<undefined>(`${this.apiUniverse}/${id}`).pipe(
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- arrow function required to capture `this`
      catchError((error: unknown) => {
        this.notification.error(
          'Error deleting universe, refreshing the parent row(s)'
        );
        // eslint-disable-next-line @smarttools/no-anonymous-functions -- arrow function required for throwError factory
        return throwError(() => error);
      })
    );
  }

  override loadByIndexes(
    _: string,
    __: string,
    ___: number,
    ____: number
  ): Observable<PartialArrayDefinition> {
    // intentionally unimplemented
    throw new Error('Method not implemented.');
  }
}
