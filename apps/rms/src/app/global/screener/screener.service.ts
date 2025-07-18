import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class ScreenerService {
  private http = inject(HttpClient);

  refresh() {
    return this.http.get('http://localhost:3000/api/screener');
  }
}
