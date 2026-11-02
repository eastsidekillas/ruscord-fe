import { pluralRu } from './plural';

const TIME = new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' });
const DATE_TIME = new Intl.DateTimeFormat('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const DAY = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' });
const DAY_YEAR = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', year: 'numeric' });

/** Whether two moments fall on the same local date. */
export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "20:41" today, "28.10.2026, 20:41" on other days. */
export function messageTime(d: Date, now: Date): string {
  return (sameDay(d, now) ? TIME : DATE_TIME).format(d);
}

/** "Сегодня", "Вчера", "28 октября", or with the year for other years. */
export function dayLabel(d: Date, now: Date): string {
  if (sameDay(d, now)) return 'Сегодня';
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return 'Вчера';
  return (d.getFullYear() === now.getFullYear() ? DAY : DAY_YEAR).format(d);
}

/** "сейчас", "5 минут назад", "2 часа назад", "3 дня назад", then the date. */
export function timeAgo(d: Date, now: Date): string {
  const min = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (min < 1) return 'сейчас';
  if (min < 60) return `${min} ${pluralRu(min, 'минуту', 'минуты', 'минут')} назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ${pluralRu(h, 'час', 'часа', 'часов')} назад`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} ${pluralRu(days, 'день', 'дня', 'дней')} назад`;
  return (d.getFullYear() === now.getFullYear() ? DAY : DAY_YEAR).format(d);
}
