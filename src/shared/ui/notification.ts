import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NotificationService } from '@shared/model/notification.service';

@Component({
  selector: 'Notification',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed top-0 left-1/2 transform -translate-x-1/2 z-50 mt-5 w-96 p-4 rounded-lg shadow-lg text-center transition-opacity ease-in duration-700"
      [class.bg-green-500]="notificationService.state().type === 'success'"
      [class.bg-red-500]="notificationService.state().type === 'error'"
      [class.bg-blue-500]="notificationService.state().type === 'info'"
      [class.text-white]="true"
    >
      <p>{{ notificationService.state().message }}</p>
    </div>
  `,
})
export class Notification {
  constructor(public notificationService: NotificationService) {}
}
