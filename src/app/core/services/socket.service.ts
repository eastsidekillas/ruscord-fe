import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket!: WebSocket;
  private messageSubject = new Subject<{
    message: string;
    sender_uuid: string;
    recipient_uuid: string;
    sender_username: string;
  }>();

  constructor() { }

  // Метод для подключения к WebSocket
  connect(uuid: string) {
    this.socket = new WebSocket(`ws://localhost:8000/ws/dm/${uuid}/`);


    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.messageSubject.next({
        message: data.message,
        sender_uuid: data.sender,
        recipient_uuid: data.recipient,
        sender_username: data.sender_username
      });
    };


    this.socket.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }

  // Метод для отправки сообщения
  sendMessage(message: string, senderId: string, recipient: string, senderUsername: string) {
    const data = {
      message: message,
      sender_uuid: senderId,
      sender_username: senderUsername,
      recipient_uuid: recipient
    };
    this.socket.send(JSON.stringify(data));
  }

  // Метод для подписки на сообщения
  getMessages() {
    return this.messageSubject.asObservable();
  }
}
