import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';

@Component({
  selector: 'FriendsHeader',
  standalone: true,
  imports: [NgClass, NgIf],
  template: `
    <div class="h-16 flex items-center justify-between px-6 shadow-xl">
      <div class="flex items-center space-x-4">
        <button
          class="text-sm px-4 py-2 rounded-lg transition duration-300"
          [ngClass]="activeFilter === 'all' ? 'bg-green-500 text-white' : 'bg-main-surface-secondary hover:bg-green-500'"
          (click)="changeFilter('all')"
        >
          Все
        </button>
        <button
          class="text-sm px-4 py-2 rounded-lg transition duration-300"
          [ngClass]="activeFilter === 'online' ? 'bg-green-500 text-white' : 'bg-main-surface-secondary hover:bg-green-500'"
          (click)="changeFilter('online')"
        >
          В сети
        </button>
        <button
          class="relative text-sm px-4 py-2 rounded-lg transition duration-300"
          [ngClass]="activeFilter === 'waiting' ? 'bg-green-500 text-white' : 'bg-main-surface-secondary hover:bg-green-500'"
          (click)="changeFilter('waiting')"
        >
          Ожидание
          <span
            *ngIf="pendingCount > 0"
            class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
          >
            {{ pendingCount > 99 ? '99+' : pendingCount }}
          </span>
        </button>
      </div>
    </div>
  `
})
export class FriendsHeader {
  @Input() pendingCount: number = 0;
  @Output() filterChanged = new EventEmitter<'all' | 'waiting' | 'online'>();

  activeFilter: string = 'all';

  changeFilter(filter: 'all' | 'waiting' | 'online') {
    this.activeFilter = filter;
    this.filterChanged.emit(filter);
  }
}
