import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { messageTime } from '@shared/lib/dates';
import { AvatarUI } from '@shared/ui/avatar';
import { CornerUpRight, LucideAngularModule, Pencil, Reply, Trash2 } from 'lucide-angular';
import { Message } from '@shared/api';
import { MAX_MESSAGE } from '@shared/config/limits';

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
  host: {
    class: 'block relative group rounded-[10px] p-2 hover:bg-ok-surface-2 [&:not(.editing)]:focus-within:bg-ok-surface-2',
    '[class.editing]': 'editing',
  },
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
        <p *ngIf="!editing" class="mt-0.5 text-[15px] leading-[22px] text-ok-text break-words whitespace-pre-wrap">{{ item.message.content }}<span *ngIf="item.message.edited_at" class="ml-1 text-[12px] text-ok-muted">(изменено)</span></p>
        <ng-container *ngIf="editing">
          <label [for]="'edit-' + item.message.id" class="sr-only-ok">Изменить сообщение</label>
          <input #editField [id]="'edit-' + item.message.id" type="text" [value]="item.message.content" [attr.maxlength]="max"
                 class="mt-1 w-full h-11 box-border rounded-[10px] border border-ok-accent bg-ok-sidebar text-ok-text px-3.5 !outline-none"
                 (keydown.enter)="save(editField.value)" (keydown.escape)="cancelEdit.emit()" />
          <div class="mt-1 text-[12px] text-ok-muted">Esc — отменить · Enter — сохранить</div>
        </ng-container>
      </div>
    </div>

    <div *ngIf="!editing" role="toolbar" aria-label="Действия с сообщением"
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
  /** Shows the text as a field: Enter saves, Esc cancels. */
  @Input() set editing(on: boolean) {
    this.isEditing = on;
    if (on) setTimeout(() => this.editField?.nativeElement.focus());
  }
  get editing(): boolean {
    return this.isEditing;
  }
  @Output() saveEdit = new EventEmitter<{ item: ChatMessage; text: string }>();
  @Output() cancelEdit = new EventEmitter<void>();
  @ViewChild('editField') private editField?: ElementRef<HTMLInputElement>;
  private isEditing = false;
  protected readonly max = MAX_MESSAGE;
  @Output() replyClicked = new EventEmitter<ChatMessage>();
  @Output() editClicked = new EventEmitter<ChatMessage>();
  @Output() deleteClicked = new EventEmitter<ChatMessage>();
  @Output() authorClicked = new EventEmitter<string>();

  protected readonly Reply = Reply;
  protected readonly Pencil = Pencil;
  protected readonly Trash2 = Trash2;
  protected readonly CornerUpRight = CornerUpRight;

  protected save(text: string): void {
    const t = text.trim();
    if (t) this.saveEdit.emit({ item: this.item, text: t });
  }

  /** Time only for today, the date as well for older messages. */
  protected when(iso: string): string {
    return messageTime(new Date(iso), new Date());
  }
}

