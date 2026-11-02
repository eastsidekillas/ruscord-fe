import { shortDate } from './members-tab';

describe('shortDate', () => {
  it('day and short month without the dot', () => expect(shortDate('2026-10-12T10:00:00Z')).toBe('12 окт'));
  it('May has no dot to drop', () => expect(shortDate('2026-05-03T10:00:00Z')).toBe('3 мая'));
  it('a bad date is empty', () => expect(shortDate('nope')).toBe(''));
});
