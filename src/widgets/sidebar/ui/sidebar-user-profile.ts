import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusUi, StatusUIText } from '@entities/user-status';
import { ModalService } from '@shared/model/modal.service';
import { NotificationService } from '@shared/model/notification.service';
import { AvatarUI } from '@shared/ui/avatar';
import { HeadphoneOff, Headphones, LucideAngularModule, Mic, MicOff, Settings } from 'lucide-angular';
import { VoiceService } from '@entities/voice';
import { AuthService } from '@entities/session';
import { ApiService, ChosenStatus, errorText, nameOf } from '@shared/api';
import { dismissOnOutside } from '@shared/lib/dismiss';

const CHOICES: { value: ChosenStatus; label: string; dot: string }[] = [
  { value: 'online', label: 'В сети', dot: 'bg-ok-success' },
  { value: 'idle', label: 'Не на месте', dot: 'bg-ok-warning' },
  { value: 'dnd', label: 'Не беспокоить', dot: 'bg-ok-danger' },
  { value: 'invisible', label: 'Невидимка', dot: 'ring-2 ring-inset ring-ok-muted' },
];

@Component({
  selector: 'SidebarUserProfile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LucideAngularModule, StatusUi, StatusUIText, AvatarUI],
  template: `
    <div *ngIf="user() as u" class="relative flex items-center gap-1 p-1" data-user-panel>
      <button type="button" class="flex items-center gap-2 min-w-0 flex-1 text-left rounded-lg hover:bg-ok-surface-1"
              (click)="menuOpen.set(!menuOpen())" title="Сменить статус" [attr.aria-expanded]="menuOpen()">
        <span class="relative w-8 h-8 shrink-0">
          <span class="block w-full h-full rounded-lg overflow-hidden"><AvatarUI [src]="u.avatar" [name]="name()" /></span>
          <StatusUI [userId]="u.id" />
        </span>
        <span class="min-w-0">
          <span class="block text-[13px] font-semibold text-ok-text truncate">{{ name() }}</span>
          <StatusUIText [userId]="u.id" />
        </span>
      </button>
      <button type="button" (click)="voice.toggleMute()" [disabled]="!voice.canSpeak()" [attr.aria-pressed]="voice.selfMute()"
              [title]="voice.serverMute() ? 'Микрофон выключил модератор' : voice.selfMute() ? 'Включить микрофон' : 'Выключить микрофон'"
              aria-keyshortcuts="Control+Shift+M"
              class="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              [ngClass]="voice.serverMute() ? 'text-ok-danger' : voice.selfMute() ? 'text-ok-danger bg-ok-surface-1' : 'text-ok-muted hover:text-ok-text hover:bg-ok-surface-1'">
        <lucide-angular class="w-4 h-4" [img]="voice.selfMute() || voice.serverMute() ? MicOff : Mic"></lucide-angular>
      </button>
      <button type="button" (click)="voice.toggleDeaf()" [attr.aria-pressed]="voice.selfDeaf()"
              [title]="voice.selfDeaf() ? 'Включить звук' : 'Выключить звук'" aria-keyshortcuts="Control+Shift+D"
              class="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center"
              [ngClass]="voice.selfDeaf() ? 'text-ok-danger bg-ok-surface-1' : 'text-ok-muted hover:text-ok-text hover:bg-ok-surface-1'">
        <lucide-angular class="w-4 h-4" [img]="voice.selfDeaf() ? HeadphoneOff : Headphones"></lucide-angular>
      </button>
      <button type="button" (click)="openSettings()" title="Настройки" aria-label="Настройки"
              class="w-8 h-8 shrink-0 rounded-lg text-ok-muted hover:text-ok-text hover:bg-ok-surface-1 flex items-center justify-center">
        <lucide-angular class="w-4 h-4" [img]="Settings"></lucide-angular>
      </button>

      <div *ngIf="menuOpen()" role="menu" aria-label="Статус"
           class="absolute bottom-full left-0 mb-2 w-56 rounded-2xl bg-ok-surface-1 border border-ok-border shadow-[0_8px_24px_rgba(0,0,0,0.45)] p-2 flex flex-col gap-0.5 z-50">
        <button *ngFor="let c of choices" type="button" role="menuitemradio" [attr.aria-checked]="u.status === c.value" (click)="choose(c.value)"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] text-ok-text hover:bg-ok-surface-2 text-left"
                [class.bg-ok-surface-2]="u.status === c.value">
          <span class="w-2.5 h-2.5 rounded-full" [ngClass]="c.dot"></span>{{ c.label }}
        </button>
      </div>
    </div>
  `,
})
export class SidebarUserProfile {
  private readonly modal = inject(ModalService);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);

  protected readonly user = this.auth.user;
  protected readonly name = computed(() => nameOf(this.user()));
  protected readonly menuOpen = signal(false);
  protected readonly choices = CHOICES;
  protected readonly voice = inject(VoiceService);
  protected readonly Mic = Mic;
  protected readonly MicOff = MicOff;
  protected readonly Headphones = Headphones;
  protected readonly HeadphoneOff = HeadphoneOff;
  protected readonly Settings = Settings;

  constructor() {
    dismissOnOutside(this.menuOpen, () => this.menuOpen.set(false));
  }

  protected choose(status: ChosenStatus): void {
    this.menuOpen.set(false);
    // The new status comes back as USER_UPDATE through the gateway as well.
    this.api.updateMe({ status }).subscribe({
      next: u => this.auth.setUser(u),
      error: err => this.notify.show(errorText(err, 'Не удалось сменить статус'), 'error'),
    });
  }

  protected openSettings(): void {
    this.modal.open('userSettings');
  }
}
