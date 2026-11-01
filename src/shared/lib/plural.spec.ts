import { members, pluralRu } from './plural';

describe('pluralRu', () => {
  it('picks one, few or many like Russian does', () => {
    const f = (n: number) => pluralRu(n, 'день', 'дня', 'дней');
    expect([1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 101, 111].map(f)).toEqual(
      ['день', 'дня', 'дня', 'дней', 'дней', 'дней', 'дней', 'день', 'дня', 'дней', 'день', 'дней']);
    expect(members(4)).toBe('участника');
  });
});
