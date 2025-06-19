import { Injectable } from '@angular/core';
import { Account } from './account';
import { SmartArray } from '@smarttools/smart-signals';
import { Account as AccountInterface } from './store/accounts/account.interface';
import { Top } from './store/top/top.interface';

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

  cancelEdit(item: AccountInterface): void {
    this.component.addingNode = '';
    this.component.editingContent = '';
    (this.component.accounts$() as SmartArray<Top, AccountInterface>).removeFromStore!(item, this.component.top['1']!);
  }
}
