import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { LucideAngularModule, Maximize, Monitor } from 'lucide-angular';
import { Track } from 'livekit-client';
import { VoiceService } from '@entities/voice';
import { VideoView } from './video-view';

/**
 * The shared screen (VoiceService.screen) with its label and fullscreen,
 * and a switch when several people share. Shown only while someone shares.
 */
@Component({
  selector: 'ScreenStage',
  standalone: true,
  imports: [NgClass, LucideAngularModule, VideoView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex-1 min-h-0 flex flex-col gap-4' },
  template: `
    @if (voice.screen(); as uid) {
      @if (sharers().length > 1) {
        <div role="tablist" aria-label="Чей экран смотреть" class="flex gap-2 flex-wrap">
          @for (id of sharers(); track id) {
            <button type="button" role="tab" [attr.aria-selected]="id === uid" (click)="voice.watching.set(id)"
                    class="h-9 px-3 rounded-lg text-[13px] font-semibold flex items-center gap-2"
                    [ngClass]="id === uid ? 'bg-ok-surface-2 text-ok-text' : 'text-ok-muted hover:bg-ok-surface-1'">
              <lucide-angular class="w-4 h-4" [img]="Monitor" aria-hidden="true"></lucide-angular>{{ who()(id) }}
            </button>
          }
        </div>
      }
      <section #stage [attr.aria-label]="label(uid)" data-voice-stage
               class="flex-1 min-h-[320px] relative rounded-ok-lg bg-ok-surface-1 border border-ok-border overflow-hidden">
        <VideoView class="absolute inset-0" [source]="Screen" [userId]="uid" [label]="label(uid)" />
        <span class="absolute left-4 bottom-4 flex items-center gap-2 h-8 px-3 rounded-lg bg-ok-bg text-[13px] font-semibold">
          <lucide-angular class="w-3.5 h-3.5 text-ok-accent" [img]="Monitor" aria-hidden="true"></lucide-angular>{{ label(uid) }}
        </span>
        <button type="button" (click)="fullscreen()" aria-label="Во весь экран" title="Во весь экран"
                class="absolute right-4 bottom-4 w-9 h-9 rounded-lg bg-ok-bg text-ok-text flex items-center justify-center">
          <lucide-angular class="w-4 h-4" [img]="Maximize" aria-hidden="true"></lucide-angular>
        </button>
      </section>
    }
  `,
})
export class ScreenStage {
  /** A participant's name, «Вы» for us. */
  readonly who = input.required<(userId: string) => string>();
  /** Our id: our own screen is labelled «Вы показываете экран». */
  readonly me = input<string | null>(null);

  protected readonly voice = inject(VoiceService);
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  protected readonly sharers = computed(() => [...this.voice.sharers()]);

  protected label(userId: string): string {
    return userId === this.me() ? 'Вы показываете экран' : `${this.who()(userId)} показывает экран`;
  }

  protected fullscreen(): void {
    void this.stage()?.nativeElement.requestFullscreen?.().catch(() => undefined);
  }

  protected readonly Screen = Track.Source.ScreenShare as const;
  protected readonly Monitor = Monitor;
  protected readonly Maximize = Maximize;
}
