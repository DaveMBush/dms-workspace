import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SmartArray } from '@smarttools/smart-signals';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';

import { selectRiskGroup } from '../../store/risk-group/selectors/select-risk-group.function';
import { selectTopEntities } from '../../store/top/selectors/select-top-entities.function';
import { Top } from '../../store/top/top.interface';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';
import { Universe } from '../../store/universe/universe.interface';

interface SelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'dms-add-symbol-dialog',
  templateUrl: './add-symbol-dialog.html',
  styleUrls: ['./add-symbol-dialog.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DialogModule,
    InputTextModule,
    SelectModule,
    ButtonModule,
    FormsModule,
    MessageModule,
  ],
  viewProviders: [MessageService],
})
export class AddSymbolDialog {
  private readonly messageService = inject(MessageService);

  topEntities = selectTopEntities().entities;

  visible = signal(false);
  symbolInput = signal('');
  selectedRiskGroup = signal<string | null>(null);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  riskGroupOptions = computed(
    function riskGroupOptionsComputed(): SelectOption[] {
      const riskGroups = selectRiskGroup();
      const riskGroupArray = [] as SelectOption[];
      for (let i = 0; i < riskGroups.length; i++) {
        const riskGroup = riskGroups[i];
        riskGroupArray.push({
          label: riskGroup.name,
          value: riskGroup.id,
        });
      }
      return riskGroupArray;
    }
  );

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal requires lexical this binding
  isFormValid = computed(() => {
    const symbol = this.symbolInput().trim();
    const riskGroup = this.selectedRiskGroup();

    return (
      symbol.length > 0 &&
      symbol.length <= 5 &&
      /^[A-Z]+$/i.test(symbol) &&
      riskGroup !== null
    );
  });

  show(): void {
    this.visible.set(true);
    this.reset();
  }

  onSymbolInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.symbolInput.set(target.value.toUpperCase());
  }

  hide(): void {
    this.visible.set(false);
    this.reset();
  }

  onSubmit(): void {
    const symbol = this.symbolInput().trim().toUpperCase();
    const riskGroupId = this.selectedRiskGroup();

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const universeArray = selectUniverses() as SmartArray<Top, Universe> &
      Universe[];

    const top = this.topEntities['1']!;

    const newUniverse: Universe = {
      id: 'new',
      symbol,
      risk_group_id: riskGroupId!,
      distribution: 0,
      distributions_per_year: 0,
      last_price: 0,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      ex_date: '',
      expired: false,
      is_closed_end_fund: false,
      name: symbol,
      position: 0,
    };

    const context = this;
    try {
      universeArray.add!(newUniverse, top);
      context.isLoading.set(false);
      context.messageService.add({
        severity: 'success',
        summary: 'Symbol Added',
        detail: `Successfully added ${symbol} to universe`,
      });
      context.hide();
    } catch (error) {
      context.isLoading.set(false);
      let errorMsg = 'Failed to add symbol to universe';

      if (
        error !== null &&
        error !== undefined &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
      ) {
        errorMsg = error.message;
      }

      context.errorMessage.set(errorMsg);
    }
  }

  private reset(): void {
    this.symbolInput.set('');
    this.selectedRiskGroup.set(null);
    this.isLoading.set(false);
    this.errorMessage.set(null);
  }
}
