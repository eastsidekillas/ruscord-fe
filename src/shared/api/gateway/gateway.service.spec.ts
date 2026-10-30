import { TestBed, fakeAsync, flushMicrotasks, tick, discardPeriodicTasks } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { ApiService } from '../api.service';
import { CLOSE_ZOMBIE, GatewayDispatch, GatewayService, Op, SOCKET_FACTORY, SocketLike } from './gateway.service';

class FakeSocket implements SocketLike {
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  readyState = 1;
  sent: any[] = [];
  closedWith: number | null = null;

  constructor(readonly url: string) {}

  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }
  close(code?: number): void {
    this.closedWith = code ?? 1000;
    this.readyState = 3;
  }
  // Server side
  frame(f: object): void {
    this.onmessage?.({ data: JSON.stringify(f) } as MessageEvent);
  }
  serverClose(code: number): void {
    this.readyState = 3;
    this.onclose?.({ code } as CloseEvent);
  }
  last(): any {
    return this.sent[this.sent.length - 1];
  }
}

describe('GatewayService', () => {
  let sockets: FakeSocket[];
  let tickets: Observable<{ ticket: string; expires_in: number }>[];
  let gw: GatewayService;
  let events: GatewayDispatch[];
  let ended: number;

  const socket = () => sockets[sockets.length - 1];
  const hello = (interval = 30_000) => socket().frame({ op: Op.Hello, d: { heartbeat_interval: interval } });
  const dispatch = (s: number | undefined, t: string, d: object = {}) => socket().frame({ op: Op.Dispatch, s, t, d });

  beforeEach(() => {
    sockets = [];
    tickets = [];
    let n = 0;
    TestBed.configureTestingModule({
      providers: [
        { provide: SOCKET_FACTORY, useValue: (url: string) => { const s = new FakeSocket(url); sockets.push(s); return s; } },
        { provide: ApiService, useValue: { gatewayTicket: () => tickets.shift() ?? of({ ticket: `t${++n}`, expires_in: 30 }) } },
      ],
    });
    gw = TestBed.inject(GatewayService);
    events = [];
    ended = 0;
    gw.dispatches.subscribe(e => events.push(e));
    gw.sessionEnded.subscribe(() => ended++);
  });

  /** Starts and gets to READY with session "S" at s=1. */
  const ready = () => {
    gw.start();
    flushMicrotasks();
    hello();
    dispatch(1, 'READY', { session_id: 'S' });
  };

  it('identifies with a fresh ticket on the gateway path', fakeAsync(() => {
    gw.start();
    flushMicrotasks();
    expect(socket().url).toMatch(/^wss?:\/\/[^/]+\/gateway\?v=1$/);
    expect(socket().sent).toEqual([]); // nothing before HELLO
    hello();
    expect(socket().last()).toEqual({ op: Op.Identify, d: { ticket: 't1' } });
    expect(gw.status()).toBe('connecting');
    dispatch(1, 'READY', { session_id: 'S' });
    expect(gw.status()).toBe('ready');
    expect(events.map(e => e.t)).toEqual(['READY']);
    gw.stop();
  }));

  it('heartbeats the last sequence and closes a connection that stops acking', fakeAsync(() => {
    ready();
    dispatch(2, 'MESSAGE_CREATE');
    tick(1000); // first beat is jittered within the interval
    tick(30_000);
    const beats = socket().sent.filter(f => f.op === Op.Heartbeat);
    expect(beats.length).toBeGreaterThanOrEqual(1);
    expect(beats[0]).toEqual({ op: Op.Heartbeat, d: 2 });
    // No ack until the next beat: the connection is a zombie.
    tick(30_000);
    expect(socket().closedWith).toBe(CLOSE_ZOMBIE);
    gw.stop();
    discardPeriodicTasks();
  }));

  it('acks keep the connection', fakeAsync(() => {
    ready();
    for (let i = 0; i < 4; i++) {
      tick(30_000);
      socket().frame({ op: Op.HeartbeatAck, d: null });
    }
    expect(socket().closedWith).toBeNull();
    gw.stop();
    discardPeriodicTasks();
  }));

  // What the client does after the server closes the connection.
  const closes: { code: number; resume: boolean; stops?: boolean }[] = [
    { code: 1006, resume: true },   // network drop
    { code: 1012, resume: true },   // server restart
    { code: 4000, resume: true },
    { code: 4009, resume: true },   // missed heartbeat
    { code: 4010, resume: true },   // slow reader
    { code: 4004, resume: false },  // ticket refused / sign-in session revoked
    { code: 4006, resume: false },  // session cannot be resumed
    { code: 4012, resume: false, stops: true },
    { code: 4013, resume: false, stops: true },
  ];
  for (const c of closes) {
    it(`after close ${c.code} ${c.stops ? 'stops' : c.resume ? 'resumes' : 'identifies anew'}`, fakeAsync(() => {
      ready();
      dispatch(2, 'MESSAGE_CREATE');
      const first = socket();
      first.serverClose(c.code);
      if (c.stops) {
        tick(60_000);
        expect(sockets.length).toBe(1);
        expect(gw.status()).toBe('stopped');
        return;
      }
      expect(gw.status()).toBe('reconnecting');
      tick(1000); // first retry within a second
      flushMicrotasks();
      expect(sockets.length).toBe(2);
      hello();
      if (c.resume) {
        expect(socket().last()).toEqual({ op: Op.Resume, d: { ticket: 't2', session_id: 'S', seq: 2 } });
        dispatch(3, 'MESSAGE_CREATE');
        dispatch(undefined, 'RESUMED');
      } else {
        expect(socket().last()).toEqual({ op: Op.Identify, d: { ticket: 't2' } });
        dispatch(1, 'READY', { session_id: 'S2' });
      }
      expect(gw.status()).toBe('ready');
      gw.stop();
      discardPeriodicTasks();
    }));
  }

  it('backs off between failed attempts and resets after READY', fakeAsync(() => {
    ready();
    socket().serverClose(1006);
    tick(1000);
    flushMicrotasks();
    socket().serverClose(1006); // fails before HELLO
    tick(1000);
    flushMicrotasks();
    expect(sockets.length).toBe(2); // second retry waits 1–2 s
    tick(1000);
    flushMicrotasks();
    expect(sockets.length).toBe(3);
    hello();
    dispatch(undefined, 'RESUMED');
    socket().serverClose(1006);
    tick(1000);
    flushMicrotasks();
    expect(sockets.length).toBe(4); // back to the first delay
    gw.stop();
    discardPeriodicTasks();
  }));

  it('ends the session when no ticket is given (signed out)', fakeAsync(() => {
    ready();
    tickets.push(throwError(() => new HttpErrorResponse({ status: 401 })));
    socket().serverClose(4004);
    tick(1000);
    flushMicrotasks();
    expect(ended).toBe(1);
    expect(gw.status()).toBe('stopped');
    expect(sockets.length).toBe(1);
  }));

  it('retries when the ticket request fails for another reason', fakeAsync(() => {
    tickets.push(throwError(() => new HttpErrorResponse({ status: 502 })));
    gw.start();
    flushMicrotasks();
    expect(sockets.length).toBe(0);
    expect(gw.status()).toBe('reconnecting');
    tick(1000);
    flushMicrotasks();
    expect(sockets.length).toBe(1);
    gw.stop();
    discardPeriodicTasks();
  }));

  it('stop closes as a leaving client and ignores the late close', fakeAsync(() => {
    ready();
    const s = socket();
    gw.stop();
    expect(s.closedWith).toBe(1000);
    s.onclose?.({ code: 1000 } as CloseEvent); // handler was detached
    tick(60_000);
    expect(sockets.length).toBe(1);
    expect(gw.status()).toBe('offline');
  }));

  it('sends idle and online (op 3) only while ready, and idle again after READY', fakeAsync(() => {
    gw.setIdle(true); // before connecting: remembered
    ready();
    expect(socket().last()).toEqual({ op: Op.Presence, d: { status: 'idle' } });
    gw.setIdle(false);
    expect(socket().last()).toEqual({ op: Op.Presence, d: { status: 'online' } });
    const n = socket().sent.length;
    gw.setIdle(false); // no change, nothing sent
    expect(socket().sent.length).toBe(n);
    gw.stop();
    discardPeriodicTasks();
  }));

  it('ignores frames it cannot parse', fakeAsync(() => {
    ready();
    socket().onmessage?.({ data: 'not json' } as MessageEvent);
    dispatch(2, 'MESSAGE_CREATE');
    expect(events.map(e => e.t)).toEqual(['READY', 'MESSAGE_CREATE']);
    gw.stop();
    discardPeriodicTasks();
  }));
});
