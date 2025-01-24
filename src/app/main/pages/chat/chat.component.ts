import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SocketService } from '../../../core/services/socket.service';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from "../../../auth/services/auth.service";
import {EmojiData} from "@ctrl/ngx-emoji-mart/ngx-emoji";


@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  messages: any[] = [];
  messageInput: string = '';
  isEmojiPickerVisible: boolean = false;
  ruEmojiInterface = {
    search: 'Поиск',
    emojilist: 'Список эмодзи',
    notfound: 'Эмодзи не найдено',
    clear: 'Очистить',
    categories: {
      search: 'Результаты поиска',
      recent: 'Недавние',
      people: 'Смайлики и люди',
      nature: 'Животные и природа',
      foods: 'Еда и напитки',
      activity: 'Активность',
      places: 'Путешествия и места',
      objects: 'Объекты',
      symbols: 'Символы',
      flags: 'Флаги',
      custom: 'Свои',
    },
    skintones: {
      1: 'Тон по умолчанию',
      2: 'Светлый тон',
      3: 'Средне-светлый тон',
      4: 'Средний тон',
      5: 'Средне-темный тон',
      6: 'Темный тон',
    },
  }
  friend: { username: string; avatar: string } | null = null; // Информация о друге
  uuid: string = ''; // UUID канала чата
  sender: string = ''; // ID текущего пользователя
  recipient: string = ''; // ID получателя
  senderUsername: string = ''; // Имя отправителя
  recipientUsername: string = ''; // Имя получателя
  currentUser: any;

  maxMessageLength: number = 2000;
  messageError: string = '';

  currentTime: number = Date.now();

  lastMessageTimestamp: number = 0; // Время последнего отправленного сообщения
  messageCooldown: number = 1000; // Минимальное время между сообщениями в миллисекундах (2 секунды)

  callActive: boolean = false;

  // Для уведомлений
  showNotification: boolean = false;
  notificationMessage: string = '';
  notificationType: 'success' | 'error' = 'success';

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
        if (message.recipient === this.sender || message.sender === this.sender) {
          // Это сообщение для текущего чата, показываем его
          if (message.sender !== this.sender) {
            this.messages.push(message);

            // Показ уведомления
            this.showNotification = true;
            this.notificationMessage = `${message.sender_username} отправил вам сообщение!`;
            this.notificationType = 'success';

            // Звуковое уведомление (опционально)
            const audio = new Audio('sounds/notification.mp3');
            audio.play();

            // Автоматически скрыть уведомление через 5 секунд
            setTimeout(() => {
              this.showNotification = false;
            }, 5000);
          }

          this.scrollToBottom();
        }
      });
    });

    this.updateCurrentTime();
    setInterval(() => this.updateCurrentTime(), 1000);
  }

  updateCurrentTime() {
    this.currentTime = Date.now();
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
    const now = this.currentTime;

    // Проверяем, прошло ли достаточно времени для отправки нового сообщения
    if (now - this.lastMessageTimestamp < this.messageCooldown) {
      console.log("Пожалуйста, подождите перед отправкой следующего сообщения.");
      return;
    }

    // Проверяем длину сообщения
    if (this.messageInput.trim().length === 0) {
      this.messageError = 'Сообщение не может быть пустым.';
      return;
    }

    if (this.messageInput.length > this.maxMessageLength) {
      this.messageError = `Сообщение не может быть длиннее ${this.maxMessageLength} символов.`;
      return;
    }

    // Очистить ошибку, если все проверки пройдены
    this.messageError = '';

    // Отправка сообщения через сокет
    this.socketService.sendMessage(this.messageInput, this.recipient);

    // Добавляем сообщение в локальный список
    this.messages.push({
      message: this.messageInput,
      sender: this.sender,
      recipient: this.recipient,
      sender_username: this.senderUsername,
      recipient_username: this.recipientUsername,
      timestamp: new Date().toISOString(), // Добавляем временную метку
    });

    // Обновляем время последнего отправленного сообщения
    this.lastMessageTimestamp = now;

    // Очищаем поле ввода
    this.messageInput = '';
  }


  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }


  toggleEmojiPicker() {
    this.isEmojiPickerVisible = !this.isEmojiPickerVisible;
  }

  addEmoji(event: { emoji: EmojiData }) {
    console.log(event)
    if (event.emoji && event.emoji.native) {
      this.messageInput += event.emoji.native;
    }
    this.isEmojiPickerVisible = false;
  }


  startCall(): void {
    this.callActive = true;
  }

  endCall(): void {
    this.callActive = false;
  }


}
