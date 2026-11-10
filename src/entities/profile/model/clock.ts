import { Injectable, NgZone, OnDestroy, inject, signal } from '@angular/core';

/**
 * The time, one tick a minute, for everything that hides or relabels itself
 * as time passes (a mood that expires). One timer for the whole app; ticks
 * fall on the start of a minute.
 */
@Injectable({ providedIn: 'root' })
export class MinuteClock implements OnDestroy {
  private readonly current = signal(new Date());
  readonly now = this.current.asReadonly();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Outside the zone: a pending timer must not keep the app "unstable".
    inject(NgZone).runOutsideAngular(() => this.schedule());
  }

  private schedule(): void {
    this.timer = setTimeout(() => {
      this.current.set(new Date());
      this.schedule();
    }, 60_000 - (Date.now() % 60_000));
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }
}
