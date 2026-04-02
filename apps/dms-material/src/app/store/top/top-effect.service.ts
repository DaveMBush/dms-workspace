import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  EffectService,
  PartialArrayDefinition,
} from '@smarttools/smart-signals';
import { Observable, of } from 'rxjs';

import { Top } from './top.interface';

@Injectable()
export class TopEffectsService extends EffectService<Top> {
  private apiTop = './api/top';

  private http = inject(HttpClient);

  override loadByIds(ids: string[]): Observable<Top[]> {
    return this.http.post<Top[]>(this.apiTop, ids);
  }

  override loadByIndexes(
    parentId: string,
    childField: string,
    startIndex: number,
    length: number
  ): Observable<PartialArrayDefinition> {
    return this.http.post<PartialArrayDefinition>(this.apiTop + '/indexes', {
      parentId,
      childField,
      startIndex,
      length,
    });
  }

  override update(_: Top): Observable<Top[]> {
    return of([]);
  }

  override add(_: Top): Observable<Top[]> {
    return of([]);
  }

  override delete(_: string): Observable<void> {
    return of();
  }
}
