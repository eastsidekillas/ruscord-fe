import { Component } from '@angular/core';
import { NotificationService } from '@shared/model/notification.service';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'Notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="(notificationService.notification$ | async) as notification"
      class="fixed top-0 left-1/2 transform -translate-x-1/2 z-50 mt-5 w-96 p-4 rounded-lg shadow-lg text-center"
      [ngClass]="{
        'bg-green-500 text-white': notification.type === 'success',
        'bg-red-500 text-white': notification.type === 'error',
        'bg-blue-500 text-white': notification.type === 'info',
        'transition-opacity ease-in duration-700 opacity-100 hover:opacity-0': notification.visible,
        'transition-opacity ease-in-out duration-700 opacity-100 hover:opacity-0': !notification.visible
      }"
    >
      <p>{{ notification.message }}</p>
    </div>
  `,
})
export class Notification {
  constructor(public notificationService: NotificationService) {}
}
