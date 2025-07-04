import { Component, computed, inject, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolbarModule } from 'primeng/toolbar';
import { ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { selectAccounts } from '../store/accounts/account.selectors';
import { Account as AccountInterface } from '../store/accounts/account.interface';
import { SmartArray } from '@smarttools/smart-signals';
import { Top } from '../store/top/top.interface';

@Component({
  selector: 'app-account-panel',
  standalone: true,
  imports: [CommonModule, ToolbarModule, RouterModule],
  templateUrl: './account-panel.component.html',
  styleUrls: ['./account-panel.component.scss']
})
export class AccountPanelComponent {
  private route = inject(ActivatedRoute);
  private accounts$ = selectAccounts as Signal<SmartArray<Top, AccountInterface> & AccountInterface[]>;

  accountId = '';
  accountName$ = computed(() => {
    const id = this.accountId;
    const accounts = this.accounts$();
    for (let i = 0; i < accounts.length; i++) {
      if (accounts[i].id === id) {
        return accounts[i].name;
      }
    }
    return 'Account Not Found';
  });

  constructor() {
    this.route.params.subscribe(params => {
      this.accountId = params['accountId'];
    });
  }
}
