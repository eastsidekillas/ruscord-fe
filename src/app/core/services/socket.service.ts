import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from "../../../environment/environment";

interface Message {
  message: string;
  sender: string;
  recipient: string;
  sender_username: string;
  recipient_username: string;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket!: WebSocket;
  private messageSubject = new Subject<Message>();
  private unreadMessagesCount: { [key: string]: number } = {};  // Объект для хранения количества непрочитанных сообщений
  private unreadMessagesCountSubject = new Subject<{ [key: string]: number }>();  // Subject для обновления данных

  constructor() {}

  private getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  connect(uuid: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket is already connected');
      return;
    }

    const url = `${environment.API_WS_URL}chat/${uuid}/`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('WebSocket connection opened');
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const currentUserId = this.getUserId();  // Текущий пользователь

      // Проверка, что сообщение относится к текущему чату
      if (data.recipient === currentUserId || data.sender === currentUserId) {
        this.messageSubject.next({
          message: data.message,
          sender: data.sender,
          recipient: data.recipient,
          sender_username: data.sender_username || '',
          recipient_username: data.recipient_username || '',
        });

        // Если это сообщение от другого пользователя, увеличиваем счетчик непрочитанных сообщений
        if (data.sender !== currentUserId) {
          this.unreadMessagesCount[data.sender] = (this.unreadMessagesCount[data.sender] || 0) + 1;
          this.unreadMessagesCountSubject.next(this.unreadMessagesCount);  // Обновляем Subject с новыми данными
        }
      }

      console.log('Received data from WebSocket:', data);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.socket.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }

  sendMessage(message: string, recipient: string) {
    const sender = this.getUserId();
    if (sender && this.socket.readyState === WebSocket.OPEN) {
      const data: { sender: string; recipient: string; message: string } = {
        message: message,
        sender: sender,
        recipient: recipient,
      };
      this.socket.send(JSON.stringify(data));
    } else {
      console.error('WebSocket connection is not open or sender ID is not available');
    }
  }

  getMessages() {
    return this.messageSubject.asObservable();
  }

  // Метод для получения количества непрочитанных сообщений
  getUnreadMessagesCount() {
    return this.unreadMessagesCountSubject.asObservable();  // Возвращаем Observable с количеством непрочитанных сообщений
  }

  // Метод для отметки сообщений как прочитанных
  markAsRead(friendId: string) {
    if (this.unreadMessagesCount[friendId]) {
      this.unreadMessagesCount[friendId] = 0;  // Сбрасываем счетчик для этого друга
    }
    this.unreadMessagesCountSubject.next(this.unreadMessagesCount);  // Обновляем Subject
  }
}
