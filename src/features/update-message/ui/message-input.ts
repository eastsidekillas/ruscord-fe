import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
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
    <div *ngIf="replyTo || editing" class="flex items-center gap-2 px-3 py-2 rounded-t-ok-md bg-ok-surface-2 text-[13px] text-ok-muted min-w-0">
      <lucide-angular [img]="editing ? Pencil : Reply" class="w-3.5 h-3.5 shrink-0"></lucide-angular>
      <ng-container *ngIf="editing; else replyLine">
        <span class="flex-1">Редактирование сообщения · Esc — отмена</span>
      </ng-container>
      <ng-template #replyLine>
        <span class="shrink-0">Ответ для</span>
        <span class="font-semibold text-ok-text shrink-0">{{ replyTo!.authorName }}</span>
        <span class="truncate flex-1">{{ replyTo!.message.content }}</span>
      </ng-template>
      <button type="button" (click)="cancel()" class="w-7 h-7 rounded-lg text-ok-muted hover:text-ok-text hover:bg-ok-surface-1 flex items-center justify-center shrink-0"
              title="Отменить" aria-label="Отменить">
        <lucide-angular [img]="X" class="w-3.5 h-3.5"></lucide-angular>
      </button>
    </div>

    <label class="flex items-center gap-2 h-12 pl-4 pr-1.5 border border-ok-border-control bg-ok-sidebar"
           [ngClass]="replyTo || editing ? 'rounded-b-ok-md' : 'rounded-ok-md'" [class.opacity-60]="disabled">
      <span class="sr-only-ok">Сообщение</span>
      <input #field
        class="flex-1 min-w-0 bg-transparent text-[15px] text-ok-text placeholder:text-ok-muted outline-none"
        type="text"
        [maxlength]="max"
        [disabled]="disabled"
        [(ngModel)]="message"
        (input)="onInput()"
        [placeholder]="disabled ? disabledText : placeholder"
        (keydown.enter)="handleSend()"
        (keydown.escape)="cancel()"
      />
      <button type="button" (click)="handleSend()" [disabled]="disabled || !message.trim()" title="Отправить" aria-label="Отправить"
              class="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-ok-accent hover:bg-ok-surface-1 disabled:text-ok-muted disabled:hover:bg-transparent">
        <lucide-angular class="w-[18px] h-[18px]" [img]="SendHorizonal"></lucide-angular>
      </button>
    </label>
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

  private readonly cdr = inject(ChangeDetectorRef);

  /**
   * Clears the input after the page sent the message, or puts the text back
   * when sending failed. The page calls it, so this OnPush view must be
   * marked: otherwise the restored text would stay invisible.
   */
  reset(text = ''): void {
    this.message = text;
    this.cdr.markForCheck();
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
