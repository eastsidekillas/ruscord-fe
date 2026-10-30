import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AvatarUI } from '@shared/ui/avatar';
import { LucideAngularModule, Pencil, Reply, Trash2 } from 'lucide-angular';
import { Message } from '@shared/api';

/** A message ready to show: the author resolved to the newest profile. */
export interface ChatMessage {
  message: Message;
  authorId: string | null;
  authorName: string;
  authorAvatar: string | null;
  /** The message it answers, if loaded; `missing` when it is not. */
  reply: { authorName: string; content: string } | 'missing' | null;
  canEdit: boolean;
  canDelete: boolean;
}

@Component({
  selector: 'ChatItem',
  standalone: true,
  imports: [DatePipe, CommonModule, AvatarUI, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block relative group px-2' },
  template: `
    <div *ngIf="item.reply" class="flex items-center gap-2 ml-14 mb-0.5 pl-2 border-l-2 border-gray-500/60 max-w-prose">
      <lucide-angular class="w-3 h-3 text-gray-500 shrink-0" [img]="Reply"></lucide-angular>
      <ng-container *ngIf="item.reply !== 'missing'; else missing">
        <span class="text-xs font-medium text-gray-400 shrink-0">{{ item.reply.authorName }}</span>
        <span class="text-xs text-gray-500 truncate">{{ item.reply.content }}</span>
      </ng-container>
      <ng-template #missing><span class="text-xs text-gray-500 italic">Исходное сообщение не загружено или удалено</span></ng-template>
    </div>

    <div class="flex items-start space-x-3">
      <button class="relative w-10 h-10 rounded-full overflow-hidden bg-main-surface-secondary shrink-0"
              (click)="item.authorId && authorClicked.emit(item.authorId)">
        <AvatarUI [src]="item.authorAvatar" [name]="item.authorName" />
      </button>
      <div class="min-w-0 flex-1">
        <div class="flex items-center space-x-2">
          <span class="text-sm font-medium text-gray-300">{{ item.authorName }}</span>
          <span class="text-xs text-gray-500">{{ item.message.created_at | date:'dd.MM.yyyy, HH:mm' }}</span>
          <span *ngIf="item.message.edited_at" class="text-[10px] text-gray-500">(изменено)</span>
        </div>
        <div class="text-sm text-gray-400 break-words whitespace-pre-wrap">{{ item.message.content }}</div>
      </div>
    </div>

    <div class="absolute right-2 top-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <button *ngIf="canReply" class="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300" title="Ответить"
              (click)="replyClicked.emit(item)">
        <lucide-angular class="w-4 h-4" [img]="Reply"></lucide-angular>
      </button>
      <button *ngIf="item.canEdit" class="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300" title="Изменить"
              (click)="editClicked.emit(item)">
        <lucide-angular class="w-4 h-4" [img]="Pencil"></lucide-angular>
      </button>
      <button *ngIf="item.canDelete" class="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-red-400" title="Удалить"
              (click)="deleteClicked.emit(item)">
        <lucide-angular class="w-4 h-4" [img]="Trash2"></lucide-angular>
      </button>
    </div>
  `,
})
export class ChatItem {
  @Input({ required: true }) item!: ChatMessage;
  @Input() canReply = true;
  @Output() replyClicked = new EventEmitter<ChatMessage>();
  @Output() editClicked = new EventEmitter<ChatMessage>();
  @Output() deleteClicked = new EventEmitter<ChatMessage>();
  @Output() authorClicked = new EventEmitter<string>();

  protected readonly Reply = Reply;
  protected readonly Pencil = Pencil;
  protected readonly Trash2 = Trash2;
}
