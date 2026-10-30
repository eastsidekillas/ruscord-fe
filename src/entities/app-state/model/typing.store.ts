import { Injectable, NgZone, inject, signal } from '@angular/core';
import { GatewayService } from '@shared/api/gateway/gateway.service';
import { Message, Snowflake, TypingStart } from '@shared/api/models';
import { AuthService } from '@entities/session/api/auth.service';

/** How long an indicator shows without a new TYPING_START (docs/api.md). */
export const TYPING_TTL_MS = 10_000;

/** Who is typing in which channel: TYPING_START for 10 s or until their message. */
@Injectable({ providedIn: 'root' })
export class TypingStore {
  private readonly auth = inject(AuthService);
  private readonly zone = inject(NgZone);

  /** channel id → user id → until (ms since epoch). */
  readonly typing = signal<Record<Snowflake, Record<Snowflake, number>>>({});
  private sweep: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(GatewayService).dispatches.subscribe(ev => {
      if (ev.t === 'TYPING_START') this.start(ev.d as TypingStart);
      if (ev.t === 'MESSAGE_CREATE') {
        const m = ev.d as Message;
        if (m?.author) this.stop(m.channel_id, m.author.id);
      }
      if (ev.t === 'READY') this.typing.set({});
    });
  }

  /** User ids typing in a channel now, the caller excluded. */
  usersIn(channelId: Snowflake | null | undefined): Snowflake[] {
    if (!channelId) return [];
    const me = this.auth.user()?.id;
    const now = Date.now();
    return Object.entries(this.typing()[channelId] ?? {})
      .filter(([id, until]) => id !== me && until > now)
      .map(([id]) => id);
  }

  private start(t: TypingStart): void {
    if (!t?.channel_id || !t.user_id) return;
    this.typing.update(all => ({
      ...all,
      [t.channel_id]: { ...(all[t.channel_id] ?? {}), [t.user_id]: Date.now() + TYPING_TTL_MS },
    }));
    this.scheduleSweep();
  }

  private stop(channelId: Snowflake, userId: Snowflake): void {
    const ch = this.typing()[channelId];
    if (!ch?.[userId]) return;
    const { [userId]: _, ...rest } = ch;
    this.typing.update(all => ({ ...all, [channelId]: rest }));
  }

  /** Drops expired entries, so the signal changes when an indicator ends. */
  private scheduleSweep(): void {
    if (this.sweep) return;
    this.zone.runOutsideAngular(() => {
      this.sweep = setTimeout(() => {
        this.sweep = null;
        this.zone.run(() => {
          const now = Date.now();
          let left = false;
          const next: Record<Snowflake, Record<Snowflake, number>> = {};
          for (const [ch, users] of Object.entries(this.typing())) {
            const alive = Object.fromEntries(Object.entries(users).filter(([, until]) => until > now));
            if (Object.keys(alive).length) {
              next[ch] = alive;
              left = true;
            }
          }
          this.typing.set(next);
          if (left) this.scheduleSweep();
        });
      }, 1000);
    });
  }
}
