import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusUi, StatusUIText } from '@entities/user-status';
import { ModalService } from '@shared/model/modal.service';
import { NotificationService } from '@shared/model/notification.service';
import { AvatarUI } from '@shared/ui/avatar';
import { AuthService } from '@entities/session';
import { ApiService, ChosenStatus, errorText, nameOf } from '@shared/api';

const CHOICES: { value: ChosenStatus; label: string; dot: string }[] = [
  { value: 'online', label: 'В сети', dot: 'bg-green-400' },
  { value: 'idle', label: 'Не активен', dot: 'bg-yellow-500' },
  { value: 'dnd', label: 'Не беспокоить', dot: 'bg-red-500' },
  { value: 'invisible', label: 'Невидимый', dot: 'bg-gray-400' },
];

@Component({
  selector: 'SidebarUserProfile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, StatusUi, StatusUIText, AvatarUI],
  template: `
    <div *ngIf="user() as u" class="relative bg-main-surface-secondary rounded-xl shadow-lg p-4 flex items-center">
      <button class="flex items-center space-x-3 min-w-0 text-left" (click)="menuOpen.set(!menuOpen())" title="Сменить статус">
        <div class="relative w-10 h-10 shrink-0">
          <div class="w-full h-full rounded-full overflow-hidden border border-gray-600">
            <AvatarUI [src]="u.avatar" [name]="name()" />
          </div>
          <StatusUI [userId]="u.id"></StatusUI>
        </div>
        <div class="min-w-0">
          <div class="text-sm font-semibold text-white truncate">{{ name() }}</div>
          <StatusUIText [userId]="u.id" />
        </div>
      </button>
      <button (click)="openSettings()" class="ml-auto text-gray-400 hover:text-white transition" title="Настройки">
        <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path fill-rule="evenodd" d="M9.586 2.586A2 2 0 0 1 11 2h2a2 2 0 0 1 2 2v.089l.473.196.063-.063a2.002 2.002 0 0 1 2.828 0l1.414 1.414a2 2 0 0 1 0 2.827l-.063.064.196.473H20a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-.089l-.196.473.063.063a2.002 2.002 0 0 1 0 2.828l-1.414 1.414a2 2 0 0 1-2.828 0l-.063-.063-.473.196V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-.089l-.473-.196-.063.063a2.002 2.002 0 0 1-2.828 0l-1.414-1.414a2 2 0 0 1 0-2.827l.063-.064L4.089 15H4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h.09l.195-.473-.063-.063a2 2 0 0 1 0-2.828l1.414-1.414a2 2 0 0 1 2.827 0l.064.063L9 4.089V4a2 2 0 0 1 .586-1.414ZM8 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clip-rule="evenodd"/>
        </svg>
      </button>

      <div *ngIf="menuOpen()" class="absolute bottom-full left-0 mb-2 w-56 bg-main-surface-primary rounded-xl shadow-xl border border-white/10 py-2">
        <button *ngFor="let c of choices" (click)="choose(c.value)"
                class="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-white/5"
                [class.font-semibold]="u.status === c.value">
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
