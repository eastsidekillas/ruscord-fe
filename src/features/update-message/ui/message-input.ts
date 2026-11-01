import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessage } from '@widgets/chat/ui/chat-item';
import { LucideAngularModule, SendHorizonal, X } from 'lucide-angular';
import { MAX_MESSAGE } from '@shared/config/limits';

export interface SendPayload {
  text: string;
  replyToId: string | null;
}

@Component({
  selector: 'MessageInput',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div *ngIf="replyTo" class="flex items-center gap-2 px-3 py-2 rounded-t-ok-md bg-ok-surface-2 text-[13px] text-ok-muted min-w-0">
      <span class="flex-1 truncate">Ответ <span class="font-semibold text-ok-text">{{ replyTo.authorName }}</span></span>
      <button type="button" (click)="cancelReply.emit()" class="w-7 h-7 rounded-lg text-ok-muted hover:text-ok-text hover:bg-ok-surface-1 flex items-center justify-center shrink-0"
              title="Отменить ответ" aria-label="Отменить ответ">
        <lucide-angular [img]="X" class="w-3.5 h-3.5"></lucide-angular>
      </button>
    </div>

    <label class="flex items-center gap-2 h-12 pl-4 pr-1.5 border border-ok-border-control focus-within:border-ok-accent bg-ok-sidebar"
           [ngClass]="replyTo ? 'rounded-b-ok-md' : 'rounded-ok-md'" [class.opacity-60]="disabled">
      <span class="sr-only-ok">Сообщение</span>
      <input #field
        class="flex-1 min-w-0 bg-transparent text-[15px] text-ok-text placeholder:text-ok-muted !outline-none"
        type="text"
        [maxlength]="max"
        [disabled]="disabled"
        [(ngModel)]="message"
        (input)="onInput()"
        [placeholder]="disabled ? disabledText : placeholder"
        (keydown.enter)="handleSend()"
        (keydown.escape)="replyTo && cancelReply.emit()"
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
  @Output() cancelReply = new EventEmitter<void>();
  /** Fired on input; the page decides how often to tell the server. */
  @Output() typing = new EventEmitter<void>();
  @Output() sendMessage = new EventEmitter<SendPayload>();
  @ViewChild('field') field?: ElementRef<HTMLInputElement>;

  message = '';
  protected readonly max = MAX_MESSAGE;

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['replyTo'] && this.replyTo) this.focus();
  }

  handleSend(): void {
    const text = this.message.trim();
    if (!text || this.disabled) return;
    this.sendMessage.emit({ text, replyToId: this.replyTo?.message.id ?? null });
    this.message = '';
  }

  protected onInput(): void {
    if (this.message.trim()) this.typing.emit();
  }

  private focus(): void {
    setTimeout(() => this.field?.nativeElement.focus());
  }

  protected readonly SendHorizonal = SendHorizonal;
  protected readonly X = X;
}
