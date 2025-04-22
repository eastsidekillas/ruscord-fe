import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'MessageInput',
  standalone: true,
  imports: [
    FormsModule
  ],
  template:
    `
      <input
        class="flex-1 bg-main-surface-secondary text-sm text-gray-200 py-4 pl-4 pr-16 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 border-none"
        type="text"
        [(ngModel)]="message"
        [placeholder]="placeholder"
        (keydown.enter)="handleSend()"
      />
    `
})

export class MessageInput {
  @Input() channelId!: string;
  @Input() placeholder: string = 'Напишите сообщение...';
  @Output() sendMessage = new EventEmitter<string>();

  message: string = '';


  handleSend() {
    const text = this.message.trim();
    if (text) {
      this.sendMessage.emit(text);
      this.message = '';
    }
  }

  openAttachmentDialog() {
    // реализуй открытие вложений, если нужно
    alert('Тут будет модалка вложений');
  }
}
