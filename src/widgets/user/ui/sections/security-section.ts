import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, errorText } from '@shared/api';
import { NotificationService } from '@shared/model/notification.service';

/** Password change; the server signs every other device out (ADR-0023). */
@Component({
  selector: 'SecuritySection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Пароль</h3>
      <form class="bg-sidebar-surface-primary rounded-lg px-4 py-3 flex flex-col gap-3 text-sm" (ngSubmit)="change()">
        <input type="password" name="current" autocomplete="current-password" placeholder="Текущий пароль" [(ngModel)]="current"
               class="bg-main-surface-secondary text-white rounded-md px-3 py-2 border border-transparent focus:outline-none focus:border-green-500" />
        <input type="password" name="next" autocomplete="new-password" placeholder="Новый пароль (от 8 символов)" [(ngModel)]="next"
               class="bg-main-surface-secondary text-white rounded-md px-3 py-2 border border-transparent focus:outline-none focus:border-green-500" />
        <input type="password" name="repeat" autocomplete="new-password" placeholder="Новый пароль ещё раз" [(ngModel)]="repeat"
               class="bg-main-surface-secondary text-white rounded-md px-3 py-2 border border-transparent focus:outline-none focus:border-green-500" />
        <p class="text-xs text-gray-500">После смены пароля все другие устройства выйдут из учётной записи.</p>
        <p *ngIf="error()" class="text-red-400">{{ error() }}</p>
        <div>
          <button type="submit" [disabled]="busy() || !current || !next"
                  class="px-4 py-2 rounded-md bg-green-600 hover:bg-green-500 text-white disabled:opacity-50">Сменить пароль</button>
        </div>
      </form>
    </section>
  `,
})
export class SecuritySectionComponent {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotificationService);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected current = '';
  protected next = '';
  protected repeat = '';

  protected change(): void {
    if (this.next !== this.repeat) {
      this.error.set('Новые пароли не совпадают');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.api.changePassword(this.current, this.next).subscribe({
      next: () => {
        this.busy.set(false);
        this.current = this.next = this.repeat = '';
        this.notify.show('Пароль изменён, другие устройства вышли', 'success', 5000);
      },
      error: err => {
        this.busy.set(false);
        this.error.set(errorText(err, 'Не удалось сменить пароль'));
      },
    });
  }
}
