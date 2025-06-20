import { Component, inject } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SettingsService } from './settings.service';
import { Textarea } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: true,
  imports: [DialogModule, ButtonModule, Textarea, FormsModule],
})
export class SettingsComponent {
  protected readonly settingsService = inject(SettingsService);
  symbols = '';

  save() {
    // Save logic goes here
    this.settingsService.hide();
  }
}
