import { KeyLike, hotkeyFor, neighbour } from './keys';

const k = (key: string, mods: Partial<KeyLike> = {}, code = ''): KeyLike =>
  ({ key, code, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods });

describe('hotkeys', () => {
  it('maps keys to actions', () => {
    const cases: [KeyLike, string | null][] = [
      [k('k', { ctrlKey: true }, 'KeyK'), 'switch'],
      [k('л', { ctrlKey: true }, 'KeyK'), 'switch'], // Russian layout
      [k('k', { metaKey: true }, 'KeyK'), 'switch'],
      [k('k', { ctrlKey: true, shiftKey: true }, 'KeyK'), null],
      [k('M', { ctrlKey: true, shiftKey: true }, 'KeyM'), 'mute'],
      [k('D', { ctrlKey: true, shiftKey: true }, 'KeyD'), 'deafen'],
      [k('ArrowLeft', { ctrlKey: true, altKey: true }), 'back'],
      [k('ArrowRight', { ctrlKey: true, altKey: true }), 'forward'],
      [k('ArrowUp', { altKey: true }), 'prev'],
      [k('ArrowDown', { altKey: true }), 'next'],
      [k('ArrowUp', { altKey: true, shiftKey: true }), 'prevUnread'],
      [k('ArrowDown', { altKey: true, shiftKey: true }), 'nextUnread'],
      [k('ArrowDown'), null],
      [k('Escape'), 'markRead'],
      [k('Escape', { shiftKey: true }), null],
      [k('m', {}, 'KeyM'), null],
    ];
    for (const [e, want] of cases) expect(hotkeyFor(e)).withContext(JSON.stringify(e)).toBe(want as never);
  });

  it('steps through channels with wrap-around', () => {
    const ids = ['a', 'b', 'c'];
    const cases: [string | null, 1 | -1, string | null][] = [
      ['a', 1, 'b'],
      ['c', 1, 'a'],
      ['a', -1, 'c'],
      [null, 1, 'a'],
      [null, -1, 'c'],
      ['x', 1, 'a'],
    ];
    for (const [cur, dir, want] of cases) expect(neighbour(ids, cur, dir)).withContext(`${cur} ${dir}`).toBe(want);
    expect(neighbour([], 'a', 1)).toBeNull();
    expect(neighbour(['a'], 'a', 1)).toBeNull();
  });

  it('finds the nearest unread one, or nothing', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const unread = new Set(['d']);
    expect(neighbour(ids, 'a', 1, id => unread.has(id))).toBe('d');
    expect(neighbour(ids, 'a', -1, id => unread.has(id))).toBe('d');
    expect(neighbour(ids, 'd', 1, id => unread.has(id))).toBeNull();
    expect(neighbour(ids, 'b', 1, () => false)).toBeNull();
  });
});
