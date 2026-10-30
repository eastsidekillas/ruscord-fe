import { DestroyRef, Injectable, NgZone, inject } from '@angular/core';
import { GatewayService } from '@shared/api/gateway/gateway.service';

/** No input for this long makes the device idle. */
export const IDLE_AFTER_MS = 5 * 60_000;

const ACTIVITY = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/** Tells the gateway whether this device is in use (op 3), from user input. */
@Injectable({ providedIn: 'root' })
export class IdleService {
  private readonly gateway = inject(GatewayService);
  private readonly zone = inject(NgZone);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastInput = 0;

  constructor() {
    const onInput = () => this.active();
    this.zone.runOutsideAngular(() => {
      for (const e of ACTIVITY) window.addEventListener(e, onInput, { passive: true });
    });
    this.active();
    inject(DestroyRef).onDestroy(() => {
      for (const e of ACTIVITY) window.removeEventListener(e, onInput);
      if (this.timer) clearTimeout(this.timer);
    });
  }

  private active(): void {
    const now = Date.now();
    if (now - this.lastInput < 1000) return; // pointermove fires constantly
    this.lastInput = now;
    this.gateway.setIdle(false);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.gateway.setIdle(true), IDLE_AFTER_MS);
  }
}
