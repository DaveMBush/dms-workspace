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

function getTableName(url: string): string | null {
  for (const [endpoint, table] of Object.entries(SORTABLE_ENDPOINTS)) {
    if (url.includes(endpoint)) {
      return table;
    }
  }
  return null;
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

  const cloned = req.clone({
    setHeaders: {
      'X-Sort-Field': sortState.field,
      'X-Sort-Order': sortState.order,
    },
  });

  return next(cloned);
};
