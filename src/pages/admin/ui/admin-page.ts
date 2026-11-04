import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AdminStats, ApiService } from '@shared/api';
import {
  RefView, SeriesView, barHeight, dayLabel, formatBytes, formatNumber, refViews, seriesViews,
} from '../model/stats';

/** How often the page asks again; the core caches reports for 30 s anyway. */
const REFRESH_MS = 30_000;
const PERIODS = [7, 30, 90];

/**
 * Owner statistics (ruscord-core ADR-0042): who is here now, what happens
 * per day, where people came from. Not in any menu; the core answers 404 to
 * everyone but admins, and so does this page.
 */
@Component({
  selector: 'AdminPage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  host: { class: 'block min-h-[100dvh] bg-ok-bg text-ok-text' },
  template: `
    <main class="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      <header class="flex flex-wrap items-center gap-3">
        <a routerLink="/channels/me" class="text-ok-muted hover:text-ok-text text-[14px]" aria-label="Назад в приложение">← Назад</a>
        <h1 class="text-[22px] font-bold mr-auto">Статистика</h1>
        <div role="radiogroup" aria-label="Период" class="flex rounded-lg border border-ok-border p-0.5 bg-ok-surface-1">
          @for (p of periods; track p) {
            <button type="button" role="radio" [attr.aria-checked]="days() === p"
                    class="px-3 h-8 rounded-md text-[13px]"
                    [class]="days() === p ? 'bg-ok-surface-2 text-ok-text' : 'text-ok-muted hover:text-ok-text'"
                    (click)="setDays(p)">{{ p }} дней</button>
          }
        </div>
        <button type="button" class="h-9 px-3 rounded-lg border border-ok-border text-[13px] hover:bg-ok-surface-2"
                [attr.aria-pressed]="asTable()" (click)="asTable.set(!asTable())">{{ asTable() ? 'Графики' : 'Таблицей' }}</button>
      </header>

      @if (missing()) {
        <p class="text-ok-muted">Такой страницы нет.</p>
      } @else if (!report()) {
        <p class="text-ok-muted" aria-live="polite">{{ failed() ? 'Не удалось загрузить статистику. Повторим через 30 секунд.' : 'Загрузка…' }}</p>
      } @else {
        <p class="text-[12px] text-ok-muted -mt-4" aria-live="polite">
          Обновлено в {{ updated() }} · дни по московскому времени{{ failed() ? ' · последнее обновление не удалось' : '' }}
        </p>

        <section aria-labelledby="now-h" class="flex flex-col gap-3">
          <h2 id="now-h" class="text-[12px] font-semibold tracking-[0.06em] text-ok-muted">СЕЙЧАС</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            @for (t of nowTiles(); track t.label) {
              <div class="rounded-ok-md bg-ok-surface-1 border border-ok-border p-4">
                <div class="text-[13px] text-ok-muted">{{ t.label }}</div>
                <div class="text-[28px] font-bold tabular-nums leading-tight">{{ t.value }}</div>
              </div>
            }
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            @for (t of totalTiles(); track t.label) {
              <div class="rounded-ok-md bg-ok-surface-1 border border-ok-border px-4 py-3">
                <div class="text-[12px] text-ok-muted">{{ t.label }}</div>
                <div class="text-[18px] font-semibold tabular-nums">{{ t.value }}</div>
              </div>
            }
          </div>
        </section>

        <section aria-labelledby="days-h" class="flex flex-col gap-3">
          <h2 id="days-h" class="text-[12px] font-semibold tracking-[0.06em] text-ok-muted">ПО ДНЯМ</h2>
          @if (asTable()) {
            <div class="overflow-x-auto rounded-ok-md border border-ok-border">
              <table class="w-full text-[13px] tabular-nums">
                <thead class="bg-ok-surface-1 text-ok-muted">
                  <tr>
                    <th scope="col" class="text-left px-3 py-2 font-medium">День</th>
                    @for (s of series(); track s.key) { <th scope="col" class="text-right px-3 py-2 font-medium">{{ s.title }}</th> }
                  </tr>
                </thead>
                <tbody>
                  @for (d of daysDesc(); track d.i) {
                    <tr class="border-t border-ok-border">
                      <th scope="row" class="text-left px-3 py-1.5 font-normal text-ok-muted whitespace-nowrap">{{ d.label }}</th>
                      @for (s of series(); track s.key) { <td class="text-right px-3 py-1.5">{{ fmt(s.values[d.i]) }}</td> }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              @for (s of series(); track s.key) {
                <figure class="rounded-ok-md bg-ok-surface-1 border border-ok-border p-4 m-0 flex flex-col gap-2">
                  <figcaption class="flex items-baseline gap-2">
                    <span class="text-[14px] font-semibold mr-auto">{{ s.title }}</span>
                    <span class="text-[12px] text-ok-muted">сегодня</span>
                    <span class="text-[14px] font-semibold tabular-nums">{{ fmt(s.today) }}</span>
                    <span class="text-[12px] text-ok-muted ml-2">за период</span>
                    <span class="text-[14px] font-semibold tabular-nums">{{ fmt(s.total) }}</span>
                  </figcaption>
                  <div class="h-5 text-[12px] text-ok-muted tabular-nums" aria-hidden="true">
                    @if (hover()?.key === s.key) { {{ dayName(hover()!.i) }}: <span class="text-ok-text font-semibold">{{ fmt(s.values[hover()!.i]) }}</span> }
                  </div>
                  <div class="relative h-28 flex items-end gap-[2px] border-b border-ok-border"
                       role="img" [attr.aria-label]="s.title + ': за период ' + s.total + ', сегодня ' + s.today + ', больше всего за день ' + s.max"
                       (mouseleave)="hover.set(null)">
                    <span class="absolute right-0 top-0 text-[11px] text-ok-muted tabular-nums" aria-hidden="true">{{ fmt(s.max) }}</span>
                    @for (v of s.values; track $index) {
                      <div class="flex-1 h-full flex items-end cursor-default" (mouseenter)="hover.set({ key: s.key, i: $index })">
                        <div class="w-full rounded-t-[4px]"
                             [class]="hover()?.key === s.key && hover()!.i === $index ? 'bg-ok-text' : 'bg-ok-accent'"
                             [style.height.%]="height(v, s.max)"></div>
                      </div>
                    }
                  </div>
                  <div class="flex justify-between text-[11px] text-ok-muted" aria-hidden="true">
                    <span>{{ dayName(0) }}</span><span>{{ dayName(lastDay()) }}</span>
                  </div>
                </figure>
              }
            </div>
          }
        </section>

        <section aria-labelledby="refs-h" class="flex flex-col gap-3">
          <h2 id="refs-h" class="text-[12px] font-semibold tracking-[0.06em] text-ok-muted">ОТКУДА ПРИШЛИ</h2>
          <p class="text-[13px] text-ok-muted -mt-1">
            Метка — часть ссылки: <code class="text-ok-text">{{ origin }}/?ref=stream</code>. Заход считается один раз на адрес за 30 минут.
          </p>
          @if (refs().length) {
            <div class="overflow-x-auto rounded-ok-md border border-ok-border">
              <table class="w-full text-[13px] tabular-nums">
                <thead class="bg-ok-surface-1 text-ok-muted">
                  <tr>
                    <th scope="col" class="text-left px-3 py-2 font-medium">Метка</th>
                    <th scope="col" class="text-right px-3 py-2 font-medium">Заходы</th>
                    <th scope="col" class="text-right px-3 py-2 font-medium">Регистрации</th>
                    <th scope="col" class="text-right px-3 py-2 font-medium">Конверсия</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of refs(); track r.ref) {
                    <tr class="border-t border-ok-border">
                      <th scope="row" class="text-left px-3 py-1.5 font-normal" [class.text-ok-muted]="!r.ref">{{ r.label }}</th>
                      <td class="text-right px-3 py-1.5">{{ fmt(r.visits) }}</td>
                      <td class="text-right px-3 py-1.5">{{ fmt(r.registrations) }}</td>
                      <td class="text-right px-3 py-1.5">{{ r.conversion === null ? '—' : r.conversion + ' %' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="text-[13px] text-ok-muted">За период заходов и регистраций нет.</p>
          }
        </section>
      }
    </main>
  `,
})
export class AdminPage {
  private readonly api = inject(ApiService);

