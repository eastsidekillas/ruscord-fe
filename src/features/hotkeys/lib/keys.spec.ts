import { KeyLike, endsTalk, hotkeyFor, isTyping, neighbour, startsTalk } from './keys';

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

describe('push to talk', () => {
  const ctx = { key: 'Backquote', required: true, typing: false, modalOpen: false };
  const down = { code: 'Backquote', repeat: false, ctrlKey: false, metaKey: false, altKey: false };

  it('starts on the talk key', () => {
    expect(startsTalk(down, ctx)).toBeTrue();
  });

  it('does not start on repeat, typing, an open modal, another key or when not required', () => {
    expect(startsTalk({ ...down, repeat: true }, ctx)).toBeFalse();
    expect(startsTalk(down, { ...ctx, typing: true })).toBeFalse();
    expect(startsTalk(down, { ...ctx, modalOpen: true })).toBeFalse();
    expect(startsTalk({ ...down, code: 'KeyV' }, ctx)).toBeFalse();
    expect(startsTalk(down, { ...ctx, required: false })).toBeFalse();
  });

  it('leaves Ctrl, Cmd and Alt combinations to the shortcuts', () => {
    const k = { ...ctx, key: 'KeyK' };
    const press = { ...down, code: 'KeyK' };
    expect(startsTalk(press, k)).toBeTrue();
    expect(startsTalk({ ...press, ctrlKey: true }, k)).toBeFalse();
    expect(startsTalk({ ...press, metaKey: true }, k)).toBeFalse();
    expect(startsTalk({ ...press, altKey: true }, k)).toBeFalse();
  });

  it('releases on the talk key whatever the focus or modal is', () => {
    expect(endsTalk({ code: 'Backquote' }, 'Backquote')).toBeTrue();
    expect(endsTalk({ code: 'KeyV' }, 'Backquote')).toBeFalse();
  });

  it('detects typing targets', () => {
    expect(isTyping(document.createElement('textarea'))).toBeTrue();
    expect(isTyping(document.createElement('input'))).toBeTrue();
    expect(isTyping(document.createElement('select'))).toBeTrue();
    expect(isTyping(document.createElement('div'))).toBeFalse();
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    expect(isTyping(editable)).toBeTrue();
    expect(isTyping(null)).toBeFalse();
  });
});
