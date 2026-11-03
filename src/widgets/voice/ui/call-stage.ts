import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { DMCall, DMChannel, PublicUser, nameOf } from '@shared/api';
import { AppStateStore } from '@entities/app-state';
import { VoiceService } from '@entities/voice';
import { Off, VoiceTile } from './voice-tile';
import { CallToolbar } from './call-toolbar';
import { VideoStage } from './video-stage';

/** Whether a call still rings at time now. */
export function ringsAt(call: DMCall | undefined, userId: string | undefined, now: number): boolean {
  return !!call && !!userId && call.ringing.includes(userId) && Date.parse(call.ring_until) > now;
}

/**
 * The call of a DM channel above its chat (ruscord-core ADR-0032): while we
 * are in it, the shared screen, a tile per participant and those still
 * being called, and the controls; otherwise a bar to join the call going on.
 */
@Component({
  selector: 'CallStage',
  standalone: true,
  imports: [VoiceTile, CallToolbar, VideoStage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (here()) {
      <section aria-label="Звонок" data-call-stage class="flex flex-col gap-3 p-4 border-b border-ok-border bg-ok-sidebar"
               [class.h-[60vh]]="!!voice.shown()">
        @if (voice.shown()) {
          <VideoStage [who]="who" [me]="me() ?? null" />
        }
        <div class="grid gap-3 grid-cols-[repeat(auto-fit,minmax(180px,240px))] justify-center">
          @for (u of people(); track u.id) {
            <VoiceTile [userId]="u.id" [name]="nameOf(u)" [avatar]="u.avatar ?? null" [me]="u.id === me()" [compact]="true"
                       [mute]="muted(u.id)" [deaf]="u.id === me() && voice.selfDeaf() ? 'self' : null" />
          }
          @for (u of calling(); track u.id) {
            <div class="h-[120px] rounded-xl border border-dashed border-ok-border flex flex-col items-center justify-center gap-1 text-[13px] text-ok-muted"
                 [attr.data-call-ringing]="nameOf(u)">
              <span class="font-semibold text-ok-text">{{ nameOf(u) }}</span>Звоним…
            </div>
          }
        </div>
        <CallToolbar />
      </section>
    } @else if (dm().call; as call) {
      <div class="flex items-center gap-3 px-6 py-2.5 border-b border-ok-border bg-ok-sidebar text-[13px]" data-call-bar>
        <span class="flex-1 truncate">Идёт звонок · {{ memberNames(call) }}</span>
        <button type="button" (click)="join()" data-call-join
                class="h-8 px-3 rounded-lg bg-ok-success text-ok-bg font-semibold">Присоединиться</button>
      </div>
    }
  `,
})
export class CallStage {
  readonly dm = input.required<DMChannel>();

  protected readonly voice = inject(VoiceService);
  private readonly store = inject(AppStateStore);
  protected readonly nameOf = nameOf;
  protected readonly me = computed(() => this.store.me()?.id);

  /** Ticks while someone is being called, so «Звоним…» goes at ring_until. */
  private readonly now = signal(Date.now());

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected readonly here = computed(() => this.voice.target()?.channelId === this.dm().id && this.voice.connected());

  private user(id: string): PublicUser | null {
    return this.store.user(this.dm().recipients.find(r => r.id === id) ?? null);
  }

  /** In the call: its members, and us while we connect. */
  protected readonly people = computed(() => {
    const ids = [...(this.dm().call?.members ?? [])];
    const me = this.me();
    if (me && !ids.includes(me)) ids.push(me);
    return ids.map(id => this.user(id)).filter((u): u is PublicUser => !!u);
  });

  /** Still being called. */
  protected readonly calling = computed(() => {
    const call = this.dm().call;
    const now = this.now();
    return (call?.ringing ?? []).filter(id => ringsAt(call, id, now)).map(id => this.user(id)).filter((u): u is PublicUser => !!u);
  });

  protected readonly who = (userId: string): string => (userId === this.me() ? 'Вы' : nameOf(this.user(userId)));

  protected memberNames(call: DMCall): string {
    return call.members.map(id => this.who(id)).join(', ') || 'никого нет';
  }

  /** Others' microphones by LiveKit's tracks; ours by our own switch. */
  protected muted(userId: string): Off {
    if (userId === this.me()) return this.voice.selfMute() ? 'self' : null;
    return this.voice.silent().has(userId) ? 'self' : null;
  }

  protected join(): void {
    void this.voice.join({ guildId: null, channelId: this.dm().id });
  }
}
