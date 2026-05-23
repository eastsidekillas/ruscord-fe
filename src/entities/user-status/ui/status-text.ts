import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { UserStatusStoreService } from '../model/user-status-store';

@Component({
  selector: 'StatusUIText',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center space-x-1">
      <span class="text-xs"
            [class.text-green-400]="status() === 'online'"
            [class.text-yellow-400]="status() === 'idle'"
            [class.text-red-400]="status() === 'dnd'"
            [class.text-gray-400]="status() === 'offline'">
        {{ statusText() }}
      </span>
    </div>
  `,
})
export class StatusUIText {
  readonly userId = input.required<string>();
  protected readonly status = computed(() => this.statusStore.statuses()[this.userId()] ?? 'offline');
  protected readonly statusText = computed(() => {
    switch (this.status()) {
      case 'online':  return 'В сети';
      case 'idle':    return 'Не активен';
      case 'dnd':     return 'Занят';
      case 'offline': return 'Не в сети';
      default:        return 'Неизвестно';
    }
  });

  constructor(private statusStore: UserStatusStoreService) {}
}
