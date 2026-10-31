import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '@entities/session/api/auth.service';
import { GatewayService } from '@shared/api/gateway/gateway.service';
import { NotificationService } from '@shared/model/notification.service';
import {
  DMChannel,
  FullGuild,
  GuildChannel,
  PublicUser,
  RelType,
  Session,
  deviceLabel,
  Relationship,
  Snowflake,
  UserStatus,
} from '@shared/api/models';
import { AppState, emptyState, reduce, resolveUser } from './reduce';

/** Live client state: READY plus every gateway event, as signals. */
@Injectable({ providedIn: 'root' })
export class AppStateStore {
  private readonly gateway = inject(GatewayService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly state = signal<AppState>(emptyState);
  /** True once READY arrived for this sign-in. */
  readonly loaded = signal(false);

  readonly me = computed(() => this.state().me);
  readonly guilds = computed(() => {
    const s = this.state();
    return s.guildOrder.map(id => s.guilds[id]).filter((g): g is FullGuild => !!g);
  });
  /** Direct messages and groups, newest first (by id: UUIDv7). */
  readonly dms = computed(() => Object.values(this.state().dms).sort((a, b) => (a.id < b.id ? 1 : -1)));
  readonly relationships = computed(() => Object.values(this.state().relationships));
  readonly friends = computed(() => this.byType(RelType.Friend));
  readonly incoming = computed(() => this.byType(RelType.Incoming));
  readonly outgoing = computed(() => this.byType(RelType.Outgoing));
  readonly blocked = computed(() => this.byType(RelType.Blocked));

  constructor() {
    this.gateway.dispatches.pipe(filter(Boolean)).subscribe(ev => {
      const next = reduce(this.state(), ev);
      if (next === this.state()) return;
      this.state.set(next);
      if (ev.t === 'READY') this.loaded.set(true);
      if ((ev.t === 'READY' || ev.t === 'USER_UPDATE') && next.me) this.auth.setUser(next.me);
    });
    // Someone signed in to this account elsewhere (ruscord-core ADR-0023).
    const notify = inject(NotificationService);
    this.gateway.dispatches.pipe(filter(ev => ev.t === 'SESSION_CREATE' && !!ev.d)).subscribe(ev => {
      const s = ev.d as Session;
      notify.show(`Вход с нового устройства: ${deviceLabel(s.device)}${s.ip ? ', ' + s.ip : ''}`, 'info', 8000);
    });
    this.gateway.sessionEnded.subscribe(() => {
      this.auth.forget();
      this.router.navigate(['/login']);
    });
    // One connection while signed in.
    effect(() => {
      const signedIn = this.auth.signedIn();
      untracked(() => {
        if (signedIn) {
          this.gateway.start();
        } else {
          this.gateway.stop();
          this.state.set(emptyState);
          this.loaded.set(false);
        }
      });
    });
    inject(DestroyRef).onDestroy(() => this.gateway.stop());
  }

  /**
   * Adds what a REST call just returned (a created guild, an opened DM)
   * before its gateway event arrives, so navigating to it works at once.
   */
  noteGuild(g: FullGuild): void {
    this.state.update(s => reduce(s, { t: 'GUILD_CREATE', d: g }));
  }

  noteDM(dm: DMChannel): void {
    this.state.update(s => reduce(s, { t: 'CHANNEL_CREATE', d: dm }));
  }

  guild(id: Snowflake | null | undefined): FullGuild | null {
    return id ? this.state().guilds[id] ?? null : null;
  }

  dm(id: Snowflake | null | undefined): DMChannel | null {
    return id ? this.state().dms[id] ?? null : null;
  }

  /** A guild channel the user can see, with its guild. */
  channel(id: Snowflake | null | undefined): { guild: FullGuild; channel: GuildChannel } | null {
    if (!id) return null;
    for (const g of Object.values(this.state().guilds)) {
      const ch = g.channels.find(c => c.id === id);
      if (ch) return { guild: g, channel: ch };
    }
    return null;
  }

  /** What others see of a user; for yourself, the status you chose. */
  status(userId: Snowflake | null | undefined): UserStatus {
    if (!userId) return 'offline';
    const me = this.state().me;
    if (me && userId === me.id) return me.status === 'invisible' ? 'offline' : me.status;
    return this.state().presences[userId] ?? 'offline';
  }

  /** Remembers statuses that came with a member list (GET /guilds/{id}/members). */
  notePresences(list: { user_id: Snowflake; status?: UserStatus }[]): void {
    const known = list.filter(m => m.status);
    if (!known.length) return;
    this.state.update(s => {
      const presences = { ...s.presences };
      for (const m of known) presences[m.user_id] = m.status!;
      return { ...s, presences };
    });
  }

  /** The newest public profile of a user (names and avatars change live). */
  user(u: PublicUser): PublicUser;
  user(u: PublicUser | null | undefined): PublicUser | null;
  user(u: PublicUser | null | undefined): PublicUser | null {
    return resolveUser(this.state(), u);
  }

  relationship(userId: Snowflake): Relationship | null {
    return this.state().relationships[userId] ?? null;
  }

  /** The other person of a 1:1 DM. */
  dmPartner(dm: DMChannel): PublicUser | null {
    const me = this.state().me?.id;
    const other = dm.recipients.find(r => r.id !== me) ?? null;
    return this.user(other);
  }

  private byType(t: number): Relationship[] {
    return Object.values(this.state().relationships).filter(r => r.type === t);
  }
}
