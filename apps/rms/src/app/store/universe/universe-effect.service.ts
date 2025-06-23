import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  EffectService,
  PartialArrayDefinition,
} from '@smarttools/smart-signals';
import { Observable } from 'rxjs';

import { Universe } from './universe.interface';

@Injectable()
export class UniverseEffectsService extends EffectService<Universe> {
  apiUniverse = './api/universe';
  constructor(private http: HttpClient) {
    super();
  }

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
    return this.http.delete<undefined>(`${this.apiUniverse}/${id}`);
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
