import { ChangeDetectionStrategy, Component, ElementRef,inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Textarea } from 'primeng/textarea';

import { UniverseSettingsService } from './universe-settings.service';
import { UpdateUniverseSettingsService } from './update-universe.service';

@Component({
  selector: 'rms-universe-settings',
  templateUrl: './universe-settings.component.html',
  styleUrls: ['./universe-settings.component.scss'],
  standalone: true,
  imports: [DialogModule, ButtonModule, Textarea, FormsModule, ProgressSpinnerModule],
  viewProviders: [UpdateUniverseSettingsService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UniverseSettingsComponent {
  protected readonly settingsService = inject(UniverseSettingsService);
  protected readonly updateUniverseService = inject(UpdateUniverseSettingsService);
  @ViewChild('equitySymbolsTextarea') equitySymbolsTextarea!: ElementRef<HTMLTextAreaElement>;
  equitySymbols = '';
  incomeSymbols = '';
  taxFreeIncomeSymbols = '';
  loading = false;

  updateUniverse(): void {
    const self = this;
    this.loading = true;
    this.updateUniverseService.updateUniverse(this.equitySymbols, this.incomeSymbols, this.taxFreeIncomeSymbols)
      .subscribe({
        next: function updateUniverseNext() {
          self.settingsService.hide();
        },
        complete: function updateUniverseComplete() {
          self.loading = false;
        },
        error: function updateUniverseError() {
          self.loading = false;
        }
      });
  }

  updateFields(): void {
    const self = this;
    this.loading = true;
    this.updateUniverseService.updateFields()
      .subscribe({
        next: function updateFieldsNext() {
          self.settingsService.hide();
        },
        complete: function updateFieldsComplete() {
          self.loading = false;
        },
        error: function updateFieldsError() {
          self.loading = false;
        }
      });
  }

  onDialogShow(): void {
    const self = this;
    setTimeout(function onDialogShowTimeout() {
      self.equitySymbolsTextarea.nativeElement.focus();
    });
  }
}
