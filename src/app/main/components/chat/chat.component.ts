import {Component, OnInit, AfterViewInit, ViewChild, ElementRef, AfterViewChecked} from '@angular/core';
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
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  messages: any[] = [];
  messageInput: string = '';
  friend: { username: string; avatar: string } | null = null; // Информация о друге
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

          // Устанавливаем friend для передачи в HeaderComponent
          this.friend = {
            username: recipientInfo.username,
            avatar: recipientInfo.avatar || 'avatars/default-avatar.png',
          };

          // Теперь, когда recipient установлен, можно загружать историю сообщений
          this.loadHistoryMessage();
        }
      });

      // Получаем сообщения в чате через WebSocket
      this.socketService.getMessages().subscribe(message => {

        if (!message.timestamp) {
          message.timestamp = new Date().toISOString();
        }

        if (message.sender !== this.sender) {
          this.messages.push(message);
        }
        this.scrollToBottom();
      });
    });
  }



  loadHistoryMessage() {
    // Запрашиваем историю сообщений для текущего канала
    this.apiService.getMessageHistory(this.sender, this.recipient).subscribe(messages => {
      this.messages = messages.map((msg: any) => ({
        text: msg.text,
        sender: msg.sender.id,
        sender_avatar: msg.sender.avatar,
        recipient: msg.recipient.id,
        sender_username: msg.sender.username,
        recipient_username: msg.recipient.username,
        timestamp: msg.timestamp,
      }));
      this.scrollToBottom();
    });
  }

  sendMessage(): void {
    if (this.messageInput.trim()) {
      this.socketService.sendMessage(this.messageInput, this.recipient);

      this.messages.push({
        message: this.messageInput,
        sender: this.sender,
        recipient: this.recipient,
        sender_username: this.senderUsername,
        recipient_username: this.recipientUsername,
        timestamp: new Date().toISOString(), // Добавляем временную метку
      });

      this.messageInput = ''; // Очищаем поле ввода
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }
}
