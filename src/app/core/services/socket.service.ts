import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import {environment} from "../../../environment/environment";

interface Message {
  message: string;
  sender: string;
  recipient: string;
  sender_username: string;
  recipient_username: string;
}

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket!: WebSocket;
  private messageSubject = new Subject<Message>();

  constructor() {}

  private getUserId(): string | null {
    return localStorage.getItem('user_id');  // Получаем user_id из localStorage
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
      this.messageSubject.next({
        message: data.message,
        sender: data.sender,
        recipient: data.recipient,
        sender_username: data.sender_username || '',
        recipient_username: data.recipient_username || '',
      });
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
    const sender = this.getUserId();  // Получаем user_id через метод getUserId
    if (sender && this.socket.readyState === WebSocket.OPEN) {
      const data: { sender: string; recipient: string; message: string } = {
        message: message,
        sender: sender,  // Отправляем sender через WebSocket
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
}
