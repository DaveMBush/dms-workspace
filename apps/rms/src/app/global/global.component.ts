import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolbarModule } from 'primeng/toolbar';
import { ListboxModule } from 'primeng/listbox';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-global',
  standalone: true,
  imports: [CommonModule, ToolbarModule, ListboxModule, FormsModule],
  templateUrl: './global.component.html',
  styleUrl: './global.component.scss',
})
export class GlobalComponent {
  @Input() selectedId: string | null = null;
  @Output() selectedIdChange = new EventEmitter<{id: string, name: string}>();

  globals = [
    { id: 'universe', name: 'Universe' },
  ];

  constructor(private router: Router) {}

  onSelect(e: {id: string, name: string}) {
    this.selectedIdChange.emit(e);
    if (e.id === 'universe') {
      this.router.navigate(['/global/universe']);
    }
  }
}
