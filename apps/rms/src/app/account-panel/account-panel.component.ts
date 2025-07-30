import { Component, computed, inject, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolbarModule } from 'primeng/toolbar';
import { ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { selectAccounts } from '../store/accounts/account.selectors';
import { Account as AccountInterface } from '../store/accounts/account.interface';
import { SmartArray } from '@smarttools/smart-signals';
import { Top } from '../store/top/top.interface';
import { currentAccountSignalStore } from '../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../store/current-account/select-current-account.signal';

@Component({
  selector: 'app-account-panel',
  standalone: true,
  imports: [CommonModule, ToolbarModule, RouterModule],
  templateUrl: './account-panel.component.html',
  styleUrls: ['./account-panel.component.scss']
})
export class AccountPanelComponent {
  private route = inject(ActivatedRoute);
  private currentAccount = inject(currentAccountSignalStore)

  accountId = '';
  accountName$ = computed(() => {
    const currentAccount = selectCurrentAccountSignal(this.currentAccount);
    return currentAccount().name;
  });

  constructor() {
    this.route.params.subscribe(params => {
      this.accountId = params['accountId'];
      this.currentAccount.setCurrentAccountId(this.accountId);
    });
  }
}
