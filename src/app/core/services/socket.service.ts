import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import {data} from "autoprefixer";

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket!: WebSocket;
  private messageSubject = new Subject<{
    message: string;
    sender: string;
    receiver: string;
    recipient_username: string;
    sender_username: string;
  }>();

  constructor() { }

  connect(uuid: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket is already connected');
      return;
    }

    this.socket = new WebSocket(`ws://localhost:8000/ws/dm/${uuid}/`);



    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.messageSubject.next({
        message: data.message,
        sender: data.sender,
        receiver: data.receiver,
        recipient_username: data.recipient_username,
        sender_username: data.sender_username
      });
      console.log('Received data from WebSocket:', data);
    };


    this.socket.onclose = () => {
      console.log('WebSocket connection closed');
      // Реализуйте логику для переподключения или завершения чата
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }



  sendMessage(message: string, sender: string, receiver: string, senderUsername: string, recipientUsername: string) {
    if (this.socket.readyState === WebSocket.OPEN) {
      const data = {
        message: message,
        sender: sender,
        sender_username: senderUsername,
        receiver: receiver,
        receiver_username: recipientUsername
      };
      this.socket.send(JSON.stringify(data));
    } else {
      console.error('WebSocket connection is not open');
    }
  }


  // Метод для подписки на сообщения
  getMessages() {
    return this.messageSubject.asObservable();
  }
}
