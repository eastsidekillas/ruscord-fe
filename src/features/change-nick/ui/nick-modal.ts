import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ModalService } from '@shared/model/modal.service';
import { NotificationService } from '@shared/model/notification.service';
import { ApiService, errorText, nameOf } from '@shared/api';
import { ModalFrame } from '@shared/ui/modal-frame';
import { AppStateStore } from '@entities/app-state';

/** Nick length of ruscord-core. */
const MAX_NICK = 32;

/**
 * «Ник на сервере» by the mockup (modal data: serverId). Needs
 * CHANGE_NICKNAME; the new nick comes back as GUILD_MEMBER_UPDATE.
 */
@Component({
  selector: 'NickModal',
  standalone: true,
  imports: [FormsModule, ModalFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ModalFrame title="Ник на сервере" (closed)="close()">
      <form class="flex flex-col gap-3.5" (ngSubmit)="save()">
        <div class="flex flex-col gap-1.5">
          <label for="nk" class="text-[13px] font-medium text-ok-muted">Так вас увидят на «{{ guild()?.name }}»</label>
          <input id="nk" name="nick" type="text" [maxlength]="maxNick" [placeholder]="fallback()" [(ngModel)]="nick"
                 class="h-12 box-border rounded-ok-md border border-ok-border-control bg-ok-sidebar text-ok-text px-4" />
          <span class="text-[12px] text-ok-muted">Пусто — будет видно имя профиля.</span>
        </div>
        @if (error()) { <p role="alert" class="m-0 text-[13px] text-ok-danger">{{ error() }}</p> }
        <div class="flex gap-2 justify-end flex-wrap">
          <button type="button" (click)="reset()" [disabled]="busy() || !current()" class="h-11 px-4 rounded-ok-md bg-ok-surface-2 text-ok-text font-semibold disabled:opacity-50">Сбросить</button>
          <button type="submit" [disabled]="busy()" class="h-11 px-4 rounded-ok-md bg-ok-accent text-ok-on-accent font-semibold disabled:opacity-50">Сохранить</button>
        </div>
      </form>
    </ModalFrame>
  `,
})
export class NickModal {
  private readonly modal = inject(ModalService);
  private readonly api = inject(ApiService);
  private readonly store = inject(AppStateStore);
  private readonly notify = inject(NotificationService);

  private readonly data = this.modal.modalData();
  protected readonly guild = computed(() => this.store.guild(this.data['serverId']));
  protected readonly current = computed(() => this.guild()?.member?.nick ?? '');
  protected readonly fallback = computed(() => nameOf(this.store.me()));
  protected readonly maxNick = MAX_NICK;
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected nick = this.current();

  protected save(): void {
    const nick = this.nick.trim();
    if (nick === this.current()) {
      this.close();
      return;
    }
    this.send(nick || null, nick ? 'Ник сохранён' : 'Ник сброшен');
  }

  protected reset(): void {
    this.send(null, 'Ник сброшен');
  }

  private send(nick: string | null, done: string): void {
    const g = this.guild();
    if (!g || this.busy()) return;
    this.run(this.api.setNick(g.id, nick), () => {
      this.notify.show(done, 'success');
      this.close();
    });
  }

  private run(req: Observable<void>, done: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    req.subscribe({
      next: () => {
        this.busy.set(false);
        done();
      },
      error: err => {
        this.busy.set(false);
        this.error.set(errorText(err, 'Не удалось сменить ник'));
      },
    });
  }

  protected close(): void {
    this.modal.close();
  }
}
