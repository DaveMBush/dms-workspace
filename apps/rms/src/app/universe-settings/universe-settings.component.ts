import { Component, inject, ViewChild, ElementRef } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { UniverseSettingsService } from './universe-settings.service';
import { Textarea } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';
import { UpdateUniverseSettingsService } from './update-universe.service';

@Component({
  selector: 'app-universe-settings',
  templateUrl: './universe-settings.component.html',
  styleUrls: ['./universe-settings.component.scss'],
  standalone: true,
  imports: [DialogModule, ButtonModule, Textarea, FormsModule],
  viewProviders: [UpdateUniverseSettingsService]
})
export class UniverseSettingsComponent {
  protected readonly settingsService = inject(UniverseSettingsService);
  protected readonly updateUniverseService = inject(UpdateUniverseSettingsService);
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
