import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { AvatarUI } from '@shared/ui/avatar';
import { LucideAngularModule, Reply, Forward } from 'lucide-angular';

export interface ChatMessage {
  message_id?: string;
  sender_avatar: string;
  sender_username: string;
  timestamp: string;
  message?: string;
  text?: string;
  reply_to?: { id: string; content: string; sender_name: string } | null;
  forwarded_from?: { id: string; content: string; sender_name: string } | null;
}

@Component({
  selector: 'ChatItem',
  standalone: true,
  imports: [DatePipe, CommonModule, AvatarUI, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block relative group px-2' },
  template: `
    <!-- Forwarded banner -->
    <div *ngIf="msg.forwarded_from"
         class="flex items-center gap-1.5 ml-14 mb-0.5 text-xs text-gray-500">
      <lucide-angular class="w-3 h-3" [img]="Forward"></lucide-angular>
      <span>Переслано от</span>
      <span class="font-medium text-gray-400">{{ msg.forwarded_from.sender_name }}</span>
    </div>

    <!-- Reply quote -->
    <div *ngIf="msg.reply_to" class="flex items-center gap-2 ml-14 mb-0.5 pl-2 border-l-2 border-gray-500/60 max-w-prose">
      <lucide-angular class="w-3 h-3 text-gray-500 shrink-0" [img]="Reply"></lucide-angular>

      <span class="text-xs font-medium text-gray-400 shrink-0">{{ msg.reply_to.sender_name }}</span>
      <span class="text-xs text-gray-500 truncate">{{ msg.reply_to.content }}</span>
    </div>

    <!-- Message row -->
    <div class="flex items-start space-x-3">
      <div class="relative w-10 h-10 rounded-full overflow-hidden bg-main-surface-secondary shrink-0">
        <AvatarUI [src]="msg.sender_avatar" [name]="msg.sender_username" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center space-x-2">
          <span class="text-sm font-medium text-gray-300">{{ msg.sender_username }}</span>
          <span class="text-xs text-gray-500">{{ msg.timestamp | date:'dd.MM.yyyy, HH:mm' }}</span>
        </div>
        <div class="text-sm text-gray-400 break-words">{{ msg.message || msg.text }}</div>
      </div>
    </div>

    <!-- Action buttons (on hover) -->
    <div class="absolute right-2 top-1 flex items-center gap-0.5
                opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        class="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300"
        title="Ответить"
        (click)="replyClicked.emit(msg)"
      >
        <lucide-angular class="w-4 h-4" [img]="Reply"></lucide-angular>
      </button>
      <button
        class="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300"
        title="Переслать"
        (click)="forwardClicked.emit(msg)"
      >
        <lucide-angular class="w-4 h-4" [img]="Forward"></lucide-angular>
      </button>
    </div>
  `
})
export class ChatItem {
  @Input() msg!: ChatMessage;
  @Output() replyClicked = new EventEmitter<ChatMessage>();
  @Output() forwardClicked = new EventEmitter<ChatMessage>();

  protected readonly Reply = Reply;
  protected readonly Forward = Forward;
}
