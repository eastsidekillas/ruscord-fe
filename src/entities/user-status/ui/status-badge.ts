import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { UserStatusStoreService } from '../model/user-status-store';

@Component({
  selector: 'StatusUI',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="w-2.5 h-2.5 rounded-full absolute bottom-0 right-0 translate-x-1/8 translate-y-1/8 transition-all duration-300"
      [class.bg-green-400]="status() === 'online'"
      [class.bg-yellow-500]="status() === 'idle'"
      [class.bg-red-500]="status() === 'dnd'"
      [class.bg-gray-400]="status() === 'offline'"
    ></span>
  `
})
export class StatusUi {
  readonly userId = input.required<string>();
  protected readonly status = computed(() => this.statusStore.statuses()[this.userId()] ?? 'offline');

  constructor(private statusStore: UserStatusStoreService) {}
}
