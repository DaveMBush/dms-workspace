import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import { SymbolFilterHeaderComponent } from './symbol-filter-header.component';

/**
 * Common imports for position-related components
 */
export const POSITIONS_COMMON_IMPORTS = [
  CommonModule,
  FormsModule,
  ButtonModule,
  DatePickerModule,
  InputNumberModule,
  TableModule,
  ToastModule,
  SymbolFilterHeaderComponent,
] as const;
