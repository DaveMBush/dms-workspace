import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  EffectService,
  PartialArrayDefinition,
} from '@smarttools/smart-signals';
import { Observable } from 'rxjs';

import { RiskGroup } from './risk-group.interface';

@Injectable()
export class RiskGroupEffectsService extends EffectService<RiskGroup> {
  apiRiskGroup = './api/risk-group';
  private http = inject(HttpClient);

  override loadByIds(ids: string[]): Observable<RiskGroup[]> {
    return this.http.post<RiskGroup[]>(this.apiRiskGroup, ids);
  }

  override update(newRow: RiskGroup): Observable<RiskGroup[]> {
    return this.http.put<RiskGroup[]>(this.apiRiskGroup, newRow);
  }

  override add(row: RiskGroup): Observable<RiskGroup[]> {
    return this.http.post<RiskGroup[]>(this.apiRiskGroup + '/add', row);
  }

  override delete(id: string): Observable<void> {
    return this.http.delete<undefined>(`${this.apiRiskGroup}/${id}`);
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
