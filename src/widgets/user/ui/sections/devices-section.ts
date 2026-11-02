import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { LucideAngularModule, Monitor, Smartphone } from 'lucide-angular';
import { ApiService, GatewayService, Session, deviceLabel, errorText } from '@shared/api';
import { NotificationService } from '@shared/model/notification.service';
import { pluralRu } from '@shared/lib/plural';
import { sameDay, timeAgo } from '@shared/lib/dates';

const DAY = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' });

/**
 * «Устройства» (ruscord-core ADR-0023): where the account is signed in,
 * this device first; signing one out, or every other one with the password.
 * The list follows SESSION_CREATE and SESSION_REVOKE live.
 */
@Component({
  selector: 'DevicesSection',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="dev-h" class="flex flex-col gap-3">
      <div class="flex items-center gap-3 flex-wrap">
        <h1 id="dev-h" class="m-0 flex-1 text-[20px] leading-7 font-semibold">Устройства</h1>
        @if (others() > 0) {
          <button type="button" (click)="confirming.set(!confirming())" [attr.aria-expanded]="confirming()"
                  class="h-10 px-4 rounded-[10px] bg-ok-surface-2 text-ok-danger font-semibold">Выйти на всех других</button>
        }
      </div>
      <p class="m-0 text-[13px] text-ok-muted">Где сейчас открыт ваш аккаунт. Завершённое устройство отключается сразу.</p>
      @if (error()) { <p role="alert" class="m-0 text-[13px] text-ok-danger">{{ error() }}</p> }

      <div class="flex flex-col rounded-2xl bg-ok-surface-1 border border-ok-border">
        @for (s of sorted(); track s.id; let lastRow = $last) {
          <div data-session class="flex items-center gap-3.5 p-4" [class.border-b]="!lastRow" [class.border-ok-border]="!lastRow">
            <lucide-angular class="w-[22px] h-[22px] text-ok-muted shrink-0" [img]="mobile(s) ? Smartphone : Monitor" aria-hidden="true"></lucide-angular>
            <div class="flex-1 min-w-0">
              <div class="font-semibold truncate">
                {{ label(s) }}
                @if (s.current) {
                  <span class="ml-1.5 text-[12px] font-semibold text-ok-on-accent bg-ok-accent px-2 py-0.5 rounded-ok-sm">Это устройство</span>
                }
              </div>
              <div class="text-[13px] text-ok-muted truncate">{{ meta(s) }}</div>
            </div>
            @if (!s.current) {
              <button type="button" (click)="revoke(s)" [disabled]="busy()"
                      class="h-9 px-3.5 rounded-lg border border-ok-border-control text-ok-text text-[13px] font-semibold disabled:opacity-50">Завершить</button>
            }
          </div>
        } @empty {
          @if (loaded()) { <p class="m-0 p-4 text-[13px] text-ok-muted">Нет активных сессий.</p> }
        }
      </div>

      @if (confirming() && others() > 0) {
        <form class="rounded-2xl bg-ok-surface-2 p-4 flex flex-col gap-2.5" (ngSubmit)="revokeOthers()">
          <div class="font-semibold">Выйти на всех других устройствах</div>
          <div class="flex gap-2 flex-wrap items-start">
            <div class="flex-[1_1_240px] flex flex-col gap-1.5">
              <label for="s-ro" class="text-[13px] font-medium text-ok-muted">Пароль ещё раз</label>
              <input id="s-ro" type="password" name="password" autocomplete="current-password" [(ngModel)]="password"
                     [attr.aria-invalid]="othersError() ? 'true' : null" [attr.aria-describedby]="othersError() ? 's-ro-err' : null"
                     class="h-11 box-border rounded-ok-md border bg-ok-sidebar text-ok-text px-4"
                     [class]="othersError() ? 'border-ok-danger' : 'border-ok-border-control'" />
              @if (othersError()) { <span id="s-ro-err" class="text-[13px] text-ok-danger">{{ othersError() }}</span> }
            </div>
            <button type="submit" [disabled]="!password || busy()"
                    class="mt-6 h-11 px-[18px] rounded-ok-md bg-ok-danger text-ok-on-danger font-semibold disabled:opacity-50">{{ othersLabel() }}</button>
          </div>
        </form>
      }
    </section>
  `,
})
export class DevicesSectionComponent {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotificationService);

  protected readonly sessions = signal<Session[]>([]);
  protected readonly loaded = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly othersError = signal<string | null>(null);
  protected readonly confirming = signal(false);
  protected password = '';

  protected readonly Monitor = Monitor;
  protected readonly Smartphone = Smartphone;

  /** This device first, then by last use. */
  protected readonly sorted = computed(() =>
    [...this.sessions()].sort((a, b) =>
      Number(b.current) - Number(a.current) || b.last_used_at.localeCompare(a.last_used_at)));
  protected readonly others = computed(() => this.sessions().filter(s => !s.current).length);
  protected readonly othersLabel = computed(() => {
    const n = this.others();
    return `Выйти на ${n} ${pluralRu(n, 'устройстве', 'устройствах', 'устройствах')}`;
  });

  protected readonly label = (s: Session) => deviceLabel(s.device);
  protected readonly mobile = (s: Session) => /Android|iPhone|iPad|iPod|Mobile/.test(s.device);

  /** «192.0.2.10 · 2 часа назад · вход 28 октября»; this device is «сейчас». */
  protected meta(s: Session): string {
    const now = new Date();
    const used = new Date(s.last_used_at);
    const created = new Date(s.created_at);
    const parts = [s.ip || 'адрес неизвестен', s.current ? 'сейчас' : timeAgo(used, now)];
    if (!s.current && !sameDay(created, used)) parts.push('вход ' + DAY.format(created));
    return parts.join(' · ');
  }

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
    this.run(this.api.revokeSession(s.id), err => this.error.set(errorText(err, 'Не удалось завершить сессию')), () => {
      this.sessions.update(list => list.filter(x => x.id !== s.id));
    });
  }

  protected revokeOthers(): void {
    this.othersError.set(null);
    this.run(this.api.revokeOtherSessions(this.password), err => this.othersError.set(errorText(err, 'Не удалось завершить сессии')), r => {
      this.password = '';
      this.confirming.set(false);
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

  private run<T>(req: Observable<T>, fail: (err: unknown) => void, done: (v: T) => void): void {
    this.busy.set(true);
    this.error.set(null);
    req.subscribe({
      next: v => {
        this.busy.set(false);
        done(v);
      },
      error: err => {
        this.busy.set(false);
        fail(err);
      },
    });
  }
}
