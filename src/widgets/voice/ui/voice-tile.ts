import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { HeadphoneOff, LucideAngularModule, MicOff, Monitor } from 'lucide-angular';
import { Track } from 'livekit-client';
import { VideoFocus, VoiceService, sameVideo } from '@entities/voice';
import { AvatarUI } from '@shared/ui/avatar';
import { VideoView } from './video-view';

/** Who turned a microphone or the sound off: the user, or a moderator. */
export type Off = 'self' | 'server' | null;

/**
 * A participant of a voice channel or a call: their camera, else their
 * avatar; their name with what is off; a ring while they speak.
 */
@Component({
  selector: 'VoiceTile',
  standalone: true,
  imports: [NgClass, LucideAngularModule, AvatarUI, VideoView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div [attr.data-voice-tile]="label()" [attr.data-speaking]="speaking() ? '' : null"
         class="relative rounded-xl bg-ok-surface-1 flex items-center justify-center transition-shadow"
         [ngClass]="[compact() ? 'h-[120px]' : 'h-[180px]', speaking() ? 'shadow-[0_0_0_2px_var(--color-ok-accent)]' : '', filming() ? 'cursor-pointer' : '']"
         [class.outline]="onStage()" [class.outline-2]="onStage()" [class.outline-ok-accent]="onStage()"
         [attr.role]="filming() ? 'button' : null" [attr.tabindex]="filming() ? 0 : null"
         [attr.aria-pressed]="filming() ? onStage() : null"
         [attr.aria-label]="filming() ? (onStage() ? 'Убрать камеру со сцены: ' : 'Смотреть камеру: ') + label() : null"
         (click)="toggleStage()" (keydown.enter)="toggleStage()" (keydown.space)="$event.preventDefault(); toggleStage()">
      @if (filming()) {
        <!-- The whole picture, not cropped; our own camera is mirrored, as people expect to see themselves. -->
        <VideoView class="absolute inset-0 rounded-xl overflow-hidden" data-voice-camera [source]="Camera" [userId]="userId()"
                   [class.-scale-x-100]="me()" [label]="'Камера: ' + label()" />
      } @else {
        <span class="rounded-xl overflow-hidden" [ngClass]="compact() ? 'w-14 h-14' : 'w-20 h-20'">
          <AvatarUI [src]="avatar()" [name]="name()" />
        </span>
      }
      <span class="absolute left-2.5 bottom-2.5 max-w-[calc(100%-20px)] flex items-center gap-1.5 text-[13px] font-semibold"
            [ngClass]="filming() ? 'h-6 px-2 rounded-md bg-ok-bg' : ''">
        <span class="truncate">{{ label() }}</span>
        @if (mute() === 'server') {
          <lucide-angular class="w-3.5 h-3.5 shrink-0 text-ok-danger" [img]="MicOff" title="Микрофон выключил модератор"></lucide-angular>
        } @else if (mute() === 'self') {
          <lucide-angular class="w-3.5 h-3.5 shrink-0 text-ok-muted" [img]="MicOff" title="Микрофон выключен"></lucide-angular>
        }
        @if (deaf() === 'server') {
          <lucide-angular class="w-3.5 h-3.5 shrink-0 text-ok-danger" [img]="HeadphoneOff" title="Звук выключил модератор"></lucide-angular>
        } @else if (deaf() === 'self') {
          <lucide-angular class="w-3.5 h-3.5 shrink-0 text-ok-muted" [img]="HeadphoneOff" title="Звук выключен"></lucide-angular>
        }
        @if (sharing()) {
          <lucide-angular class="w-3.5 h-3.5 shrink-0 text-ok-accent" [img]="Monitor" title="Показывает экран"></lucide-angular>
        }
      </span>
    </div>
  `,
})
export class VoiceTile {
  readonly userId = input.required<string>();
  /** The name for the avatar's letter. */
  readonly name = input.required<string>();
  readonly avatar = input<string | null>(null);
  /** It is us: «Вы», mirrored camera. */
  readonly me = input(false);
  /** Smaller, in a row under a shared screen. */
  readonly compact = input(false);
  readonly mute = input<Off>(null);
  readonly deaf = input<Off>(null);

  private readonly voice = inject(VoiceService);
  protected readonly label = computed(() => (this.me() ? 'Вы' : this.name()));
  protected readonly speaking = computed(() => this.voice.speaking().has(this.userId()));
  protected readonly filming = computed(() => this.voice.filming().has(this.userId()));
  protected readonly sharing = computed(() => this.voice.sharers().has(this.userId()));
  private readonly camera = computed<VideoFocus>(() => ({ userId: this.userId(), source: Track.Source.Camera }));
  /** This camera is on the stage now. */
  protected readonly onStage = computed(() => sameVideo(this.voice.shown(), this.camera()));

  /** A click on a camera puts it on the stage (where it can go fullscreen), again takes it off. */
  protected toggleStage(): void {
    if (!this.filming()) return;
    this.voice.focus.set(this.onStage() ? null : this.camera());
  }

  protected readonly Camera = Track.Source.Camera as const;
  protected readonly MicOff = MicOff;
  protected readonly HeadphoneOff = HeadphoneOff;
  protected readonly Monitor = Monitor;
}
