import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';

export type FriendsTab = 'online' | 'all' | 'pending' | 'blocked' | 'add';

const TABS: { id: FriendsTab; label: string }[] = [
  { id: 'online', label: 'В сети' },
  { id: 'all', label: 'Все' },
  { id: 'pending', label: 'Ожидание' },
  { id: 'blocked', label: 'Заблокированные' },
];

@Component({
  selector: 'FriendsHeader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, NgIf, NgFor],
  template: `
    <div class="h-16 flex items-center px-6 shadow-xl gap-3 overflow-x-auto">
      <button *ngFor="let t of tabs"
              class="relative text-sm px-4 py-2 rounded-lg transition duration-300 whitespace-nowrap"
              [ngClass]="active === t.id ? 'bg-green-500 text-white' : 'bg-main-surface-secondary hover:bg-green-500'"
              (click)="tabChange.emit(t.id)">
        {{ t.label }}
        <span *ngIf="t.id === 'pending' && pendingCount > 0"
              class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
          {{ pendingCount > 99 ? '99+' : pendingCount }}
        </span>
      </button>
      <button class="text-sm px-4 py-2 rounded-lg transition duration-300 whitespace-nowrap"
              [ngClass]="active === 'add' ? 'bg-transparent text-green-400' : 'bg-green-600 text-white hover:bg-green-500'"
              (click)="tabChange.emit('add')">
        Добавить в друзья
      </button>
    </div>
  `,
})
export class FriendsHeader {
  @Input() active: FriendsTab = 'online';
  @Input() pendingCount = 0;
  @Output() tabChange = new EventEmitter<FriendsTab>();
  protected readonly tabs = TABS;
}
