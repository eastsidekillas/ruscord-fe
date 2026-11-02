import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { HeadphoneOff, Headphones, LucideAngularModule, Mic, MicOff, Monitor, MonitorOff, PhoneOff, Video, VideoOff } from 'lucide-angular';
import { VoiceService } from '@entities/voice';

/** The controls of the voice connection: microphone, sound, camera, screen, leave. */
@Component({
  selector: 'CallToolbar',
  standalone: true,
  imports: [NgClass, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'toolbar', 'aria-label': 'Управление звонком', 'data-voice-toolbar': '', class: 'flex justify-center flex-wrap gap-2 p-2' },
  template: `
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
    @if (voice.canCamera()) {
      <button type="button" (click)="voice.toggleCamera()" [attr.aria-label]="cameraLabel()" [title]="cameraLabel()"
              [attr.aria-pressed]="voice.cameraOn()" data-voice-camera-toggle class="w-12 h-12 rounded-xl flex items-center justify-center"
              [ngClass]="voice.cameraOn() ? 'bg-ok-accent text-ok-on-accent' : 'bg-ok-surface-2 text-ok-text'">
        <lucide-angular class="w-5 h-5" [img]="voice.cameraOn() ? Video : VideoOff" aria-hidden="true"></lucide-angular>
      </button>
    }
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
  `,
})
export class CallToolbar {
  protected readonly voice = inject(VoiceService);
  protected readonly micLabel = computed(() =>
    this.voice.serverMute() ? 'Микрофон выключил модератор' : this.voice.selfMute() ? 'Включить микрофон' : 'Выключить микрофон');
  protected readonly deafLabel = computed(() => (this.voice.selfDeaf() ? 'Включить звук' : 'Выключить звук'));
  protected readonly cameraLabel = computed(() => (this.voice.cameraOn() ? 'Выключить камеру' : 'Включить камеру'));
  protected readonly shareLabel = computed(() => (this.voice.sharing() ? 'Остановить показ экрана' : 'Показать экран'));

  protected readonly Mic = Mic;
  protected readonly MicOff = MicOff;
  protected readonly Headphones = Headphones;
  protected readonly HeadphoneOff = HeadphoneOff;
  protected readonly Monitor = Monitor;
  protected readonly MonitorOff = MonitorOff;
  protected readonly Video = Video;
  protected readonly VideoOff = VideoOff;
  protected readonly PhoneOff = PhoneOff;
}
