import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, errorText } from '@shared/api';
import { AuthService } from '@entities/session/api/auth.service';
import { ModalService } from '@shared/model/modal.service';
import { NotificationService } from '@shared/model/notification.service';

const FIELD = 'box-border rounded-ok-md border border-ok-border-control bg-ok-sidebar text-ok-text px-4';

/**
 * «Пароль» and «Удалить аккаунт» under the devices. A new password signs
 * every other device out (ADR-0023); deletion needs the password and fails
 * with owns_guilds while the user owns servers (ADR-0021).
 */
@Component({
  selector: 'SecuritySection',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-10">
      <form aria-labelledby="pw-h" class="flex flex-col gap-3" (ngSubmit)="change()">
        <h2 id="pw-h" class="m-0 text-[20px] leading-7 font-semibold">Пароль</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label for="pw-cur" class="text-[13px] font-medium text-ok-muted">Текущий пароль</label>
            <input id="pw-cur" type="password" name="current" autocomplete="current-password" [(ngModel)]="current" class="h-12 ${FIELD}" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="pw-new" class="text-[13px] font-medium text-ok-muted">Новый пароль</label>
            <input id="pw-new" type="password" name="next" autocomplete="new-password" [(ngModel)]="next" class="h-12 ${FIELD}" />
          </div>
        </div>
        @if (pwError()) { <p role="alert" class="m-0 text-[13px] text-ok-danger">{{ pwError() }}</p> }
        <div class="flex items-center gap-3 flex-wrap">
          <span class="flex-1 text-[13px] text-ok-muted">После смены пароля другие устройства выйдут из аккаунта.</span>
          <button type="submit" [disabled]="busy() || !current || !next"
                  class="h-11 px-5 rounded-ok-md bg-ok-accent text-ok-on-accent font-semibold disabled:opacity-50">Сменить пароль</button>
        </div>
      </form>

      <form aria-labelledby="del-h" class="flex flex-col gap-3 rounded-2xl border border-ok-danger p-5" (ngSubmit)="deleteAccount()">
        <h2 id="del-h" class="m-0 text-[20px] leading-7 font-semibold text-ok-danger">Удалить аккаунт</h2>
        <p class="m-0 text-[13px] leading-[18px] text-ok-muted">
          Вы выйдете со всех серверов, из групп и друзей. Ваши сообщения останутся от «Удалённого пользователя». Отменить нельзя.
        </p>
        @if (delError()) {
          <div role="alert" class="rounded-ok-md bg-ok-surface-2 px-3.5 py-3 text-[13px] text-ok-danger">{{ delError() }}</div>
        }
        <div class="flex gap-2 flex-wrap items-end">
          <div class="flex-[1_1_240px] flex flex-col gap-1.5">
            <label for="del-pw" class="text-[13px] font-medium text-ok-muted">Пароль</label>
            <input id="del-pw" type="password" name="deletePassword" autocomplete="current-password" [(ngModel)]="deletePassword" class="h-11 ${FIELD}" />
          </div>
          <button type="submit" [disabled]="busy() || !deletePassword"
                  class="h-11 px-[18px] rounded-ok-md bg-ok-danger text-ok-on-danger font-semibold disabled:opacity-50">Удалить навсегда</button>
        </div>
      </form>
    </div>
  `,
})
export class SecuritySectionComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly modal = inject(ModalService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly busy = signal(false);
  protected readonly pwError = signal<string | null>(null);
  protected readonly delError = signal<string | null>(null);
  protected current = '';
  protected next = '';
  protected deletePassword = '';

  protected change(): void {
    this.busy.set(true);
    this.pwError.set(null);
    this.api.changePassword(this.current, this.next).subscribe({
      next: () => {
        this.busy.set(false);
        this.current = this.next = '';
        this.notify.show('Пароль изменён, другие устройства вышли', 'success', 5000);
      },
      error: err => {
        this.busy.set(false);
        this.pwError.set(errorText(err, 'Не удалось сменить пароль'));
      },
    });
  }

  /** After deletion every session is gone: forget the user and go to sign-in. */
  protected deleteAccount(): void {
    this.busy.set(true);
    this.delError.set(null);
    this.api.deleteMe(this.deletePassword).subscribe({
      next: () => {
        this.busy.set(false);
        this.modal.close();
        this.auth.forget();
        this.router.navigate(['/login']);
      },
      error: err => {
        this.busy.set(false);
        this.delError.set(errorText(err, 'Не удалось удалить аккаунт'));
      },
    });
  }
}
