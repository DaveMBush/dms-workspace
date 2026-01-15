import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Sort } from '@angular/material/sort';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { of } from 'rxjs';

import { BaseTableComponent } from '../../shared/components/base-table/base-table.component';
import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { GlobalLoadingService } from '../../shared/services/global-loading.service';
import { NotificationService } from '../../shared/services/notification.service';
import { Screen } from '../../store/screen/screen.interface';
import { selectScreen } from '../../store/screen/selectors/select-screen.function';
import { ScreenCellEditEvent } from './screen-cell-edit-event.interface';
import { ScreenerService } from './services/screener.service';

@Component({
  selector: 'dms-global-screener',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatTooltipModule,
    BaseTableComponent,
  ],
  templateUrl: './global-screener.component.html',
  styleUrl: './global-screener.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalScreenerComponent implements AfterViewInit {
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly notification = inject(NotificationService);
  private readonly screenerService = inject(ScreenerService);

  readonly cellEdit = output<ScreenCellEditEvent>();
  readonly loading = this.screenerService.loading;
  readonly error = this.screenerService.error;

  readonly riskGroupFilter$ = signal<string | null>(null);
  readonly sortField$ = signal<string>('symbol');
  readonly sortDirection$ = signal<'' | 'asc' | 'desc'>('asc');

  @ViewChild(BaseTableComponent) table!: BaseTableComponent<Screen>;

  readonly columns: ColumnDef[] = [
    { field: 'symbol', header: 'Symbol', sortable: true, width: '100px' },
    {
      field: 'risk_group',
      header: 'Risk Group',
      sortable: true,
      width: '120px',
    },
    {
      field: 'has_volitility',
      header: 'Has Volatility',
      type: 'boolean',
      width: '120px',
    },
    {
      field: 'objectives_understood',
      header: 'Objectives Understood',
      type: 'boolean',
      width: '160px',
    },
    {
      field: 'graph_higher_before_2008',
      header: 'Graph Higher Before 2008',
      type: 'boolean',
      width: '180px',
    },
  ];

  readonly riskGroups = [
    { label: 'Equities', value: 'Equities' },
    { label: 'Income', value: 'Income' },
    { label: 'Tax Free Income', value: 'Tax Free Income' },
  ];

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal
  readonly filteredData$ = computed(() => {
    const rawData = selectScreen();
    if (!Array.isArray(rawData)) {
      return [];
    }
    const riskGroupFilter = this.riskGroupFilter$();
    let filtered = rawData;
    if (riskGroupFilter !== null) {
      filtered = rawData.filter(function filterByRiskGroup(row) {
        return row.risk_group === riskGroupFilter;
      });
    }
    return this.sortScreens(filtered);
  });

  ngAfterViewInit(): void {
    const context = this;
    this.table.initDataSource(function loadScreenData() {
      const data = context.filteredData$();
      return of({ data, total: data.length });
    });
  }

  refreshTable(): void {
    this.table?.refresh();
  }

  onSortChange(sort: Sort): void {
    this.sortField$.set(sort.active);
    this.sortDirection$.set(sort.direction);
    this.refreshTable();
  }

  onRefresh(): void {
    this.globalLoading.show('Refreshing screener data...');
    const context = this;
    this.screenerService.refresh().subscribe({
      next: function handleRefresh() {
        const errorValue = context.screenerService.error();
        if (errorValue === null || errorValue === '') {
          context.notification.show('Screener data refreshed successfully');
          context.refreshTable();
        }
        context.globalLoading.hide();
      },
      error: function handleError() {
        context.globalLoading.hide();
      },
    });
  }

  onRiskGroupFilterChange(value: string | null): void {
    this.riskGroupFilter$.set(value);
    this.refreshTable();
  }

  onCellEdit(row: Screen, field: string, value: unknown): void {
    this.cellEdit.emit({ row, field, value });
  }

  getCefConnectUrl(symbol: string): string {
    return `https://www.cefconnect.com/fund/${symbol}`;
  }

  sortScreens(screens: Screen[]): Screen[] {
    const screenReturn = [...screens];
    screenReturn.sort(function screenSort(a, b) {
      const aAllChecked =
        a.graph_higher_before_2008 &&
        a.has_volitility &&
        a.objectives_understood;
      const bAllChecked =
        b.graph_higher_before_2008 &&
        b.has_volitility &&
        b.objectives_understood;
      const aScore = (aAllChecked ? 'a' : 'z') + a.symbol;
      const bScore = (bAllChecked ? 'a' : 'z') + b.symbol;
      return aScore.localeCompare(bScore);
    });
    return screenReturn;
  }
}
