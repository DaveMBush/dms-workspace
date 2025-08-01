import { CommonModule } from '@angular/common';
import { Component, computed, inject,output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SmartArray } from '@smarttools/smart-signals';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';

import { Account } from '../../store/accounts/account.interface';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { DivDepositType } from '../../store/div-deposit-types/div-deposit-type.interface';
import { selectDivDepositTypes } from '../../store/div-deposit-types/selectors/select-div-deposit-types.function';
import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';

@Component({
  selector: 'app-div-dep-modal',
  imports: [CommonModule, FormsModule, InputNumberModule, DatePickerModule, SelectModule, ButtonModule, AutoCompleteModule],
  templateUrl: './div-dep-modal.component.html',
  styleUrl: './div-dep-modal.component.scss',
})
export class DivDepModalComponent {
  readonly close = output();
  route = inject(ActivatedRoute);
  private currentAccount = inject(currentAccountSignalStore)
  accountId = computed(() => {
    return this.route.snapshot.paramMap.get('accountId');
  });

  // Symbol typeahead logic
  symbol = signal<string | null>(null);
  filter = signal<string>('');
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
    if (selectedSymbol && !filtered.some(r => r.value === selectedSymbol.value)) {
      filtered = [selectedSymbol, ...filtered];
    }
    return filtered;
  });

  filterSymbols(event: { query: string }) {
    this.filter.set(event.query + 'a');
    this.filter.set(event.query + '');
  }

  date = signal<Date | null>(null);
  amount = signal<number | null>(null);
  type = signal<string | null>(null);
  types = computed(() => {
    const types = selectDivDepositTypes();
    const returnTypes = [] as DivDepositType[];
    for(let i = 0; i < types.length; i++) {
      returnTypes.push({ id: types[i].id, name: types[i].name });
    }
    return returnTypes;
  });

  onClose() {
    this.close.emit();
  }

  onSave() {
    const account = selectCurrentAccountSignal(this.currentAccount);
    if (!account) {
      return;
    }
    const act = account();
    const divDeposits = act.divDeposits as DivDeposit[] & SmartArray<Account, DivDeposit>;
    divDeposits.add!({
      id: 'new',
      date: this.date()!,
      amount: this.amount()!,
      accountId: act.id,
      divDepositTypeId: this.type()!,
      universeId: this.symbol()!,
    },{
      id: this.accountId()!,
      name: 'New Account',
      trades: [],
      divDeposits: [],
      months: []
    });
    this.close.emit();
  }
}
