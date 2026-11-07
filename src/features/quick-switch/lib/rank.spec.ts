import { SwitchItem, fold, moveSelection, rankSwitch } from './rank';

const item = (kind: SwitchItem['kind'], label: string, hint = '', extra: Partial<SwitchItem> = {}): SwitchItem =>
  ({ kind, id: label, label, hint, route: [], unread: false, mentions: 0, ...extra });

const items = [
  item('guild', 'Стрим-тусовка'),
  item('text', 'общий', 'Стрим-тусовка'),
  item('text', 'мемы', 'Стрим-тусовка', { unread: true }),
  item('voice', 'Болталка', 'Стрим-тусовка'),
  item('dm', 'Аня'),
  item('group', 'Ёлка и мемы', '', { mentions: 2 }),
  item('text', 'общий', 'Домашка 11Б', { unread: true, mentions: 1 }),
];
const labels = (xs: SwitchItem[]) => xs.map(x => `${x.label}${x.hint ? '/' + x.hint : ''}`);

describe('quick switch ranking', () => {
  it('puts unread first when nothing is typed', () => {
    expect(labels(rankSwitch(items, '')).slice(0, 3)).toEqual(['Ёлка и мемы', 'общий/Домашка 11Б', 'мемы/Стрим-тусовка']);
  });

  it('orders exact, prefix, word, substring, then the server', () => {
    const cases: [string, string[]][] = [
      ['мемы', ['мемы/Стрим-тусовка', 'Ёлка и мемы']],
      ['тус', ['Стрим-тусовка', 'мемы/Стрим-тусовка', 'общий/Стрим-тусовка', 'Болталка/Стрим-тусовка']],
      ['елка', ['Ёлка и мемы']],
      ['ОБЩ', ['общий/Домашка 11Б', 'общий/Стрим-тусовка']],
      ['нет такого', []],
    ];
    for (const [q, want] of cases) expect(labels(rankSwitch(items, q))).withContext(q).toEqual(want);
  });

  it('narrows by a leading sign', () => {
    const cases: [string, string[]][] = [
      ['#мем', ['мемы/Стрим-тусовка']],
      ['@', ['Ёлка и мемы', 'Аня']],
      ['*', ['Стрим-тусовка']],
      ['!бол', ['Болталка/Стрим-тусовка']],
    ];
    for (const [q, want] of cases) expect(labels(rankSwitch(items, q))).withContext(q).toEqual(want);
  });

  it('keeps to the limit', () => {
    expect(rankSwitch(items, '', 2).length).toBe(2);
  });

  it('folds case and ё', () => {
    expect(fold('  ЁЛКА ')).toBe('елка');
  });

  it('moves the selection with wrap-around', () => {
    const cases: [number, number, string, number | null][] = [
      [0, 3, 'ArrowDown', 1],
      [2, 3, 'ArrowDown', 0],
      [0, 3, 'ArrowUp', 2],
      [0, 0, 'ArrowDown', null],
      [1, 3, 'Enter', null],
    ];
    for (const [at, n, key, want] of cases) expect(moveSelection(at, n, key)).withContext(`${at} ${n} ${key}`).toBe(want);
  });
});
