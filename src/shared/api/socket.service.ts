import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { environment } from '../../environment/environment';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket!: WebSocketSubject<any>;
  private messagesSubject = new Subject<any>();

  constructor() {}

  connectToChannel(channelId: string) {
    if (this.socket) {
      this.socket.complete();
    }

    const tokenString = localStorage.getItem('currentUser');
    let token: string | null = null;

    if (tokenString) {
      try {
        const user = JSON.parse(tokenString);
        token = user.token;
      } catch (error) {
        console.error('Ошибка при парсинге currentUser из localStorage:', error);
      }
    }

    this.socket = webSocket(`${environment.API_WS_URL}chat/${channelId}/?token=${token || ''}`);
    return this.socket;
  }

  listenMessages() {
    return this.messagesSubject.asObservable();
  }



  handleMessage(message: any) {
    this.messagesSubject.next(message);
  }

  send(message: any) {
    if (this.socket) {
      this.socket.next(message);
    } else {
      console.error('WebSocket не подключён. Невозможно отправить сообщение:', message);
    }
  }
}
