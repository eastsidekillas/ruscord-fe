import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { messageTime } from '@shared/lib/dates';
import { AvatarUI } from '@shared/ui/avatar';
import { CornerUpRight, LucideAngularModule, Pencil, Reply, Trash2 } from 'lucide-angular';
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
  imports: [CommonModule, AvatarUI, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block relative group rounded-[10px] p-2 hover:bg-ok-surface-2 focus-within:bg-ok-surface-2' },
  template: `
    <div *ngIf="item.reply" class="flex items-center gap-1.5 pl-[52px] pb-1 text-[13px] text-ok-muted min-w-0">
      <lucide-angular class="w-3.5 h-3.5 shrink-0" [img]="CornerUpRight"></lucide-angular>
      <ng-container *ngIf="item.reply !== 'missing'; else missing">
        <span class="font-semibold text-ok-text shrink-0">{{ item.reply.authorName }}</span>
        <span class="truncate">{{ item.reply.content }}</span>
      </ng-container>
      <ng-template #missing><span class="italic">Исходное сообщение не загружено или удалено</span></ng-template>
    </div>

    <div class="flex items-start gap-3">
      <button type="button" class="w-10 h-10 rounded-[10px] overflow-hidden shrink-0" [attr.aria-label]="'Профиль: ' + item.authorName"
              (click)="item.authorId && authorClicked.emit(item.authorId)">
        <AvatarUI [src]="item.authorAvatar" [name]="item.authorName" />
      </button>
      <div class="min-w-0 flex-1">
        <div class="flex items-baseline gap-2">
          <span class="text-[15px] font-semibold text-ok-text">{{ item.authorName }}</span>
          <time class="text-[12px] text-ok-muted" [attr.datetime]="item.message.created_at">{{ when(item.message.created_at) }}</time>
        </div>
        <p class="mt-0.5 text-[15px] leading-[22px] text-ok-text break-words whitespace-pre-wrap">{{ item.message.content }}<span *ngIf="item.message.edited_at" class="ml-1 text-[12px] text-ok-muted">(изменено)</span></p>
      </div>
    </div>

    <div role="toolbar" aria-label="Действия с сообщением"
         class="absolute right-3 -top-4 hidden group-hover:flex group-focus-within:flex gap-0.5 p-0.5 rounded-[10px] bg-ok-surface-1 border border-ok-border shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
      <button *ngIf="canReply" type="button" class="w-8 h-8 rounded-lg text-ok-text hover:bg-ok-surface-2 flex items-center justify-center" title="Ответить" aria-label="Ответить"
              (click)="replyClicked.emit(item)">
        <lucide-angular class="w-4 h-4" [img]="Reply"></lucide-angular>
      </button>
      <button *ngIf="item.canEdit" type="button" class="w-8 h-8 rounded-lg text-ok-text hover:bg-ok-surface-2 flex items-center justify-center" title="Изменить" aria-label="Изменить"
              (click)="editClicked.emit(item)">
        <lucide-angular class="w-4 h-4" [img]="Pencil"></lucide-angular>
      </button>
      <button *ngIf="item.canDelete" type="button" class="w-8 h-8 rounded-lg text-ok-danger hover:bg-ok-surface-2 flex items-center justify-center" title="Удалить" aria-label="Удалить"
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
  protected readonly CornerUpRight = CornerUpRight;

  /** Time only for today, the date as well for older messages. */
  protected when(iso: string): string {
    return messageTime(new Date(iso), new Date());
  }
}

