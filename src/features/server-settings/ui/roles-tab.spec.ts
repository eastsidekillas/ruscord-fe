import { Role } from '@shared/api';
import { colorHex, moveTarget } from './roles-tab';

const role = (id: string, position: number): Role => ({ id, guild_id: 'g', name: id, position, permissions: '0', color: 0 });

describe('moveTarget', () => {
  const cases: { name: string; from: Role; to: Role; want: number | null }[] = [
    { name: 'up onto a higher role takes its place', from: role('a', 1), to: role('b', 3), want: 3 },
    { name: 'down onto a lower role takes its place', from: role('a', 3), to: role('b', 1), want: 1 },
    { name: 'onto itself is no move', from: role('a', 2), to: role('a', 2), want: null },
    { name: 'onto @everyone is no move', from: role('a', 2), to: role('g', 0), want: null },
    { name: '@everyone cannot move', from: role('g', 0), to: role('b', 2), want: null },
  ];
  for (const c of cases) it(c.name, () => expect(moveTarget(c.from, c.to)).toBe(c.want));
});

describe('colorHex', () => {
  it('pads to six digits', () => expect(colorHex(0x00ff)).toBe('#0000ff'));
  it('keeps the palette colours', () => expect(colorHex(0xE6C27A)).toBe('#e6c27a'));
});
