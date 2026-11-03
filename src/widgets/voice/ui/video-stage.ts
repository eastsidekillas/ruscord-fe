import { ChangeDetectionStrategy, Component, DOCUMENT, DestroyRef, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { LucideAngularModule, Maximize, Minimize, Monitor, Video } from 'lucide-angular';
import { Track } from 'livekit-client';
import { VideoFocus, VoiceService, sameVideo } from '@entities/voice';
import { VideoView } from './video-view';

/**
 * The video on the stage (VoiceService.shown): a shared screen, or a
 * camera picked from the tiles; a switch between all screens and cameras;
 * fullscreen on and off by its own button too.
 */
@Component({
  selector: 'VideoStage',
  standalone: true,
  imports: [NgClass, LucideAngularModule, VideoView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex-1 min-h-0 flex flex-col gap-4' },
  template: `
    @if (voice.shown(); as v) {
      @if (voice.videoList().length > 1) {
        <div role="tablist" aria-label="Что смотреть" class="flex gap-2 flex-wrap">
          @for (o of voice.videoList(); track o.userId + o.source) {
            <button type="button" role="tab" [attr.aria-selected]="same(o, v)" (click)="voice.focus.set(o)"
                    class="h-9 px-3 rounded-lg text-[13px] font-semibold flex items-center gap-2"
                    [ngClass]="same(o, v) ? 'bg-ok-surface-2 text-ok-text' : 'text-ok-muted hover:bg-ok-surface-1'">
              <lucide-angular class="w-4 h-4" [img]="o.source === Screen ? Monitor : Video" aria-hidden="true"></lucide-angular>
              {{ who()(o.userId) }}{{ o.source === Screen ? ' — экран' : ' — камера' }}
            </button>
          }
        </div>
      }
      <section #stage [attr.aria-label]="label(v)" data-voice-stage [attr.data-voice-stage-source]="v.source"
               class="flex-1 min-h-[320px] relative rounded-ok-lg bg-ok-surface-1 border border-ok-border overflow-hidden">
        <VideoView class="absolute inset-0" [source]="v.source" [userId]="v.userId" [label]="label(v)"
                   [class.-scale-x-100]="v.source === Camera && v.userId === me()" />
        <span class="absolute left-4 bottom-4 flex items-center gap-2 h-8 px-3 rounded-lg bg-ok-bg text-[13px] font-semibold">
          <lucide-angular class="w-3.5 h-3.5 text-ok-accent" [img]="v.source === Screen ? Monitor : Video" aria-hidden="true"></lucide-angular>{{ label(v) }}
        </span>
        <button type="button" (click)="toggleFullscreen()" [attr.aria-label]="fullscreenLabel()" [title]="fullscreenLabel()"
                [attr.aria-pressed]="fullscreen()" data-voice-fullscreen
                class="absolute right-4 bottom-4 w-9 h-9 rounded-lg bg-ok-bg text-ok-text flex items-center justify-center">
          <lucide-angular class="w-4 h-4" [img]="fullscreen() ? Minimize : Maximize" aria-hidden="true"></lucide-angular>
        </button>
      </section>
    }
  `,
})
export class VideoStage {
  /** A participant's name, «Вы» for us. */
  readonly who = input.required<(userId: string) => string>();
  /** Our id: our own video is labelled and mirrored as ours. */
  readonly me = input<string | null>(null);

  protected readonly voice = inject(VoiceService);
  private readonly doc = inject(DOCUMENT);
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  /** The stage is fullscreen now (the browser's own Esc included). */
  protected readonly fullscreen = signal(false);

  constructor() {
    const sync = () => this.fullscreen.set(!!this.doc.fullscreenElement && this.doc.fullscreenElement === this.stage()?.nativeElement);
    this.doc.addEventListener('fullscreenchange', sync);
    inject(DestroyRef).onDestroy(() => this.doc.removeEventListener('fullscreenchange', sync));
  }

  protected same(a: VideoFocus, b: VideoFocus): boolean {
    return sameVideo(a, b);
  }

  protected label(v: VideoFocus): string {
    const mine = v.userId === this.me();
    if (v.source === Track.Source.ScreenShare) return mine ? 'Вы показываете экран' : `${this.who()(v.userId)} показывает экран`;
    return mine ? 'Ваша камера' : `Камера: ${this.who()(v.userId)}`;
  }

  protected fullscreenLabel(): string {
    return this.fullscreen() ? 'Выйти из полноэкранного режима' : 'Во весь экран';
  }

  /** The same button leaves fullscreen: before, it asked for fullscreen again and nothing happened. */
  protected toggleFullscreen(): void {
    if (this.doc.fullscreenElement) {
      void this.doc.exitFullscreen().catch(() => undefined);
      return;
    }
    void this.stage()?.nativeElement.requestFullscreen?.().catch(() => undefined);
  }

  protected readonly Screen = Track.Source.ScreenShare as const;
  protected readonly Camera = Track.Source.Camera as const;
  protected readonly Monitor = Monitor;
  protected readonly Video = Video;
  protected readonly Maximize = Maximize;
  protected readonly Minimize = Minimize;
}
