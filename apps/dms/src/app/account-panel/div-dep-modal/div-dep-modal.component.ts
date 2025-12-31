import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SmartArray } from '@smarttools/smart-signals';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';

import { SymbolAutocompleteComponent } from '../../shared/symbol-autocomplete.component';
import { createFilteredSymbolsSignal } from '../../shared/symbol-filtering.function';
import { Account } from '../../store/accounts/account.interface';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { DivDepositType } from '../../store/div-deposit-types/div-deposit-type.interface';
import { selectDivDepositTypes } from '../../store/div-deposit-types/selectors/select-div-deposit-types.function';
import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dms-div-dep-modal',
  imports: [
    FormsModule,
    InputNumberModule,
    DatePickerModule,
    SelectModule,
    ButtonModule,
    AutoCompleteModule,
    SymbolAutocompleteComponent,
  ],
  templateUrl: './div-dep-modal.component.html',
  styleUrl: './div-dep-modal.component.scss',
})
export class DivDepModalComponent {
  // eslint-disable-next-line @angular-eslint/no-output-native -- it is the only thing that make sense and it does not conflict
  readonly close = output();
  route = inject(ActivatedRoute);
  private currentAccount = inject(currentAccountSignalStore);
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- will hide this
  accountId = computed(() => {
    return this.route.snapshot.paramMap.get('accountId');
  });

  // Symbol typeahead logic
  symbol$ = signal<string | null>(null);
  filter = signal<string>('');
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- will hide this
  symbolAsString = computed(() => this.symbol$() ?? '');
  filteredSymbols$ = createFilteredSymbolsSignal(
    this.filter,
    this.symbolAsString
  );

  filterSymbols(event: { query: string }): void {
    this.filter.set(event.query + 'a');
    this.filter.set(event.query + '');
  }

  date$ = signal<Date | null>(null);
  amount$ = signal<number | null>(null);
  type$ = signal<string | null>(null);
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- will hide this
  types$ = computed(() => {
    const types = selectDivDepositTypes();
    const returnTypes = [] as DivDepositType[];
    for (let i = 0; i < types.length; i++) {
      returnTypes.push({ id: types[i].id, name: types[i].name });
    }
    return returnTypes;
  });

  handleClose(): void {
    this.close.emit();
  }

  handleSave(): void {
    const account = selectCurrentAccountSignal(this.currentAccount);
    const act = account();
    const divDeposits = act.divDeposits as DivDeposit[] &
      SmartArray<Account, DivDeposit>;
    divDeposits.add!(
      {
        id: 'new',
        date: this.date$()!,
        amount: this.amount$()!,
        accountId: act.id,
        divDepositTypeId: this.type$()!,
        universeId: this.symbol$()!,
      },
      act
    );
    this.close.emit();
  }
}
