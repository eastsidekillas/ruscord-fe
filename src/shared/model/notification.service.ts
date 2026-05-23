import { Injectable, signal } from '@angular/core';
import { timer } from 'rxjs';

export type NotificationType = 'success' | 'error' | 'info';

export interface NotificationState {
  message: string;
  type: NotificationType | null;
  visible: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly state = signal<NotificationState>({
    message: '',
    type: 'info',
    visible: false,
  });

  show(message: string, type: NotificationType = 'info', duration = 3000) {
    this.state.set({ message, type, visible: true });
    timer(duration).subscribe(() => {
      this.state.update(s => ({ ...s, visible: false }));
    });
  }
}
