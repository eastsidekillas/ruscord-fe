import {Component, Input} from '@angular/core';
import {DatePipe, NgIf} from '@angular/common';

@Component({
  selector: 'ChatItem',
  imports: [
    DatePipe,
    NgIf
  ],
  standalone: true,
  template:
    `
      <div class="relative w-10 h-10">
      <div class="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-main-surface-secondary">
        <!-- Если есть аватар — отображаем его -->
        <img
          *ngIf="msg.sender_avatar; else noAvatar"
          [src]="msg.sender_avatar"
          alt="Avatar"
          class="w-10 h-10 rounded-full object-cover"
        />

        <!-- Если аватара нет — отображаем первую букву имени -->
        <ng-template #noAvatar>
          <div class="w-10 h-10 rounded-full bg-gray-600 text-white flex items-center justify-center text-sm font-semibold">
            {{ msg.sender_username.charAt(0).toUpperCase() }}
          </div>
        </ng-template>
      </div>
    </div>

    <!-- Текст сообщения -->
    <div>
      <div class="flex items-center space-x-2">
        <div class="text-sm font-medium text-gray-300">{{ msg.sender_username }}</div>
        <div class="text-xs text-gray-500">{{ msg.timestamp | date:'dd.MM.yyyy, HH:mm' }}</div>
      </div>
      <div class="text-sm text-gray-400">{{ msg.message || msg.text }}</div>
    </div>


    `
})

export class ChatItem {
  @Input() msg!: {
    sender_avatar: string;
    sender_username: string;
    timestamp: string;
    message?: string;
    text?: string;
  };
}
