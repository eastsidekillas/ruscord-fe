import {Component, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'MessageInput',
  standalone: true,
  imports: [
    FormsModule
  ],
  template: `
    <input
      class="flex-1 bg-main-surface-secondary text-sm text-gray-200 py-4 pl-4 pr-16 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 border-none"
      type="text"
      [(ngModel)]="message"
      (input)="onInputChange()"
      [placeholder]="placeholder"
      (keydown.enter)="handleSend()"
    />
  `
})

export class MessageInput {
  @Input() channelId!: string;
  @Input() placeholder: string = 'Напишите сообщение...';
  @Output() typing = new EventEmitter<boolean>(); // Изменен тип на boolean
  @Output() sendMessage = new EventEmitter<string>();

  message: string = '';
  private typingTimeout: any;
  private isTyping = false;

  handleSend() {
    const text = this.message.trim();
    if (text) {
      this.sendMessage.emit(text);
      this.message = '';
      this.emitTyping(false); // Сообщаем, что закончили печатать после отправки
    }
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
      this.debounceTyping(); // Сбрасываем таймер, если продолжаем печатать
    }
  }

  private debounceTyping() {
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      if (this.isTyping) {
        this.isTyping = false;
        this.emitTyping(false);
      }
    }, 200); // Задержка в 1 секунду после прекращения ввода
  }

  private emitTyping(isTyping: boolean) {
    this.typing.emit(isTyping);
  }
}
