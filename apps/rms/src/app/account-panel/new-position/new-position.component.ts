import { Component, Output, EventEmitter, computed, signal, model, OnInit, inject } from '@angular/core';
import { selectUniverses } from '../../store/universe/universe.selectors';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { SmartArray } from '@smarttools/smart-signals';
import { Trade } from '../../store/trades/trade.interface';
import { Account } from '../../store/accounts/account.interface';

@Component({
  selector: 'app-new-position',
  standalone: true,
  imports: [AutoCompleteModule, InputNumberModule, DatePickerModule, FormsModule],
  templateUrl: './new-position.component.html',
  styleUrls: ['./new-position.component.scss']
})
export class NewPositionComponent {
  @Output() close = new EventEmitter<void>();
  router = inject(Router);
  route = inject(ActivatedRoute);

  accountId = computed(() => {
    return this.route.snapshot.paramMap.get('accountId');
  });

  symbol = model<string | null>(null);
  buy = model<number | null>(null);
  quantity = model<number | null>(null);
  buyDate = model<Date | null>(null);
  filter = model<string>('');
  filteredSymbols = computed(() => {
    const symbols = selectUniverses();
    const returnedSymbols = [] as { label: string; value: string; expired: boolean }[];
    const selectedId = this.symbol();
    let selectedSymbol: { label: string; value: string; expired: boolean } | undefined;
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      const entry = {
        label: symbol.symbol,
        value: symbol.id,
        expired: symbol.expired,
      };
      if (symbol.id === selectedId) {
        selectedSymbol = entry;
      }
      returnedSymbols.push(entry);
    }
    const query = this.filter().toLowerCase();
    let filtered = returnedSymbols.filter((r) => r.label.toLowerCase().includes(query));
    // Ensure the selected symbol is always present
    if (selectedSymbol && !filtered.some(r => r.value === selectedSymbol!.value)) {
      filtered = [selectedSymbol, ...filtered];
    }
    return filtered;
  });

  selectedSymbolExpired = computed(() => {
    const symbols = selectUniverses();
    for (let i = 0; i < symbols.length; i++) {
      if (symbols[i].id === this.symbol()) {
        return symbols[i].expired;
      }
    }
    return false;
  });

  canSave = computed(() =>
    !!(this.symbol() && this.buy() && this.quantity() && this.buyDate())
  );

  filterSymbols(event: { query: string }) {
    // hack to get the dropdown to display the first time
    this.filter.set(event.query + 'a');
    this.filter.set(event.query + '');
  }

  private currentAccount = inject(currentAccountSignalStore)


  onSave() {
    const account = selectCurrentAccountSignal(this.currentAccount);
    if (!account) {
      return;
    }
    const act = account();
    const trades = act.trades as SmartArray<Account, Trade> & Trade[];
    trades.add!({
      id: 'new',
      universeId: this.symbol()!,
      accountId: this.accountId()!,
      buy: Number(this.buy()!),
      quantity: Number(this.quantity()!),
      buy_date: this.buyDate()!.toISOString(),
      sell_date: undefined,
      sell: 0,
    },{
      id: this.accountId()!,
      name: 'New Account',
      trades: [],
      divDeposits: []
    });
    this.close.emit();
  }

  onCancel() {
    this.close.emit();
  }
}
