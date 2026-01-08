import { Injectable } from '@angular/core';
import { SmartArray } from '@smarttools/smart-signals';

import { Account as AccountInterface } from '../store/accounts/account.interface';
import { Top } from '../store/top/top.interface';
import { Account } from './account';

@Injectable()
export class AccountComponentService {
  private component!: Account;

  init(component: Account): void {
    this.component = component;
  }

  addAccount(): void {
    this.component.addingNode = 'new';
    this.component.editingContent = 'New Account';
    this.component.accounts$().addToStore!(
      {
        name: 'New Account',
        id: 'new',
        trades: [],
        divDeposits: [],
        months: [],
      },
      this.component.top['1']!
    );
  }

  editAccount(item: AccountInterface): void {
    if (this.component.addingNode.length > 0) {
      return; // Don't allow edit while adding
    }
    this.component.editingNode = item.id;
    this.component.editingContent = item.name;
  }

  cancelEdit(item: AccountInterface): void {
    if (this.component.addingNode.length > 0) {
      (this.component.accounts$() as SmartArray<Top, AccountInterface>)
        .removeFromStore!(item, this.component.top['1']!);
    }
    this.component.addingNode = '';
    this.component.editingNode = '';
    this.component.editingContent = '';
  }

  saveEdit(item: AccountInterface): void {
    if (this.component.editingContent === '') {
      return;
    }
    const account = this.component
      .accountsArray$()
      .find(function findAccount(n: AccountInterface) {
        return n.id === item.id;
      });
    if (account) {
      account.name = this.component.editingContent;
    }
    this.component.addingNode = '';
    this.component.editingNode = '';
    this.component.editingContent = '';
  }
}
