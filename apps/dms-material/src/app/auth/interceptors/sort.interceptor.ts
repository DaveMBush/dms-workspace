import {
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

import { SortFilterStateService } from '../../shared/services/sort-filter-state.service';
import { TableState } from '../../shared/services/table-state.interface';

const FIELD_NAME_MAP: Record<string, Record<string, string>> = {
  universes: {
    risk_group: 'risk_group',
  },
  'trades-open': {
    buyDate: 'openDate',
  },
  'trades-closed': {
    sell_date: 'closeDate',
  },
};

function mapSortField(tableName: string, frontendField: string): string {
  const tableMap = FIELD_NAME_MAP[tableName];
  if (tableMap === undefined) {
    return frontendField;
  }
  return tableMap[frontendField] ?? frontendField;
}

function buildMappedEntry(
  table: string,
  tableState: TableState
): TableState | null {
  const entry: TableState = {};
  if (tableState.sort !== undefined) {
    const serverField = mapSortField(table, tableState.sort.field);
    entry.sort = { field: serverField, order: tableState.sort.order };
  }
  if (tableState.filters !== undefined) {
    entry.filters = tableState.filters;
  }
  return entry.sort !== undefined || entry.filters !== undefined ? entry : null;
}

function buildMappedState(
  allState: Record<string, TableState>
): Record<string, TableState> {
  const mapped: Record<string, TableState> = {};
  for (const [table, tableState] of Object.entries(allState)) {
    const entry = buildMappedEntry(table, tableState);
    if (entry !== null) {
      mapped[table] = entry;
    }
  }
  return mapped;
}

export const sortInterceptor: HttpInterceptorFn = function sortInterceptorImpl(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const sortFilterStateService = inject(SortFilterStateService);
  const allState = sortFilterStateService.loadAllSortFilterState();

  if (Object.keys(allState).length === 0) {
    return next(req);
  }

  const mapped = buildMappedState(allState);

  if (Object.keys(mapped).length === 0) {
    return next(req);
  }
  const cloned = req.clone({
    setHeaders: {
      'X-Sort-Filter-State': JSON.stringify(mapped),
    },
  });
  return next(cloned);
};
