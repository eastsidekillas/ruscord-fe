import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {LucideAngularModule, Settings} from 'lucide-angular';

export interface DropdownMenuItem {
  label: string;
  action: string;
  icon?: string; // необязательно, если хочешь добавить иконки
}

@Component({
  selector: 'DropdownMenu',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="relative inline-block text-left">
      <button
        (click)="toggle()"
        class="text-typo-secondary pt-2"
        aria-label="Меню настроек"
      >
        <lucide-angular class="w-5 h-5 hover:text-gray-200" [img]="Settings"></lucide-angular>
      </button>

      <div
        *ngIf="open"
        class="absolute right-0 z-50 mt-2 w-58 origin-top-right rounded-lg bg-main-surface-primary shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
      >
        <ul class="py-1 text-sm text-white">
          <li
            *ngFor="let item of items"
            (click)="selectItem(item)"
            class="block px-4 py-2 cursor-pointer hover:bg-main-surface-secondary transition"
          >
            {{ item.label }}
          </li>
        </ul>
      </div>
    </div>
  `,
})
export class DropdownMenu {
  @Input() items: DropdownMenuItem[] = [];
  @Output() itemSelected = new EventEmitter<DropdownMenuItem>();

  open = false;

  toggle() {
    this.open = !this.open;
  }

  selectItem(item: DropdownMenuItem) {
    this.itemSelected.emit(item);
    this.open = false;
  }

  protected readonly Settings = Settings;
}
