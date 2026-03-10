import {
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

import { SortStateService } from '../../shared/services/sort-state.service';

const SORTABLE_ENDPOINTS: Record<string, string> = {
  '/api/universe': 'universes',
  '/api/trades/open': 'trades-open',
  '/api/trades/closed': 'trades-closed',
};

const FIELD_NAME_MAP: Record<string, Record<string, string>> = {
  universes: {
    symbol: 'symbol',
    risk_group: 'name',
  },
  'trades-open': {
    buyDate: 'openDate',
    unrealizedGain: 'unrealizedGain',
  },
  'trades-closed': {
    sell_date: 'closeDate',
  },
};

function getTableName(url: string): string | null {
  for (const [endpoint, table] of Object.entries(SORTABLE_ENDPOINTS)) {
    if (url.includes(endpoint)) {
      return table;
    }
  }
  return null;
}

function mapFieldName(tableName: string, frontendField: string): string | null {
  const tableMap = FIELD_NAME_MAP[tableName];
  if (tableMap === undefined) {
    return null;
  }
  return tableMap[frontendField] ?? null;
}

export const sortInterceptor: HttpInterceptorFn = function sortInterceptorImpl(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const sortStateService = inject(SortStateService);
  const tableName = getTableName(req.url);

  if (tableName === null) {
    return next(req);
  }

  if (req.method !== 'GET') {
    return next(req);
  }

  const sortState = sortStateService.loadSortState(tableName);

  if (!sortState) {
    return next(req);
  }

  const serverField = mapFieldName(tableName, sortState.field);

  if (serverField === null) {
    return next(req);
  }

  const cloned = req.clone({
    setParams: {
      sortBy: serverField,
      sortOrder: sortState.order,
    },
  });

  return next(cloned);
};
