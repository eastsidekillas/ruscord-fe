import { isUnread, noteMessage, noteRead } from './read-states.store';

// UUIDv7-like ids that sort by time.
const id = (n: number) => `0190a3b4-0000-7000-8000-${String(n).padStart(12, '0')}`;

describe('read states', () => {
  it('a new message makes a channel unread; a mention counts', () => {
    let s = noteMessage(undefined, id(1), false);
    expect(isUnread(s)).toBeTrue();
    s = noteMessage(s, id(2), true);
    expect([s.lastMessage, s.mentions]).toEqual([id(2), 1]);
    // An older message (an event late after history) changes nothing.
    expect(noteMessage(s, id(1), true)).toBe(s);
  });

  it('a mark at the end reads everything, an earlier one keeps the count', () => {
    const s = { lastRead: id(1), lastMessage: id(5), mentions: 2 };
    expect(noteRead(s, id(3))).toEqual({ lastRead: id(3), lastMessage: id(5), mentions: 2 });
    const all = noteRead(s, id(5));
    expect([isUnread(all), all.mentions]).toEqual([false, 0]);
    // Marks never move back.
    expect(noteRead(all, id(2))).toBe(all);
  });

  it('a mention before the mark does not count', () => {
    const s = noteMessage({ lastRead: id(5), lastMessage: id(5), mentions: 0 }, id(6), true);
    expect(s.mentions).toBe(1);
    expect(noteMessage({ lastRead: id(9), lastMessage: id(5), mentions: 0 }, id(6), true).mentions).toBe(0);
  });
});
