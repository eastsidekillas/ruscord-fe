import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SocketService } from '../../../core/services/socket.service';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from "../../../auth/services/auth.service";

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, AfterViewInit {
  messages: any[] = [];
  messageInput: string = '';
  friend: { username: string; avatar: string } | null = null; // Информация о друге
  uuid: string = ''; // UUID канала чата
  sender: string = ''; // ID текущего пользователя
  recipient: string = ''; // ID получателя
  senderUsername: string = ''; // Имя отправителя
  recipientUsername: string = ''; // Имя получателя
  currentUser: any;

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef; // Контейнер сообщений
  private isUserAtBottom: boolean = false; // Флаг, отслеживающий, находимся ли мы внизу чата

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
        if (message.sender !== this.sender) {
          this.messages.push(message);
          if (this.isUserAtBottom) {
            this.scrollToBottom(); // Прокручиваем до последнего сообщения, если пользователь находится внизу
          }
        }
      });
    });
  }

  ngAfterViewInit(): void {
    // Прокручиваем вниз после загрузки истории сообщений
    setTimeout(() => {
      this.scrollToBottom();
    }, 5); // Мы используем setTimeout, чтобы гарантировать, что DOM был обновлён
  }



  loadHistoryMessage() {
    // Запрашиваем историю сообщений для текущего канала
    this.apiService.getMessageHistory(this.sender, this.recipient).subscribe(messages => {
      // Добавляем все сообщения в список
      this.messages = messages.map((msg: any) => ({
        text: msg.text, // Используем поле text для истории
        sender: msg.sender.id,
        sender_avatar: msg.sender.avatar,
        recipient: msg.recipient.id,
        sender_username: msg.sender.username,
        recipient_username: msg.recipient.username,
        timestamp: msg.timestamp,
      }));

      // Прокручиваем вниз после загрузки истории сообщений
      this.scrollToBottom();
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
      this.scrollToBottom(); // Прокручиваем вниз после отправки сообщения
    }
  }

  // Метод для прокрутки контейнера с сообщениями вниз
  private scrollToBottom(): void {
    try {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    } catch (err) {
      console.error('Ошибка прокрутки', err);
    }
  }

  // Проверка на то, внизу ли пользователь
  public onScroll(): void {
    const container = this.messagesContainer.nativeElement;
    this.isUserAtBottom = container.scrollHeight - container.scrollTop === container.clientHeight;
  }
}
