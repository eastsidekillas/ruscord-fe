import { Injectable, InjectionToken, NgZone, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, firstValueFrom } from 'rxjs';
import { environment } from '../../../environment/environment';
import { ApiService } from '../api.service';

// Protocol of ruscord-core's gateway (docs/api.md, "Gateway", ADR-0016).
export const Op = {
  Dispatch: 0,
  Heartbeat: 1,
  Identify: 2,
  Presence: 3,
  Resume: 6,
  Hello: 10,
  HeartbeatAck: 11,
} as const;

interface Frame {
  op: number;
  d?: any;
  s?: number;
  t?: string;
}

export interface GatewayDispatch {
  t: string;
  d: any;
}

/** offline: not started; ready: events flow; stopped: will not reconnect by itself. */
export type GatewayStatus = 'offline' | 'connecting' | 'ready' | 'reconnecting' | 'stopped';

/** The browser WebSocket, replaceable in tests. */
export interface SocketLike {
  onopen: ((ev: Event) => void) | null;
  onmessage: ((ev: MessageEvent) => void) | null;
  onclose: ((ev: CloseEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export const SOCKET_FACTORY = new InjectionToken<(url: string) => SocketLike>('gateway socket factory', {
  providedIn: 'root',
  factory: () => (url: string) => new WebSocket(url),
});

/** A close code after which the session cannot continue, but a new one can. */
const NEW_SESSION = new Set([4004, 4006]);
/** Close codes after which reconnecting would not help. */
const FATAL = new Set([4012, 4013]);
/** Our own code for closing a connection that stopped answering heartbeats; the server keeps the session. */
export const CLOSE_ZOMBIE = 3000;

const MAX_BACKOFF_MS = 30_000;

/**
 * One gateway connection per tab: ticket, HELLO, IDENTIFY or RESUME,
 * heartbeats, reconnects. Events come out of `dispatches`.
 */
@Injectable({ providedIn: 'root' })
export class GatewayService {
  private readonly api = inject(ApiService);
  private readonly zone = inject(NgZone);
  private readonly makeSocket = inject(SOCKET_FACTORY);

  readonly status = signal<GatewayStatus>('offline');
  /** Every DISPATCH, READY and RESUMED included, in order. */
  readonly dispatches = new Subject<GatewayDispatch>();
  /** Set when the session ended for good (signed out elsewhere, ticket refused). */
  readonly sessionEnded = new Subject<void>();

  private socket: SocketLike | null = null;
  private sessionId: string | null = null;
  private seq: number | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private firstBeat: ReturnType<typeof setTimeout> | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private acked = true;
  private attempts = 0;
  private running = false;
  private idle = false;
  /** Bumped on every new connection, so stale callbacks do nothing. */
  private generation = 0;

  /** Connects and keeps the connection until stop(). */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.attempts = 0;
    this.connect();
  }

  /** Closes as a client that leaves: the server ends the session. */
  stop(): void {
    this.running = false;
    this.generation++;
    this.clearTimers();
    const s = this.socket;
    this.socket = null;
    if (s) {
      s.onclose = null;
      s.close(1000);
    }
    this.sessionId = null;
    this.seq = null;
    this.status.set('offline');
  }

  /** Whether this device is in use; the server combines devices (op 3). */
  setIdle(idle: boolean): void {
    if (this.idle === idle) return;
    this.idle = idle;
    if (this.status() === 'ready') this.send({ op: Op.Presence, d: { status: idle ? 'idle' : 'online' } });
  }

  /** Reconnects now instead of waiting for the backoff (e.g. the browser is back online). */
  retryNow(): void {
    if (!this.running || this.status() !== 'reconnecting' || !this.retry) return;
    clearTimeout(this.retry);
    this.retry = null;
    this.connect();
  }

  private async connect(): Promise<void> {
    const gen = ++this.generation;
    this.status.set(this.sessionId ? 'reconnecting' : 'connecting');
    let ticket: string;
    try {
      ticket = (await firstValueFrom(this.api.gatewayTicket())).ticket;
    } catch (err) {
      if (gen !== this.generation) return;
      if (err instanceof HttpErrorResponse && err.status === 401) {
        // The refresh interceptor already tried: the sign-in session is over.
        this.end();
        return;
      }
      this.scheduleReconnect();
      return;
    }
    if (gen !== this.generation || !this.running) return;

    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${environment.GATEWAY_PATH}`;
    const socket = this.zone.runOutsideAngular(() => this.makeSocket(url));
    this.socket = socket;
    socket.onmessage = ev => this.zone.run(() => gen === this.generation && this.onFrame(ev.data, ticket));
    socket.onclose = ev => this.zone.run(() => gen === this.generation && this.onClose(ev.code));
    socket.onerror = () => undefined; // onclose follows with the code
  }

  private onFrame(raw: unknown, ticket: string): void {
    let f: Frame;
    try {
      f = JSON.parse(String(raw));
    } catch {
      return;
    }
    switch (f.op) {
      case Op.Hello:
        this.startHeartbeat(Number(f.d?.heartbeat_interval) || 30_000);
        if (this.sessionId && this.seq !== null) {
          this.send({ op: Op.Resume, d: { ticket, session_id: this.sessionId, seq: this.seq } });
        } else {
          this.send({ op: Op.Identify, d: { ticket } });
        }
        break;
      case Op.HeartbeatAck:
        this.acked = true;
        break;
      case Op.Dispatch:
        if (typeof f.s === 'number') this.seq = f.s;
        if (f.t === 'READY') {
          this.sessionId = f.d?.session_id ?? null;
        }
        if (f.t === 'READY' || f.t === 'RESUMED') {
          this.attempts = 0;
          this.status.set('ready');
          if (this.idle) this.send({ op: Op.Presence, d: { status: 'idle' } });
        }
        if (f.t) this.dispatches.next({ t: f.t, d: f.d });
        break;
    }
  }

  private onClose(code: number): void {
    this.clearTimers();
    this.socket = null;
    if (!this.running) return;
    if (FATAL.has(code)) {
      this.running = false;
      this.status.set('stopped');
      return;
    }
    if (NEW_SESSION.has(code)) {
      this.sessionId = null;
      this.seq = null;
    }
    this.scheduleReconnect();
  }

  private startHeartbeat(interval: number): void {
    this.clearTimers();
    this.acked = true;
    const beat = () => {
      if (!this.acked) {
        // No ack for a whole interval: the connection is dead without a close.
        this.socket?.close(CLOSE_ZOMBIE);
        return;
      }
      this.acked = false;
      this.send({ op: Op.Heartbeat, d: this.seq });
    };
    // The first beat is jittered so reconnecting clients do not beat in step.
    // Timers run outside Angular: a heartbeat changes nothing on screen.
    this.zone.runOutsideAngular(() => {
      this.firstBeat = setTimeout(() => {
        beat();
        this.heartbeat = setInterval(beat, interval);
      }, Math.floor(interval * Math.random()));
    });
  }

  private scheduleReconnect(): void {
    this.status.set('reconnecting');
    const base = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** this.attempts);
    this.attempts++;
    const delay = base / 2 + Math.random() * (base / 2);
    this.retry = setTimeout(() => {
      this.retry = null;
      if (this.running) this.connect();
    }, delay);
  }

  private end(): void {
    this.stop();
    this.status.set('stopped');
    this.sessionEnded.next();
  }

  private send(f: Frame): void {
    if (this.socket?.readyState === 1) this.socket.send(JSON.stringify(f));
  }

  private clearTimers(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.firstBeat) clearTimeout(this.firstBeat);
    if (this.retry) clearTimeout(this.retry);
    this.heartbeat = this.firstBeat = this.retry = null;
  }
}
