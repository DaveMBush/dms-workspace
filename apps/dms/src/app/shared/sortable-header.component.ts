import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'dms-sortable-header',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sortable-header.component.html',
})
export class SortableHeaderComponent {
  @Input() label = '';
  @Input() sortIcon = '';
  @Input() sortOrder = '';
}
