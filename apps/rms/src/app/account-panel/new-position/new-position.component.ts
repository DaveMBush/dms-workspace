import { Component, Output, EventEmitter, computed } from '@angular/core';
import { selectUniverses } from '../../store/universe/universe.selectors';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-new-position',
  standalone: true,
  imports: [AutoCompleteModule, FormsModule],
  templateUrl: './new-position.component.html',
  styleUrls: ['./new-position.component.scss']
})
export class NewPositionComponent {
  @Output() close = new EventEmitter<void>();

  symbol: string | null = null;
  filteredSymbols: string[] = [];

  availableSymbols = computed(() => {
    const symbols = selectUniverses();
    const returnedSymbols = [] as string[];
    for(let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      if (symbol.expired) {
        continue;
      }
      returnedSymbols.push(symbol.symbol);
    }
    return returnedSymbols;
  });

  filterSymbols(event: { query: string }) {
    const query = event.query.toLowerCase();
    this.filteredSymbols = this.availableSymbols().filter(s =>
      s.toLowerCase().includes(query)
    );
  }

  onSave() {
    this.close.emit();
  }

  onCancel() {
    this.close.emit();
  }
}
