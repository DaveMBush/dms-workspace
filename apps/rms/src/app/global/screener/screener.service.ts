import { computed, inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { selectScreen } from '../../store/screen/screen.selectors';
import { Screen } from '../../store/screen/screen.interface';

@Injectable()
export class ScreenerService {
  private http = inject(HttpClient);

  screens = computed(() => {
    const screens = selectScreen();
    const screenReturn = [] as Screen[];
    for(let i = 0; i < screens.length; i++) {
      const screen = screens[i];
      screenReturn.push(screen);
    }
    screenReturn.sort((a, b) => {
      const aScore = (a.graph_higher_before_2008 && a.has_volitility && a.objectives_understood ? 'z' : 'a') + a.symbol;
      const bScore = (b.graph_higher_before_2008 && b.has_volitility && b.objectives_understood ? 'z' : 'a') + b.symbol;

      return aScore.localeCompare(bScore)
    });
    return screenReturn;
  });

  refresh() {
    return this.http.get('http://localhost:3000/api/screener');
  }

  updateScreener(id: string, field: keyof Screen, value: boolean) {
    const screens = selectScreen();
    for(let i = 0; i < screens.length; i++) {
      const screen = screens[i]  as unknown as Record<keyof Screen, boolean | string>;
      if(screen.id === id) {
        screen[field] = value;
        break;
      }
    }
  }
}
