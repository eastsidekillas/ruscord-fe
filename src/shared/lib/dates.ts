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
