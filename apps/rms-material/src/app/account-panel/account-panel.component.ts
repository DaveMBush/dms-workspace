import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'rms-account-panel',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatTabsModule],
  templateUrl: './account-panel.component.html',
  styleUrl: './account-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPanelComponent {}
