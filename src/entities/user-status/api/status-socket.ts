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
  private pingInterval: any;

  constructor() {
    this.connect();
  }

  connect(): void {
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      this.socket.onclose = null;
      this.socket.close();
    }

    const tokenString = localStorage.getItem('currentUser');
    if (!tokenString) return;

    const user = JSON.parse(tokenString);
    this.socket = new WebSocket(`${environment.API_WS_URL}status/?token=${user.token}`);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.startPingPong();
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.messageSubject.next(data);
    };

    this.socket.onclose = () => {
      console.log('WebSocket connection closed');
      this.reconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
      this.reconnect();
    };
  }

  startPingPong(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ op: 'ping' }));
      }
    }, 5000);
  }

  reconnect(): void {
    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      console.log('Reconnecting...');
      this.connect();
    }, 500);
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
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
    }
  }
}