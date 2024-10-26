import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from "@angular/router";
import {SocketService} from "../../../core/services/socket.service";

@Component({
  selector: 'app-direct-message',
  templateUrl: './direct-message.component.html',
  styleUrls: ['./direct-message.component.css']
})
export class DirectMessageComponent implements OnInit {
  messages: { message: string, sender: number, recipient: number, sender_username: string }[] = [];
  messageInput: string = '';
  senderId!: number;
  recipientId!: number;

  constructor(
    private chatService: SocketService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Получаем senderId из localStorage
    this.senderId = +localStorage.getItem('user_id')!;

    // Подписываемся на параметры маршрута, чтобы получить recipientId и подключиться к чату
    this.route.queryParams.subscribe(params => {
      this.recipientId = +params['recipientId'];
      this.connectToChat();
    });

    // Подписываемся на сообщения от WebSocket-сервиса
    this.chatService.getMessages().subscribe((data) => {
      console.log('Received message:', data);
      this.messages.push({
        message: data.message,
        sender: data.sender,
        recipient: data.recipient,
        sender_username: data.sender_username,
      });
    });
  }

  connectToChat(): void {
    if (this.recipientId) {
      this.chatService.connect(this.recipientId);
    } else {
      console.error('Recipient ID не указан');
    }
  }

  sendMessage(): void {
    if (this.messageInput.trim()) {
      this.chatService.sendMessage(this.messageInput, this.senderId, this.recipientId);
      this.messageInput = ''; // Очищаем поле ввода
    }
  }
}
