import { ChangeDetectorRef, inject, Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RowProxyDelete } from '@smarttools/smart-signals';

import { ConfirmDialogService } from '../shared/services/confirm-dialog.service';
import { Account as AccountInterface } from '../store/accounts/account.interface';

import { AccountComponent } from './account';

@Injectable()
export class AccountComponentService {
  private component!: AccountComponent;
  private confirmDialogService = inject(ConfirmDialogService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  init(component: AccountComponent): void {
    this.component = component;
  }

  addAccount(): void {
    this.component.addingNode = 'new';
    this.component.editingContent = 'New Account';
    const accounts = this.component.accounts$();
    const parentRow = this.component.top();
    if (!parentRow) {
      return;
    }
    (
      accounts as unknown as {
        addToStore(args: unknown, parentRow: unknown): void;
      }
    ).addToStore(
      {
        name: 'New Account',
        id: 'new',
        openTrades: [],
        soldTrades: [],
        divDeposits: [],
        months: [],
      },
      parentRow,
    );
    this.cdr.detectChanges();
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
      const accounts = this.component.accounts$();
      const parentRow = this.component.top();
      if (!parentRow) {
        return;
      }
      (
        accounts as unknown as {
          removeFromStore(item: unknown, parentRow: unknown): void;
        }
      ).removeFromStore(item, parentRow);
    }
    this.component.addingNode = '';
    this.component.editingNode = '';
    this.component.editingContent = '';
  }

  saveEdit(item: AccountInterface): void {
    if (this.component.editingContent === '') {
      return;
    }
    const account = this.component.accountsArray$().find(function findAccount(
      n: AccountInterface,
    ) {
      return n.id === item.id;
    });
    if (account) {
      account.name = this.component.editingContent;
    }
    this.component.addingNode = '';
    this.component.editingNode = '';
    this.component.editingContent = '';
  }

  deleteAccount(item: AccountInterface): void {
    (item as RowProxyDelete).delete!();
  }
}
