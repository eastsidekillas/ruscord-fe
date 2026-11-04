import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService, FullGuild, GatewayService, Message, ReadState } from '@shared/api';
import { AppStateStore } from '@entities/app-state';
import { mentionsMe } from '@shared/lib/messages';

/** A channel's state as the client keeps it between server reads. */
export interface Unread {
  lastRead: string | null;
  lastMessage: string | null;
  mentions: number;
}

/** A read mark is sent at most this often per channel; the latest one wins. */
const ACK_EVERY_MS = 3000;

/** Ids are UUIDv7: string order is time order. */
const newer = (a: string | null | undefined, b: string | null | undefined) => !!a && (!b || a > b);

/** Applies a message the user did not write: newer last message, maybe a mention. */
export function noteMessage(s: Unread | undefined, id: string, pingsMe: boolean): Unread {
  const cur = s ?? { lastRead: null, lastMessage: null, mentions: 0 };
  if (!newer(id, cur.lastMessage)) return cur;
  return { ...cur, lastMessage: id, mentions: cur.mentions + (pingsMe && newer(id, cur.lastRead) ? 1 : 0) };
}

/** Applies a read mark: what is at or before it is read. */
export function noteRead(s: Unread | undefined, id: string): Unread {
  const cur = s ?? { lastRead: null, lastMessage: null, mentions: 0 };
  if (!newer(id, cur.lastRead)) return cur;
  // Mentions after the mark are not known here; a mark at the end reads them all.
  const all = !newer(cur.lastMessage, id);
  return { lastRead: id, lastMessage: newer(id, cur.lastMessage) ? id : cur.lastMessage, mentions: all ? 0 : cur.mentions };
}

export function isUnread(s: Unread | undefined): s is Unread {
  return !!s && newer(s.lastMessage, s.lastRead);
}

/**
 * Unread channels and mentions (ruscord-core ADR-0038). Loaded after each
 * READY, then kept by MESSAGE_CREATE and MESSAGE_ACK; read marks go to the
 * server at most every few seconds per channel.
 */
@Injectable({ providedIn: 'root' })
export class ReadStateStore {
  private readonly api = inject(ApiService);
  private readonly app = inject(AppStateStore);
  readonly states = signal<Record<string, Unread>>({});
  private readonly timers = new Map<string, { at: number; pending?: string; timer?: ReturnType<typeof setTimeout> }>();

  constructor() {
    // READY may have come before anything asked for this store.
    if (this.app.loaded()) this.load();
    inject(GatewayService).dispatches.subscribe(ev => {
      switch (ev.t) {
        case 'READY':
          this.load();
          break;
        case 'MESSAGE_CREATE': {
          const m = ev.d as Message;
          const me = this.app.me()?.id;
          if (m.author?.id === me) this.set(m.channel_id, s => noteRead(s, m.id));
          else this.set(m.channel_id, s => noteMessage(s, m.id, mentionsMe(m, me, this.rolesIn(m.guild_id))));
          break;
        }
        case 'MESSAGE_ACK': {
          const a = ev.d as { channel_id: string; message_id: string };
          this.set(a.channel_id, s => noteRead(s, a.message_id));
          break;
        }
      }
    });
  }

  /** Unread text channels of a guild, and how many mentions they hold. */
  readonly guildSummary = computed(() => {
    const states = this.states();
    const out: Record<string, { unread: boolean; mentions: number }> = {};
    for (const g of this.app.guilds()) {
      let unread = false;
      let mentions = 0;
      for (const c of g.channels) {
        if (c.type !== 0) continue;
        const s = states[c.id];
        unread ||= isUnread(s);
        mentions += isUnread(s) ? s.mentions : 0;
      }
      out[g.id] = { unread, mentions };
    }
    return out;
  });

  /** DMs and groups with something unread. */
  readonly dmSummary = computed(() => {
    const states = this.states();
    const dms = this.app.dms().filter(d => isUnread(states[d.id]));
    return { unread: dms.length, mentions: dms.reduce((n, d) => n + states[d.id].mentions, 0) };
  });

  get(channelId: string): Unread | undefined {
    return this.states()[channelId];
  }

  unread(channelId: string): boolean {
    return isUnread(this.states()[channelId]);
  }

  /** Marks the channel read up to messageId; sends it now or a bit later. */
  ack(channelId: string, messageId: string): void {
    if (!this.unread(channelId) && !newer(messageId, this.get(channelId)?.lastRead)) return;
    this.set(channelId, s => noteRead(s, messageId));
    const t = this.timers.get(channelId) ?? { at: 0 };
    this.timers.set(channelId, t);
    const wait = t.at + ACK_EVERY_MS - Date.now();
    if (wait <= 0) {
      t.at = Date.now();
      this.send(channelId, messageId);
      return;
    }
    t.pending = messageId;
    t.timer ??= setTimeout(() => {
      t.timer = undefined;
      t.at = Date.now();
      if (t.pending) this.send(channelId, t.pending);
      t.pending = undefined;
    }, wait);
  }

  ackGuild(g: FullGuild): void {
    for (const c of g.channels) {
      const s = this.get(c.id);
      if (s?.lastMessage) this.set(c.id, x => noteRead(x, s.lastMessage!));
    }
    this.api.ackGuild(g.id).subscribe({ error: () => this.load() });
  }

  private send(channelId: string, messageId: string): void {
    this.api.ack(channelId, messageId).subscribe({ error: () => undefined });
  }

  private load(): void {
    this.api.readStates().subscribe({
      next: list => {
        // A mark sent while the answer was on its way is newer than it.
        const local = this.states();
        this.states.set(Object.fromEntries(list.map((r: ReadState) => {
          const server: Unread = { lastRead: r.last_read_id, lastMessage: r.last_message_id, mentions: r.mention_count };
          const mine = local[r.channel_id]?.lastRead;
          return [r.channel_id, mine ? noteRead(server, mine) : server];
        })));
      },
      error: () => undefined,
    });
  }

  private set(channelId: string, f: (s: Unread | undefined) => Unread): void {
    this.states.update(all => ({ ...all, [channelId]: f(all[channelId]) }));
  }

  private rolesIn(guildId: string | undefined): string[] {
    return this.app.guild(guildId)?.member?.roles ?? [];
  }
}
