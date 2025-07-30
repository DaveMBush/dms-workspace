import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  EffectService,
  PartialArrayDefinition,
} from '@smarttools/smart-signals';
import { Observable } from 'rxjs';

import { Screen } from './screen.interface';

@Injectable()
export class ScreenEffectsService extends EffectService<Screen> {
  apiScreen = './api/screener/rows';
  constructor(private http: HttpClient) {
    super();
  }

  override loadByIds(ids: string[]): Observable<Screen[]> {
    return this.http.post<Screen[]>(this.apiScreen, ids);
  }

  override update(newRow: Screen): Observable<Screen[]> {
    return this.http.put<Screen[]>(this.apiScreen, newRow);
  }

  override add(row: Screen): Observable<Screen[]> {
    throw new Error('Not implemented');
  }

  override delete(id: string): Observable<void> {
    throw new Error('Not implemented');
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
