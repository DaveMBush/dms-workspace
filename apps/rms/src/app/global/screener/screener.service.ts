import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Screen } from '../../store/screen/screen.interface';
import { selectScreen } from '../../store/screen/selectors/select-screen.function';

@Injectable()
export class ScreenerService {
  private http = inject(HttpClient);

  screens = computed(function screensCompute() {
    const screens = selectScreen();
    const screenReturn = [] as Screen[];
    for (let i = 0; i < screens.length; i++) {
      const screen = screens[i];
      screenReturn.push(screen);
    }
    screenReturn.sort(function screenSort(a, b) {
      const aScore =
        (a.graph_higher_before_2008 &&
        a.has_volitility &&
        a.objectives_understood
          ? 'z'
          : 'a') + a.symbol;
      const bScore =
        (b.graph_higher_before_2008 &&
        b.has_volitility &&
        b.objectives_understood
          ? 'z'
          : 'a') + b.symbol;

      return aScore.localeCompare(bScore);
    });
    return screenReturn;
  });

  refresh(): Observable<object> {
    return this.http.get('http://localhost:3000/api/screener');
  }

  updateScreener(id: string, field: keyof Screen, value: boolean): void {
    const screens = selectScreen();
    for (let i = 0; i < screens.length; i++) {
      const screen = screens[i] as unknown as Record<
        keyof Screen,
        boolean | string
      >;
      if (screen.id === id) {
        screen[field] = value;
        break;
      }
    }
  }
}
