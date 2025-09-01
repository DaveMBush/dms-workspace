import {
  ChangeDetectionStrategy,
  Component,
  model,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'rms-symbol-filter-header',
  templateUrl: './symbol-filter-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InputTextModule],
})
export class SymbolFilterHeaderComponent {
  symbolFilter = model.required<string>();
  readonly filterChange = output();
}
