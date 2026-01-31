import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { SymbolOption } from '../components/symbol-autocomplete/symbol-option.interface';

@Injectable({
  providedIn: 'root',
})
export class SymbolSearchService {
  // eslint-disable-next-line unused-imports/no-unused-vars -- TDD RED phase stub parameter
  searchSymbols(query: string): Observable<SymbolOption[]> {
    throw new Error('Not implemented - TDD RED phase');
  }
}