  protected readonly periods = PERIODS;
  protected readonly origin = location.origin;
  protected readonly days = signal(30);
  protected readonly asTable = signal(false);
  protected readonly report = signal<AdminStats | null>(null);
  protected readonly failed = signal(false);
  protected readonly missing = signal(false);
  protected readonly hover = signal<{ key: string; i: number } | null>(null);

  protected readonly series = computed<SeriesView[]>(() => {
    const r = this.report();
    return r ? seriesViews(r) : [];
  });
  protected readonly refs = computed<RefView[]>(() => {
    const r = this.report();
    return r ? refViews(r) : [];
  });
  protected readonly lastDay = computed(() => (this.report()?.days.length ?? 1) - 1);
  protected readonly daysDesc = computed(() =>
    (this.report()?.days ?? []).map((d, i) => ({ i, label: dayLabel(d) })).reverse());
  protected readonly updated = computed(() => {
    const r = this.report();
    return r ? new Date(r.generated_at).toLocaleTimeString('ru-RU') : '';
  });
  protected readonly nowTiles = computed(() => {
    const n = this.report()?.now ?? {};
    return [
      { label: 'Онлайн', value: formatNumber(n['online']) },
      { label: 'Открытых вкладок', value: formatNumber(n['sessions']) },
      { label: 'В голосе на серверах', value: formatNumber(n['in_voice']) },
      { label: 'В звонках', value: formatNumber(n['in_calls']) },
    ];
  });
  protected readonly totalTiles = computed(() => {
    const r = this.report();
    const n = r?.now ?? {};
    const t = r?.totals ?? {};
    return [
      { label: 'Активные: сегодня · 7 дней · 30 дней', value: `${formatNumber(n['active_day'])} · ${formatNumber(n['active_week'])} · ${formatNumber(n['active_month'])}` },
      { label: 'Аккаунтов', value: formatNumber(t['users']) },
      { label: 'Серверов · сообщений', value: `${formatNumber(t['guilds'])} · ${formatNumber(t['messages'])}` },
      { label: 'Файлы в сообщениях', value: formatBytes(t['attachment_bytes']) },
    ];
  });

  protected readonly fmt = formatNumber;
  protected readonly height = barHeight;

  constructor() {
    this.load();
    const timer = setInterval(() => this.load(), REFRESH_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected setDays(d: number): void {
    if (d === this.days()) return;
    this.days.set(d);
    this.hover.set(null);
    this.load();
  }

  protected dayName(i: number): string {
    const d = this.report()?.days[i];
    return d ? dayLabel(d) : '';
  }

  private load(): void {
    if (this.missing()) return;
    const days = this.days();
    this.api.adminStats(days).subscribe({
      next: r => {
        // An answer for a period no longer chosen is dropped.
        if (days !== this.days()) return;
        this.report.set(r);
        this.failed.set(false);
      },
      error: (e: unknown) => {
        if (e instanceof HttpErrorResponse && e.status === 404) this.missing.set(true);
        else this.failed.set(true);
      },
    });
  }
}
