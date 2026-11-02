import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { Perm, VoiceState, hasPerm, nameOf } from '@shared/api';
import { AppStateStore } from '@entities/app-state';
import { VoiceService } from '@entities/voice';
import { Dolobeb } from '@shared/ui/dolobeb';
import { members } from '@shared/lib/plural';
import { Off, VoiceTile } from './voice-tile';
import { CallToolbar } from './call-toolbar';
import { ScreenStage } from './screen-stage';

/**
 * The voice channel in the centre, by the mockup «Голосовой канал: показ
 * экрана»: the shared screen, a tile per participant with their camera or
 * avatar and who speaks, the call controls; a way in for those outside.
 */
@Component({
  selector: 'VoiceRoom',
  standalone: true,
  imports: [NgClass, Dolobeb, VoiceTile, CallToolbar, ScreenStage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex-1 min-h-0 flex flex-col gap-4 p-4 bg-ok-bg text-ok-text text-[15px]' },
  template: `
    <header class="flex items-center gap-3 flex-wrap">
      <h1 class="m-0 text-[20px] leading-7 font-semibold truncate">{{ channel()?.name }}</h1>
      <span class="text-[13px] text-ok-muted">{{ countText() }}</span>
    </header>

    @if (!here()) {
      <section class="flex-1 min-h-[320px] rounded-ok-lg bg-ok-surface-1 border border-ok-border flex flex-col items-center justify-center gap-4 p-8 text-center">
        <Dolobeb state="idle" [size]="96" />
        <p class="m-0 text-[13px] text-ok-muted">{{ outsideText() }}</p>
        @if (canJoin()) {
          <button type="button" (click)="join()" class="h-11 px-5 rounded-ok-md bg-ok-accent text-ok-on-accent font-semibold">Зайти</button>
        }
      </section>
    } @else {
      @if (voice.screen()) {
        <ScreenStage [who]="who" [me]="store.me()?.id ?? null" />
      }
      <section aria-label="Участники" data-voice-tiles class="grid gap-3"
               [ngClass]="voice.screen() ? 'grid-cols-[repeat(auto-fit,minmax(180px,1fr))]' : 'flex-1 content-center grid-cols-[repeat(auto-fit,minmax(240px,1fr))]'">
        @for (v of inVoice(); track v.user_id) {
          <VoiceTile [userId]="v.user_id" [name]="nameOf(store.user(v.user ?? null))" [avatar]="store.user(v.user ?? null)?.avatar ?? null"
                     [me]="v.user_id === store.me()?.id" [compact]="!!voice.screen()" [mute]="off(v.mute, v.self_mute)" [deaf]="off(v.deaf, v.self_deaf)" />
        }
      </section>
      <CallToolbar />
    }
  `,
})
export class VoiceRoom {
  readonly guildId = input.required<string>();
  readonly channelId = input.required<string>();

  protected readonly voice = inject(VoiceService);
  protected readonly store = inject(AppStateStore);

  constructor() {
    // A moderator moved us out of the channel on screen: the view follows.
    const router = inject(Router);
    effect(() => {
      const m = this.voice.lastMove();
      if (m && m.from === untracked(this.channelId)) void router.navigate(['/channels', untracked(this.guildId), m.to]);
    });
  }

  protected readonly guild = computed(() => this.store.guild(this.guildId()));
  protected readonly channel = computed(() => this.guild()?.channels.find(c => c.id === this.channelId()) ?? null);
  protected readonly inVoice = computed(() => (this.guild()?.voice_states ?? []).filter(v => v.channel_id === this.channelId()));
  protected readonly here = computed(() => this.voice.target()?.channelId === this.channelId() && this.voice.connected());
  protected readonly countText = computed(() => {
    const n = this.inVoice().length;
    return n ? `${n} ${members(n)}` : 'никого нет';
  });

  private readonly canConnect = computed(() => hasPerm(this.guild()?.channel_permissions[this.channelId()], Perm.Connect));
  private readonly full = computed(() => {
    const limit = this.channel()?.user_limit ?? 0;
    return !!limit && this.inVoice().length >= limit;
  });
  protected readonly canJoin = computed(() => this.canConnect() && !this.full());
  protected readonly outsideText = computed(() =>
    !this.canConnect() ? 'Нет права подключаться' : this.full() ? 'В голосовом канале нет мест' : 'Вы не в голосовом канале');

  protected readonly nameOf = nameOf;

  /** A participant's name, «Вы» for us. */
  protected readonly who = (userId: string): string => {
    if (userId === this.store.me()?.id) return 'Вы';
    const v: VoiceState | undefined = this.inVoice().find(s => s.user_id === userId);
    return nameOf(this.store.user(v?.user ?? null));
  };

  /** A moderator's mute or deafen shows over the user's own. */
  protected off(server: boolean | undefined, self: boolean): Off {
    return server ? 'server' : self ? 'self' : null;
  }

  protected join(): void {
    void this.voice.join({ guildId: this.guildId(), channelId: this.channelId() });
  }
}
