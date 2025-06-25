import { Component, computed, inject, signal, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolbarModule } from 'primeng/toolbar';
import { ActivatedRoute } from '@angular/router';
import { AccountDetailComponent } from './account-detail.component';
import { selectAccounts } from '../accounts/store/accounts/account.selectors';
import { Account as AccountInterface } from '../accounts/store/accounts/account.interface';
import { SmartArray } from '@smarttools/smart-signals';
import { Top } from '../store/top/top.interface';

@Component({
  selector: 'app-account-panel',
  standalone: true,
  imports: [CommonModule, ToolbarModule, AccountDetailComponent],
  templateUrl: './account-panel.component.html',
  styleUrls: ['./account-panel.component.scss']
})
export class AccountPanelComponent {
  private route = inject(ActivatedRoute);
  private accounts$ = selectAccounts;

  accountId = signal('');
  accountName$ = computed(() => {
    const id = this.accountId();
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
      this.accountId.set(params['accountId']);
    });
  }
}
