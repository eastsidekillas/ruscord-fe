import { Message } from '@shared/api';
import { applyMessageEvent, upsertMessage } from './window';

const id = (n: number) => `0190a3b4-0000-7000-8000-${String(n).padStart(12, '0')}`;
const msg = (n: number, content = `m${n}`) => ({ id: id(n), channel_id: 'c', content, reactions: [] }) as unknown as Message;
const ids = (l: Message[]) => l.map(m => Number(m.id.slice(-12)));

describe('message window', () => {
  const loaded = [msg(10), msg(11), msg(12)];

  it('keeps id order on insert and the shown reactions on replace', () => {
    expect(ids(upsertMessage(loaded, msg(5)))).toEqual([5, 10, 11, 12]);
    const shown = [{ ...msg(11), reactions: [{ emoji: '👍', count: 1, me: true }] }] as unknown as Message[];
    const next = upsertMessage(shown, { ...msg(11, 'поправил'), reactions: null } as unknown as Message);
    expect([next[0].content, next[0].reactions?.length]).toEqual(['поправил', 1]);
  });

  it('applies events by what the window holds', () => {
    const cases: { name: string; t: Parameters<typeof applyMessageEvent>[1]; m: Message; atEnd: boolean; want: number[] }[] = [
      { name: 'an edit of a loaded message', t: 'MESSAGE_UPDATE', m: msg(11, 'x'), atEnd: true, want: [10, 11, 12] },
      { name: 'an edit or pin of an old message outside the window', t: 'MESSAGE_UPDATE', m: msg(2), atEnd: true, want: [10, 11, 12] },
      { name: 'a new message at the end', t: 'MESSAGE_CREATE', m: msg(13), atEnd: true, want: [10, 11, 12, 13] },
      { name: 'a new message while in the middle of history', t: 'MESSAGE_CREATE', m: msg(99), atEnd: false, want: [10, 11, 12] },
      { name: 'a delete of a loaded message', t: 'MESSAGE_DELETE', m: msg(11), atEnd: true, want: [10, 12] },
      { name: 'a delete outside the window', t: 'MESSAGE_DELETE', m: msg(2), atEnd: true, want: [10, 11, 12] },
    ];
    for (const c of cases) expect(ids(applyMessageEvent(loaded, c.t, c.m, c.atEnd))).withContext(c.name).toEqual(c.want);
    expect(applyMessageEvent(loaded, 'MESSAGE_UPDATE', msg(11, 'x'), true)[1].content).toBe('x');
  });

  it('returns the same list when nothing changes', () => {
    expect(applyMessageEvent(loaded, 'MESSAGE_UPDATE', msg(2), true)).toBe(loaded);
    expect(applyMessageEvent(loaded, 'MESSAGE_DELETE', msg(2), true)).toBe(loaded);
  });
});
