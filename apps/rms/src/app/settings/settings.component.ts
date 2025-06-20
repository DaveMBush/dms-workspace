import { Component, inject } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SettingsService } from './settings.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: true,
  imports: [DialogModule, ButtonModule],
})
export class SettingsComponent {
  protected readonly settingsService = inject(SettingsService);
}
