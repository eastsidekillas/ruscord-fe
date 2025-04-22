import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import {environment} from '../../../environment/environment';

@Injectable({
  providedIn: 'root',
})
export class StatusSocketService {
  private socket!: WebSocket;
  private messageSubject = new Subject<any>();

  constructor() {
    this.connect()
  }

  // Метод для подключения к WebSocket
  connect(): void {

    const token = localStorage.getItem('currentUser');
    if (token) {
      // Преобразуем строку JSON в объект (если нужно)
      const user = JSON.parse(token);

      // Теперь передаем токен в URL запроса WebSocket
      this.socket = new WebSocket(`${environment.API_WS_URL}status/?token=${user.token}`);
    }

    // Слушаем событие открытия соединения
    this.socket.onopen = () => {
      console.log('WebSocket connected');
    };

    // Слушаем события получения данных от сервера
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.messageSubject.next(data);
    };

    // Слушаем закрытие соединения
    this.socket.onclose = () => {
      console.log('WebSocket connection closed');
      this.disconnect()
    };

    // Обработка ошибок
    this.socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };
  }

  // Метод для отправки сообщений на сервер (например, обновление статуса)
  sendStatusUpdate(status: string): void {
    const message = {
      op: 'STATUS_UPDATE',
      d: { status }, // отправляем новый статус
    };
    this.socket.send(JSON.stringify(message));
  }

  // Метод для получения сообщений от сервера (например, статуса пользователя)
  getMessage(): Observable<any> {
    return this.messageSubject.asObservable();
  }

  // Метод для отключения от WebSocket
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
    }
  }
}
