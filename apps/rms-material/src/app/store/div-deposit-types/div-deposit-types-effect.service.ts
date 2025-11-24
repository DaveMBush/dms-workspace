import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  EffectService,
  PartialArrayDefinition,
} from '@smarttools/smart-signals';
import { Observable } from 'rxjs';

import { DivDepositType } from './div-deposit-type.interface';

@Injectable()
export class DivDepositTypesEffectsService extends EffectService<DivDepositType> {
  apiDivDepositTypes = './api/div-deposit-types';
  private http = inject(HttpClient);

  override loadByIds(ids: string[]): Observable<DivDepositType[]> {
    return this.http.post<DivDepositType[]>(this.apiDivDepositTypes, ids);
  }

  override update(newRow: DivDepositType): Observable<DivDepositType[]> {
    return this.http.put<DivDepositType[]>(this.apiDivDepositTypes, newRow);
  }

  override add(row: DivDepositType): Observable<DivDepositType[]> {
    return this.http.post<DivDepositType[]>(
      this.apiDivDepositTypes + '/add',
      row
    );
  }

  override delete(id: string): Observable<void> {
    return this.http.delete<undefined>(`${this.apiDivDepositTypes}/${id}`);
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
