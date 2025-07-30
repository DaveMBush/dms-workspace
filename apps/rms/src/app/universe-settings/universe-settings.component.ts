import { Component, ElementRef,inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Textarea } from 'primeng/textarea';

import { UniverseSettingsService } from './universe-settings.service';
import { UpdateUniverseSettingsService } from './update-universe.service';

@Component({
  selector: 'app-universe-settings',
  templateUrl: './universe-settings.component.html',
  styleUrls: ['./universe-settings.component.scss'],
  standalone: true,
  imports: [DialogModule, ButtonModule, Textarea, FormsModule, ProgressSpinnerModule],
  viewProviders: [UpdateUniverseSettingsService]
})
export class UniverseSettingsComponent {
  protected readonly settingsService = inject(UniverseSettingsService);
  protected readonly updateUniverseService = inject(UpdateUniverseSettingsService);
  @ViewChild('equitySymbolsTextarea') equitySymbolsTextarea!: ElementRef<HTMLTextAreaElement>;
  equitySymbols = '';
  incomeSymbols = '';
  taxFreeIncomeSymbols = '';
  loading = false;

  updateUniverse() {
    this.loading = true;
    this.updateUniverseService.updateUniverse(this.equitySymbols, this.incomeSymbols, this.taxFreeIncomeSymbols)
      .subscribe({
        next: () => {
          this.settingsService.hide();
        },
        complete: () => {
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  updateFields() {
    this.loading = true;
    this.updateUniverseService.updateFields()
      .subscribe({
        next: () => {
          this.settingsService.hide();
        },
        complete: () => {
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  onDialogShow() {
    setTimeout(() => {
      this.equitySymbolsTextarea.nativeElement.focus();
    });
  }
}
