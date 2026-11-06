import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { ApiService, GatewayService, ReadState } from '@shared/api';
import { GatewayDispatch } from '@shared/api/gateway/gateway.service';
import { AppStateStore } from '@entities/app-state';
import { ReadStateStore, isUnread, noteMessage, noteRead } from './read-states.store';

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

describe('ReadStateStore loads', () => {
  const me = 'me';
  const ch = 'c1';
  let answers: Subject<ReadState[]>[];
  let events: Subject<GatewayDispatch>;
  let store: ReadStateStore;

  beforeEach(() => {
    answers = [];
    events = new Subject();
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: { readStates: () => { const a = new Subject<ReadState[]>(); answers.push(a); return a; } } },
        { provide: GatewayService, useValue: { dispatches: events } },
        {
          provide: AppStateStore,
          useValue: { loaded: signal(false), me: signal({ id: me }), guilds: signal([]), dms: signal([]), guild: () => undefined },
        },
      ],
    });
    store = TestBed.inject(ReadStateStore);
  });

  const mention = (n: number) => ({ t: 'MESSAGE_CREATE', d: { id: id(n), channel_id: ch, author: { id: 'ann' }, mentions: [me] } }) as unknown as GatewayDispatch;
  const answer = (a: Subject<ReadState[]>, last: number) => {
    a.next([{ channel_id: ch, last_read_id: id(1), last_message_id: id(last), mention_count: 0 }]);
    a.complete();
  };

  it('a mention during a load is kept on top of its answer', () => {
    events.next({ t: 'READY', d: {} } as GatewayDispatch);
    events.next(mention(2));
    answer(answers[0], 1);
    expect(store.get(ch)?.mentions).toBe(1);
  });

  it('an earlier load answering last does not undo what came after the latest one', () => {
    events.next({ t: 'READY', d: {} } as GatewayDispatch);
    events.next({ t: 'READY', d: {} } as GatewayDispatch); // a reconnect while the first load is out
    answer(answers[1], 1);
    events.next(mention(2));
    answer(answers[0], 1);
    expect([store.get(ch)?.lastMessage, store.get(ch)?.mentions]).toEqual([id(2), 1]);
  });
});
