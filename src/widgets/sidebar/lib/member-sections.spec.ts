import { Role } from '@shared/api/models';
import { memberSections, roleColor } from './member-sections';

const role = (id: string, name: string, position: number, color = 0): Role =>
  ({ id, guild_id: 'g', name, position, permissions: '0', color, mentionable: false });

const roles = [role('g', '@everyone', 0), role('mod', 'Модератор', 5, 0xe6c27a), role('reg', 'Постоянный', 2), role('vip', 'VIP', 3, 0x7fd1a8)];

const rows = [
  { user_id: 'ann', name: 'Аня', roles: ['reg', 'mod'] },
  { user_id: 'bob', name: 'Боб', roles: [] },
  { user_id: 'cat', name: 'Кот', roles: ['reg'] },
  { user_id: 'fox', name: 'Лиса', roles: ['g'] },
  { user_id: 'owl', name: 'Сова', roles: ['mod'] },
  { user_id: 'yak', name: 'Як', roles: ['vip', 'reg'] },
];

describe('member sections', () => {
  it('groups people online under their highest role, then the rest, offline last', () => {
    const off = new Set(['owl']);
    const s = memberSections(rows, roles, 'g', id => (off.has(id) ? 'offline' : 'online'));
    expect(s.map(x => [x.title, x.rows.map(r => r.name)])).toEqual([
      ['МОДЕРАТОР', ['Аня']],
      ['VIP', ['Як']],
      ['ПОСТОЯННЫЙ', ['Кот']],
      ['В СЕТИ', ['Боб', 'Лиса']],
      ['НЕ В СЕТИ', ['Сова']],
    ]);
    expect(s.at(-1)!.offline).toBeTrue();
  });

  it('colours a name by the highest role that has a colour', () => {
    const s = memberSections(rows, roles, 'g', () => 'online');
    const color = (name: string) => s.flatMap(x => x.rows).find(r => r.name === name)!.color;
    expect(color('Аня')).toBe('#e6c27a');
    expect(color('Як')).toBe('#7fd1a8');
    expect(color('Кот')).toBeNull();
  });

  it('groups everyone the same way when statuses are unknown', () => {
    const s = memberSections(rows, roles, 'g', null);
    expect(s.map(x => x.title)).toEqual(['МОДЕРАТОР', 'VIP', 'ПОСТОЯННЫЙ', 'УЧАСТНИКИ']);
    expect(s[0].rows.map(r => r.name)).toEqual(['Аня', 'Сова']);
  });

  it('turns a role colour into CSS', () => {
    expect(roleColor(0)).toBeNull();
    expect(roleColor(0x00ff)).toBe('#0000ff');
  });
});
