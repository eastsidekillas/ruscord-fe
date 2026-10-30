import {
  DMChannel,
  FullGuild,
  Guild,
  GuildChannel,
  Member,
  PresenceUpdate,
  PublicUser,
  Ready,
  Relationship,
  Role,
  Snowflake,
  User,
  UserStatus,
} from '@shared/api/models';

/**
 * Client state built from READY and kept current by gateway events. Messages
 * are not here: a channel page loads them and applies MESSAGE_* itself.
 */
export interface AppState {
  me: User | null;
  /** Guilds in the order the user joined them. */
  guildOrder: Snowflake[];
  guilds: Record<Snowflake, FullGuild>;
  dms: Record<Snowflake, DMChannel>;
  relationships: Record<Snowflake, Relationship>;
  /** Statuses others show; anyone missing is offline. */
  presences: Record<Snowflake, UserStatus>;
  /** Public profiles that changed after they were loaded (USER_PROFILE_UPDATE). */
  profiles: Record<Snowflake, PublicUser>;
}

export const emptyState: AppState = {
  me: null,
  guildOrder: [],
  guilds: {},
  dms: {},
  relationships: {},
  presences: {},
  profiles: {},
};

export interface Dispatch {
  t: string;
  d: unknown;
}

const byId = <T extends { id: Snowflake }>(items: T[]): Record<Snowflake, T> =>
  Object.fromEntries(items.map(i => [i.id, i]));

const without = <T>(rec: Record<Snowflake, T>, id: Snowflake): Record<Snowflake, T> => {
  if (!(id in rec)) return rec;
  const { [id]: _, ...rest } = rec;
  return rest;
};

function withGuild(s: AppState, id: Snowflake, fn: (g: FullGuild) => FullGuild): AppState {
  const g = s.guilds[id];
  return g ? { ...s, guilds: { ...s.guilds, [id]: fn(g) } } : s;
}

function fromReady(r: Ready): AppState {
  const presences: Record<Snowflake, UserStatus> = {};
  for (const p of r.presences ?? []) presences[p.user_id] = p.status;
  return {
    me: r.user,
    guildOrder: r.guilds.map(g => g.id),
    guilds: byId(r.guilds),
    dms: byId(r.dms ?? []),
    relationships: byId(r.relationships ?? []),
    presences,
    profiles: {},
  };
}

/** A changed public profile replaces the copies the state already holds. */
function applyProfile(s: AppState, u: PublicUser): AppState {
  const relationships = { ...s.relationships };
  for (const [id, r] of Object.entries(relationships)) {
    if (r.user?.id === u.id) relationships[id] = { ...r, user: u };
  }
  const dms = { ...s.dms };
  for (const [id, dm] of Object.entries(dms)) {
    if (dm.recipients.some(x => x.id === u.id)) {
      dms[id] = { ...dm, recipients: dm.recipients.map(x => (x.id === u.id ? u : x)) };
    }
  }
  return { ...s, relationships, dms, profiles: { ...s.profiles, [u.id]: u } };
}

/** Applies one gateway dispatch; unknown or malformed events change nothing. */
export function reduce(s: AppState, ev: Dispatch): AppState {
  const d = ev.d as any;
  if (d === null || typeof d !== 'object') return s;
  switch (ev.t) {
    case 'READY':
      return fromReady(d as Ready);

    case 'USER_UPDATE':
      return s.me && d.id === s.me.id ? { ...s, me: d as User } : s;

    case 'USER_PROFILE_UPDATE':
      return d.user?.id ? applyProfile(s, d.user as PublicUser) : s;

    case 'PRESENCE_UPDATE': {
      const p = d as PresenceUpdate;
      if (!p.user_id || s.presences[p.user_id] === p.status) return s;
      return { ...s, presences: { ...s.presences, [p.user_id]: p.status } };
    }

    case 'GUILD_CREATE': {
      const g = d as FullGuild;
      if (!g.id) return s;
      const guildOrder = s.guildOrder.includes(g.id) ? s.guildOrder : [...s.guildOrder, g.id];
      return { ...s, guildOrder, guilds: { ...s.guilds, [g.id]: g } };
    }

    case 'GUILD_UPDATE': {
      const g = d as Guild;
      return withGuild(s, g.id, cur => ({
        ...cur, name: g.name, owner_id: g.owner_id, icon: g.icon ?? null,
      }));
    }

    case 'GUILD_DELETE':
      return s.guilds[d.id]
        ? { ...s, guilds: without(s.guilds, d.id), guildOrder: s.guildOrder.filter(id => id !== d.id) }
        : s;

    case 'GUILD_PERMISSIONS_UPDATE':
      return withGuild(s, d.guild_id, g => ({
        ...g, permissions: d.permissions, channel_permissions: d.channel_permissions ?? {},
      }));

    case 'GUILD_ROLE_CREATE':
    case 'GUILD_ROLE_UPDATE':
    case 'GUILD_ROLE_DELETE':
      return Array.isArray(d.roles) ? withGuild(s, d.guild_id, g => ({ ...g, roles: d.roles as Role[] })) : s;

    case 'GUILD_MEMBER_UPDATE': {
      const m = d as Member;
      return s.me && m.user_id === s.me.id ? withGuild(s, m.guild_id, g => ({ ...g, member: { ...g.member, ...m } })) : s;
    }

    case 'CHANNEL_CREATE':
    case 'CHANNEL_UPDATE':
      if (d.guild_id) {
        const ch = d as GuildChannel;
        return withGuild(s, ch.guild_id, g => {
          const i = g.channels.findIndex(c => c.id === ch.id);
          const channels = i >= 0 ? g.channels.map(c => (c.id === ch.id ? ch : c)) : [...g.channels, ch];
          return { ...g, channels };
        });
      }
      return d.id && (d.type === 1 || d.type === 3) ? { ...s, dms: { ...s.dms, [d.id]: d as DMChannel } } : s;

    case 'CHANNEL_DELETE':
      if (d.guild_id) {
        return withGuild(s, d.guild_id, g => ({ ...g, channels: g.channels.filter(c => c.id !== d.id) }));
      }
      return { ...s, dms: without(s.dms, d.id) };

    case 'CHANNEL_RECIPIENT_ADD':
    case 'CHANNEL_RECIPIENT_REMOVE':
      return d.channel?.id ? { ...s, dms: { ...s.dms, [d.channel.id]: d.channel as DMChannel } } : s;

    case 'RELATIONSHIP_ADD': {
      const r = d as Relationship;
      if (!r.id) return s;
      // The event carries the user (ruscord-core#17); keep the known one otherwise.
      const user = r.user ?? s.relationships[r.id]?.user ?? s.profiles[r.id];
      return { ...s, relationships: { ...s.relationships, [r.id]: { ...r, user } } };
    }

    case 'RELATIONSHIP_REMOVE':
      // A block arrives as REMOVE of the old type and ADD of the new one:
      // only drop the relationship the event names.
      return s.relationships[d.id]?.type === d.type ? { ...s, relationships: without(s.relationships, d.id) } : s;
  }
  return s;
}

/** The newest known public profile of a user. */
export function resolveUser(s: AppState, u: PublicUser): PublicUser;
export function resolveUser(s: AppState, u: PublicUser | null | undefined): PublicUser | null;
export function resolveUser(s: AppState, u: PublicUser | null | undefined): PublicUser | null {
  if (!u) return null;
  if (s.me && u.id === s.me.id) return s.me;
  return s.profiles[u.id] ?? u;
}
