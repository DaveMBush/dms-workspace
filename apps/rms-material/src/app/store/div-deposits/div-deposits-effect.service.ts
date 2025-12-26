import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  EffectService,
  PartialArrayDefinition,
} from '@smarttools/smart-signals';
import { Observable } from 'rxjs';

import { DivDeposit } from './div-deposit.interface';

@Injectable()
export class DivDepositsEffectsService extends EffectService<DivDeposit> {
  apiDivDeposits = './api/div-deposits';
  private http = inject(HttpClient);

  override loadByIds(ids: string[]): Observable<DivDeposit[]> {
    return this.http.post<DivDeposit[]>(this.apiDivDeposits, ids);
  }

  override update(newRow: DivDeposit): Observable<DivDeposit[]> {
    return this.http.put<DivDeposit[]>(this.apiDivDeposits, newRow);
  }

  override add(row: DivDeposit): Observable<DivDeposit[]> {
    return this.http.post<DivDeposit[]>(this.apiDivDeposits + '/add', row);
  }

  override delete(id: string): Observable<void> {
    return this.http.delete<undefined>(`${this.apiDivDeposits}/${id}`);
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
