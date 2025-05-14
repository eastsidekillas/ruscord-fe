// src/app/shared/ui/settings-sidebar.ts
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'SettingsSidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-64 bg-sidebar-surface-primary h-full p-4">
      <h3 class="text-sm font-semibold uppercase text-gray-400 mb-4">Настройки пользователя</h3>
      <ul class="space-y-2">
        <li *ngFor="let item of items">
          <button
            (click)="selectItem(item.key)"
            class="w-full text-left px-3 py-2 rounded-md hover:bg-main-surface-hover"
            [class.bg-main-surface-hover]="selected === item.key">
            {{ item.label }}
          </button>
        </li>
      </ul>
    </div>
  `
})
export class SettingsSidebar {
  @Output() itemSelected = new EventEmitter<string>();

  items = [
    { key: 'account', label: 'Моя учётная запись' },
    { key: 'devices', label: 'Устройства' },
    { key: 'security', label: 'Безопасность' },
    { key: 'privacy', label: 'Приватность' }
  ];

  selected: string = 'account';

  selectItem(key: string) {
    this.selected = key;
    this.itemSelected.emit(key);
  }
}
