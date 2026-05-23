import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessage } from '@widgets/chat/ui/chat-item';
import { LucideAngularModule, Reply, SendHorizonal, X } from 'lucide-angular';

export interface SendPayload {
  text: string;
  replyToId: string | null;
}

@Component({
  selector: 'MessageInput',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `

    <div *ngIf="replyTo" class="flex items-center gap-2 mb-2 pl-3 pr-2 py-1.5 bg-main-surface-secondary rounded-xl text-xs border border-white/5">

      <lucide-angular [img]="Reply" class="w-3.5 h-3.5 text-green-500 shrink-0"></lucide-angular>

      <span class="text-gray-400">Ответ для</span>
      <span class="text-green-400 font-medium">{{ replyTo.sender_username }}</span>
      <span class="text-gray-500 truncate flex-1">{{ replyTo.message || replyTo.text }}</span>
      <button
        (click)="cancelReply.emit()"
        class="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors shrink-0"
        title="Отменить ответ"
      >
        <lucide-angular [img]="X" class="w-3.5 h-3.5"></lucide-angular>

      </button>
    </div>

    <div class="bg-main-surface-secondary rounded-xl shadow-lg px-4 py-4 flex items-center gap-3">
      <input
        class="flex-1 bg-transparent text-sm text-gray-200 focus:outline-none placeholder-typo-secondary h-10"
        type="text"
        [(ngModel)]="message"
        (input)="onInputChange()"
        [placeholder]="placeholder"
        (keydown.enter)="handleSend()"
      />
      <button
        (click)="handleSend()"
        class="text-green-500 hover:text-green-400 transition-all shrink-0"
        title="Отправить"
      >
        <lucide-angular class="w-5 h-5"  [img]="SendHorizonal"></lucide-angular>
      </button>
    </div>
  `
})
export class MessageInput {
  @Input() channelId!: string;
  @Input() placeholder = 'Написать сообщение...';
  @Input() replyTo: ChatMessage | null = null;
  @Output() cancelReply = new EventEmitter<void>();
  @Output() typing = new EventEmitter<boolean>();
  @Output() sendMessage = new EventEmitter<SendPayload>();

  message = '';
  private typingTimeout: any;
  private isTyping = false;

  handleSend() {
    const text = this.message.trim();
    if (!text) return;
    this.sendMessage.emit({
      text,
      replyToId: this.replyTo?.message_id ?? null,
    });
    this.message = '';
    this.emitTyping(false);
  }

  onInputChange() {
    if (this.message.length > 0 && !this.isTyping) {
      this.isTyping = true;
      this.emitTyping(true);
      this.debounceTyping();
    } else if (this.message.length === 0 && this.isTyping) {
      this.isTyping = false;
      this.emitTyping(false);
      clearTimeout(this.typingTimeout);
    } else if (this.message.length > 0) {
      this.debounceTyping();
    }
  }

  private debounceTyping() {
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      if (this.isTyping) {
        this.isTyping = false;
        this.emitTyping(false);
      }
    }, 2000);
  }

  private emitTyping(isTyping: boolean) {
    this.typing.emit(isTyping);
  }

  protected readonly SendHorizonal = SendHorizonal;
  protected readonly Reply = Reply;
  protected readonly X = X;
}
