import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {DropdownMenu, DropdownMenuItem} from '@shared/ui/dropdown-menu';

@Component({
  selector: 'SidebarHeader',
  standalone: true,
  imports: [CommonModule, DropdownMenu],
  template: `
    <div class="flex items-center justify-between h-16 px-6 shadow-xl">
      <h3 class="text-lg font-semibold text-typo-secondary">
        {{ isServerRoute ? serverName || 'Сервер' : 'Главная' }}
      </h3>
      <ng-container *ngIf="isServerRoute">
        <DropdownMenu
          [items]="dropdownItems"
          (itemSelected)="menuAction.emit($event.action)"
        />
      </ng-container>
    </div>
  `,
})
export class SidebarHeader {
  @Input() serverName: string | null = null;
  @Input() isServerRoute = false;
  @Output() menuAction = new EventEmitter<string>();

  dropdownItems: DropdownMenuItem[] = [
    { label: 'Пригласить участников', action: 'invite' },
    { label: 'Настройки сервера', action: 'editServer' },
    { label: 'Выйти с сервера', action: 'leaveServer' },
  ];
}
