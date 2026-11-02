import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule, Phone, PhoneOff } from 'lucide-angular';
import { ApiService, nameOf } from '@shared/api';
import { AppStateStore } from '@entities/app-state';
import { VoiceService } from '@entities/voice';
import { AvatarUI } from '@shared/ui/avatar';
import { ringsAt } from './call-stage';

/** Two short tones every two seconds while a call rings; WebAudio, no file. */
class Ringer {
  private ctx: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  start(): void {
    if (this.timer) return;
    try {
      this.ctx ??= new AudioContext();
    } catch {
      return; // no audio here; the window still shows
    }
    const ring = () => {
      const ctx = this.ctx!;
      for (const [at, hz] of [[0, 440], [0.25, 480]] as const) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = hz;
        gain.gain.setValueAtTime(0.08, ctx.currentTime + at);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + at);
        osc.stop(ctx.currentTime + at + 0.4);
      }
    };
    ring();
    this.timer = setInterval(ring, 2000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

/**
 * An incoming DM call over everything (owner's choice 2026-11-02): who
 * calls, «Принять» and «Отклонить», a ring until ring_until (30 s).
 */
@Component({
  selector: 'IncomingCall',
  standalone: true,
  imports: [LucideAngularModule, AvatarUI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (incoming(); as dm) {
      <div role="alertdialog" aria-labelledby="incoming-call-title" data-incoming-call
           class="fixed right-6 top-6 z-50 w-[320px] rounded-ok-lg bg-ok-surface-1 border border-ok-border shadow-xl p-5 flex flex-col items-center gap-4 text-ok-text">
        <span class="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-ok-accent animate-pulse">
          <AvatarUI [src]="caller()?.avatar ?? null" [name]="title()" />
        </span>
        <div class="text-center">
          <h2 id="incoming-call-title" class="m-0 text-[15px] font-semibold">{{ title() }}</h2>
          <p class="m-0 text-[13px] text-ok-muted">{{ dm.type === 3 ? 'Звонок в группе' : 'Входящий звонок' }}</p>
        </div>
        <div class="flex gap-3">
          <button type="button" (click)="decline(dm.id)" class="h-11 px-4 rounded-ok-md bg-ok-danger text-ok-on-danger font-semibold flex items-center gap-2">
            <lucide-angular class="w-4 h-4" [img]="PhoneOff" aria-hidden="true"></lucide-angular>Отклонить
          </button>
          <button type="button" (click)="accept(dm.id)" class="h-11 px-4 rounded-ok-md bg-ok-success text-ok-bg font-semibold flex items-center gap-2">
            <lucide-angular class="w-4 h-4" [img]="Phone" aria-hidden="true"></lucide-angular>Принять
          </button>
        </div>
      </div>
    }
  `,
})
export class IncomingCall {
  private readonly store = inject(AppStateStore);
  private readonly voice = inject(VoiceService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly now = signal(Date.now());
  /** Calls we declined here, until the core's update arrives. */
  private readonly declined = signal<ReadonlySet<string>>(new Set());
  private readonly ringer = new Ringer();

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    effect(() => (this.incoming() ? this.ringer.start() : this.ringer.stop()));
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      this.ringer.stop();
    });
  }

  /** The first DM whose call rings for us and that we are not in. */
  protected readonly incoming = computed(() => {
    const me = this.store.me()?.id;
    const now = this.now();
    const inCall = this.voice.target()?.channelId;
    return this.store.dms().find(d => d.call && d.id !== inCall && !this.declined().has(d.call.id) && ringsAt(d.call, me, now)) ?? null;
  });

  protected readonly caller = computed(() => {
    const dm = this.incoming();
    return dm ? this.store.user(dm.recipients.find(r => r.id === dm.call?.started_by) ?? null) : null;
  });

  protected readonly title = computed(() => {
    const dm = this.incoming();
    return !dm ? '' : dm.type === 3 ? this.store.groupTitle(dm) : nameOf(this.caller());
  });

  protected accept(dmId: string): void {
    void this.voice.join({ guildId: null, channelId: dmId });
    void this.router.navigate(['/channels/me', dmId]);
  }

  protected decline(dmId: string): void {
    const id = this.incoming()?.call?.id;
    if (id) this.declined.update(s => new Set(s).add(id));
    this.api.declineCall(dmId).subscribe({ error: () => undefined });
  }

  protected readonly Phone = Phone;
  protected readonly PhoneOff = PhoneOff;
}
