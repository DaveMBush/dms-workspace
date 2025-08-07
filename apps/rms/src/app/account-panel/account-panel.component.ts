import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute , Params, RouterModule } from '@angular/router';
import { ToolbarModule } from 'primeng/toolbar';

import { currentAccountSignalStore } from '../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../store/current-account/select-current-account.signal';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'rms-account-panel',
  standalone: true,
  imports: [CommonModule, ToolbarModule, RouterModule],
  templateUrl: './account-panel.component.html',
  styleUrls: ['./account-panel.component.scss']
})
export class AccountPanelComponent {
  private route = inject(ActivatedRoute);
  private currentAccount = inject(currentAccountSignalStore)

  accountId = '';
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- will hide this
  accountName$ = computed(() => {
    const currentAccount = selectCurrentAccountSignal(this.currentAccount);
    return currentAccount().name;
  });

  constructor() {
    const self = this;
    this.route.params.subscribe(function routeParams(params: Params) {
      self.accountId = params['accountId'] as string;
      self.currentAccount.setCurrentAccountId(self.accountId);
    });
  }
}
