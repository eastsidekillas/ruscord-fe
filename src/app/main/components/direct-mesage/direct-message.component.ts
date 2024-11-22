import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from "@angular/router";
import { SocketService } from "../../../core/services/socket.service";
import { ApiService } from "../../../core/services/api.service";

@Component({
  selector: 'app-direct-message',
  templateUrl: './direct-message.component.html',
  styleUrls: ['./direct-message.component.css']
})
export class DirectMessageComponent implements OnInit {
  messages: { message: string, sender: string, recipient: string, sender_username: string }[] = [];
  messageInput: string = '';
  senderId!: string;
  recipientId!: string;
  senderUsername: string = ''; // Имя текущего пользователя
  uuid: string = '';

  constructor(
    private chatService: SocketService,
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    // Получаем текущего пользователя
    this.apiService.getProfile().subscribe({
      next: (profile) => {
        this.senderId = profile.id;
        this.senderUsername = profile.username; // Сохраняем имя текущего пользователя
        this.initializeChat();
      },
      error: (err) => {
        console.error('Ошибка получения профиля:', err);
      },
    });
  }

  initializeChat(): void {
    // Подписываемся на параметры маршрута, чтобы получить uuid и подключиться к чату
    this.route.queryParams.subscribe(params => {
      this.uuid = params['uuid'];
      this.connectToChat();
    });

    // Подписываемся на сообщения от WebSocket-сервиса
    this.chatService.getMessages().subscribe((data) => {
      console.log('Received message:', data);
      this.messages.push({
        message: data.message,
        sender: data.sender_uuid,
        recipient: data.recipient_uuid,
        sender_username: data.sender_username,
      });
    });
  }

  connectToChat(): void {
    if (this.uuid) {
      this.chatService.connect(this.uuid);
    } else {
      console.error('UUID не указан');
    }
  }

  sendMessage(): void {
    if (this.messageInput.trim()) {
      // Отправляем сообщение через WebSocket
      this.chatService.sendMessage(this.messageInput, this.senderId, this.uuid, this.senderUsername);
      // Добавляем сообщение в локальный список
      this.messages.push({
        message: this.messageInput,
        sender: this.senderId,
        recipient: this.recipientId,
        sender_username: this.senderUsername,
      });
      this.messageInput = ''; // Очищаем поле ввода
    }
  }
}
