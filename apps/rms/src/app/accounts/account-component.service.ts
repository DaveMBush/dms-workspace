import { Injectable } from '@angular/core';
import { Account } from './account';
import { RowProxyDelete, SmartArray } from '@smarttools/smart-signals';
import { Account as AccountInterface } from './store/accounts/account.interface';
import { Top } from '../store/top/top.interface';

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
      },
      this.component.top['1']!
    );
  }

  editAccount(item: AccountInterface): void {
    this.component.editingNode = item.id;
    this.component.editingContent = item.name;
  }

  cancelEdit(item: AccountInterface): void {
    if(this.component.addingNode.length > 0) {
      (this.component.accounts$() as SmartArray<Top, AccountInterface>).removeFromStore!(item, this.component.top['1']!);
    }
    this.component.addingNode = '';
    this.component.editingNode = '';
    this.component.editingContent = '';
  }

  deleteAccount(item: AccountInterface): void {
    (item as RowProxyDelete).delete!();
  }

  saveEdit(item: AccountInterface): void {
    if (this.component.editingContent === '') {
      return;
    }
    var account = this.component.accountsArray$().find((n: AccountInterface) => n.id === item.id);
    if (account) {
      account.name = this.component.editingContent;
    }
    this.component.editingNode = '';
    this.component.addingNode = '';
    this.component.editingContent = '';
  }
}
