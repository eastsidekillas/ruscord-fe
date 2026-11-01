import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeadphoneOff, Headphones, LucideAngularModule, Mic, MicOff, PhoneOff, Settings2 } from 'lucide-angular';
import { AppStateStore } from '@entities/app-state';
import { AudioDeviceKind, VoiceService } from '@entities/voice';

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
    <div *ngIf="voice.connected() || voice.error()" class="bg-main-surface-secondary rounded-xl shadow-lg px-4 py-3 text-sm" data-voice-panel>
      <div *ngIf="voice.connected()" class="flex items-center gap-2">
        <div class="min-w-0 flex-1">
          <div class="font-semibold" [ngClass]="voice.status() === 'connected' ? 'text-green-400' : 'text-yellow-400'">
            {{ statusText() }}
          </div>
          <div class="text-xs text-gray-400 truncate">{{ place() }}</div>
        </div>
        <button type="button" (click)="voice.toggleMute()" [disabled]="!voice.canSpeak()"
                [title]="voice.selfMute() ? 'Включить микрофон' : 'Выключить микрофон'"
                class="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-40"
                [ngClass]="voice.selfMute() ? 'text-red-400' : 'text-gray-300'">
          <lucide-angular class="w-4 h-4" [img]="voice.selfMute() ? MicOff : Mic"></lucide-angular>
        </button>
        <button type="button" (click)="voice.toggleDeaf()" [title]="voice.selfDeaf() ? 'Включить звук' : 'Выключить звук'"
                class="p-1.5 rounded-md hover:bg-white/10" [ngClass]="voice.selfDeaf() ? 'text-red-400' : 'text-gray-300'">
          <lucide-angular class="w-4 h-4" [img]="voice.selfDeaf() ? HeadphoneOff : Headphones"></lucide-angular>
        </button>
        <button type="button" (click)="toggleDevices()" title="Устройства" class="p-1.5 rounded-md hover:bg-white/10 text-gray-300">
          <lucide-angular class="w-4 h-4" [img]="Settings2"></lucide-angular>
        </button>
        <button type="button" (click)="voice.leave()" title="Отключиться" class="p-1.5 rounded-md hover:bg-red-500/20 text-red-400">
          <lucide-angular class="w-4 h-4" [img]="PhoneOff"></lucide-angular>
        </button>
      </div>

      <div *ngIf="voice.connected() && devicesOpen()" class="mt-3 flex flex-col gap-2 text-xs">
        <label class="flex flex-col gap-1">
          <span class="text-gray-400">Микрофон</span>
          <select [value]="voice.input()" (change)="pick('audioinput', $event)"
                  class="bg-sidebar-surface-primary rounded-md px-2 py-1.5 text-gray-200 focus:outline-none">
            <option value="">По умолчанию</option>
            <option *ngFor="let d of voice.inputs()" [value]="d.deviceId">{{ d.label || 'Микрофон' }}</option>
          </select>
        </label>
        <label *ngIf="voice.outputs().length" class="flex flex-col gap-1">
          <span class="text-gray-400">Динамики</span>
          <select [value]="voice.output()" (change)="pick('audiooutput', $event)"
                  class="bg-sidebar-surface-primary rounded-md px-2 py-1.5 text-gray-200 focus:outline-none">
            <option value="">По умолчанию</option>
            <option *ngFor="let d of voice.outputs()" [value]="d.deviceId">{{ d.label || 'Динамики' }}</option>
          </select>
        </label>
        <p *ngIf="!voice.outputs().length" class="text-gray-500">Этот браузер не даёт выбрать динамики.</p>
      </div>

      <p *ngIf="voice.connected() && voice.pushToTalk()" class="mt-2 text-xs text-yellow-400">
        На этом канале только push-to-talk — он появится в настройках голоса. Пока вы слушаете.
      </p>
      <div *ngIf="voice.error() as err" class="flex items-start gap-2 text-xs text-red-400" [class.mt-2]="voice.connected()">
        <span class="flex-1">{{ err }}</span>
        <button type="button" (click)="voice.error.set(null)" title="Скрыть" class="text-gray-400 hover:text-white">×</button>
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
      default: return 'Голос подключён';
    }
  });
  /** "voice / Server". */
  protected readonly place = computed(() => {
    const t = this.voice.target();
    const g = t ? this.store.guild(t.guildId) : null;
    const ch = g?.channels.find(c => c.id === t?.channelId);
    return [ch?.name, g?.name].filter(Boolean).join(' / ');
  });

  protected toggleDevices(): void {
    const open = !this.devicesOpen();
    this.devicesOpen.set(open);
    if (open) void this.voice.refreshDevices();
  }

  protected pick(kind: AudioDeviceKind, ev: Event): void {
    void this.voice.setDevice(kind, (ev.target as HTMLSelectElement).value);
  }

  protected readonly Mic = Mic;
  protected readonly MicOff = MicOff;
  protected readonly Headphones = Headphones;
  protected readonly HeadphoneOff = HeadphoneOff;
  protected readonly PhoneOff = PhoneOff;
  protected readonly Settings2 = Settings2;
}
