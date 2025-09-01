import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  EffectService,
  PartialArrayDefinition,
} from '@smarttools/smart-signals';
import { Observable } from 'rxjs';

import { Account } from './account.interface';

@Injectable()
export class AccountEffectsService extends EffectService<Account> {
  apiAccount = './api/accounts';
  private http = inject(HttpClient);

  override loadByIds(ids: string[]): Observable<Account[]> {
    return this.http.post<Account[]>(this.apiAccount, ids);
  }

  override update(newRow: Account): Observable<Account[]> {
    return this.http.put<Account[]>(this.apiAccount, newRow);
  }

  override add(row: Account): Observable<Account[]> {
    return this.http.post<Account[]>(this.apiAccount + '/add', row);
  }

  override delete(id: string): Observable<void> {
    return this.http.delete<undefined>(`${this.apiAccount}/${id}`);
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
