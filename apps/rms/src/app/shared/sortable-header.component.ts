import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'rms-sortable-header',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sortable-header.component.html',
})
export class SortableHeaderComponent {
  @Input() label = '';
  @Input() sortIcon = '';
  @Input() sortOrder = '';
}
