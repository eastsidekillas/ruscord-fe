import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class SocketService {
  private socket: WebSocket | null = null;

  constructor() {}

  connect(userId: number) {
    // Создаём подключение к WebSocket серверу
    this.socket = new WebSocket(`${environment.API_WS_URL}direct-message/${userId}/`);

    // Обработка события открытия соединения
    this.socket.onopen = () => {
      console.log('WebSocket connection established');
    };

    // Обработка ошибок
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Обработка закрытия соединения
    this.socket.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  sendMessage(message: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ message }));
    } else {
      console.error('WebSocket is not open. Unable to send message.');
    }
  }

  receiveMessage(): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) {
        console.error('WebSocket is not initialized. Cannot receive messages.');
        return;
      }

      // Обработка полученных сообщений
      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        observer.next(data);
      };

      // Cleanup when unsubscribing
      return () => {
        this.socket!.onmessage = null;
      };
    });
  }
}
