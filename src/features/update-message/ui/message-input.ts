import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessage } from '@widgets/chat/ui/chat-item';

export interface SendPayload {
  text: string;
  replyToId: string | null;
}

@Component({
  selector: 'MessageInput',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Reply preview bar (above the card) -->
    <div *ngIf="replyTo"
         class="flex items-center gap-2 mb-2 pl-3 pr-2 py-1.5
                bg-main-surface-secondary rounded-xl text-xs border border-white/5">
      <svg class="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6"/>
      </svg>
      <span class="text-gray-400">Ответ для</span>
      <span class="text-green-400 font-medium">{{ replyTo.sender_username }}</span>
      <span class="text-gray-500 truncate flex-1">{{ replyTo.message || replyTo.text }}</span>
      <button
        (click)="cancelReply.emit()"
        class="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors shrink-0"
        title="Отменить ответ"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Input card — same style as SidebarUserProfile -->
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
        [class.opacity-0]="!message.trim()"
        [class.pointer-events-none]="!message.trim()"
        class="text-green-500 hover:text-green-400 transition-all shrink-0"
        title="Отправить"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
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
}
