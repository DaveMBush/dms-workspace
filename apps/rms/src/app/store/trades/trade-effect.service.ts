import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  EffectService,
  PartialArrayDefinition,
} from '@smarttools/smart-signals';
import { Observable } from 'rxjs';

import { Trade } from './trade.interface';

@Injectable()
export class TradeEffectsService extends EffectService<Trade> {
  apiTrade = './api/trades';
  constructor(private http: HttpClient) {
    super();
  }

  override loadByIds(ids: string[]): Observable<Trade[]> {
    return this.http.post<Trade[]>(this.apiTrade, ids);
  }

  override update(newRow: Trade): Observable<Trade[]> {
    return this.http.put<Trade[]>(this.apiTrade, newRow);
  }

  override add(row: Trade): Observable<Trade[]> {
    return this.http.post<Trade[]>(this.apiTrade + '/add', row);
  }

  override delete(id: string): Observable<void> {
    return this.http.delete<undefined>(`${this.apiTrade}/${id}`);
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
