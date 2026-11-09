import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info';

/** A link under the message («Открыть сеансы»). */
export interface NotificationAction {
  label: string;
  run: () => void;
}

export interface NotificationState {
  message: string;
  type: NotificationType | null;
  visible: boolean;
  action?: NotificationAction;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly state = signal<NotificationState>({
    message: '',
    type: 'info',
    visible: false,
  });
  private timer?: ReturnType<typeof setTimeout>;

  show(message: string, type: NotificationType = 'info', duration = 3000, action?: NotificationAction) {
    clearTimeout(this.timer);
    this.state.set({ message, type, visible: true, action });
    this.timer = setTimeout(() => this.hide(), duration);
  }

  hide(): void {
    clearTimeout(this.timer);
    this.state.update(s => ({ ...s, visible: false }));
  }
}
