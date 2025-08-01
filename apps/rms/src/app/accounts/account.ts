import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
OnInit,
  Signal,
  signal,
  ViewEncapsulation, } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd,Router } from '@angular/router';
import { SmartArray } from '@smarttools/smart-signals';
import { ButtonModule } from 'primeng/button';
import { ListboxModule } from 'primeng/listbox';
import { ToolbarModule } from 'primeng/toolbar';
import { filter, Subscription } from 'rxjs';

import { NodeEditorComponent } from '../shared/components/edit/node-editor.component';
import { Account as AccountInterface } from '../store/accounts/account.interface';
import { selectAccounts } from '../store/accounts/selectors/select-accounts.function';
import { selectTopEntities } from '../store/top/selectors/select-top-entities.function';
import { Top } from '../store/top/top.interface';
import { AccountComponentService } from './account-component.service';

@Component({
  imports: [CommonModule, ButtonModule, FormsModule, NodeEditorComponent, ListboxModule, ToolbarModule],
  templateUrl: './account.html',
  styleUrl: './account.scss',
  selector: 'rms-account',
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [AccountComponentService],
})
export class Account implements OnInit, OnDestroy {
  private accountService = inject(AccountComponentService);
  private router = inject(Router);
  private routeSubscription?: Subscription;
  accounts$ = selectAccounts as Signal<AccountInterface[] & SmartArray<Top, AccountInterface>>;
  top = selectTopEntities().entities;

  ngOnInit(): void {
    this.accountService.init(this);

    // Set initial selection based on current route
    this.updateSelectionFromRoute(this.router.url);

    // Listen for route changes
    const self = this;
    this.routeSubscription = this.router.events
      .pipe(filter(function filterNavigationEnd(event) {
        return event instanceof NavigationEnd;
      }))
      .subscribe(function routeChangeSubscription() {
        self.updateSelectionFromRoute(self.router.url);
      });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  private updateSelectionFromRoute(url: string): void {
    const accountMatch = /\/account\/([^/]+)/.exec(url);
    const accountId = accountMatch?.[1];

    if (accountId !== undefined && accountId !== '') {
      this.selectedAccountId$.set(accountId);
    } else {
      // Clear selection if not on an account route
      this.selectedAccountId$.set(null);
    }
  }

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- making this a function hides this
  accountsArray$ = computed(() => {
    const accounts = this.accounts$() as SmartArray<Top, AccountInterface>;
    const accountsArray = [] as AccountInterface[];
    for (let i = 0; i < accounts.length; i++) {
      accountsArray.push(accounts[i] as AccountInterface);
    }
    return accountsArray;
  });

  addingNode = '';
  editingNode = '';
  editingContent = '';

  protected addAccount(): void {
    this.accountService.addAccount();
  }

  protected editAccount(item: AccountInterface): void {
    this.accountService.editAccount(item);
  }

  protected deleteAccount(item: AccountInterface): void {
    this.accountService.deleteAccount(item);
  }

  protected cancelEdit(item: AccountInterface): void {
    this.accountService.cancelEdit(item);
  }

  protected saveEdit(item: AccountInterface): void {
    this.accountService.saveEdit(item);
  }

  selectedAccountId$ = signal<string | null>(null);



  protected onAccountSelect(account: AccountInterface): void {
    this.selectedAccountId$.set(account.id);
    void this.router.navigate(['/account', account.id]);
  }
}
