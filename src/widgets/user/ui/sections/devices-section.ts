import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, GatewayService, Session, deviceLabel, errorText } from '@shared/api';
import { NotificationService } from '@shared/model/notification.service';

/**
 * Signed-in devices (ruscord-core ADR-0023): which, from where, when last
 * used; signing one out or every other one. The list follows SESSION_CREATE
 * and SESSION_REVOKE live.
 */
@Component({
  selector: 'DevicesSection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="text-sm text-gray-400 mb-4">
      Здесь все устройства, на которых выполнен вход. Если какое-то вам незнакомо, завершите его и смените пароль.
    </p>
    <p *ngIf="error()" class="text-red-400 text-sm mb-3">{{ error() }}</p>
    <div class="bg-sidebar-surface-primary rounded-lg divide-y divide-white/5 mb-6">
      <div *ngFor="let s of sessions(); trackBy: byId" class="px-4 py-3 flex items-center gap-3" data-session>
        <div class="min-w-0 flex-1">
          <div class="text-sm text-white truncate">
            {{ label(s) }}
            <span *ngIf="s.current" class="ml-1 text-xs text-green-400">это устройство</span>
          </div>
          <div class="text-xs text-gray-500 truncate">
            {{ s.ip || 'адрес неизвестен' }} · вход {{ s.created_at | date:'dd.MM.yyyy HH:mm' }}
            · активность {{ s.last_used_at | date:'dd.MM.yyyy HH:mm' }}
          </div>
        </div>
        <button *ngIf="!s.current" type="button" (click)="revoke(s)" [disabled]="busy()"
                class="text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50">Завершить</button>
      </div>
      <p *ngIf="loaded() && !sessions().length" class="px-4 py-3 text-sm text-gray-500">Нет активных сессий.</p>
    </div>

    <div *ngIf="others() > 0" class="bg-sidebar-surface-primary rounded-lg px-4 py-3 text-sm">
      <p class="text-gray-400 mb-3">Выйти на всех других устройствах: останется только это. Нужен пароль.</p>
      <form class="flex flex-wrap items-center gap-2" (ngSubmit)="revokeOthers()">
        <input type="password" name="password" autocomplete="current-password" placeholder="Пароль" [(ngModel)]="password"
               class="flex-1 min-w-48 bg-main-surface-secondary text-white rounded-md px-3 py-2 border border-transparent focus:outline-none focus:border-red-500" />
        <button type="submit" [disabled]="!password || busy()"
                class="px-3 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white disabled:opacity-50">Выйти на других устройствах</button>
      </form>
    </div>
  `,
})
export class DevicesSectionComponent {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotificationService);

  protected readonly sessions = signal<Session[]>([]);
  protected readonly loaded = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected password = '';

  protected readonly label = (s: Session) => deviceLabel(s.device);
  protected readonly byId = (_: number, s: Session) => s.id;
  protected readonly others = () => this.sessions().filter(s => !s.current).length;

  constructor() {
    this.load();
    inject(GatewayService).dispatches.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(ev => {
      if (ev.t === 'SESSION_CREATE' && ev.d?.id) {
        const s = ev.d as Session;
        this.sessions.update(list => list.some(x => x.id === s.id) ? list : [{ ...s, current: false }, ...list]);
      } else if (ev.t === 'SESSION_REVOKE' && ev.d?.session_id) {
        this.sessions.update(list => list.filter(x => x.id !== ev.d.session_id));
      }
    });
  }

  protected revoke(s: Session): void {
    this.run(this.api.revokeSession(s.id), 'Не удалось завершить сессию', () => {
      this.sessions.update(list => list.filter(x => x.id !== s.id));
    });
  }

  protected revokeOthers(): void {
    this.run(this.api.revokeOtherSessions(this.password), 'Не удалось завершить сессии', r => {
      this.password = '';
      this.sessions.update(list => list.filter(x => x.current));
      this.notify.show(`Завершено сессий: ${r.revoked}`, 'success');
    });
  }

  private load(): void {
    this.api.sessions().subscribe({
      next: list => {
        this.sessions.set(list);
        this.loaded.set(true);
      },
      error: err => {
        this.loaded.set(true);
        this.error.set(errorText(err, 'Не удалось загрузить устройства'));
      },
    });
  }

  private run<T>(req: import('rxjs').Observable<T>, fallback: string, done: (v: T) => void): void {
    this.busy.set(true);
    this.error.set(null);
    req.subscribe({
      next: v => {
        this.busy.set(false);
        done(v);
      },
      error: err => {
        this.busy.set(false);
        this.error.set(errorText(err, fallback));
      },
    });
  }
}
