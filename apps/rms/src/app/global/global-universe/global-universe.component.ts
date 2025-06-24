import { Component } from '@angular/core';
import { ToolbarModule } from 'primeng/toolbar';
import { TableModule } from 'primeng/table';
import { selectUniverse } from './universe.selector';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-global-universe',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ToolbarModule, TableModule, DatePickerModule, FormsModule],
  templateUrl: './global-universe.component.html',
  styleUrls: ['./global-universe.component.scss'],
})
export class GlobalUniverseComponent {
  public readonly universe$ = selectUniverse;
  public readonly today = new Date();
}
