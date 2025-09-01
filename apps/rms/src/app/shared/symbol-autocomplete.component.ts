import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';

import { SymbolOption } from './symbol-filtering.function';

@Component({
  selector: 'rms-symbol-autocomplete',
  templateUrl: './symbol-autocomplete.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AutoCompleteModule],
})
export class SymbolAutocompleteComponent {
  selectedSymbol = model.required<string | null>();
  suggestions = input.required<SymbolOption[]>();
  readonly filterSymbols = output<{ query: string }>();

  // Signal alias with $ suffix for template
  suggestions$ = this.suggestions;
}
