import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket!: WebSocket;
  private messageSubject = new Subject<{
    message: string;
    sender: number;
    recipient: number;
    sender_username: string;
  }>();

  constructor() { }

  // Метод для подключения к WebSocket
  connect(recipientId: number) {
    this.socket = new WebSocket(`ws://localhost:8000/ws/messages/${recipientId}/`);


    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.messageSubject.next({
        message: data.message,
        sender: data.sender,
        recipient: data.recipient,
        sender_username: data.sender_username
      });
    };


    this.socket.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }

  // Метод для отправки сообщения
  sendMessage(message: string, senderId: number, recipientId: number) {
    const data = {
      message: message,
      sender: senderId,
      recipient: recipientId
    };
    this.socket.send(JSON.stringify(data));
  }

  // Метод для подписки на сообщения
  getMessages() {
    return this.messageSubject.asObservable();
  }
}
