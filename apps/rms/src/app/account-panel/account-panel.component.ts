import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute , RouterModule } from '@angular/router';
import { ToolbarModule } from 'primeng/toolbar';

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
