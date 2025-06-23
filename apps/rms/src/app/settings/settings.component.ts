import { Component, inject, ViewChild, ElementRef } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SettingsService } from './settings.service';
import { Textarea } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';
import { UpdateUniverseService } from './update-universe.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: true,
  imports: [DialogModule, ButtonModule, Textarea, FormsModule],
  viewProviders: [UpdateUniverseService]
})
export class SettingsComponent {
  protected readonly settingsService = inject(SettingsService);
  protected readonly updateUniverseService = inject(UpdateUniverseService);
  @ViewChild('equitySymbolsTextarea') equitySymbolsTextarea!: ElementRef<HTMLTextAreaElement>;
  equitySymbols = '';
  incomeSymbols = '';
  taxFreeIncomeSymbols = '';

  save() {
    this.updateUniverseService.updateUniverse(this.equitySymbols, this.incomeSymbols, this.taxFreeIncomeSymbols);
    this.settingsService.hide();
  }

  onDialogShow() {
    setTimeout(() => {
      this.equitySymbolsTextarea.nativeElement.focus();
    });
  }
}
