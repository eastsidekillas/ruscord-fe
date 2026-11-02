import { dayLabel, messageTime, sameDay, timeAgo } from './dates';

describe('dates', () => {
  const now = new Date(2026, 10, 1, 23, 30);

  it('shows only the time for today and the date for other days', () => {
    expect(messageTime(new Date(2026, 10, 1, 20, 41), now)).toBe('20:41');
    expect(messageTime(new Date(2026, 9, 28, 9, 5), now)).toBe('28.10.2026, 09:05');
  });

  it('names the day of a message group', () => {
    expect(dayLabel(new Date(2026, 10, 1, 0, 1), now)).toBe('Сегодня');
    expect(dayLabel(new Date(2026, 9, 31, 23, 59), now)).toBe('Вчера');
    expect(dayLabel(new Date(2026, 9, 28), now)).toBe('28 октября');
    expect(dayLabel(new Date(2025, 9, 28), now)).toBe('28 октября 2025 г.');
  });

  it('compares local dates, not moments', () => {
    expect(sameDay(new Date(2026, 10, 1, 0, 0), new Date(2026, 10, 1, 23, 59))).toBeTrue();
    expect(sameDay(new Date(2026, 10, 1), new Date(2026, 10, 2))).toBeFalse();
  });

  it('says how long ago a device was used', () => {
    const at = (min: number) => new Date(now.getTime() - min * 60000);
    expect(timeAgo(at(0), now)).toBe('сейчас');
    expect(timeAgo(at(1), now)).toBe('1 минуту назад');
    expect(timeAgo(at(22), now)).toBe('22 минуты назад');
    expect(timeAgo(at(120), now)).toBe('2 часа назад');
    expect(timeAgo(at(5 * 60), now)).toBe('5 часов назад');
    expect(timeAgo(at(5 * 24 * 60), now)).toBe('5 дней назад');
    expect(timeAgo(new Date(2026, 9, 2), now)).toBe('2 октября');
  });
});
