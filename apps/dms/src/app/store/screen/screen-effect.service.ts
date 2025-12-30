import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  EffectService,
  PartialArrayDefinition,
} from '@smarttools/smart-signals';
import { Observable } from 'rxjs';

import { Screen } from './screen.interface';

@Injectable()
export class ScreenEffectsService extends EffectService<Screen> {
  apiScreen = './api/screener/rows';
  private http = inject(HttpClient);

  override loadByIds(ids: string[]): Observable<Screen[]> {
    return this.http.post<Screen[]>(this.apiScreen, ids);
  }

  override update(newRow: Screen): Observable<Screen[]> {
    return this.http.put<Screen[]>(this.apiScreen, newRow);
  }

  override add(_: Screen): Observable<Screen[]> {
    throw new Error('Not implemented');
  }

  override delete(_: string): Observable<void> {
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
