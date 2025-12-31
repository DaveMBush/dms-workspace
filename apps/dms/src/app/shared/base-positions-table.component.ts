import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';

interface PositionRow {
  id: string;
  symbol: string;
  [key: string]: unknown;
}

@Component({
  selector: 'dms-base-positions-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TableModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    FormsModule,
  ],
  templateUrl: './base-positions-table.component.html',
})
export abstract class BasePositionsTableComponent<T extends PositionRow> {
  @Input() data: T[] = [];
  @Input() tableClass =
    'flex-1 min-w-full max-h-full min-h-full rounded-lg shadow-sm table-fixed';

  @Input() scrollHeight = 'calc(100vh - 184px)';

  protected messageService = inject(MessageService);

  trackById(index: number, row: T): string {
    return row.id;
  }

  stopArrowKeyPropagation(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.stopPropagation();
    }
  }

  protected abstract getSortIcon(field: string): string;
  protected abstract getSortOrder(field: string): string;
  protected abstract onSort(field: string): void;
  protected abstract onEditCommit(row: T, field: string): void;
}
