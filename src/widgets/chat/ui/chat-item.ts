import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AvatarUI } from '@shared/ui/avatar';

@Component({
  selector: 'ChatItem',
  standalone: true,
  imports: [DatePipe, AvatarUI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-10 h-10 rounded-full overflow-hidden bg-main-surface-secondary shrink-0">
      <AvatarUI [src]="msg.sender_avatar" [name]="msg.sender_username" />
    </div>

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
