import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { AppStateStore } from '@entities/app-state/model/app-state.store';

/** A status dot on the corner of an avatar, cut out of the background behind it. */
@Component({
  selector: 'StatusUI',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full ring-2 transition-colors duration-300"
      [class]="ring()"
      [class.bg-ok-success]="status() === 'online'"
      [class.bg-ok-warning]="status() === 'idle'"
      [class.bg-ok-danger]="status() === 'dnd'"
      [class.bg-ok-border-control]="status() === 'offline'"
    ></span>
  `,
})
export class StatusUi {
  readonly userId = input.required<string>();
  /** The background the dot sits on, as a ring class. */
  readonly ring = input('ring-ok-sidebar');
  protected readonly status = computed(() => this.store.status(this.userId()));

  constructor(private store: AppStateStore) {}
}
