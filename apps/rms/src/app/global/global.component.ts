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
    { id: 'screener', name: 'Screener' },
  ];

  constructor(private router: Router) {}

  onSelect(e: {id: string, name: string}) {
    this.selectedIdChange.emit(e);
    this.router.navigate([`/global/${e.id}`]);
  }
}
