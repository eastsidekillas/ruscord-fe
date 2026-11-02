import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { HeadphoneOff, Headphones, LucideAngularModule, Maximize, Mic, MicOff, Monitor, MonitorOff, PhoneOff } from 'lucide-angular';
import { Perm, VoiceState, hasPerm, nameOf } from '@shared/api';
import { AppStateStore } from '@entities/app-state';
import { VoiceService } from '@entities/voice';
import { Dolobeb } from '@shared/ui/dolobeb';
import { AvatarUI } from '@shared/ui/avatar';
import { members } from '@shared/lib/plural';
import { ScreenView } from './screen-view';

/**
 * The voice channel in the centre, by the mockup «Голосовой канал: показ
 * экрана»: the shared screen (the one picked in the channel list, else the
 * first), a tile per participant with who speaks, the call controls; a way
 * in for those outside.
 */
@Component({
  selector: 'VoiceRoom',
  standalone: true,
  imports: [NgClass, LucideAngularModule, Dolobeb, AvatarUI, ScreenView],
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
    } @else if (shown(); as uid) {
      @if (voice.sharers().size > 1) {
        <div role="tablist" aria-label="Чей экран смотреть" class="flex gap-2 flex-wrap">
          @for (id of sharerList(); track id) {
            <button type="button" role="tab" [attr.aria-selected]="id === uid" (click)="voice.watching.set(id)"
                    class="h-9 px-3 rounded-lg text-[13px] font-semibold flex items-center gap-2"
                    [ngClass]="id === uid ? 'bg-ok-surface-2 text-ok-text' : 'text-ok-muted hover:bg-ok-surface-1'">
              <lucide-angular class="w-4 h-4" [img]="Monitor" aria-hidden="true"></lucide-angular>{{ who(id) }}
            </button>
          }
        </div>
      }
      <section #stage [attr.aria-label]="screenLabel(uid)" data-voice-stage
               class="flex-1 min-h-[320px] relative rounded-ok-lg bg-ok-surface-1 border border-ok-border overflow-hidden">
        <ScreenView class="absolute inset-0" [userId]="uid" [label]="screenLabel(uid)" />
        <span class="absolute left-4 bottom-4 flex items-center gap-2 h-8 px-3 rounded-lg bg-ok-bg text-[13px] font-semibold">
          <lucide-angular class="w-3.5 h-3.5 text-ok-accent" [img]="Monitor" aria-hidden="true"></lucide-angular>{{ screenLabel(uid) }}
        </span>
        <button type="button" (click)="fullscreen()" aria-label="Во весь экран" title="Во весь экран"
                class="absolute right-4 bottom-4 w-9 h-9 rounded-lg bg-ok-bg text-ok-text flex items-center justify-center">
          <lucide-angular class="w-4 h-4" [img]="Maximize" aria-hidden="true"></lucide-angular>
        </button>
      </section>
    }

    @if (here()) {
      <section aria-label="Участники" data-voice-tiles class="grid gap-3"
               [ngClass]="shown() ? 'grid-cols-[repeat(auto-fit,minmax(180px,1fr))]' : 'flex-1 content-center grid-cols-[repeat(auto-fit,minmax(240px,1fr))]'">
        @for (v of inVoice(); track v.user_id) {
          <div [attr.data-voice-tile]="who(v.user_id)" [attr.data-speaking]="voice.speaking().has(v.user_id) ? '' : null"
               class="relative rounded-xl bg-ok-surface-1 flex items-center justify-center transition-shadow"
               [ngClass]="[shown() ? 'h-[120px]' : 'h-[180px]', voice.speaking().has(v.user_id) ? 'shadow-[0_0_0_2px_var(--color-ok-accent)]' : '']">
            <span class="rounded-xl overflow-hidden" [ngClass]="shown() ? 'w-14 h-14' : 'w-20 h-20'">
              <AvatarUI [src]="store.user(v.user ?? null)?.avatar ?? null" [name]="nameOf(store.user(v.user ?? null))" />
            </span>
            <span class="absolute left-2.5 bottom-2.5 right-2.5 flex items-center gap-1.5 text-[13px] font-semibold">
              <span class="truncate">{{ who(v.user_id) }}</span>
              @if (v.mute) {
                <lucide-angular class="w-3.5 h-3.5 shrink-0 text-ok-danger" [img]="MicOff" title="Микрофон выключил модератор"></lucide-angular>
              } @else if (v.self_mute) {
                <lucide-angular class="w-3.5 h-3.5 shrink-0 text-ok-muted" [img]="MicOff" title="Микрофон выключен"></lucide-angular>
              }
              @if (v.deaf) {
                <lucide-angular class="w-3.5 h-3.5 shrink-0 text-ok-danger" [img]="HeadphoneOff" title="Звук выключил модератор"></lucide-angular>
              } @else if (v.self_deaf) {
                <lucide-angular class="w-3.5 h-3.5 shrink-0 text-ok-muted" [img]="HeadphoneOff" title="Звук выключен"></lucide-angular>
              }
              @if (voice.sharers().has(v.user_id)) {
                <lucide-angular class="w-3.5 h-3.5 shrink-0 text-ok-accent" [img]="Monitor" title="Показывает экран"></lucide-angular>
              }
            </span>
          </div>
        }
      </section>

      <div role="toolbar" aria-label="Управление звонком" data-voice-toolbar class="flex justify-center flex-wrap gap-2 p-2">
        <button type="button" (click)="voice.toggleMute()" [disabled]="!voice.canSpeak()"
                [attr.aria-label]="micLabel()" [title]="micLabel()" [attr.aria-pressed]="voice.selfMute()"
                class="w-12 h-12 rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                [ngClass]="voice.serverMute() ? 'bg-ok-surface-2 text-ok-danger' : voice.selfMute() ? 'bg-ok-text text-ok-bg' : 'bg-ok-surface-2 text-ok-text'">
          <lucide-angular class="w-5 h-5" [img]="voice.selfMute() || voice.serverMute() ? MicOff : Mic" aria-hidden="true"></lucide-angular>
        </button>
        <button type="button" (click)="voice.toggleDeaf()" [attr.aria-label]="deafLabel()" [title]="deafLabel()"
                [attr.aria-pressed]="voice.selfDeaf()" class="w-12 h-12 rounded-xl flex items-center justify-center"
                [ngClass]="voice.selfDeaf() ? 'bg-ok-text text-ok-bg' : 'bg-ok-surface-2 text-ok-text'">
          <lucide-angular class="w-5 h-5" [img]="voice.selfDeaf() ? HeadphoneOff : Headphones" aria-hidden="true"></lucide-angular>
        </button>
        @if (voice.canShare()) {
          <button type="button" (click)="voice.toggleShare()" [attr.aria-label]="shareLabel()" [title]="shareLabel()"
                  [attr.aria-pressed]="voice.sharing()" class="w-12 h-12 rounded-xl flex items-center justify-center"
                  [ngClass]="voice.sharing() ? 'bg-ok-accent text-ok-on-accent' : 'bg-ok-surface-2 text-ok-text'">
            <lucide-angular class="w-5 h-5" [img]="voice.sharing() ? MonitorOff : Monitor" aria-hidden="true"></lucide-angular>
          </button>
        }
        <button type="button" (click)="voice.leave()" aria-label="Отключиться"
                class="h-12 px-5 rounded-xl bg-ok-danger text-ok-on-danger flex items-center gap-2 font-semibold">
          <lucide-angular class="w-5 h-5" [img]="PhoneOff" aria-hidden="true"></lucide-angular>Выйти
        </button>
      </div>
    }
  `,
})
export class VoiceRoom {
  readonly guildId = input.required<string>();
  readonly channelId = input.required<string>();

  protected readonly voice = inject(VoiceService);
  protected readonly store = inject(AppStateStore);
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');

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

  protected readonly sharerList = computed(() => [...this.voice.sharers()]);
  /** The screen picked in the list, else the first one shared. */
  protected readonly shown = computed(() => {
    const w = this.voice.watching();
    return w && this.voice.sharers().has(w) ? w : this.sharerList()[0] ?? null;
  });

  protected readonly nameOf = nameOf;

  protected who(userId: string): string {
    if (userId === this.store.me()?.id) return 'Вы';
    const v: VoiceState | undefined = this.inVoice().find(s => s.user_id === userId);
    return nameOf(this.store.user(v?.user ?? null));
  }

  protected screenLabel(userId: string): string {
    return userId === this.store.me()?.id ? 'Вы показываете экран' : `${this.who(userId)} показывает экран`;
  }

  protected readonly micLabel = computed(() =>
    this.voice.serverMute() ? 'Микрофон выключил модератор' : this.voice.selfMute() ? 'Включить микрофон' : 'Выключить микрофон');
  protected readonly deafLabel = computed(() => (this.voice.selfDeaf() ? 'Включить звук' : 'Выключить звук'));
  protected readonly shareLabel = computed(() => (this.voice.sharing() ? 'Остановить показ экрана' : 'Показать экран'));

  protected join(): void {
    void this.voice.join({ guildId: this.guildId(), channelId: this.channelId() });
  }

  protected fullscreen(): void {
    void this.stage()?.nativeElement.requestFullscreen?.().catch(() => undefined);
  }

  protected readonly Monitor = Monitor;
  protected readonly MonitorOff = MonitorOff;
  protected readonly Maximize = Maximize;
  protected readonly Mic = Mic;
  protected readonly MicOff = MicOff;
  protected readonly Headphones = Headphones;
  protected readonly HeadphoneOff = HeadphoneOff;
  protected readonly PhoneOff = PhoneOff;
}
