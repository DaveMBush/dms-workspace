import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ListboxModule } from 'primeng/listbox';
import { ToolbarModule } from 'primeng/toolbar';

import { BaseRouteComponent } from '../shared/base-route-component';

@Component({
  selector: 'dms-global',
  standalone: true,
  imports: [ToolbarModule, ListboxModule, FormsModule],
  templateUrl: './global.component.html',
  styleUrl: './global.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalComponent extends BaseRouteComponent {
  @Input() selectedId: string | null = null;
  @Output() readonly selectedIdChange = new EventEmitter<{
    id: string;
    name: string;
  }>();

  globals = [
    { id: 'universe', name: 'Universe' },
    { id: 'screener', name: 'Screener' },
    { id: 'summary', name: 'Summary' },
    { id: 'error-logs', name: 'Error Logs' },
  ];

  updateSelectionFromRoute(url: string): void {
    const globalMatch = /\/global\/([^/]+)/.exec(url);
    const globalId = globalMatch?.[1];

    if (globalId !== undefined && globalId !== '') {
      // Update the parent component's selectedId through the output
      this.selectedIdChange.emit({ id: globalId, name: globalId });
    } else {
      // Clear selection if not on a global route
      this.selectedIdChange.emit({ id: '', name: '' });
    }
  }

  protected onSelect(e: { id: string; name: string }): void {
    this.selectedIdChange.emit(e);
    void this.router.navigate([`/global/${e.id}`]);
  }
}
