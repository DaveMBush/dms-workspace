import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-new-position',
  standalone: true,
  templateUrl: './new-position.component.html',
  styleUrls: ['./new-position.component.scss']
})
export class NewPositionComponent {
  @Output() close = new EventEmitter<void>();

  onSave() {
    this.close.emit();
  }

  onCancel() {
    this.close.emit();
  }
}
