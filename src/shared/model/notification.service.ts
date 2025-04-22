import { Injectable } from '@angular/core';
import {BehaviorSubject, timer} from 'rxjs';

export type NotificationType = 'success' | 'error' | 'info';

export interface NotificationState {
  message: string;
  type: NotificationType | null; // Тип уведомления теперь может быть null
  visible: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private state = new BehaviorSubject<NotificationState>({
    message: '',
    type: 'info',
    visible: false,
  });

  notification$ = this.state.asObservable();

  show(message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 3000) {
    this.state.next({ message, type, visible: true });

    timer(duration).subscribe(() => {
      this.state.next({ ...this.state.value, visible: false });
    });
  }

  // Метод для проверки видимости уведомления
  notificationVisible(): boolean {
    return this.state.value.visible;
  }
}

