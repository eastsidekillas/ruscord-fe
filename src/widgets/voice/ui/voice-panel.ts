import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeadphoneOff, Headphones, LucideAngularModule, Mic, MicOff, Monitor, MonitorOff, PhoneOff, Settings2, Video, VideoOff } from 'lucide-angular';
import { AppStateStore } from '@entities/app-state';
import { nameOf } from '@shared/api';
import { DeviceKind, VoiceService } from '@entities/voice';

/**
 * The voice connection bar above the user panel: where you are, mute,
 * deafen, devices and leave. Shown while connected or when a problem
 * needs telling.
 */
@Component({
  selector: 'VoicePanel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngIf="voice.connected() || voice.error()" class="flex flex-col gap-2" data-voice-panel>
      <div *ngIf="voice.connected()" class="rounded-ok-md bg-ok-surface-2 p-3 flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <div class="min-w-0 flex-1">
            <div class="text-[13px] font-semibold truncate" [ngClass]="voice.status() === 'connected' ? 'text-ok-accent' : 'text-ok-warning'">
              {{ statusText() }}
            </div>
            <div class="text-[12px] text-ok-muted truncate">{{ place() }}</div>
          </div>
          <button type="button" (click)="voice.leave()" title="Отключиться"
                  class="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-ok-danger hover:bg-ok-surface-1">
            <lucide-angular class="w-4 h-4" [img]="PhoneOff"></lucide-angular>
          </button>
        </div>
        <div class="grid gap-1" [style.grid-template-columns]="'repeat(' + buttons() + ', minmax(0, 1fr))'">
          <button type="button" (click)="voice.toggleMute()" [disabled]="!voice.canSpeak()"
                  [title]="voice.serverMute() ? 'Микрофон выключил модератор' : voice.selfMute() ? 'Включить микрофон' : 'Выключить микрофон'"
                  [attr.aria-pressed]="voice.selfMute()"
                  class="h-9 rounded-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                  [ngClass]="voice.serverMute() ? 'bg-ok-surface-1 text-ok-danger' : voice.selfMute() ? 'bg-ok-text text-ok-bg' : 'text-ok-text hover:bg-ok-surface-1'">
            <lucide-angular class="w-4 h-4" [img]="voice.selfMute() || voice.serverMute() ? MicOff : Mic"></lucide-angular>
          </button>
          <button type="button" (click)="voice.toggleDeaf()" [title]="voice.selfDeaf() ? 'Включить звук' : 'Выключить звук'"
                  [attr.aria-pressed]="voice.selfDeaf()"
                  class="h-9 rounded-lg flex items-center justify-center"
                  [ngClass]="voice.selfDeaf() ? 'bg-ok-text text-ok-bg' : 'text-ok-text hover:bg-ok-surface-1'">
            <lucide-angular class="w-4 h-4" [img]="voice.selfDeaf() ? HeadphoneOff : Headphones"></lucide-angular>
          </button>
          <button *ngIf="voice.canCamera()" type="button" (click)="voice.toggleCamera()" data-voice-camera-button
                  [title]="voice.cameraOn() ? 'Выключить камеру' : 'Включить камеру'"
                  [attr.aria-pressed]="voice.cameraOn()"
                  class="h-9 rounded-lg flex items-center justify-center"
                  [ngClass]="voice.cameraOn() ? 'bg-ok-accent text-ok-on-accent' : 'text-ok-text hover:bg-ok-surface-1'">
            <lucide-angular class="w-4 h-4" [img]="voice.cameraOn() ? Video : VideoOff"></lucide-angular>
          </button>
          <button *ngIf="voice.canShare()" type="button" (click)="voice.toggleShare()" data-voice-share
                  [attr.aria-label]="voice.sharing() ? 'Остановить показ экрана' : 'Показать экран'"
                  [title]="voice.sharing() ? 'Остановить показ экрана' : 'Показать экран'"
                  [attr.aria-pressed]="voice.sharing()"
                  class="h-9 rounded-lg flex items-center justify-center"
                  [ngClass]="voice.sharing() ? 'bg-ok-accent text-ok-on-accent' : 'text-ok-text hover:bg-ok-surface-1'">
            <lucide-angular class="w-4 h-4" [img]="voice.sharing() ? MonitorOff : Monitor"></lucide-angular>
          </button>
          <button type="button" (click)="toggleDevices()" title="Устройства" [attr.aria-expanded]="devicesOpen()"
                  class="h-9 rounded-lg flex items-center justify-center text-ok-text hover:bg-ok-surface-1"
                  [class.bg-ok-surface-1]="devicesOpen()">
            <lucide-angular class="w-4 h-4" [img]="Settings2"></lucide-angular>
          </button>
        </div>

        <div *ngIf="devicesOpen()" class="flex flex-col gap-2 text-[12px]">
          <label class="flex flex-col gap-1">
            <span class="text-ok-muted">Микрофон</span>
            <select [value]="voice.input()" (change)="pick('audioinput', $event)"
                    class="h-9 bg-ok-sidebar border border-ok-border-control rounded-lg px-2 text-ok-text">
              <option value="">По умолчанию</option>
              <option *ngFor="let d of voice.inputs()" [value]="d.deviceId">{{ d.label || 'Микрофон' }}</option>
            </select>
          </label>
          <label *ngIf="voice.outputs().length" class="flex flex-col gap-1">
            <span class="text-ok-muted">Динамики</span>
            <select [value]="voice.output()" (change)="pick('audiooutput', $event)"
                    class="h-9 bg-ok-sidebar border border-ok-border-control rounded-lg px-2 text-ok-text">
              <option value="">По умолчанию</option>
              <option *ngFor="let d of voice.outputs()" [value]="d.deviceId">{{ d.label || 'Динамики' }}</option>
            </select>
          </label>
          <p *ngIf="!voice.outputs().length" class="text-ok-muted">Этот браузер не даёт выбрать динамики.</p>
          <label *ngIf="voice.canCamera() && voice.cameras().length" class="flex flex-col gap-1">
            <span class="text-ok-muted">Камера</span>
            <select [value]="voice.camera()" (change)="pick('videoinput', $event)"
                    class="h-9 bg-ok-sidebar border border-ok-border-control rounded-lg px-2 text-ok-text">
              <option value="">По умолчанию</option>
              <option *ngFor="let d of voice.cameras()" [value]="d.deviceId">{{ d.label || 'Камера' }}</option>
            </select>
          </label>
        </div>

        <p *ngIf="voice.pushToTalk()" class="text-[12px] text-ok-warning">
          На этом канале только push-to-talk — он появится в настройках голоса. Пока вы слушаете.
        </p>
      </div>

      <div *ngIf="voice.error() as err" role="alert" class="flex items-start gap-2 rounded-ok-md bg-ok-surface-2 p-3 text-[13px] text-ok-danger">
        <span class="flex-1">{{ err }}</span>
        <button type="button" (click)="voice.error.set(null)" title="Скрыть" aria-label="Скрыть" class="text-ok-muted hover:text-ok-text leading-none">×</button>
      </div>
    </div>
  `,
})
export class VoicePanel {
  protected readonly voice = inject(VoiceService);
  private readonly store = inject(AppStateStore);

  protected readonly devicesOpen = signal(false);
  protected readonly statusText = computed(() => {
    switch (this.voice.status()) {
      case 'connecting': return 'Подключение…';
      case 'reconnecting': return 'Переподключение…';
      default: return this.voice.sharing() ? 'Вы показываете экран' : 'Голос подключён';
    }
  });
  /** "voice · Server", or "Звонок · name" in a DM call. */
  protected readonly place = computed(() => {
    const t = this.voice.target();
    if (t && !t.guildId) {
      const dm = this.store.dm(t.channelId);
      const title = !dm ? '' : dm.type === 3 ? this.store.groupTitle(dm) : nameOf(this.store.dmPartner(dm));
      return title ? `Звонок · ${title}` : 'Звонок';
    }
    const g = t?.guildId ? this.store.guild(t.guildId) : null;
    const ch = g?.channels.find(c => c.id === t?.channelId);
    return [ch?.name, g?.name].filter(Boolean).join(' · ');
  });

  protected toggleDevices(): void {
    const open = !this.devicesOpen();
    this.devicesOpen.set(open);
    if (open) void this.voice.refreshDevices();
  }

  /** Mute, deafen and devices always; camera and screen when allowed. */
  protected readonly buttons = computed(() => 3 + Number(this.voice.canCamera()) + Number(this.voice.canShare()));

  protected pick(kind: DeviceKind, ev: Event): void {
    void this.voice.setDevice(kind, (ev.target as HTMLSelectElement).value);
  }

  protected readonly Mic = Mic;
  protected readonly MicOff = MicOff;
  protected readonly Headphones = Headphones;
  protected readonly HeadphoneOff = HeadphoneOff;
  protected readonly PhoneOff = PhoneOff;
  protected readonly Settings2 = Settings2;
  protected readonly Monitor = Monitor;
  protected readonly MonitorOff = MonitorOff;
  protected readonly Video = Video;
  protected readonly VideoOff = VideoOff;
}
