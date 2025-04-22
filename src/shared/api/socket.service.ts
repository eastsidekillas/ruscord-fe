import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import {WebSocketSubject} from 'rxjs/internal/observable/dom/WebSocketSubject';
import {webSocket} from 'rxjs/webSocket';


@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket!: WebSocket;

  constructor() {}

  private getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  connectToChannel(channelId: string): WebSocketSubject<any> {
    const tokenString = localStorage.getItem('currentUser');
    let token: string | null = null;

    if (tokenString) {
      try {
        const user = JSON.parse(tokenString);
        token = user.token;
      } catch (error) {
        console.error('Ошибка при парсинге currentUser из localStorage:', error);
        // Обработайте ошибку, например, установите token в null или выполните другие действия
        token = null;
      }
    } else {
      console.warn('currentUser не найден в localStorage.');
      // Обработайте отсутствие токена, например, перенаправьте пользователя на страницу входа
    }

    const ws = webSocket(`${environment.API_WS_URL}chat/${channelId}/?token=${token || ''}`);

    return ws;
  }

}
