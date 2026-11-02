import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { LucideAngularModule, Maximize, Monitor } from 'lucide-angular';
import { Perm, hasPerm, nameOf } from '@shared/api';
import { AppStateStore } from '@entities/app-state';
import { VoiceService } from '@entities/voice';
import { Dolobeb } from '@shared/ui/dolobeb';
import { members } from '@shared/lib/plural';
import { ScreenView } from './screen-view';

/**
 * The voice channel in the centre, by the mockup «Голосовой канал в центре:
 * показ экрана»: who is there, the shared screen (the one picked in the
 * channel list, else the first), and a way in for those outside.
 */
@Component({
  selector: 'VoiceRoom',
  standalone: true,
  imports: [NgClass, LucideAngularModule, Dolobeb, ScreenView],
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
    } @else {
      <section class="flex-1 min-h-[320px] rounded-ok-lg bg-ok-surface-1 border border-ok-border flex flex-col items-center justify-center gap-4 p-8 text-center">
        <Dolobeb state="listening" [size]="96" />
        <p class="m-0 text-[13px] text-ok-muted">Никто не показывает экран</p>
        @if (voice.canShare()) {
          <button type="button" (click)="voice.toggleShare()" class="h-11 px-5 rounded-ok-md bg-ok-accent text-ok-on-accent font-semibold">Показать экран</button>
        }
      </section>
    }
  `,
})
export class VoiceRoom {
  readonly guildId = input.required<string>();
  readonly channelId = input.required<string>();

  protected readonly voice = inject(VoiceService);
  private readonly store = inject(AppStateStore);
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');

  protected readonly guild = computed(() => this.store.guild(this.guildId()));
  protected readonly channel = computed(() => this.guild()?.channels.find(c => c.id === this.channelId()) ?? null);
  private readonly inVoice = computed(() => (this.guild()?.voice_states ?? []).filter(v => v.channel_id === this.channelId()));
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

  protected who(userId: string): string {
    if (userId === this.store.me()?.id) return 'Вы';
    const v = this.inVoice().find(s => s.user_id === userId);
    return nameOf(this.store.user(v?.user ?? null));
  }

  protected screenLabel(userId: string): string {
    return userId === this.store.me()?.id ? 'Вы показываете экран' : `${this.who(userId)} показывает экран`;
  }

  protected join(): void {
    void this.voice.join({ guildId: this.guildId(), channelId: this.channelId() });
  }

  protected fullscreen(): void {
    void this.stage()?.nativeElement.requestFullscreen?.().catch(() => undefined);
  }

  protected readonly Monitor = Monitor;
  protected readonly Maximize = Maximize;
}
