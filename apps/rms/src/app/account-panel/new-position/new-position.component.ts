import { Component, Output, EventEmitter, computed, signal } from '@angular/core';
import { selectUniverses } from '../../store/universe/universe.selectors';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-new-position',
  standalone: true,
  imports: [AutoCompleteModule, InputNumberModule, CalendarModule, FormsModule],
  templateUrl: './new-position.component.html',
  styleUrls: ['./new-position.component.scss']
})
export class NewPositionComponent {
  @Output() close = new EventEmitter<void>();

  symbol = signal<string | null>(null);
  buy = signal<number | null>(null);
  quantity = signal<number | null>(null);
  buyDate = signal<Date | null>(null);
  filteredSymbols = signal<string[]>([]);

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

  canSave = computed(() =>
    !!(this.symbol() && this.buy() && this.quantity() && this.buyDate())
  );

  filterSymbols(event: { query: string }) {
    const query = event.query.toLowerCase();
    this.filteredSymbols.set(
      this.availableSymbols().filter(s =>
        s.toLowerCase().includes(query)
      )
    );
  }

  onSave() {
    this.close.emit();
  }

  onCancel() {
    this.close.emit();
  }
}
