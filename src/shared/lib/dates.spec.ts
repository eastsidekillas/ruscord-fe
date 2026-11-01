import { dayLabel, messageTime, sameDay } from './dates';

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
});
