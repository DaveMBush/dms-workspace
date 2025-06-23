import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolbarModule } from 'primeng/toolbar';
import { ListboxModule } from 'primeng/listbox';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-global',
  standalone: true,
  imports: [CommonModule, ToolbarModule, ListboxModule, FormsModule],
  templateUrl: './global.component.html',
  styleUrl: './global.component.scss',
})
export class GlobalComponent {
  @Input() selectedId: string | null = null;
  @Output() selectedIdChange = new EventEmitter<string>();

  globals = [
    { id: 'universe', name: 'Universe' },
  ];

  onSelect(id: string) {
    this.selectedIdChange.emit(id);
  }
}
