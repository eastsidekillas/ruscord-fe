import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessage } from '@widgets/chat/ui/chat-item';
import { LucideAngularModule, Pencil, Reply, SendHorizonal, X } from 'lucide-angular';

export interface SendPayload {
  text: string;
  replyToId: string | null;
}

/** Message length limit of ruscord-core, in characters. */
export const MAX_MESSAGE = 4000;

@Component({
  selector: 'MessageInput',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div *ngIf="replyTo || editing" class="flex items-center gap-2 mb-2 pl-3 pr-2 py-1.5 bg-main-surface-secondary rounded-xl text-xs border border-white/5">
      <lucide-angular [img]="editing ? Pencil : Reply" class="w-3.5 h-3.5 text-green-500 shrink-0"></lucide-angular>
      <ng-container *ngIf="editing; else replyLine">
        <span class="text-gray-400 flex-1">Редактирование сообщения · Esc — отмена</span>
      </ng-container>
      <ng-template #replyLine>
        <span class="text-gray-400">Ответ для</span>
        <span class="text-green-400 font-medium">{{ replyTo!.authorName }}</span>
        <span class="text-gray-500 truncate flex-1">{{ replyTo!.message.content }}</span>
      </ng-template>
      <button (click)="cancel()" class="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors shrink-0" title="Отменить">
        <lucide-angular [img]="X" class="w-3.5 h-3.5"></lucide-angular>
      </button>
    </div>

    <div class="bg-main-surface-secondary rounded-xl shadow-lg px-4 py-4 flex items-center gap-3" [class.opacity-60]="disabled">
      <input #field
        class="flex-1 bg-transparent text-sm text-gray-200 focus:outline-none placeholder-typo-secondary h-10"
        type="text"
        [maxlength]="max"
        [disabled]="disabled"
        [(ngModel)]="message"
        (input)="onInput()"
        [placeholder]="disabled ? disabledText : placeholder"
        (keydown.enter)="handleSend()"
        (keydown.escape)="cancel()"
      />
      <button (click)="handleSend()" [disabled]="disabled" class="text-green-500 hover:text-green-400 transition-all shrink-0 disabled:text-gray-600" title="Отправить">
        <lucide-angular class="w-5 h-5" [img]="SendHorizonal"></lucide-angular>
      </button>
    </div>
  `,
})
export class MessageInput implements OnChanges {
  @Input() placeholder = 'Написать сообщение...';
  @Input() disabled = false;
  @Input() disabledText = 'Вы не можете писать в этом канале';
  @Input() replyTo: ChatMessage | null = null;
  @Input() editing: ChatMessage | null = null;
  @Output() cancelReply = new EventEmitter<void>();
  @Output() cancelEdit = new EventEmitter<void>();
  /** Fired on input; the page decides how often to tell the server. */
  @Output() typing = new EventEmitter<void>();
  @Output() sendMessage = new EventEmitter<SendPayload>();
  @Output() saveEdit = new EventEmitter<{ item: ChatMessage; text: string }>();
  @ViewChild('field') field?: ElementRef<HTMLInputElement>;

  message = '';
  protected readonly max = MAX_MESSAGE;
  private draft = '';

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['editing']) {
      if (this.editing) {
        this.draft = this.message;
        this.message = this.editing.message.content;
      } else if (ch['editing'].previousValue) {
        this.message = this.draft;
      }
      this.focus();
    }
    if (ch['replyTo'] && this.replyTo) this.focus();
  }

  handleSend(): void {
    const text = this.message.trim();
    if (!text || this.disabled) return;
    if (this.editing) {
      this.saveEdit.emit({ item: this.editing, text });
      this.draft = '';
    } else {
      this.sendMessage.emit({ text, replyToId: this.replyTo?.message.id ?? null });
      this.message = '';
    }
  }

  /** Clears the input after the page sent the message (or restores it on failure). */
  reset(text = ''): void {
    this.message = text;
  }

  protected onInput(): void {
    if (this.message.trim() && !this.editing) this.typing.emit();
  }

  protected cancel(): void {
    if (this.editing) this.cancelEdit.emit();
    else if (this.replyTo) this.cancelReply.emit();
  }

  private focus(): void {
    setTimeout(() => this.field?.nativeElement.focus());
  }

  protected readonly SendHorizonal = SendHorizonal;
  protected readonly Reply = Reply;
  protected readonly Pencil = Pencil;
  protected readonly X = X;
}
