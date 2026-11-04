import { AdminStats } from '@shared/api';

/** Series the page shows, in this order, with their Russian titles. */
export const SERIES: { key: string; title: string }[] = [
  { key: 'visits', title: 'Заходы на сайт' },
  { key: 'registrations', title: 'Регистрации' },
  { key: 'active_users', title: 'Активные за день' },
  { key: 'messages', title: 'Сообщения' },
  { key: 'senders', title: 'Писали сообщения' },
  { key: 'attachments', title: 'Файлы' },
  { key: 'joins', title: 'Входы на серверы' },
  { key: 'guilds', title: 'Новые серверы' },
];

export interface SeriesView {
  key: string;
  title: string;
  values: number[];
  total: number;
  today: number;
  max: number;
}

/** The series of a report as the page shows them; missing ones are zeros. */
export function seriesViews(r: AdminStats): SeriesView[] {
  return SERIES.map(({ key, title }) => {
    const values = r.series[key] ?? r.days.map(() => 0);
    return {
      key, title, values,
      total: values.reduce((a, b) => a + b, 0),
      today: values.at(-1) ?? 0,
      max: Math.max(0, ...values),
    };
  });
}

/** Bar height in percent of the chart; a non-zero value stays visible. */
export function barHeight(v: number, max: number): number {
  if (max <= 0 || v <= 0) return 0;
  return Math.max(2, Math.round((v / max) * 100));
}

export interface RefView {
  ref: string;
  label: string;
  visits: number;
  registrations: number;
  /** Registrations per visit, percent; null without visits. */
  conversion: number | null;
}

/** Link tags, the busiest first; '' is shown as "без метки". */
export function refViews(r: AdminStats): RefView[] {
  return r.refs
    .map(({ ref, counts }) => {
      const visits = counts['visits'] ?? 0;
      const registrations = counts['registrations'] ?? 0;
      return {
        ref, label: ref || 'без метки', visits, registrations,
        conversion: visits > 0 ? Math.round((registrations / visits) * 1000) / 10 : null,
      };
    })
    .sort((a, b) => b.visits + b.registrations - (a.visits + a.registrations) || a.ref.localeCompare(b.ref));
}

const dayFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "2026-11-05" → "5 нояб.". */
export function dayLabel(day: string): string {
  const d = new Date(day + 'T00:00:00Z');
  return isNaN(d.getTime()) ? day : dayFmt.format(d);
}

const num = new Intl.NumberFormat('ru-RU');

export function formatNumber(n: number | undefined): string {
  return num.format(n ?? 0);
}

/** Bytes in the units people read: "12,5 МБ". */
export function formatBytes(n: number | undefined): string {
  let v = n ?? 0;
  const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: i ? 1 : 0 }).format(v)} ${units[i]}`;
}
