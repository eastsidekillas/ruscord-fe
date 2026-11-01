import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { AppStateStore } from '@entities/app-state/model/app-state.store';

@Component({
  selector: 'StatusUIText',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center space-x-1">
      <span class="text-[12px] text-ok-muted">
        {{ statusText() }}
      </span>
    </div>
  `,
})
export class StatusUIText {
  readonly userId = input.required<string>();
  protected readonly status = computed(() => this.store.status(this.userId()));
  protected readonly statusText = computed(() => {
    switch (this.status()) {
      case 'online':  return 'В сети';
      case 'idle':    return 'Не на месте';
      case 'dnd':     return 'Не беспокоить';
      case 'offline': return 'Не в сети';
      default:        return 'Неизвестно';
    }
  });

  constructor(private store: AppStateStore) {}
}
