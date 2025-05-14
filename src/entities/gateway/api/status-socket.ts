import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environment/environment';

@Injectable({
  providedIn: 'root',
})
export class StatusSocketService {
  private socket!: WebSocket;
  private messageSubject = new Subject<any>();
  private reconnectTimeout: any;

  constructor() {
    this.connect();
  }

  connect(): void {
    const token = localStorage.getItem('currentUser');
    if (token) {
      const user = JSON.parse(token);
      this.socket = new WebSocket(`${environment.API_WS_URL}status/?token=${user.token}`);
    }

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.startPingPong();  // Начать ping-проверку
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.messageSubject.next(data);
    };

    this.socket.onclose = () => {
      console.log('WebSocket connection closed');
      this.reconnect();  // Переподключение
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
      this.reconnect();  // Переподключение при ошибке
    };
  }

  startPingPong(): void {
    setInterval(() => {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ op: 'ping' }));
      }
    }, 5000);  // ping каждую секунду
  }

  reconnect(): void {
    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      console.log('Reconnecting...');
      this.connect();
    }, 500);  // переподключение через 1 секунду
  }

  sendStatusUpdate(status: string): void {
    const message = {
      op: 'STATUS_UPDATE',
      d: { status },
    };
    this.socket.send(JSON.stringify(message));
  }

  getMessage(): Observable<any> {
    return this.messageSubject.asObservable();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
    }
  }
}
