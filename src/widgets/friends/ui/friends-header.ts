import {Component, EventEmitter, Output} from '@angular/core';
import {NgClass} from '@angular/common';

@Component({
  selector: 'FriendsHeader',
  standalone: true,
  imports: [
    NgClass
  ],
  template:
    `
      <div class="h-16 flex items-center justify-between px-6 shadow-xl">

          <div class="flex items-center space-x-4 ">
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
              class="text-sm px-4 py-2 rounded-lg transition duration-300"
              [ngClass]="activeFilter === 'waiting' ? 'bg-green-500 text-white' : 'bg-main-surface-secondary hover:bg-green-500'"
              (click)="changeFilter('waiting')"
            >
              Ожидание
            </button>
          </div>
      </div>
    `
})


export class FriendsHeader {
  activeFilter: string = 'all';
  @Output() filterChanged: EventEmitter<'all' | 'waiting' | 'online'> = new EventEmitter();


  changeFilter(filter: 'all' | 'waiting' | 'online') {
    this.activeFilter = filter;
    this.filterChanged.emit(filter);
  }


}
