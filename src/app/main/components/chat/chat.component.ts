import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SocketService } from '../../../core/services/socket.service';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from "../../../auth/services/auth.service";

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
  messages: any[] = [];
  messageInput: string = '';
  uuid: string = ''; // UUID канала чата
  sender: string = ''; // ID текущего пользователя
  recipient: string = ''; // ID получателя
  senderUsername: string = ''; // Имя отправителя
  recipientUsername: string = ''; // Имя получателя
  currentUser: any;

  constructor(
    private route: ActivatedRoute,
    private socketService: SocketService,
    private apiService: ApiService,
    private authService: AuthService  // Внедряем AuthService
  ) {}

  ngOnInit(): void {
    // Получаем UUID канала из маршрута
    this.route.params.subscribe(params => {
      this.uuid = params['uuid'];

      // Получаем информацию о текущем пользователе
      this.currentUser = this.authService.getCurrentUser();
      if (this.currentUser) {
        this.sender = this.currentUser.id;
        this.senderUsername = this.currentUser.username;
      }

      // Подключаемся к WebSocket
      this.socketService.connect(this.uuid);

      // Получаем информацию о пользователе, с которым мы общаемся (по uuid канала)
      this.apiService.getChannelInfo(this.uuid).subscribe(channel => {
        const recipientInfo = channel.members.find((member: { id: string; }) => member.id !== this.sender); // Находим получателя
        if (recipientInfo) {
          this.recipient = recipientInfo.id;
          this.recipientUsername = recipientInfo.username;

          // Теперь, когда recipient установлен, можно загружать историю сообщений
          this.loadHistoryMessage();
        }
      });

      // Получаем сообщения в чате через WebSocket
      this.socketService.getMessages().subscribe(message => {
        if (message.sender !== this.sender) {
          this.messages.push(message);
        }
      });
    });
  }

  loadHistoryMessage() {
    // Запрашиваем историю сообщений для текущего канала
    this.apiService.getMessageHistory(this.sender, this.recipient).subscribe(messages => {
      // Добавляем все сообщения в список
      this.messages = messages.map((msg: any) => ({
        text: msg.text, // Используем поле text для истории
        sender: msg.sender.id,
        recipient: msg.recipient.id,
        sender_username: msg.sender.username,
        recipient_username: msg.recipient.username,
        timestamp: msg.timestamp,
      }));
    });
  }

  sendMessage(): void {
    if (this.messageInput.trim()) {
      // Отправляем сообщение через WebSocket
      this.socketService.sendMessage(this.messageInput, this.recipient);

      // Добавляем сообщение в локальный список
      this.messages.push({
        message: this.messageInput,
        sender: this.sender,
        recipient: this.recipient,
        sender_username: this.senderUsername,
        recipient_username: this.recipientUsername
      });

      this.messageInput = ''; // Очищаем поле ввода
    }
  }
}
