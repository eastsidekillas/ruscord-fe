import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Monitor, MonitorOff, PhoneOff, Settings2, Video, VideoOff } from 'lucide-angular';
import { AppStateStore } from '@entities/app-state';
import { ModalService } from '@shared/model/modal.service';
import { nameOf } from '@shared/api';
import { VoiceService, talkKeyLabel } from '@entities/voice';

/**
 * The voice connection bar above the user panel: where you are, camera,
 * screen, the settings and leave. Shown while connected or when a problem
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
          <button type="button" (click)="openSettings()" title="Настройки голоса и видео" aria-label="Настройки голоса и видео"
                  class="h-9 rounded-lg flex items-center justify-center text-ok-text hover:bg-ok-surface-1">
            <lucide-angular class="w-4 h-4" [img]="Settings2"></lucide-angular>
          </button>
        </div>

        <p *ngIf="voice.pushToTalk()" class="text-[12px] text-ok-warning">
          На этом канале только рация: удерживайте клавишу {{ talkKey() }}
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

  private readonly modal = inject(ModalService);

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

  /** Settings always; camera and screen when allowed. Mute and deafen live in the user row. */
  protected readonly buttons = computed(() => 1 + Number(this.voice.canCamera()) + Number(this.voice.canShare()));

  protected openSettings(): void {
    this.modal.open('userSettings', { section: 'voice' });
  }

  protected readonly talkKey = computed(() => talkKeyLabel(this.voice.prefs().talkKey));

  protected readonly PhoneOff = PhoneOff;
  protected readonly Settings2 = Settings2;
  protected readonly Monitor = Monitor;
  protected readonly MonitorOff = MonitorOff;
  protected readonly Video = Video;
  protected readonly VideoOff = VideoOff;
}
