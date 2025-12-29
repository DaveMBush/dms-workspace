import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SmartArray } from '@smarttools/smart-signals';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';

import { SymbolAutocompleteComponent } from '../../shared/symbol-autocomplete.component';
import {
  createFilteredSymbolsSignal,
  createSelectedSymbolExpiredSignal,
} from '../../shared/symbol-filtering.function';
import { Account } from '../../store/accounts/account.interface';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { Trade } from '../../store/trades/trade.interface';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dms-new-position',
  standalone: true,
  imports: [
    AutoCompleteModule,
    InputNumberModule,
    DatePickerModule,
    FormsModule,
    SymbolAutocompleteComponent,
  ],
  templateUrl: './new-position.component.html',
  styleUrls: ['./new-position.component.scss'],
})
export class NewPositionComponent {
  // eslint-disable-next-line @angular-eslint/no-output-native -- it is the only thing that make sense and it does not conflict
  readonly close = output();
  router = inject(Router);
  route = inject(ActivatedRoute);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- will hide this
  accountId = computed(() => {
    return this.route.snapshot.paramMap.get('accountId');
  });

  symbol = model<string | null>(null);
  buy = model<number | null>(null);
  quantity = model<number | null>(null);
  buyDate = model<Date | null>(null);
  filter = model<string>('');
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- will hide this
  symbolAsString = computed(() => this.symbol() ?? '');
  filteredSymbols$ = createFilteredSymbolsSignal(
    this.filter,
    this.symbolAsString
  );

  selectedSymbolExpired$ = createSelectedSymbolExpiredSignal(
    this.symbolAsString
  );

  canSave$ = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    () =>
      !!(
        this.symbol() !== null &&
        this.buy() !== null &&
        this.quantity() !== null &&
        this.buyDate() !== null
      )
  );

  filterSymbols(event: { query: string }): void {
    // hack to get the dropdown to display the first time
    this.filter.set(event.query + 'a');
    this.filter.set(event.query + '');
  }

  private currentAccount = inject(currentAccountSignalStore);

  handleSave(): void {
    const account = selectCurrentAccountSignal(this.currentAccount);
    const act = account();
    const trades = act.trades as SmartArray<Account, Trade> & Trade[];
    trades.add!(
      {
        id: 'new',
        universeId: this.symbol()!,
        accountId: this.accountId()!,
        buy: Number(this.buy()!),
        quantity: Number(this.quantity()!),
        buy_date: this.buyDate()!.toISOString(),
        sell_date: undefined,
        sell: 0,
      },
      act
    );
    this.close.emit();
  }

  handleCancel(): void {
    this.close.emit();
  }
}
